// Copyright (c) 2019 Shellyl_N and Authors
// license: ISC
// https://github.com/shellyln


import { ParserInputWithCtx,
         ParseError,
         parserInput,
         ParserFnFailedResult,
         ParserFnWithCtx } from './types';



function getLineAndCol(src: string, pos: number) {
    let line = 1;
    let col = 1;

    for (let i = 0; i <= pos; i++) {
        switch (src[i]) {
        case '\r':
            if (src[i + 1] === '\n') {
                i++;
            }
            // FALL_TURU
        case '\n':
            line++;
            col = 1;
            break;
        default:
            col++;
            break;
        }
    }

    return ({
        line,
        col,
    });
}


export function formatErrorMessage<T extends ArrayLike<T[number]>, C, R>(
    result: ParserFnFailedResult<T, C, R>) {

    let msg = '';
    let src = '';
    if (typeof result.src === 'string') {
        src = result.src.slice(Math.max(result.pos - 5, 0), result.pos + 55);

        let ar = src.split(/\r\n|\n|\r/);
        ar = ar.slice(0, 1)
            .concat('          ^~~~~~~~')
            .concat(...ar.slice(1));
        src = ar.join('\n') + '\n\n';

        const lineAndCol = getLineAndCol(result.src, result.pos);
        msg =  (`parse failed at position:${
            result.pos} line:${lineAndCol.line} col:${lineAndCol.col} ${
            result.message ? ` ${result.message}` : ''}\n     ${src}`);
    } else {
        src = '     (object)\n          ^~~~~~~~';
        try {
            src = '     ' +
                JSON.stringify((result.src as any).slice(Math.max(result.pos - 10, 0), result.pos)) + '\n          ' +
                JSON.stringify((result.src as any).slice(result.pos, result.pos + 1)) + '\n          ' +
                JSON.stringify((result.src as any).slice(result.pos + 1, result.pos + 10));

            let ar = src.split(/\r\n|\n|\r/);
            ar = ar.slice(0, 2)
                .concat('          ^~~~~~~~')
                .concat(...ar.slice(2));
            src = ar.join('\n') + '\n\n';
        } catch (e) {}

        msg = (`parse failed at position:${
            result.pos} ${
            result.message ? ` ${result.message}` : ''}\n     ${src}`);
    }
    return msg;
}


export function zeroWidth<T extends ArrayLike<T[number]>, C, R>(
        helper?: () => R
        ): ParserFnWithCtx<T, C, R> {

    return (input => {
        return ({
            succeeded: true,
            next: {
                src: input.src,
                start: input.start,
                end: input.end,
                context: input.context,
                templateArgs: input.templateArgs,
                templateArgsPos: input.templateArgsPos,
            },
            tokens: helper ? [helper()] : [],
        });
    });
}


export function zeroWidthError<T extends ArrayLike<T[number]>, C, R>(
        message: string
        ): ParserFnWithCtx<T, C, R> {

    return (input => {
        throw new ParseError({
            succeeded: false,
            error: true,
            src: input.src,
            pos: input.start,
            message: message || '',
        });
        // return ({
        //     succeeded: false,
        //     error: true,
        //     src: input.src,
        //     pos: input.start,
        //     message: message || '',
        // });
    });
}


export function beginning<T extends ArrayLike<T[number]>, C, R>(
        helper?: () => R
        ): ParserFnWithCtx<T, C, R> {

    return (input => {
        return (input.start === 0 ? {
            succeeded: true,
            next: {
                src: input.src,
                start: input.start,
                end: input.end,
                context: input.context,
                templateArgs: input.templateArgs,
                templateArgsPos: input.templateArgsPos,
            },
            tokens: helper ? [helper()] : [],
        } : {
            succeeded: false,
            error: false,
            src: input.src,
            pos: input.start,
            message: 'operator "beginning"',
        });
    });
}


export function end<T extends ArrayLike<T[number]>, C, R>(
        helper?: () => R
        ): ParserFnWithCtx<T, C, R> {

    return (input => {
        return (input.start === input.end ? {
            succeeded: true,
            next: {
                src: input.src,
                start: input.start,
                end: input.end,
                context: input.context,
                templateArgs: input.templateArgs,
                templateArgsPos: input.templateArgsPos,
            },
            tokens: helper ? [helper()] : [],
        } : {
            succeeded: false,
            error: false,
            src: input.src,
            pos: input.start,
            message: 'operator "end"',
        });
    });
}

// TODO: match by callback function parser
// TODO: `nesting` parser


export function quantify<T extends ArrayLike<T[number]>, C, R>(
        min?: number, max?: number
        ): (parser: ParserFnWithCtx<T, C, R>) => ParserFnWithCtx<T, C, R> {

    min = min || 0;
    return (parser => {
        return (input => {
            let next = input;
            const matched: Array<{next: ParserInputWithCtx<T, C>, tokens: R[]}> = [];

            for (;;) {
                const x = parser(next);
                if (x.succeeded) {
                    next = x.next;
                    matched.push({next: x.next, tokens: x.tokens});
                    if (max && max === matched.length) {
                        break;
                    }
                } else {
                    if (x.error) {
                        return x;
                    }
                    if (matched.length >= (min as number)) {
                        break;
                    } else {
                        return ({
                            succeeded: false,
                            error: false,
                            src: next.src,
                            pos: next.start,
                            message: 'operator "quantify"',
                        });
                    }
                }
            }
            if (matched.length > 0) {
                const r: R[] = [];
                for (const x of matched) {
                    r.push(...x.tokens);
                }
                return ({
                    succeeded: true,
                    next: (matched[matched.length - 1]).next,
                    tokens: r,
                });
            } else {
                return ({
                    succeeded: true,
                    next: {
                        src: input.src,
                        start: input.start,
                        end: input.end,
                        context: input.context,
                        templateArgs: input.templateArgs,
                        templateArgsPos: input.templateArgsPos,
                    },
                    tokens: [],
                });
            }
        });
    });
}


export function first<T extends ArrayLike<T[number]>, C, R>(
        ...parsers: Array<ParserFnWithCtx<T, C, R>>
        ): ParserFnWithCtx<T, C, R> {

    return (input => {
        let matched: {next: ParserInputWithCtx<T, C>, tokens: R[]} | null = null;

        let last: ParserFnFailedResult<T, C, R> | null = null;
        for (const parser of parsers) {
            const x = parser(input);
            if (x.succeeded) {
                matched = {next: x.next, tokens: x.tokens};
                break;
            }
            if (last) {
                if (x.error) {
                    if (!last.error || last.pos < x.pos) {
                        last = x;
                    }
                } else if (last.pos < x.pos) {
                    last = x;
                }
            } else {
                last = x;
            }
        }

        return (matched ? {
            succeeded: true, next: matched.next, tokens: matched.tokens
        } : last ? last : {
            succeeded: false,
            error: false,
            src: input.src,
            pos: input.start,
            message: 'operator "first"',
        });
    });
}


export function or<T extends ArrayLike<T[number]>, C, R>(
        ...parsers: Array<ParserFnWithCtx<T, C, R>>
        ): ParserFnWithCtx<T, C, R> {

    return (input => {
        const matched: Array<{next: ParserInputWithCtx<T, C>, tokens: R[]}> = [];

        let last: ParserFnFailedResult<T, C, R> | null = null;
        for (const parser of parsers) {
            const x = parser(input);
            if (x.succeeded) {
                matched.push({next: x.next, tokens: x.tokens});
            } else {
                if (last) {
                    if (x.error) {
                        if (!last.error || last.pos < x.pos) {
                            last = x;
                        }
                    } else if (last.pos < x.pos) {
                        last = x;
                    }
                } else {
                    last = x;
                }
            }
        }
        if (matched.length > 0) {
            const z = matched.reduce((a, b) => a.next.start >= b.next.start ? a : b);
            return ({succeeded: true, next: z.next, tokens: z.tokens});
        }

        return (last ? last : {
            succeeded: false,
            error: false,
            src: input.src,
            pos: input.start,
            message: 'operator "or"',
        });
    });
}


export function transform<T extends ArrayLike<T[number]>, C, R>(
        trans?: ((tokens: R[], input: ParserInputWithCtx<T, C>) => R[]), ctxTrans?: ((context: C) => C)
        ): (...parsers: Array<ParserFnWithCtx<T, C, R>>) => ParserFnWithCtx<T, C, R> {

    return ((...parsers) => {
        return (input => {
            let next = input;
            const tokens: R[] = [];

            for (const parser of parsers) {
                const x = parser(next);
                if (! x.succeeded) {
                    return x;
                }
                next = x.next;
                tokens.push(...x.tokens);
            }

            // TODO: report errors while transforming
            const t2 = trans ? trans(tokens, input) : tokens;
            return ({
                succeeded: true,
                next: ctxTrans ? {
                    src: next.src,
                    start: next.start,
                    end: next.end,
                    context: ctxTrans(next.context),
                    templateArgs: next.templateArgs,
                    templateArgsPos: next.templateArgsPos,
                } : next,
                tokens: t2,
            });
        });
    });
}


export function combine<T extends ArrayLike<T[number]>, C, R>(
        ...parsers: Array<ParserFnWithCtx<T, C, R>>
        ): ParserFnWithCtx<T, C, R> {

    return transform<T, C, R>()(...parsers);
}


export function lookAhead<T extends ArrayLike<T[number]>, C, R>(
        ...parsers: Array<ParserFnWithCtx<T, C, R>>
        ): ParserFnWithCtx<T, C, R> {

    return (input => {
        let next = input;

        for (const parser of parsers) {
            const x = parser(next);
            if (! x.succeeded) {
                return x;
            }
            next = x.next;
        }

        return ({
            succeeded: true,
            next: input,
            tokens: [],
        });
    });
}


export function lookBehind<T extends ArrayLike<T[number]>, C, R>(
        n: number, helper?: () => R): (
            ...parsers: Array<ParserFnWithCtx<T, C, R>>
            ) => ParserFnWithCtx<T, C, R> {

    return ((...parsers) => {
        return (input => {
            if (input.start - n < 0) {
                return ({
                    succeeded: false,
                    error: false,
                    src: input.src,
                    pos: input.start,
                    message: 'lookBehind: src is too short',
                });
            }
            let next: ParserInputWithCtx<T, C> = {
                src: input.src,
                start: input.start - n,
                end: input.end,
                context: input.context,
                templateArgs: input.templateArgs,
                templateArgsPos: input.templateArgsPos,
            };

            for (const parser of parsers) {
                const x = parser(next);
                if (! x.succeeded) {
                    return x;
                }
                next = x.next;
            }

            return ({
                succeeded: true,
                next: input,
                tokens: helper ? [helper()] : [],
            });
        });
    });
}


// tslint:disable-next-line: interface-over-type-literal
export type ApplyProductionRulesArg<T extends ArrayLike<T[number]>, C, R> = {
    rules: Array<ParserFnWithCtx<R[], C, R> |
           {parser: ParserFnWithCtx<R[], C, R>, rtol: boolean}>,
    maxApply?: number,
    check: ParserFnWithCtx<R[], C, R>,
};

export function applyProductionRules<T extends ArrayLike<T[number]>, C, R>(
        args: ApplyProductionRulesArg<T, C, R>
        ): (lexer: ParserFnWithCtx<T, C, R>) => ParserFnWithCtx<T, C, R> {

    return (lexer => {
        return (lexerInput => {
            const lexResult = lexer(lexerInput);
            if (! lexResult.succeeded) {
                return lexResult;
            }

            const input = parserInput<R[], C>(lexResult.tokens, lexerInput.context);
            let next = input;
            let completed = false;

            if (args.check(next).succeeded) {
                return ({
                    succeeded: true,
                    next: lexResult.next,
                    tokens: lexResult.tokens,
                });
            }

            completed: for (let i = 0;
                    args.maxApply !== void 0 ? i < args.maxApply : true; i++) {
                let matched = false;

                rules: for (const rule of args.rules) {
                    const {parser, rtol} =
                        typeof rule === 'function' ?
                            {parser: rule, rtol: false} : rule;
                    const len = next.src.length;

                    for (let s = 0; s <= len; s++) {
                        const x = parser({
                            src: next.src,
                            start: rtol ? len - s : s,
                            end: next.src.length,
                            context: next.context,
                        });
                        if (x.succeeded) {
                            matched = true;
                            const nextSrc = next.src.slice(0, rtol ? len - s : s);
                            nextSrc.push(...x.tokens);
                            nextSrc.push(...next.src.slice(x.next.start));
                            next = {
                                src: nextSrc,
                                start: 0,
                                end: nextSrc.length,
                                context: x.next.context,
                                templateArgs: x.next.templateArgs,
                                templateArgsPos: x.next.templateArgsPos,
                            };
                            if (args.check(next).succeeded) {
                                completed = true;
                                break completed;
                            }
                            break rules;
                        }
                    }
                }

                if (! matched) {
                    break;
                }
            }
            if (! completed) {
                if (! args.check(next).succeeded) {
                    throw new ParseError({
                        succeeded: false,
                        error: true,
                        src: input.src,
                        pos: input.start,
                        message: 'The application of production rules was not finished',
                    });
                }
            }

            return ({
                succeeded: true,
                next: lexResult.next,
                tokens: next.src,
            });
        });
    });
}


export function makeProgram<T extends ArrayLike<T[number]>, C, R>(
    parser: ParserFnWithCtx<T, C, R>): ParserFnWithCtx<T, C, R> {

    return (input => {
        try {
            return parser(input);
        } catch (e) {
            if (e.result) {
                return e.result;
            } else {
                throw e;
            }
        }
    });
}
