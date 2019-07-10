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

type Ctx = undefined;
type Ast = {token: string, type?: string, value?: AstValuesT};


const {seq, cls, notCls, clsFn, classes, numbers, cat,
        once, repeat, qty, zeroWidth, err, beginning, end,
        first, or, combine, erase, trans, ahead, rules} = getStringParsers<Ctx, Ast>({
    rawToToken: rawToken => ({token: rawToken}),
    concatTokens: tokens => (tokens.length ?
        [tokens.reduce((a, b) => ({token: a.token + b.token}))] : []),
});

const $o = getObjectParsers<Array<Ast>, Ctx, Ast>({
    rawToToken: rawToken => rawToken,
    concatTokens: tokens => (tokens.length ?
        [tokens.reduce((a, b) => ({token: a.token + b.token}))] : []),
    comparator: (a, b) => a.type === b.type && a.value === b.value,
});


const trueValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: true}])
    (seq('true'));

const falseValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: false}])
    (seq('false'));

const floatingPointNumberValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: Number.parseFloat(tokens[0].token.replace(/_/g, ''))}])
    (numbers.float);

const decimalIntegerValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: Number.parseInt(tokens[0].token.replace(/_/g, ''), 10)}])
    (numbers.int);

const numberValue =
    first(floatingPointNumberValue,
          decimalIntegerValue);

const atomValue =
    first(trueValue, falseValue, numberValue);

const symbolName =
    cat(combine(classes.alpha, repeat(classes.alnum)));


// const unaryOp = (op: string, op1: any) => {
// };

const binaryOp = (op: string, op1: any, op2: any) => {
    return ({
        operator: op,
        operands: [op1, op2],
    });
};

// const ternaryOp = (op: string, op1: any, op2: any, op3: any) => {
// };

// production rule:
//   S -> "(" E ")"
const exprRule20 = $o.trans(tokens => [tokens[1]])(
    $o.clsFn(t => t.token === '('),
    $o.clsFn(t => t.type === 'value'),
    $o.clsFn(t => t.token === ')'),
);

// production rule:
//   S -> S "**" S
const exprRule15 = $o.trans(tokens => [{token: tokens[1].token, type: 'value',
        value: binaryOp(tokens[1].token, tokens[0].value, tokens[2].value)}])(
    $o.clsFn(t => t.type === 'value'),
    $o.clsFn(t => t.token === '**'),
    $o.clsFn(t => t.type === 'value'),
);

// production rules:
//   S -> S "*" S
//   S -> S "/" S
//   S -> S "%" S
const exprRule14 = $o.trans(tokens => [{token: tokens[1].token, type: 'value',
        value: binaryOp(tokens[1].token, tokens[0].value, tokens[2].value)}])(
    $o.clsFn(t => t.type === 'value'),
    $o.clsFn(t => t.token === '*' || t.token === '/' || t.token === '%'),
    $o.clsFn(t => t.type === 'value'),
);

// production rules:
//   S -> S "+" S
//   S -> S "-" S
const exprRule13 = $o.trans(tokens => [{token: tokens[1].token, type: 'value',
        value: binaryOp(tokens[1].token, tokens[0].value, tokens[2].value)}])(
    $o.clsFn(t => t.type === 'value'),
    $o.clsFn(t => t.token === '+' || t.token === '-'),
    $o.clsFn(t => t.type === 'value'),
);

// production rule:
//   S -> S "," S
const exprRule1 = $o.trans(tokens => [{token: tokens[1].token, type: 'value',
        value: binaryOp(tokens[1].token, tokens[0].value, tokens[2].value)}])(
    $o.clsFn(t => t.type === 'value'),
    $o.clsFn(t => t.token === ','),
    $o.clsFn(t => t.type === 'value'),
);


const exprOps = cls('**', '*', '/', '%', '+', '-');
const transformOp = (op: ParserFnWithCtx<string, Ctx, Ast>) => trans(tokens => [{
    token: tokens[0].token, type: 'op', value: tokens[0].token}])(op);

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
        exprRule15,
        exprRule14,
        exprRule13,
        exprRule1,
    ],
    check: $o.combine($o.classes.any, $o.end()),
})(exprInner(edge, false));


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
    return z.tokens[0].value;
}
