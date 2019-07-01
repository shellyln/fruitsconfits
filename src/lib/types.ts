// Copyright (c) 2019 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


export interface ParserInputWithCtx<T extends ArrayLike<T[number]>, C> {
    src: T;
    start: number;
    end: number;
    context: C;
}
export type ParserInput<T extends ArrayLike<T[number]>> = ParserInputWithCtx<T, undefined>;
export type StringParserInputWithCtx<C> = ParserInputWithCtx<string, C>;
export type StringParserInput = StringParserInputWithCtx<undefined>;

export class ParseError extends Error {}


export function parserInput<T extends ArrayLike<T[number]>>(src: T): ParserInputWithCtx<T, undefined>;
export function parserInput<T extends ArrayLike<T[number]>, C>(src: T, context: C): ParserInputWithCtx<T, C>;
export function parserInput<T extends ArrayLike<T[number]>, C>(src: T, context?: C): ParserInputWithCtx<T, C> {
    return ({
        src,
        start: 0,
        end: src.length,
        context: context as any,
    });
}


export type ParserFnSucceededResult<T extends ArrayLike<T[number]>, C, R> =
    {succeeded: true, next: ParserInputWithCtx<T, C>, tokens: R[]};
export type ParserFnFailedResult<T extends ArrayLike<T[number]>, C, R> =
    {succeeded: false, error: boolean, src: T, pos: number, message: string};
export type ParserFnWithCtx<T extends ArrayLike<T[number]>, C, R> =
    (input: ParserInputWithCtx<T, C>) =>
        ParserFnSucceededResult<T, C, R> |
        ParserFnFailedResult<T, C, R>;
export type ParserFn<T extends ArrayLike<T[number]>, R> = ParserFnWithCtx<T, undefined, R>
export type StringParserFnWithCtx<C, R> = ParserFnWithCtx<string, C, R>;
export type StringParserFn<R> = StringParserFnWithCtx<undefined, R>;
