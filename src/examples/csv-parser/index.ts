// Copyright (c) 2019 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { parserInput }  from '../../lib/types';
import { getStringParsers } from '../../lib/string-parser';



type Ctx = undefined;
type Ast = string | Array<any>;


const {seq, cls, notCls, clsFn, classes, numbers, cat,
        once, repeat, qty, zeroWidth, err, beginning, end,
        first, or, combine, erase, trans, preread, rules} = getStringParsers<Ctx, Ast>({
    rawToToken: rawToken => rawToken,
    concatTokens: tokens => (tokens.length ?
        [tokens.reduce((a, b) => a as any + b as any)] : []),
});


const quoted = trans(input => input.length ? input : [''])(
    erase(repeat(erase(classes.spaceWithinSingleLine)), cls('"')),
    cat(repeat(first(
        trans(input => ['"'])(seq('""')),
        notCls('"'),
    ))),
    erase(cls('"'), repeat(erase(classes.spaceWithinSingleLine))),);

const nakid = trans(input => input.length ? input : [''])(
    erase(repeat(erase(classes.spaceWithinSingleLine))),
    cat(repeat(first(
        erase(classes.spaceWithinSingleLine, preread(cls(',', '\r\n', '\n', '\r'))),
        notCls(',', '\r\n', '\n', '\r'),
    ))),
    erase(repeat(erase(classes.spaceWithinSingleLine))),);

const cell = first(quoted, nakid);

const row = trans(input => [input])(
    cell,
    repeat(combine(erase(seq(',')), cell)),);

const rows = combine(
    row,
    repeat(combine(erase(classes.newline), row)),
    end(),);


export function parse(s: string) {
    const z = rows(parserInput(s));
    if (! z.succeeded) {
        throw new Error(z.message);
    }
    return z.tokens;
}
