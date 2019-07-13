// Copyright (c) 2019 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { ParseError,
         ParserInputWithCtx,
         parserInput,
         ParserFnWithCtx }  from '../../lib/types';
import { getStringParsers } from '../../lib/string-parser';
import { getObjectParsers } from '../../lib/object-parser';
import * as liyad           from 'liyad';



type AstValuesT = number | string | boolean | BigInt | null | object | Array<any> | undefined;

export interface SxExternalValue {
    value: any;
}

export interface SxOp {
    'op': string;
}
export interface SxSymbol {
    'symbol': string;
}

export interface SxComment {
    comment: string;
}

export interface SxDottedPair {
    car: SxToken; // left
    cdr: SxToken; // right
}

export interface SxDottedFragment {
    dotted: SxToken; // right
}

export type SxTokenChild = SxOp | SxSymbol | SxDottedPair | SxDottedFragment | SxComment | SxExternalValue | string | number | boolean | null | /*SxToken*/ any[];
export type SxToken      = SxOp | SxSymbol | SxDottedPair | SxDottedFragment | SxComment | SxExternalValue | string | number | boolean | null | SxTokenChild[];

type Ctx = undefined;
type Ast = SxToken;


const {seq, cls, notCls, clsFn, classes, numbers, cat,
        once, repeat, qty, zeroWidth, err, beginning, end,
        first, or, combine, erase, trans, ahead, rules} = getStringParsers<Ctx, Ast>({
    rawToToken: rawToken => rawToken,
    concatTokens: tokens => (tokens.length ?
        [tokens.reduce((a, b) => String(a) + b)] : []),
});

const $o = getObjectParsers<Array<Ast>, Ctx, Ast>({
    rawToToken: rawToken => rawToken,
    concatTokens: tokens => (tokens.length ?
        [tokens.reduce((a, b) => String(a) + b)] : []),
    comparator: (a, b) => a === b,
});


const trueValue =
    trans(tokens => [true])
    (seq('true'));

const falseValue =
    trans(tokens => [false])
    (seq('false'));

const floatingPointNumberValue =
    trans(tokens => [Number.parseFloat((tokens as string[])[0].replace(/_/g, ''))])
    (numbers.float);

const decimalIntegerValue =
    trans(tokens => [Number.parseInt((tokens as string[])[0].replace(/_/g, ''), 10)])
    (numbers.int);

const numberValue =
    first(floatingPointNumberValue,
          decimalIntegerValue);

const atomValue =
    first(trueValue, falseValue, numberValue);

const symbolName =
    trans(tokens => [{symbol: (tokens as string[])[0]}])
    (cat(combine(classes.alpha, repeat(classes.alnum))));


const unaryOp = (op: string, op1: any) => {
    return [{symbol: op}, op1];
};

const binaryOp = (op: string, op1: any, op2: any) => {
    if (op === ',') {
        const operands: SxToken[] = [];
        if (Array.isArray(op1) && isSymbol(op1[0], '$last')) {
            operands.push(...op1.slice(1));
        } else {
            operands.push(op1);
        }
        if (Array.isArray(op2) && isSymbol(op2[0], '$last')) {
            operands.push(...op2.slice(1));
        } else {
            operands.push(op2);
        }
        return [{symbol: '$last'}, ...operands];
    }
    return [{symbol: op}, op1, op2];
};

const ternaryOp = (op: string, op1: any, op2: any, op3: any) => {
    return [{symbol: op}, op1, op2, op3];
};

const isSymbol = (x: any, name?: string) => {
    if (x && typeof x === 'object' && Object.prototype.hasOwnProperty.call(x, 'symbol')) {
        if (name !== void 0) {
            return x.symbol === name ? x : null;
        } else {
            return x;
        }
    }
    return null;
};

const isOperator = (v: any, op: string) => {
    if (typeof v === 'object' && v.op === op) {
        return true;
    }
    return false;
};

const isValue = (v: any) => {
    switch (typeof v) {
    case 'number': case 'boolean': case 'string':
        return true;
    }
    if (Array.isArray(v)) {
        return true;
    }
    return false;
};

// production rule:
//   beginning S -> beginning "(" E ")"
//   op        S -> op        "(" E ")"
const exprRule20 = $o.trans(tokens => {
    return [tokens[1]]
})(
    $o.clsFn(t => isOperator(t, '(')),
    $o.clsFn(t => isValue(t)),
    $o.clsFn(t => isOperator(t, ')')),
);

// production rule:
//   S -> S<<symbol>> "(" S ")"
//   S -> S<<value>>  "(" S ")"
const exprRule18 = $o.trans(tokens => [[tokens[0], tokens[2]]])(
    $o.first($o.clsFn(t => isSymbol(t)), $o.clsFn(t => isValue(t))),
    $o.clsFn(t => isOperator(t, '(')),
    $o.first($o.clsFn(t => Array.isArray(t) && isSymbol(t[0], '$last')), $o.clsFn(t => isValue(t))),
    $o.clsFn(t => isOperator(t, ')')),
);

// production rule:
//   S -> S "**" S
const exprRule15 = $o.trans(tokens => [[binaryOp((tokens[1] as SxOp).op, tokens[0], tokens[2])]])(
    $o.clsFn(t => isValue(t)),
    $o.clsFn(t => isOperator(t, '**')),
    $o.clsFn(t => isValue(t)),
);

// production rules:
//   S -> S "*" S
//   S -> S "/" S
//   S -> S "%" S
const exprRule14 = $o.trans(tokens => [binaryOp((tokens[1] as SxOp).op, tokens[0], tokens[2])])(
    $o.clsFn(t => isValue(t)),
    $o.clsFn(t => isOperator(t, '*') || isOperator(t, '/') || isOperator(t, '%')),
    $o.clsFn(t => isValue(t)),
);

// production rules:
//   S -> S "+" S
//   S -> S "-" S
const exprRule13 = $o.trans(tokens => [binaryOp((tokens[1] as SxOp).op, tokens[0], tokens[2])])(
    $o.clsFn(t => isValue(t)),
    $o.clsFn(t => isOperator(t, '+') || isOperator(t, '-')),
    $o.clsFn(t => isValue(t)),
);

// production rule:
//   S -> S "," S
const exprRule1 = $o.trans(tokens => {
    return [binaryOp((tokens[1] as SxOp).op, tokens[0], tokens[2])]
})(
    $o.clsFn(t => isValue(t)),
    $o.clsFn(t => isOperator(t, ',')),
    $o.clsFn(t => isValue(t)),
);


const exprOps = cls('**', '*', '/', '%', '+', '-');
const transformOp = (op: ParserFnWithCtx<string, Ctx, Ast>) =>
    trans(tokens => [{op: tokens[0] as string}])(op);

const exprNested =
    (input: ParserInputWithCtx<string, Ctx>) => exprInner(cls(')'), true)(input);

const exprInner: (edge: ParserFnWithCtx<string, undefined, Ast>, nested: boolean) =>
        ParserFnWithCtx<string, undefined, Ast> = (edge, nested) => combine(
    qty(1)(first(
        erase(classes.space),
        atomValue,
        symbolName,
        transformOp(nested ? first(exprOps, cls(',')) : exprOps),
        combine(
            transformOp(cls('(')),
            exprNested,
            transformOp(cls(')')),
        ),
    )),
    ahead(repeat(classes.space), edge),
);

const expr = (edge: ParserFnWithCtx<string, Ctx, Ast>) => rules({
    rules: [
        exprRule20,
        exprRule18,
        exprRule15,
        exprRule14,
        exprRule13,
        exprRule1,
    ],
    check: $o.combine($o.classes.any, $o.end()),
})(exprInner(edge, true));


const program = trans(tokens => tokens)(
    erase(repeat(classes.space)),
    expr(end()),
    erase(repeat(classes.space)),
    end(),
);


export function parse(s: string) {
    const z = program(parserInput(s));
    if (! z.succeeded) {
        throw new Error(z.message);
    }
    return z.tokens[0];
}

export function evaluate(s: string) {
    const z = parse(s);
    return liyad.lisp.evaluateAST([z] as any);
}
