# Changelog

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
