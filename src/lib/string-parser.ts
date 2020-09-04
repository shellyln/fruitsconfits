// Copyright (c) 2019 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { StringParserFnWithCtx } from './types';
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
                    templateArgs: input.templateArgs,
                    templateArgsPos: input.templateArgsPos,
                },
                tokens: [helper(needle)],
            } : {
                succeeded: false,
                error: false,
                src: input.src,
                pos: input.start,
                message: `operator "charSequence(${needle})"`,
            });
        });
    });
}


export function charClass<C, R>(
        helper: (token: string) => R
        ): (...needles: string[]) => StringParserFnWithCtx<C, R> {

    // NOTE: needles[i] should be one character. surrogate pair and/or ligature are accepted.
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
                    templateArgs: input.templateArgs,
                    templateArgsPos: input.templateArgsPos,
                },
                tokens: [helper(needles[index])],
            } : {
                succeeded: false,
                error: false,
                src: input.src,
                pos: input.start,
                message: `operator "charClass(${needles.join(',')})"`,
            });
        });
    });
}


export function charClassNot<C, R>(
    helper: (token: string) => R
    ): (...needles: string[]) => StringParserFnWithCtx<C, R> {

    // NOTE: needles[i] should be one character. surrogate pair and/or ligature are accepted.
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
                        message: `operator "charClassNot(${needles.join(',')})"`,
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
                    message: `operator "charClassNot(${needles.join(',')})"`,
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
                    templateArgs: input.templateArgs,
                    templateArgsPos: input.templateArgsPos,
                },
                tokens: [helper(c)],
            });
        });
    });
}


export function charClassByNeedleFn<C, R>(
        helper: (token: string) => R
        ): (needle: (src: string) => number) => StringParserFnWithCtx<C, R> {

    // NOTE: needles[i] should be one character. surrogate pair and/or ligature are accepted.
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
                    templateArgs: input.templateArgs,
                    templateArgsPos: input.templateArgsPos,
                },
                tokens: [helper(src.substring(0, len))],
            } : {
                succeeded: false,
                error: false,
                src: input.src,
                pos: input.start,
                message: `operator "charClassByNeedleFn"`,
            });
        });
    });
}


export function templateStringsParam<C, R>(
        criteria: (o: any) => boolean, conv?: (o: any) => any): StringParserFnWithCtx<C, R> {

    return (input => {
        const src = input.src.slice(input.start, input.start + 1);
        if (src === '\x00') {
            if (input.templateArgsPos) {
                let argIdx = -1;
                const strIdx = input.templateArgsPos.findIndex((v, i) => {
                    argIdx = i;
                    return v === input.start;
                });
                if (0 <= strIdx) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-non-null-assertion
                    const o = input.templateArgs![argIdx];
                    if (criteria(o)) {
                        return ({
                            succeeded: true,
                            next: {
                                src: input.src,
                                start: input.start + 1,
                                end: input.end,
                                context: input.context,
                                templateArgs: input.templateArgs,
                                templateArgsPos: input.templateArgsPos,
                            },
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            tokens: [(conv ? conv(o) : o)],
                        });
                    }
                }
            }
        }
        return ({
            succeeded: false,
            error: false,
            src: input.src,
            pos: input.start,
            message: `operator "stringTemplatesParam()"`,
        });
    });
}


// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getStringParsers<C, R>(
        params: {
            rawToToken: (rawToken: string) => R,
            concatTokens: (tokens: R[]) => R[],
        }) {

    const seq = charSequence<C, R>(params.rawToToken);
    const cls = charClass<C, R>(params.rawToToken);
    const notCls = charClassNot<C, R>(params.rawToToken);
    const clsFn = charClassByNeedleFn<C, R>(params.rawToToken);
    const cat = transform<string, C, R>(params.concatTokens);
    const once = quantify<string, C, R>(1, 1);
    const repeat = quantify<string, C, R>();
    // TODO: reduce unneccessary call for adding types.
    const qty = (min?: number, max?: number) => quantify<string, C, R>(min, max);
    const combine = transform<string, C, R>();
    const erase = transform<string, C, R>(tokens => []);

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

    const isBinNum = clsFn(src => {
        const p = src.codePointAt(0);
        if (p === void 0) {
            return -1;
        }
        const c = String.fromCodePoint(p);
        return (
            ('0' <= c && c <= '1') ? c.length : -1);
    });

    const isOctNum = clsFn(src => {
        const p = src.codePointAt(0);
        if (p === void 0) {
            return -1;
        }
        const c = String.fromCodePoint(p);
        return (
            ('0' <= c && c <= '7') ? c.length : -1);
    });

    const isHexNum = clsFn(src => {
        const p = src.codePointAt(0);
        if (p === void 0) {
            return -1;
        }
        const c = String.fromCodePoint(p);
        return ((
            ('A' <= c && c <= 'F') ||
            ('a' <= c && c <= 'f') ||
            ('0' <= c && c <= '9')) ? c.length : -1);
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

    const isSpaceWithinSingleLine = clsFn(src => {
        const p = src.codePointAt(0);
        if (p === void 0) {
            return -1;
        }
        const c = String.fromCodePoint(p);
        return ((' \f\t\v​\u00a0\u1680​\u180e' +
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


    const binSep =
        first(isBinNum, cls('_'));
    const octSep =
        first(isOctNum, cls('_'));
    const hexSep =
        first(isHexNum, cls('_'));

    const binaryIntegerNumber = (...prefixes: Array<StringParserFnWithCtx<C, R>>) =>
        combine(erase(first(...prefixes)),
            cat(once(isBinNum), repeat(binSep)), );
    const octalIntegerNumber = (...prefixes: Array<StringParserFnWithCtx<C, R>>) =>
        combine(erase(first(...prefixes)),
            cat(once(isOctNum), repeat(octSep)), );
    const hexIntegerValue = (...prefixes: Array<StringParserFnWithCtx<C, R>>) =>
        combine(erase(first(...prefixes)),
            cat(once(isHexNum), repeat(hexSep)), );
    const decimalIntegerNumber =
        combine(cat(qty(0, 1)(cls('+', '-')),
            first(combine(once(isNonZeroNumber), repeat(first(isNumber, cls('_')))),
                seq('0'), )));
    const bigDecimalIntegerNumber =
        combine(cat(decimalIntegerNumber,
            erase(seq('n')), ));
    const floatingPointNumber =
        combine(cat(qty(0, 1)(cls('+', '-')),
            first(combine(once(isNonZeroNumber), repeat(first(isNumber, cls('_')))),
                seq('0'), ),
            qty(0, 1)(combine(seq('.'),
                qty(1)(first(isNumber, cls('_'))), )),
            qty(0, 1)(combine(cls('E', 'e'), qty(0, 1)(cls('+', '-')),
                first(combine(once(isNonZeroNumber), repeat(isNumber)), seq('0')), ))));

    // TODO: reduce unneccessary call for adding types.
    return ({
        seq,
        cls,
        notCls,
        clsFn,
        classes: {
            alpha: isAlpha,
            upper: isUpper,
            lower: isLower,
            num: isNumber,
            nonzero: isNonZeroNumber,
            bin: isBinNum,
            oct: isOctNum,
            hex: isHexNum,
            alnum: isAlNum,
            space: isSpace,
            spaceWithinSingleLine: isSpaceWithinSingleLine,
            ctrl: isControl,
            newline: isNewline,
            word: isWord,
            any: isAny,
        },
        numbers: {
            bin: binaryIntegerNumber,
            oct: octalIntegerNumber,
            hex: hexIntegerValue,
            int: decimalIntegerNumber,
            bigint: bigDecimalIntegerNumber,
            float: floatingPointNumber,
        },
        isParam: templateStringsParam,
        cat,
        once,
        repeat,
        qty,
        zeroWidth: (helper?: () => R) => zeroWidth<string, C, R>(helper), // TODO:
        err: (message: string) => zeroWidthError<string, C, R>(message),  // TODO:
        beginning: (helper?: () => R) => beginning<string, C, R>(helper), // TODO:
        end: (helper?: () => R) => end<string, C, R>(helper),             // TODO:
        first: (...parsers: Array<StringParserFnWithCtx<C, R>>) => first<string, C, R>(...parsers), // TODO:
        or: (...parsers: Array<StringParserFnWithCtx<C, R>>) => or<string, C, R>(...parsers),       // TODO:
        combine,
        erase,
        trans: (fn: (tokens: R[]) => R[]) => transform<string, C, R>(fn),                                 // TODO:
        ahead: (...parsers: Array<StringParserFnWithCtx<C, R>>) => lookAhead<string, C, R>(...parsers),   // TODO:
        behind: (n: number, helper?: () => R) => lookBehind<string, C, R>(n, helper),
        rules: (args: ApplyProductionRulesArg<string, C, R>) => applyProductionRules<string, C, R>(args), // TODO:
        makeProgram,
    });
}
