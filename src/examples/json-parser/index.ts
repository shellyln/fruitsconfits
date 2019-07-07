// Copyright (c) 2019 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { parserInput, ParserFnWithCtx }      from '../../lib/types';
import { getStringParsers } from '../../lib/string-parser';
import { getObjectParsers } from '../../lib/object-parser';



type AstValuesT = number | string | boolean | BigInt | null | object | Array<any> | undefined;

type Ctx = undefined;
type Ast = {token: string, type?: string, value?: AstValuesT};


const {seq, cls, notCls, clsFn, classes, cat,
        once, repeat, qty, zeroWidth, err, beginning, end,
        first, or, combine, erase, trans, preread, rules} = getStringParsers<Ctx, Ast>({
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


const octNum =
    cls('0', '1', '2', '3', '4', '5', '6', '7');
const octNumSep =
    cls('0', '1', '2', '3', '4', '5', '6', '7', '_');
const hexAlpha =
    cls('A', 'a', 'B', 'b', 'C', 'c', 'D', 'd', 'E', 'e', 'F', 'f');
const hexAlphaSep =
    cls('A', 'a', 'B', 'b', 'C', 'c', 'D', 'd', 'E', 'e', 'F', 'f', '_');

const binaryIntegerValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: Number.parseInt(tokens[0].token.replace(/_/g, ''), 2)}])
    (erase(seq('0b')),
        cat(qty(1)(cls('0', '1', '_'))));

const octetIntegerValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: Number.parseInt(tokens[0].token.replace(/_/g, ''), 8)}])
    (erase(first(seq('0o'), seq('0'))),
        cat(qty(1)(octNumSep)));

const hexIntegerValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: Number.parseInt(tokens[0].token.replace(/_/g, ''), 16)}])
    (erase(first(seq('0x'), seq('0X'))),
        cat(qty(1)(first(classes.num, hexAlphaSep))));

const bigDecimalIntegerValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: BigInt(tokens[0].token.replace(/_/g, ''))}])
    (cat(qty(0, 1)(cls('+', '-')),
        first(combine(once(classes.nonzero), repeat(first(classes.num, cls('_')))),
              seq('0'),),
        erase(seq('n')),));

const floatingPointNumberValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: Number.parseFloat(tokens[0].token.replace(/_/g, ''))}])
    (cat(qty(0, 1)(cls('+', '-')),
        first(combine(once(classes.nonzero), repeat(first(classes.num, cls('_')))),
              seq('0'),),
        qty(0, 1)(combine(seq('.'),
            qty(1)(first(classes.num, cls('_'))),)),
        qty(0, 1)(combine(cls('E', 'e'), qty(0, 1)(cls('+', '-')),
            first(combine(once(classes.nonzero), repeat(classes.num)), seq('0')),))));

const decimalIntegerValue =
    trans(tokens => [{token: tokens[0].token, type: 'value',
        value: Number.parseInt(tokens[0].token.replace(/_/g, ''), 10)}])
    (cat(qty(0, 1)(cls('+', '-')),
        first(combine(once(classes.nonzero), repeat(first(classes.num, cls('_')))),
              seq('0'),)));

const numberValue =
    first(octetIntegerValue,
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
    trans(t => [{token: '\r\n'}])(seq('\\\r\n')),
    trans(t => [{token: '\r'}])(seq('\\\r')),
    trans(t => [{token: '\n'}])(seq('\\\n')),
    trans(t => [{token: '\n'}])(seq('\\n')),
    trans(t => [{token: '\r'}])(seq('\\r')),
    trans(t => [{token: '\v'}])(seq('\\v')),
    trans(t => [{token: '\t'}])(seq('\\t')),
    trans(t => [{token: '\b'}])(seq('\\b')),
    trans(t => [{token: '\f'}])(seq('\\f')),
    trans(t => [{token: String.fromCodePoint(Number.parseInt(t[0].token, 16))}])(
        cat(erase(seq('\\u')),
                qty(4, 4)(first(classes.num, hexAlpha)),)),
    trans(t => [{token: String.fromCodePoint(Number.parseInt(t[0].token, 16))}])(
        cat(erase(seq('\\u{')),
                qty(1, 6)(first(classes.num, hexAlpha)),
                erase(seq('}')),)),
    trans(t => [{token: String.fromCodePoint(Number.parseInt(t[0].token, 16))}])(
        cat(erase(seq('\\x')),
                qty(2, 2)(first(classes.num, hexAlpha)),)),
    trans(t => [{token: String.fromCodePoint(Number.parseInt(t[0].token, 8))}])(
        cat(erase(seq('\\')),
                qty(3, 3)(octNum),)));

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


const listValue = combine(first(
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
            first(preread(seq(']')), err('Unexpected token has appeared.')),
        erase(seq(']'))
    )
));


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

const objectValue = combine(first(
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
            first(preread(seq('}')), err('Unexpected token has appeared.')),
        erase(seq('}')),
    )
));


const constExprRule1 = $o.trans(tokens => [tokens[1]])(
    $o.clsFn(t => t.token === '('),
    $o.clsFn(t => t.type === 'value'),
    $o.clsFn(t => t.token === ')'),
);

const constExprRule2 = $o.trans(tokens => [{token: '*', type: 'value', value: (tokens[0].value as number) * (tokens[2].value as number)}])(
    $o.clsFn(t => t.type === 'value'),
    $o.clsFn(t => t.token === '*'),
    $o.clsFn(t => t.type === 'value'),
);

const constExprRule3 = $o.trans(tokens => [{token: '+', type: 'value', value: (tokens[0].value as number) + (tokens[2].value as number)}])(
    $o.clsFn(t => t.type === 'value'),
    $o.clsFn(t => t.token === '+'),
    $o.clsFn(t => t.type === 'value'),
);


const constExpr = (edge: ParserFnWithCtx<string, Ctx, Ast>) => rules({
    rules: [
        constExprRule1,
        constExprRule2,
        constExprRule3,
    ],
    check: $o.combine($o.classes.any, $o.end()),
})(combine(
    qty(1)(first(
        erase(commentOrSpace),
        atomValue,
        trans(tokens => [{
            token: tokens[0].token, type: 'op', value: tokens[0].token}])(
            cls('*', '+', '(', ')'),))),
    preread(repeat(commentOrSpace), edge),
));


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
