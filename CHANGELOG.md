# Changelog


## v0.5.0

* Update dependencies.
* Update CI configurations.
* Migrate to webpack 5.


---


## v0.4.1

* Migrate to eslint.
* Migrate to TypeScript 4.0.
* Update dependencies.


## v0.4.0

* Add new feature:
  * Add parser function for ES6 template strings parameter value.
* Update dependencies.
* Update CI configurations.


---


## v0.3.1

* Update dependencies.


## v0.3.0

* Update dependencies.

### _Breaking changes_
* Error messages no longer include source position information and nearby source text.
  * To format position and nearby source text,  
    use `formatErrorMessage(result: ParserFnFailedResult<T, C, R>)`.
* Internal `ParseError` thrown messages no longer include source position information and nearby source text.
  * To format position and nearby source text,  
    use `makeProgram()` parser function, and convert `ParseError` thrown to a return value.
