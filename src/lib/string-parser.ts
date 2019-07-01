// Copyright (c) 2019 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { StringParserFnWithCtx } from './types';
import { makeMessage,
         zeroWidth,
         zeroWidthError,
         beginning,
         end,
         quantify,
         first,
         or,
         transform,
         preread } from './parser';



export function charSequence<C, R>(
        helper: (token: string) => R
        ): (needle: string) => StringParserFnWithCtx<C, R> {

    return (needle => {
        return (input => {
            const src = input.src.slice(input.start, input.end);
            return (src.startsWith(needle) ? {
                succeeded: true,
                next: {
                    src: input.src,
                    start: input.start + needle.length,
                    end: input.end,
                    context: input.context,
                },
                tokens: [helper(needle)],
            } : {
                succeeded: false,
                error: false,
                src: input.src,
                pos: input.start,
                message: makeMessage(input, `operator "charSequence(${needle})"`),
            });
        });
    });
}
// TODO: <T> version


export function charClass<C, R>(
        helper: (token: string) => R
        ): (...needles: string[]) => StringParserFnWithCtx<C, R> {

    // NOTE: needles[i] should be one character. surrogate pair and/or ligature are accepted.
    // NOTE: <T> version `needles` type is `T`.
    return ((...needles) => {
        return (input => {
            const src = input.src.slice(input.start, input.end);
            let index = -1;

            const succeeded = needles.some((needle, idx) => {
                const matched = src.startsWith(needle);
                if (matched) {
                    index = idx;
                    return true;
                }
            });

            return (succeeded ? {
                succeeded: true,
                next: {
                    src: input.src,
                    start: input.start + needles[index].length,
                    end: input.end,
                    context: input.context,
                },
                tokens: [helper(needles[index])],
            } : {
                succeeded: false,
                error: false,
                src: input.src,
                pos: input.start,
                message: makeMessage(input, `operator "charClass(${needles.join(',')})"`),
            });
        });
    });
}
// TODO: <T> version


export function charClassNot<C, R>(
    helper: (token: string) => R
    ): (...needles: string[]) => StringParserFnWithCtx<C, R> {

    // NOTE: needles[i] should be one character. surrogate pair and/or ligature are accepted.
    // NOTE: <T> version `needles` type is `T`.
    return ((...needles) => {
        return (input => {
            const src = input.src.slice(input.start, input.end);

            for (const needle of needles) {
                const matched = src.startsWith(needle);
                if (matched) {
                    return ({
                        succeeded: false,
                        error: false,
                        src: input.src,
                        pos: input.start,
                        message: makeMessage(input, `operator "charClassNot(${needles.join(',')})"`),
                    });
                }
            }
            const p = input.src.codePointAt(input.start);
            if (p === void 0) {
                return ({
                    succeeded: false,
                    error: false,
                    src: input.src,
                    pos: input.start,
                    message: makeMessage(input, `operator "charClassNot(${needles.join(',')})"`),
                });
            }
            const c = String.fromCodePoint(p);

            return ({
                succeeded: true,
                next: {
                    src: input.src,
                    start: input.start + c.length,
                    end: input.end,
                    context: input.context,
                },
                tokens: [helper(c)],
            });
        });
    });
}
// TODO: <T> version


export function charClassByNeedleFn<C, R>(
        helper: (token: string) => R
        ): (needle: (src: string) => number) => StringParserFnWithCtx<C, R> {

    // NOTE: needles[i] should be one character. surrogate pair and/or ligature are accepted.
    // NOTE: <T> version `needles` type is `T`.
    return (needle => {
        return (input => {
            const src = input.src.slice(input.start, input.end);
            const len = needle(src);

            return (len >= 0 ? {
                succeeded: true,
                next: {
                    src: input.src,
                    start: input.start + len,
                    end: input.end,
                    context: input.context,
                },
                tokens: [helper(src.substring(0, len))],
            } : {
                succeeded: false,
                error: false,
                src: input.src,
                pos: input.start,
                message: makeMessage(input, `operator "charClassByNeedleFn"`),
            });
        });
    });
}
// TODO: <T> version


export function getStringParsers<C, R>(
        params: {
            rawToToken: (rawToken: string) => R,
            concatTokens: (tokens: R[]) => R[],
        }) {

    const cls = charClass<C, R>(params.rawToToken);
    const clsFn = charClassByNeedleFn<C, R>(params.rawToToken);

    const isAlpha = clsFn(src => {
        const p = src.codePointAt(0);
        if (p === void 0) {
            return -1;
        }
        const c = String.fromCodePoint(p);
        return ((
            ('A' <= c && c <= 'Z') ||
            ('a' <= c && c <= 'z')) ? c.length : -1);
    });

    const isUpper = clsFn(src => {
        const p = src.codePointAt(0);
        if (p === void 0) {
            return -1;
        }
        const c = String.fromCodePoint(p);
        return (
            ('A' <= c && c <= 'Z') ? c.length : -1);
    });

    const isLower = clsFn(src => {
        const p = src.codePointAt(0);
        if (p === void 0) {
            return -1;
        }
        const c = String.fromCodePoint(p);
        return (
            ('a' <= c && c <= 'z') ? c.length : -1);
    });

    const isNumber = clsFn(src => {
        const p = src.codePointAt(0);
        if (p === void 0) {
            return -1;
        }
        const c = String.fromCodePoint(p);
        return (
            ('0' <= c && c <= '9') ? c.length : -1);
    });

    const isNonZeroNumber = clsFn(src => {
        const p = src.codePointAt(0);
        if (p === void 0) {
            return -1;
        }
        const c = String.fromCodePoint(p);
        return (
            ('1' <= c && c <= '9') ? c.length : -1);
    });

    const isAlNum = clsFn(src => {
        const p = src.codePointAt(0);
        if (p === void 0) {
            return -1;
        }
        const c = String.fromCodePoint(p);
        return ((
            ('A' <= c && c <= 'Z') ||
            ('a' <= c && c <= 'z') ||
            ('0' <= c && c <= '9')) ? c.length : -1);
    });

    const isSpace = clsFn(src => {
        const p = src.codePointAt(0);
        if (p === void 0) {
            return -1;
        }
        const c = String.fromCodePoint(p);
        return ((' \f\n\r\t\v​\u00a0\u1680​\u180e' +
            '\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a' +
            '​\u2028\u2029\u202f\u205f​\u3000\ufeff').includes(c) ? c.length : -1);
    });

    const isControl = clsFn(src => {
        const p = src.codePointAt(0);
        if (p === void 0) {
            return -1;
        }
        const c = String.fromCodePoint(p);
        return ((
            (0x0000 <= p && p <= 0x001f) ||
            (0x007f <= p && p <= 0x009f)) ? c.length : -1);
    });

    const isWord = clsFn(src => {
        const p = src.codePointAt(0);
        if (p === void 0) {
            return -1;
        }
        const c = String.fromCodePoint(p);
        return (
            ((' \f\n\r\t\v​\u00a0\u1680​\u180e' +
              '\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a' +
              '​\u2028\u2029\u202f\u205f​\u3000\ufeff').includes(c)) ||
            ((0x0000 <= p && p <= 0x001f) ||
             (0x007f <= p && p <= 0x009f)) ?
            -1 : c.length);
    });

    const isNewline = cls('\r\n', '\n', '\r');

    const isAny = clsFn(src => {
        const p = src.codePointAt(0);
        if (p === void 0) {
            return -1;
        }
        const c = String.fromCodePoint(p);
        return c.length;
    });

    return ({
        seq: charSequence<C, R>(params.rawToToken),
        cls,
        notCls: charClassNot<C, R>(params.rawToToken),
        clsFn,
        classes: {
            alpha: isAlpha,
            upper: isUpper,
            lower: isLower,
            num: isNumber,
            nonzero: isNonZeroNumber,
            alnum: isAlNum,
            space: isSpace,
            ctrl: isControl,
            newline: isNewline,
            word: isWord,
            any: isAny,
        },
        cat: transform<string, C, R>(params.concatTokens),
        once: quantify<string, C, R>(1, 1),
        repeat: quantify<string, C, R>(),
        qty: (min?: number, max?: number) => quantify<string, C, R>(min, max),
        zeroWidth,
        err: zeroWidthError,
        beginning,
        end,
        first,
        or,
        combine: transform<string, C, R>(),
        erase: transform<string, C, R>(tokens => []),
        trans: (fn: (tokens: R[]) => R[]) => transform<string, C, R>(fn),
        preread,
    });
}
