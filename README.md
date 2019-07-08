# FruitsConfits
### A well typed _sugared_ parser combinator framework for TypeScript/JavaScript.

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
* rawToToken : function to convert string token to AST element.
* concatTokens : function to merge two AST elements into one AST element.

#### returns
returns an object that containing the parsers.
* seq
* cls
* notCls
* clsFn
* classes
  * alpha
  * upper
  * lower
  * num
  * nonzero
  * bin
  * oct
  * hex
  * alnum
  * space
  * spaceWithinSingleLine
  * ctrl
  * newline
  * word
  * any
* numbers
  * bin
  * oct
  * hex
  * int
  * bigint
  * float
* cat
* once
* repeat
* qty
* zeroWidth
* err
* beginning
* end
* first
* or
* combine
* erase
* trans
* preread
* rules


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
* rawToToken : function to convert the input object list item to AST element.
* concatTokens : function to merge two AST elements into one AST element.
* comparator : function to compare two input object list items.

#### returns
returns an object that containing the parsers.
* seq
* cls
* notCls
* clsFn
* classes
  * any
* cat
* once
* repeat
* qty
* zeroWidth
* err
* beginning
* end
* first
* or
* combine
* erase
* trans
* preread
* rules


## Examples

* [JSON parser](https://github.com/shellyln/fruitsconfits/blob/master/src/examples/json-parser/index.ts)
* [CSV parser](https://github.com/shellyln/fruitsconfits/blob/master/src/examples/csv-parser/index.ts)

## License
[ISC](https://github.com/shellyln/fruitsconfits/blob/master/LICENSE.md)  
Copyright (c) 2019 Shellyl_N and Authors.
