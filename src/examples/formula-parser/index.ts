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



interface SxOp {
    'op': string;
}

type AstChild = liyad.SxTokenChild | SxOp;

type Ctx = undefined;
type Ast = liyad.SxToken | AstChild | SxOp;


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
        const operands: Ast[] = [];
        if (Array.isArray(op1) && liyad.isSymbol(op1[0], '$last')) {
            operands.push(...op1.slice(1));
        } else {
            operands.push(op1);
        }
        if (Array.isArray(op2) && liyad.isSymbol(op2[0], '$last')) {
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


const exprOps = cls('**', '*', '/', '%', '+', '-');
const transformOp = (op: ParserFnWithCtx<string, Ctx, Ast>) =>
    trans(tokens => [{op: tokens[0] as string}])(op);


const beginningOrOp =
    $o.first($o.beginning(() => ({op: '$noop'})), $o.clsFn(t => {
        if (t) {
            switch((t as any).op) {
            case '**': case '*': case '/': case '%': case '+': case '-': case ',':
                return true;
            default:
                return false;
            }
        } else {
            return false;
        }
    }));


// production rule:
//   beginning S -> beginning "(" E ")"
//   op        S -> op        "(" E ")"
const exprRule20 = $o.trans(tokens => {
    if ((tokens[0] as SxOp).op === '$noop') {
        return [tokens[2]];
    } else {
        return [tokens[0], tokens[2]];
    }
})(
    beginningOrOp,
    $o.clsFn(t => isOperator(t, '(')),
    $o.clsFn(t => isValue(t)),
    $o.clsFn(t => isOperator(t, ')')),
);

// production rule:
//   S -> S<<symbol>> "(" S ")"
//   S -> S<<value>>  "(" S ")"
const exprRule18 = $o.trans(tokens => {
    if (Array.isArray(tokens[2]) && liyad.isSymbol((tokens[2] as Ast[])[0], '$last')) {
        return [[tokens[0], ...(tokens[2] as Ast[]).slice(1)]];
    } else {
        return [[tokens[0], tokens[2]]];
    }
})(
    $o.first($o.clsFn(t => liyad.isSymbol(t) ? true : false), $o.clsFn(t => isValue(t))),
    $o.clsFn(t => isOperator(t, '(')),
    $o.first($o.clsFn(t => Array.isArray(t) && liyad.isSymbol(t[0], '$last') ? true : false), $o.clsFn(t => isValue(t))),
    $o.clsFn(t => isOperator(t, ')')),
);

// production rule:
//   beginning S -> beginning "+" S
//   op        S -> op        "+" S
//   beginning S -> beginning "-" S
//   op        S -> op        "-" S
const exprRule16 = $o.trans(tokens => {
    if ((tokens[0] as SxOp).op === '$noop') {
        return [unaryOp((tokens[1] as SxOp).op, tokens[2])];
    } else {
        return [tokens[0], unaryOp((tokens[1] as SxOp).op, tokens[2])];
    }
})(
    beginningOrOp,
    $o.clsFn(t => isOperator(t, '+') || isOperator(t, '-')),
    $o.clsFn(t => isValue(t)),
);

// production rule:
//   S -> S "**" S
const exprRule15 = $o.trans(tokens => [binaryOp((tokens[1] as SxOp).op, tokens[0], tokens[2])])(
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


const exprNested =
    (input: ParserInputWithCtx<string, Ctx>) => exprInner(cls(')'), true)(input);

const exprInner: (edge: ParserFnWithCtx<string, undefined, Ast>, nested: boolean) =>
        ParserFnWithCtx<string, undefined, Ast> = (edge, nested) => combine(
    qty(1)(first(
        erase(classes.space),
        transformOp(combine(cls('+', '-'), ahead(classes.num))),
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
        { parser: exprRule16, rtol: true },
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
