# FruitsConfits
### A well typed and _sugared_ parser combinator framework for TypeScript/JavaScript.

<img src="https://raw.githubusercontent.com/shellyln/fruitsconfits/master/docs/images/logo.svg?sanitize=true" title="logo" style="width: 200px">


[![npm](https://img.shields.io/npm/v/fruitsconfits.svg)](https://www.npmjs.com/package/fruitsconfits)
[![GitHub release](https://img.shields.io/github/release/shellyln/fruitsconfits.svg)](https://github.com/shellyln/fruitsconfits/releases)
[![Travis](https://img.shields.io/travis/shellyln/fruitsconfits/master.svg)](https://travis-ci.org/shellyln/fruitsconfits)
[![GitHub forks](https://img.shields.io/github/forks/shellyln/fruitsconfits.svg?style=social&label=Fork)](https://github.com/shellyln/fruitsconfits/fork)
[![GitHub stars](https://img.shields.io/github/stars/shellyln/fruitsconfits.svg?style=social&label=Star)](https://github.com/shellyln/fruitsconfits)


## Install

```sh
npm install fruitsconfits
```

## Features

* Build a lexer or parser for a string or object list by parser combinator.
* The parser can receive user data context and acts as a reducer.
* Sugar sweet API syntaxes.

## High level APIs

### getStringParsers(params)
Get the string parser generators.

```ts
export function getStringParsers<C, R>(
        params: {
            rawToToken: (rawToken: string) => R,
            concatTokens: (tokens: R[]) => R[],
        });
```

#### params
* `rawToToken` : function to convert string token to AST element.
* `concatTokens` : function to merge two AST elements into one AST element.

#### returns
returns an object that containing the parsers.
* `seq(needle: string)`
  * parser to match the sequence `needle`
* `cls(...needles: string[])`
  * parser to match the sequence classes `needles`
* `notCls(...needles: string[])`
  * parser to match the negation of sequence classes `needles`
* `clsFn(needle: (src: string) => number)`
  * parser to match the sequence class `needle`
    * the class is defined by the lambda function
* classes
  * `alpha`
    * parser to match the sequence of us-ascii alphabetic characters
  * `upper`
    * parser to match the sequence of us-ascii upper alphabetic characters
  * `lower`
    * parser to match the sequence of us-ascii lower alphabetic characters
  * `num`
    * parser to match the sequence of us-ascii decimal numeric characters
  * `nonzero`
    * parser to match the sequence of us-ascii decimal numeric characters except `0`
  * `bin`
    * parser to match the sequence of us-ascii binary numeric characters
  * `oct`
    * parser to match the sequence of us-ascii octal numeric characters
  * `hex`
    * parser to match the sequence of us-ascii hexadecimal numeric characters
  * `alnum`
    * parser to match the sequence of us-ascii alphabetic and numeric characters
  * `space`
    * parser to match the sequence of whitespace characters except newline (CR/LF) characters
      * the whitespace characters definition conform to javascript regexp
  * `spaceWithinSingleLine`
    * parser to match the sequence of whitespace characters
      * the whitespace characters definition conform to javascript regexp
  * `ctrl`
    * parser to match the sequence of control characters
      * the control characters definition conform to javascript regexp
  * `newline`
    * parser to match the sequence of newline (CR/LF) characters
  * `word`
    * parser to match the negation of the sequence of whitespaces and control characters
      * the whitespace and control characters definition conform to javascript regexp
  * `any`
    * parser to match the sequence class that matches to any token
* numbers
  * `bin(...prefixes: StringParserFnWithCtx<C, R>[])`
    * parse a binary number
  * `oct(...prefixes: StringParserFnWithCtx<C, R>[])`
    * parse a octal number
  * `hex(...prefixes: StringParserFnWithCtx<C, R>[])`
    * parse a hex number
  * `int`
    * parse a javascript style integer number
  * `bigint`
    * parse a javascript style bigint number
  * `float`
    * parse a javascript style floating point number
* `cat(...parsers: StringParserFnWithCtx<C, R>[])`
  * parser that combine and concatenate the parsing results of `parsers`
* `once(parser: StringParserFnWithCtx<C, R>)`
  * parser to match once to the parsing results of `parser`
* `repeat(parser: StringParserFnWithCtx<C, R>)`
  * parser to match zero or more times to the parsing results of `parser`
* `qty(min?: number, max?: number) => (parser: StringParserFnWithCtx<C, R>)`
  * parser to match min to max times to the parsing results of `parser`
    * if min and max are ommitted, it is same as `repeat` parser
    * if max is ommitted, it matches min or more times
* `zeroWidth(helper?: () => R)`
  * parser to match any zero width and return result that is provided by `helper`
* `err(message: string)`
  * parser to match any zero width and raise the error that has `message`
* `beginning(helper?: () => R)`
  * parser to match zero width beginning of input and return result that is provided by `helper`
* `end(helper?: () => R)`
  * parser to match zero width end of input and return result that is provided by `helper`
* `first(...parsers: StringParserFnWithCtx<C, R>[])`
  * parser to match the first matched parser in the `parsers`
* `or(...parsers: StringParserFnWithCtx<C, R>[])`
  * parser to match the most long matched parser in the `parsers`
* `combine(...parsers: StringParserFnWithCtx<C, R>[])`
  * parser that combine parsers `parsers`
* `erase(...parsers: StringParserFnWithCtx<C, R>[])`
  * parser that combine parsers `parsers` and return empty result `[]`
* `trans(fn: (tokens: R[]) => R[]) => (...parsers: StringParserFnWithCtx<C, R>[])`
  * parser that combine parsers `parsers` and transform the result by `fn`
* `ahead(...parsers: StringParserFnWithCtx<C, R>[])`
  * parser to match zero width by reading ahead and matching with `parsers`
* `behind(n: number, helper?: () => R)(...parsers: StringParserFnWithCtx<C, R>[])`
  * parser to match zero width by reading behind and matching with `parsers` and return result that is provided by `helper`
* `rules(args: ApplyProductionRulesArg<string, C, R>) => (lexer: StringParserFnWithCtx<C, R>)`
  * parser to match the production rules `args`
    * args.rules : production rules
    * args.maxApply : maximum number of production rules applied
    * args.check : end condition of production rules


### getObjectParsers(params)
Get the object list parser generators.

```ts
export function getObjectParsers<T extends ArrayLike<T[number]>, C, R>(
        params: {
            rawToToken: (rawToken: T[number]) => R,
            concatTokens: (tokens: R[]) => R[],
            comparator: (a: T[number], b: T[number]) => boolean,
        });
```

#### params
* `rawToToken` : function to convert the input object list item to AST element.
* `concatTokens` : function to merge two AST elements into one AST element.
* `comparator` : function to compare two input object list items.

#### returns
returns an object that containing the parsers.
* `seq(needle: T)`
  * parser to match the sequence `needle`
* `cls(...needles: T[number][])`
  * parser to match the sequence classes `needles`
* `notCls(...needles: T[number][])`
  * parser to match the negation of sequence classes `needles`
* `clsFn(needle: (src: T[number]) => boolean)`
  * parser to match the sequence class `needle`
    * the class is defined by the lambda function
* classes
  * `any`
    * parser to match the sequence class that matches to any token
* `cat(...parsers: ParserFnWithCtx<T, C, R>[])`
  * parser that combine and concatenate the parsing results of `parsers`
* `once(parser: ParserFnWithCtx<T, C, R>)`
  * parser to match once to the parsing results of `parser`
* `repeat(parser: ParserFnWithCtx<T, C, R>)`
  * parser to match zero or more times to the parsing results of `parser`
* `qty(min?: number, max?: number) => (parser: ParserFnWithCtx<T, C, R>)`
  * parser to match min to max times to the parsing results of `parser`
    * if min and max are ommitted, it is same as `repeat` parser
    * if max is ommitted, it matches min or more times
* `zeroWidth(helper?: () => R)`
  * parser to match any zero width and return result that is provided by `helper`
* `err(message: string)`
  * parser to match any zero width and raise the error that has `message`
* `beginning(helper?: () => R)`
  * parser to match zero width beginning of input and return result that is provided by `helper`
* `end(helper?: () => R)`
  * parser to match zero width end of input and return result that is provided by `helper`
* `first(...parsers: ParserFnWithCtx<T, C, R>[])`
  * parser to match the first matched parser in the `parsers`
* `or(...parsers: ParserFnWithCtx<T, C, R>[])`
  * parser to match the most long matched parser in the `parsers`
* `combine(...parsers: ParserFnWithCtx<T, C, R>[])`
  * parser that combine parsers `parsers`
* `erase(...parsers: ParserFnWithCtx<T, C, R>[])`
  * parser that combine parsers `parsers` and return empty result `[]`
* `trans(fn: (tokens: R[]) => R[]) => (...parsers: ParserFnWithCtx<T, C, R>[])`
  * parser that combine parsers `parsers` and transform the result by `fn`
* `ahead(...parsers: ParserFnWithCtx<T, C, R>[])`
  * parser to match zero width by reading ahead and matching with `parsers`
* `behind(n: number, helper?: () => R)(...parsers: ParserFnWithCtx<T, C, R>[])`
  * parser to match zero width by reading behind and matching with `parsers` and return result that is provided by `helper`
* `rules(args: ApplyProductionRulesArg<T, C, R>) => (lexer: ParserFnWithCtx<T, C, R>)`
  * parser to match the production rules `args`
    * args.rules : production rules
    * args.maxApply : maximum number of production rules applied
    * args.check : end condition of production rules


## Examples

* [JSON parser](https://github.com/shellyln/fruitsconfits/blob/master/src/examples/json-parser/index.ts)
* [CSV parser](https://github.com/shellyln/fruitsconfits/blob/master/src/examples/csv-parser/index.ts)
* [formula parser](https://github.com/shellyln/fruitsconfits/blob/master/src/examples/formula-parser/index.ts)

## License
[ISC](https://github.com/shellyln/fruitsconfits/blob/master/LICENSE.md)  
Copyright (c) 2019 Shellyl_N and Authors.
