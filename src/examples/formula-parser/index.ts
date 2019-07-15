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

type AstChild = liyad.SxTokenChild | SxOp | undefined;

type Ctx = undefined;
type Ast = liyad.SxToken | AstChild | SxOp | undefined;

const $s = getStringParsers<Ctx, Ast>({
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

const {seq, cls, notCls, clsFn, classes, numbers, cat,
        once, repeat, qty, zeroWidth, err, beginning, end,
        first, or, combine, erase, trans, ahead, rules} = $s;


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
    trans(tokens => [true])
    (seq('true'));

const falseValue =
    trans(tokens => [false])
    (seq('false'));

const nullValue =
    trans(tokens => [null])
    (seq('null'));

const undefinedValue =
    trans(tokens => [void 0])
    (seq('undefined'));

const positiveInfinityValue =
    trans(tokens => [Number.POSITIVE_INFINITY])
    (qty(0, 1)(seq('+')), seq('Infinity'));

const negativeInfinityValue =
    trans(tokens => [Number.NEGATIVE_INFINITY])
    (seq('-Infinity'));

const nanValue =
    trans(tokens => [Number.NaN])
    (seq('NaN'));


const binaryIntegerValue =
    trans(tokens => [Number.parseInt((tokens as string[])[0].replace(/_/g, ''), 2)])
    (numbers.bin(seq('0b')));

const octalIntegerValue =
    trans(tokens => [Number.parseInt((tokens as string[])[0].replace(/_/g, ''), 8)])
    (numbers.oct(seq('0o'), seq('0')));

const hexIntegerValue =
    trans(tokens => [Number.parseInt((tokens as string[])[0].replace(/_/g, ''), 16)])
    (numbers.hex(seq('0x'), seq('0X')));

const decimalIntegerValue =
    trans(tokens => [Number.parseInt((tokens as string[])[0].replace(/_/g, ''), 10)])
    (numbers.int);

const floatingPointNumberValue =
    trans(tokens => [Number.parseFloat((tokens as string[])[0].replace(/_/g, ''))])
    (numbers.float);

const numberValue =
    first(octalIntegerValue,
          hexIntegerValue,
          binaryIntegerValue,
          floatingPointNumberValue,
          decimalIntegerValue,
          positiveInfinityValue,
          negativeInfinityValue,
          nanValue);


const stringEscapeSeq = first(
    trans(t => ['\''])(seq('\\\'')),
    trans(t => ['\"'])(seq('\\"')),
    trans(t => ['\`'])(seq('\\`')),
    trans(t => ['\\'])(seq('\\\\')),
    trans(t => [''])(seq('\\\r\n')),
    trans(t => [''])(seq('\\\r')),
    trans(t => [''])(seq('\\\n')),
    trans(t => ['\n'])(seq('\\n')),
    trans(t => ['\r'])(seq('\\r')),
    trans(t => ['\v'])(seq('\\v')),
    trans(t => ['\t'])(seq('\\t')),
    trans(t => ['\b'])(seq('\\b')),
    trans(t => ['\f'])(seq('\\f')),
    trans(t => [String.fromCodePoint(Number.parseInt((t as string[])[0], 16))])(
        cat(erase(seq('\\u')),
                qty(4, 4)(classes.hex),)),
    trans(t => [String.fromCodePoint(Number.parseInt((t as string[])[0], 16))])(
        cat(erase(seq('\\u{')),
                qty(1, 6)(classes.hex),
                erase(seq('}')),)),
    trans(t => [String.fromCodePoint(Number.parseInt((t as string[])[0], 16))])(
        cat(erase(seq('\\x')),
                qty(2, 2)(classes.hex),)),
    trans(t => [String.fromCodePoint(Number.parseInt((t as string[])[0], 8))])(
        cat(erase(seq('\\')),
                qty(3, 3)(classes.oct),)));

const signleQuotStringValue =
    trans(tokens => [tokens[0]])(
        erase(seq("'")),
            cat(repeat(first(
                stringEscapeSeq,
                combine(cls('\r', '\n'), err('Line breaks within strings are not allowed.')),
                notCls("'"),
            ))),
        erase(seq("'")),);

const doubleQuotStringValue =
    trans(tokens => [tokens[0]])(
        erase(seq('"')),
            cat(repeat(first(
                stringEscapeSeq,
                combine(cls('\r', '\n'), err('Line breaks within strings are not allowed.')),
                notCls('"'),
            ))),
        erase(seq('"')),);

const backQuotStringValue =
    trans(tokens => [tokens[0]])(
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
    trans(tokens => [{symbol: (tokens as string[])[0]}])
    (cat(combine(classes.alpha, repeat(classes.alnum))));

const objKey =
    first(stringValue, symbolName);


const listValue = first(
    trans(tokens => [[]])(erase(
        seq('['),
            repeat(commentOrSpace),
        seq(']'),
    )),
    trans(tokens => {
        const ast: Ast = [{symbol: '$list'}];
        for (const token of tokens) {
            ast.push(token as any);
        }
        return [ast];
    })(
        erase(seq('[')),
            once(combine(
                erase(repeat(commentOrSpace)),
                first(input => listValue(input),   // NOTE: recursive definitions
                      input => objectValue(input), //       should place as lambda.
                      input => expr(first(seq(','), seq(']')), false)(input),),
                erase(repeat(commentOrSpace)),)),
            repeat(combine(
                erase(repeat(commentOrSpace),
                      seq(','),
                      repeat(commentOrSpace)),
                first(input => listValue(input),   // NOTE: recursive definitions
                      input => objectValue(input), //       should place as lambda.
                      input => expr(first(seq(','), seq(']')), false)(input),),
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
              input => expr(first(seq(','), seq('}')), false)(input),
              err('object value is needed.')),
    );

const objectValue = first(
    trans(tokens => [{token: '{}', type: 'object', value: {}}])(erase(
        seq('{'),
            repeat(commentOrSpace),
        seq('}'),
    )),
    trans(tokens => {
        const ast: Ast = [{symbol: '#'}];
        for (let i = 0; i < tokens.length; i += 2) {
            if (tokens[i] === '__proto__') {
                continue; // NOTE: prevent prototype pollution attacks
            }
            ast.push([tokens[i], tokens[i + 1]]);
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
    case 'number': case 'boolean': case 'string': case 'undefined': case 'bigint': case 'function':
        return true;
    case 'symbol':
        return false;
    }
    if (v === null) {
        return true;
    }
    if (Object.prototype.hasOwnProperty.call(v, '#')) {
        return true;
    }
    if (Array.isArray(v)) {
        return true;
    }
    return false;
};


const exprOpsTokens = ['**', '*', '/', '%', '+', '-', '?', ':'];
const edgeOpsTokens = exprOpsTokens.concat(',', '(');
const exprOps = cls(...exprOpsTokens);

const transformOp = (op: ParserFnWithCtx<string, Ctx, Ast>) =>
    trans(tokens => [{op: tokens[0] as string}])(op);

const beginningOrEdgeOp =
    $o.first($o.beginning(() => ({op: '$noop'})),
             $o.behind(1, () => ({op: '$noop'}))(
                 $o.clsFn(t => t && edgeOpsTokens.includes((t as any).op) ? true : false)),);


// production rule:
//   beginning S -> beginning "(" E ")"
//   op        S -> op        "(" E ")"
const exprRule20 = $o.trans(tokens => {
    return [tokens[2]];
})(
    beginningOrEdgeOp,
    $o.clsFn(t => isOperator(t, '(')),
    $o.clsFn(t => isValue(t)),
    $o.clsFn(t => isOperator(t, ')')),
);

// production rule:
//   S -> S<<symbol>> "(" S ")"
//   S -> S<<value>>  "(" S ")"
//   S -> S<<symbol>> "(" ")"
//   S -> S<<value>>  "(" ")"
const exprRule18 = $o.trans(tokens => {
    if (Array.isArray(tokens[1]) && liyad.isSymbol((tokens[1] as Ast[])[0], '$last')) {
        return [[tokens[0], ...(tokens[1] as Ast[]).slice(1)]];
    } else {
        return [[tokens[0], ...(tokens.length > 1 ? [tokens[1]] : [])]];
    }
})(
    $o.first($o.clsFn(t => liyad.isSymbol(t) ? true : false),
             $o.clsFn(t => isValue(t)),),
    $o.erase($o.clsFn(t => isOperator(t, '('))),
    $o.qty(0, 1)($o.first($o.clsFn(t => Array.isArray(t) && liyad.isSymbol(t[0], '$last') ? true : false),
                          $o.clsFn(t => isValue(t)),)),
    $o.erase($o.clsFn(t => isOperator(t, ')'))),
);

// production rule:
//   beginning S -> beginning "+" S
//   op        S -> op        "+" S
//   beginning S -> beginning "-" S
//   op        S -> op        "-" S
const exprRule16 = $o.trans(tokens => {
    return ([unaryOp((tokens[1] as SxOp).op, tokens[2])]);
})(
    beginningOrEdgeOp,
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
//   beginning S -> beginning S "?" S ":" S
//   ","       S -> ","       S "?" S ":" S
const exprRule4 = $o.trans(tokens => {
    return [ternaryOp('$if', tokens[1], tokens[3], tokens[5])];
})(
    $o.first($o.beginning(() => ({op: '$noop'})),
             $o.behind(1, () => ({op: '$noop'}))($o.clsFn(t => isOperator(t, ','))),),
    $o.clsFn(t => isValue(t)),
    $o.clsFn(t => isOperator(t, '?')),
    $o.clsFn(t => isValue(t)),
    $o.clsFn(t => isOperator(t, ':')),
    $o.clsFn(t => isValue(t)),
);

// production rule:
//   beginning S -> beginning S "," S
//   "("       S -> "("       S "," S
const exprRule1 = $o.trans(tokens => {
    return [binaryOp((tokens[2] as SxOp).op, tokens[1], tokens[3])];
})(
    $o.first($o.beginning(() => ({op: '$noop'})),
             $o.behind(1, () => ({op: '$noop'}))($o.clsFn(t => isOperator(t, '('))),),
    $o.clsFn(t => isValue(t)),
    $o.clsFn(t => isOperator(t, ',')),
    $o.clsFn(t => isValue(t)),
);


const exprNested =
    (input: ParserInputWithCtx<string, Ctx>) => exprInner(cls(')'), true)(input);

const exprInner: (edge: ParserFnWithCtx<string, undefined, Ast>, nested: boolean) =>
        ParserFnWithCtx<string, undefined, Ast> = (edge, nested) => combine(
    qty(1)(first(
        erase(commentOrSpace),
        transformOp(combine(cls('+', '-'), ahead(classes.num))),
        listValue,
        objectValue,
        // lambdaFnValue
        atomValue,
        symbolName,
        transformOp(nested ? first(exprOps, cls(',')) : exprOps),
        combine(
            transformOp(cls('(')),
            qty(0, 1)(exprNested),
            transformOp(cls(')')),
        ),
    )),
    ahead(repeat(commentOrSpace), edge),
);

const expr = (edge: ParserFnWithCtx<string, Ctx, Ast>, nested: boolean) => rules({
    rules: [
        exprRule20,
        exprRule18,
        { parser: exprRule16, rtol: true },
        exprRule15,
        exprRule14,
        exprRule13,
        { parser: exprRule4, rtol: true },
        exprRule1,
    ],
    check: $o.combine($o.classes.any, $o.end()),
})(exprInner(edge, nested));


const exprStatement =
    expr(end(), true);

const letStatement =
    combine();

const singleStatement =
    first(exprStatement);

const singleStatementSC =
    combine(singleStatement, first(ahead(end()), ahead(cls('{')), erase(seq(';'))));

const blockStatement =
    combine(
        erase(seq('{')),
        (input) => statements(input),
        erase(seq('}')),
    );

const statements =
    qty(1)(first(
        blockStatement,
        singleStatementSC,
    ));


const program = trans(tokens => tokens)(
    erase(repeat(commentOrSpace)),
    expr(end(), true),
    erase(repeat(commentOrSpace)),
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
    liyad.lisp.setGlobals({
        max: Math.max,
        twice: (x: number) => x * 2,
        one: () => 1,
    });
    return liyad.lisp.evaluateAST([z] as any);
}
