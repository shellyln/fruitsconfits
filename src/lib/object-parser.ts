// Copyright (c) 2019 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { ParserFnWithCtx } from './types';
import { zeroWidth,
         zeroWidthError,
         beginning,
         end,
         quantify,
         first,
         or,
         transform,
         lookAhead,
         lookBehind,
         ApplyProductionRulesArg,
         applyProductionRules,
         makeProgram } from './parser';



export function objSequence<T extends ArrayLike<T[number]>, C, R>(
        helper: (token: T[number]) => R,
        comparator: (a: T[number], b: T[number]) => boolean,
        ): (needle: T) => ParserFnWithCtx<T, C, R> {

    return (needle => {
        return (input => {
            const len = Math.max(0, input.end - input.start);
            let matched = true;

            if (len >= needle.length) {
                for (let i = 0; i < needle.length; i++) {
                    if (! comparator(input.src[input.start + i], needle[i])) {
                        matched = false;
                        break;
                    }
                }
            } else {
                matched = false;
            }

            return (matched ? {
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
                message: `operator "objSequence(${needle})"`,
            });
        });
    });
}


export function objClass<T extends ArrayLike<T[number]>, C, R>(
        helper: (token: T[number]) => R,
        comparator: (a: T[number], b: T[number]) => boolean,
        ): (...needles: Array<T[number]>) => ParserFnWithCtx<T, C, R> {

    // NOTE: <T> version `needles` type is `T`.
    return ((...needles) => {
        return (input => {
            const len = Math.max(0, input.end - input.start);
            let index = -1;

            const succeeded = len > 0 ? needles.some((needle, idx) => {
                if (comparator(input.src[input.start], needle)) {
                    index = idx;
                    return true;
                }
            }) : false;

            return (succeeded ? {
                succeeded: true,
                next: {
                    src: input.src,
                    start: input.start + 1,
                    end: input.end,
                    context: input.context,
                },
                tokens: [helper(needles[index])],
            } : {
                succeeded: false,
                error: false,
                src: input.src,
                pos: input.start,
                message: `operator "objClass(${needles.join(',')})"`,
            });
        });
    });
}


export function objClassNot<T extends ArrayLike<T[number]>, C, R>(
    helper: (token: T[number]) => R,
    comparator: (a: T[number], b: T[number]) => boolean,
    ): (...needles: Array<T[number]>) => ParserFnWithCtx<T, C, R> {

    // NOTE: <T> version `needles` type is `T`.
    return ((...needles) => {
        return (input => {
            const len = Math.max(0, input.end - input.start);

            if (len > 0) {
                for (const needle of needles) {
                    let matched = true;

                    if (! comparator(input.src[input.start], needle)) {
                        matched = false;
                        break;
                    }

                    if (matched) {
                        return ({
                            succeeded: false,
                            error: false,
                            src: input.src,
                            pos: input.start,
                            message: `operator "objClassNot(${needles.join(',')})"`,
                        });
                    }
                }
            }

            return ({
                succeeded: true,
                next: {
                    src: input.src,
                    start: input.start + 1,
                    end: input.end,
                    context: input.context,
                },
                tokens: [helper(input.src[input.start])],
            });
        });
    });
}


export function objClassByNeedleFn<T extends ArrayLike<T[number]>, C, R>(
        helper: (token: T[number]) => R,
        comparator: (a: T[number], b: T[number]) => boolean,
        ): (needle: (src: T[number]) => boolean) => ParserFnWithCtx<T, C, R> {

    // NOTE: needles[i] should be one character. surrogate pair and/or ligature are accepted.
    // NOTE: <T> version `needles` type is `T`.
    return (needle => {
        return (input => {
            const len = Math.max(0, input.end - input.start);
            const matched = len > 0 ? needle(input.src[input.start]) : false;

            return (matched ? {
                succeeded: true,
                next: {
                    src: input.src,
                    start: input.start + 1,
                    end: input.end,
                    context: input.context,
                },
                tokens: [helper(input.src[input.start])],
            } : {
                succeeded: false,
                error: false,
                src: input.src,
                pos: input.start,
                message: `operator "objClassByNeedleFn"`,
            });
        });
    });
}


export function getObjectParsers<T extends ArrayLike<T[number]>, C, R>(
        params: {
            rawToToken: (rawToken: T[number]) => R,
            concatTokens: (tokens: R[]) => R[],
            comparator: (a: T[number], b: T[number]) => boolean,
        }) {

    const clsFn = objClassByNeedleFn<T, C, R>(params.rawToToken, params.comparator);

    const isAny = clsFn(src => true);

    // TODO: reduce unneccessary call for adding types.
    return ({
        seq: objSequence<T, C, R>(params.rawToToken, params.comparator),
        cls: objClass<T, C, R>(params.rawToToken, params.comparator),
        notCls: objClassNot<T, C, R>(params.rawToToken, params.comparator),
        clsFn,
        classes: {
            any: isAny,
        },
        cat: transform<T, C, R>(params.concatTokens),
        once: quantify<T, C, R>(1, 1),
        repeat: quantify<T, C, R>(),
        qty: (min?: number, max?: number) => quantify<T, C, R>(min, max), // TODO:
        zeroWidth: (helper?: () => R) => zeroWidth<T, C, R>(helper),      // TODO:
        err: (message: string) => zeroWidthError<T, C, R>(message),       // TODO:
        beginning: (helper?: () => R) => beginning<T, C, R>(helper),      // TODO:
        end: (helper?: () => R) => end<T, C, R>(helper),                  // TODO:
        first: (...parsers: Array<ParserFnWithCtx<T, C, R>>) => first<T, C, R>(...parsers), // TODO:
        or: (...parsers: Array<ParserFnWithCtx<T, C, R>>) => or<T, C, R>(...parsers),       // TODO:
        combine: transform<T, C, R>(),
        erase: transform<T, C, R>(tokens => []),
        trans: (fn: (tokens: R[]) => R[]) => transform<T, C, R>(fn),                            // TODO:
        ahead: (...parsers: Array<ParserFnWithCtx<T, C, R>>) => lookAhead<T, C, R>(...parsers), // TODO:
        behind: (n: number, helper?: () => R) => lookBehind<T, C, R>(n, helper),
        rules: (args: ApplyProductionRulesArg<T, C, R>) => applyProductionRules<T, C, R>(args), // TODO:
        makeProgram,
    });
}
