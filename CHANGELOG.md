# Changelog

## v0.3.0
### Breaking changes
* Error messages no longer include source position information and nearby source text.
  * To format position and nearby source text,  
    use `formatErrorMessage(result: ParserFnFailedResult<T, C, R>)`.
* Internal `ParseError` thrown messages no longer include source position information and nearby source text.
  * To format position and nearby source text,  
    use `makeProgram()` parser function, and convert `ParseError` thrown to a return value.

### Changes
* Update dependencies.

---
