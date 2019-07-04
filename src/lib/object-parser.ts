// Copyright (c) 2019 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { makeMessage,
         zeroWidth,
         zeroWidthError,
         beginning,
         end,
         quantify,
         first,
         or,
         transform,
         preread,
         applyGenerationRules } from './parser';



export function getObjectParsers<T extends ArrayLike<T[number]>, C, R>(
        params: {
            rawToToken: (rawToken: T[number]) => R,
            concatTokens: (tokens: R[]) => R[],
            comparator: (a: T[number], b: T[number]) => boolean,
        }) {

    return ({
        cat: transform<T, C, R>(params.concatTokens),
        once: quantify<T, C, R>(1, 1),
        repeat: quantify<T, C, R>(),
        qty: (min?: number, max?: number) => quantify<T, C, R>(min, max),
        zeroWidth,
        err: zeroWidthError,
        beginning,
        end,
        first,
        or,
        combine: transform<T, C, R>(),
        erase: transform<T, C, R>(tokens => []),
        trans: (fn: (tokens: R[]) => R[]) => transform<T, C, R>(fn),
        preread,
        rules: applyGenerationRules,
    });
}
