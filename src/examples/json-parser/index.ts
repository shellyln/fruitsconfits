// Copyright (c) 2019 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { ParseError,
         ParserInputWithCtx,
         parserInput,
         ParserFnWithCtx }  from '../../lib/types';
import { getStringParsers } from '../../lib/string-parser';
import { getObjectParsers } from '../../lib/object-parser';



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


const lineComment =
    combine(
        seq('//'),
        repeat(notCls('\r\n', '\n', '\r')),
        classes.newline,
    );

const hashLineComment =
    combine(
        seq('#'),
        repeat(notCls('\r\n', '\n', '\r')),
        classes.newline,
    );

const blockComment =
    combine(
        seq('/*'),
        repeat(notCls('*/')),
        seq('*/'),
    );

const commentOrSpace =
    first(classes.space, lineComment, hashLineComment, blockComment);


const trueValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: true}])
    (seq('true'));

const falseValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: false}])
    (seq('false'));

const nullValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: null}])
    (seq('null'));

const undefinedValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: void 0}])
    (seq('undefined'));

const positiveInfinityValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: Number.POSITIVE_INFINITY}])
    (qty(0, 1)(seq('+')), seq('Infinity'));

const negativeInfinityValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: Number.NEGATIVE_INFINITY}])
    (seq('-Infinity'));

const nanValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: Number.NaN}])
    (seq('NaN'));


const binaryIntegerValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: Number.parseInt(tokens[0].token.replace(/_/g, ''), 2)}])
    (numbers.bin(seq('0b')));

const octalIntegerValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: Number.parseInt(tokens[0].token.replace(/_/g, ''), 8)}])
    (numbers.oct(seq('0o'), seq('0')));

const hexIntegerValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: Number.parseInt(tokens[0].token.replace(/_/g, ''), 16)}])
    (numbers.hex(seq('0x'), seq('0X')));

const decimalIntegerValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: Number.parseInt(tokens[0].token.replace(/_/g, ''), 10)}])
    (numbers.int);

const bigDecimalIntegerValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: BigInt(tokens[0].token.replace(/_/g, ''))}])
    (numbers.bigint);

const floatingPointNumberValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: Number.parseFloat(tokens[0].token.replace(/_/g, ''))}])
    (numbers.float);

const numberValue =
    first(octalIntegerValue,
          hexIntegerValue,
          binaryIntegerValue,
          floatingPointNumberValue,
          bigDecimalIntegerValue, 
          decimalIntegerValue,
          positiveInfinityValue,
          negativeInfinityValue,
          nanValue);


const stringEscapeSeq = first(
    trans(t => [{token: '\''}])(seq('\\\'')),
    trans(t => [{token: '\"'}])(seq('\\"')),
    trans(t => [{token: '\`'}])(seq('\\`')),
    trans(t => [{token: '\\'}])(seq('\\\\')),
    trans(t => [{token: ''}])(seq('\\\r\n')),
    trans(t => [{token: ''}])(seq('\\\r')),
    trans(t => [{token: ''}])(seq('\\\n')),
    trans(t => [{token: '\n'}])(seq('\\n')),
    trans(t => [{token: '\r'}])(seq('\\r')),
    trans(t => [{token: '\v'}])(seq('\\v')),
    trans(t => [{token: '\t'}])(seq('\\t')),
    trans(t => [{token: '\b'}])(seq('\\b')),
    trans(t => [{token: '\f'}])(seq('\\f')),
    trans(t => [{token: String.fromCodePoint(Number.parseInt(t[0].token, 16))}])(
        cat(erase(seq('\\u')),
                qty(4, 4)(classes.hex),)),
    trans(t => [{token: String.fromCodePoint(Number.parseInt(t[0].token, 16))}])(
        cat(erase(seq('\\u{')),
                qty(1, 6)(classes.hex),
                erase(seq('}')),)),
    trans(t => [{token: String.fromCodePoint(Number.parseInt(t[0].token, 16))}])(
        cat(erase(seq('\\x')),
                qty(2, 2)(classes.hex),)),
    trans(t => [{token: String.fromCodePoint(Number.parseInt(t[0].token, 8))}])(
        cat(erase(seq('\\')),
                qty(3, 3)(classes.oct),)));

const signleQuotStringValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: tokens[0].token}])(
        erase(seq("'")),
            cat(repeat(first(
                stringEscapeSeq,
                combine(cls('\r', '\n'), err('Line breaks within strings are not allowed.')),
                notCls("'"),
            ))),
        erase(seq("'")),);

const doubleQuotStringValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: tokens[0].token}])(
        erase(seq('"')),
            cat(repeat(first(
                stringEscapeSeq,
                combine(cls('\r', '\n'), err('Line breaks within strings are not allowed.')),
                notCls('"'),
            ))),
        erase(seq('"')),);

const backQuotStringValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: tokens[0].token}])(
        erase(seq('`')),
            cat(repeat(first(
                stringEscapeSeq,
                notCls('`'),
            ))),
        erase(seq('`')),);

const stringValue =
    first(signleQuotStringValue, doubleQuotStringValue, backQuotStringValue);


const atomValue =
    first(trueValue, falseValue, nullValue, undefinedValue,
          numberValue, stringValue);

const symbolName =
    cat(combine(classes.alpha, repeat(classes.alnum)));

const objKey =
    first(stringValue, symbolName);


const listValue = first(
    trans(tokens => [{token: '[]', type: 'list', value: []}])(erase(
        seq('['),
            repeat(commentOrSpace),
        seq(']'),
    )),
    trans(tokens => {
        const ast: Ast = {token: '[]', type: 'list', value: []};
        for (const token of tokens) {
            (ast.value as Array<AstValuesT>).push(token.value);
        }
        return [ast];
    })(
        erase(seq('[')),
            once(combine(
                erase(repeat(commentOrSpace)),
                first(input => listValue(input),   // NOTE: recursive definitions
                      input => objectValue(input), //       should place as lambda.
                      input => constExpr(first(seq(','), seq(']')))(input),),
                erase(repeat(commentOrSpace)),)),
            repeat(combine(
                erase(repeat(commentOrSpace),
                      seq(','),
                      repeat(commentOrSpace)),
                first(input => listValue(input),   // NOTE: recursive definitions
                      input => objectValue(input), //       should place as lambda.
                      input => constExpr(first(seq(','), seq(']')))(input),),
                erase(repeat(commentOrSpace)),)),
            qty(0, 1)(erase(
                seq(','),
                repeat(commentOrSpace),)),
            first(ahead(seq(']')), err('Unexpected token has appeared.')),
        erase(seq(']'))
    )
);


const objectKeyValuePair =
    combine(
        objKey,
        erase(repeat(commentOrSpace),
              first(seq(':'), err('":" is needed.')),
              repeat(commentOrSpace)),
        first(input => listValue(input),   // NOTE: recursive definitions
              input => objectValue(input), //       should place as lambda.
              input => constExpr(first(seq(','), seq('}')))(input),
              err('object value is needed.')),
    );

const objectValue = first(
    trans(tokens => [{token: '{}', type: 'object', value: {}}])(erase(
        seq('{'),
            repeat(commentOrSpace),
        seq('}'),
    )),
    trans(tokens => {
        const ast: Ast = {token: '{}', type: 'object', value: {}};
        for (let i = 0; i < tokens.length; i += 2) {
            if (tokens[i].token === '__proto__') {
                continue; // NOTE: prevent prototype pollution attacks
            }
            (ast.value as object)[tokens[i].token] = tokens[i + 1].value;
        }
        return [ast];
    })(
        erase(seq('{')),
            once(combine(
                erase(repeat(commentOrSpace)),
                objectKeyValuePair,
                erase(repeat(commentOrSpace)),)),
            repeat(combine(
                erase(seq(','),
                      repeat(commentOrSpace)),
                objectKeyValuePair,
                erase(repeat(commentOrSpace)),)),
            qty(0, 1)(erase(
                seq(','),
                repeat(commentOrSpace),)),
            first(ahead(seq('}')), err('Unexpected token has appeared.')),
        erase(seq('}')),
    )
);


// const unaryOp = (op: string, op1: any) => {
// };

const binaryOp = (op: string, op1: any, op2: any) => {
    switch (op) {
    case '**':
        return op1 ** op2;
    case '*':
        return op1 * op2;
    case '/':
        return op1 / op2;
    case '%':
        return op1 % op2;
    case '+':
        return op1 + op2;
    case '-':
        return op1 - op2;
    case ',':
        return op2;
    default:
        throw new ParseError('Unknown operator has appeared.' + op);
    }
};
// NOTE: Use the following function to return AST (abstract syntax tree).
// const binaryOp = (op: string, op1: any, op2: any) => {
//     return ({
//         operator: op,
//         operands: [op1, op2],
//     });
// };

// const ternaryOp = (op: string, op1: any, op2: any, op3: any) => {
// };

// production rule:
//   S -> "(" E ")"
const constExprRule20 = $o.trans(tokens => [tokens[1]])(
    $o.clsFn(t => t.token === '('),
    $o.clsFn(t => t.type === 'value'),
    $o.clsFn(t => t.token === ')'),
);

// production rule:
//   S -> S "**" S
const constExprRule15 = $o.trans(tokens => [{token: tokens[1].token, type: 'value',
        value: binaryOp(tokens[1].token, tokens[0].value, tokens[2].value)}])(
    $o.clsFn(t => t.type === 'value'),
    $o.clsFn(t => t.token === '**'),
    $o.clsFn(t => t.type === 'value'),
);

// production rules:
//   S -> S "*" S
//   S -> S "/" S
//   S -> S "%" S
const constExprRule14 = $o.trans(tokens => [{token: tokens[1].token, type: 'value',
        value: binaryOp(tokens[1].token, tokens[0].value, tokens[2].value)}])(
    $o.clsFn(t => t.type === 'value'),
    $o.clsFn(t => t.token === '*' || t.token === '/' || t.token === '%'),
    $o.clsFn(t => t.type === 'value'),
);

// production rules:
//   S -> S "+" S
//   S -> S "-" S
const constExprRule13 = $o.trans(tokens => [{token: tokens[1].token, type: 'value',
        value: binaryOp(tokens[1].token, tokens[0].value, tokens[2].value)}])(
    $o.clsFn(t => t.type === 'value'),
    $o.clsFn(t => t.token === '+' || t.token === '-'),
    $o.clsFn(t => t.type === 'value'),
);

// production rule:
//   S -> S "," S
const constExprRule1 = $o.trans(tokens => [{token: tokens[1].token, type: 'value',
        value: binaryOp(tokens[1].token, tokens[0].value, tokens[2].value)}])(
    $o.clsFn(t => t.type === 'value'),
    $o.clsFn(t => t.token === ','),
    $o.clsFn(t => t.type === 'value'),
);

const constExprOps = cls('**', '*', '/', '%', '+', '-');
const transformOp = (op: ParserFnWithCtx<string, Ctx, Ast>) => trans(tokens => [{
    token: tokens[0].token, type: 'op', value: tokens[0].token}])(op);

const constExprNested =
    (input: ParserInputWithCtx<string, Ctx>) => constExprInner(cls(')'), true)(input);

const constExprInner: (edge: ParserFnWithCtx<string, undefined, Ast>, nested: boolean) =>
        ParserFnWithCtx<string, undefined, Ast> = (edge, nested) => combine(
    qty(1)(first(
        erase(commentOrSpace),
        atomValue,
        transformOp(nested ? first(constExprOps, cls(',')) : constExprOps),
        combine(
            transformOp(cls('(')),
            constExprNested,
            transformOp(cls(')')),
        ),
    )),
    ahead(repeat(commentOrSpace), edge),
);

const constExpr = (edge: ParserFnWithCtx<string, Ctx, Ast>) => rules({
    rules: [
        constExprRule20,
        constExprRule15,
        constExprRule14,
        constExprRule13,
        constExprRule1,
    ],
    check: $o.combine($o.classes.any, $o.end()),
})(constExprInner(edge, false));


const program = trans(tokens => tokens)(
    erase(repeat(commentOrSpace)),
    first(listValue, objectValue, constExpr(end())),
    erase(repeat(commentOrSpace)),
    end(),
);


export function parse(s: string) {
    const z = program(parserInput(s));
    if (! z.succeeded) {
        throw new Error(z.message);
    }
    return z.tokens[0].value;
}
