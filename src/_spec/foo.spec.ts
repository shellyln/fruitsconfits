
// tslint:disable: no-eval
// tslint:disable: interface-over-type-literal


import { ParserInputWithCtx,
         ParserInput,
         StringParserInputWithCtx,
         StringParserInput,
         ParseError,
         parserInput,
         ParserFnSucceededResult,
         ParserFnFailedResult,
         ParserFnWithCtx,
         ParserFn,
         StringParserFnWithCtx,
         StringParserFn } from '../lib/types';
import { charSequence,
         charClass,
         charClassNot,
         charClassByNeedleFn,
         getStringParsers } from '../lib/string-parser';
import { getObjectParsers } from '../lib/object-parser';
import { parse as parseCsv } from '../examples/csv-parser';
import { parse as parseFormula, evaluate as evaluateFormula } from '../examples/formula-parser';
import { parse as parseJson } from '../examples/json-parser';



describe("foo", function() {
    it("foo1", function() {
        const x = parserInput('foo');
        const y = parserInput([{type: 'aaa', value: 0}]);
        expect(1).toEqual(1);
    });

    it("string-parser-1", function() {
        const parse: StringParserFnWithCtx<undefined, {ch: string}> = (input: StringParserInput) => {
            return (input.start < input.end ? {
                succeeded: true,
                next: {
                    src: input.src,
                    start: input.start + 1,
                    end: input.end,
                    context: input.context,
                },
                tokens: [{ch: input.src[input.start]}],
            } : {
                succeeded: false,
                error: false,
                src: input.src,
                pos: input.start,
                message: `parse failed at ${input.start}: ${input.src.slice(input.start, 50)}`,
            });
        };
        const x = parse(parserInput('abcdefg'));
        expect(x.succeeded && x.tokens).toEqual([
            {ch: 'a'},
        ]);
    });

    it("string-parser-2", function() {
        type Ctx = number;
        type Ast = {token: string};

        const {seq, cls, notCls, clsFn, classes, cat,
               qty, repeat, zeroWidth, beginning, end,
               first, or, combine} = getStringParsers<Ctx, Ast>({
            rawToToken: token => ({token}),
            concatTokens: tokens => [tokens.reduce((a, b) => ({token: a.token + b.token}))],
        });
        const zw = zeroWidth(() => ({token: '@'}));

        const parse = combine(
            cat(seq('Hello'), seq(','), ),
            cat(zw, seq('Wor'), notCls('z', 'd'),
                first(cls('z', 'y'),
                      cls('d', 'l')), ),
            cat(or(seq('?'),
                   seq('!'),
                   seq('!!'),
                   qty(0, 10)(seq('!'))), ),
            end(),
        );

        const x = parse(parserInput('Hello,World!!!!!!!!!!', 1));
        if (x.succeeded) {
            // tslint:disable-next-line: no-unused-expression
            x.next.context;
        }
        expect(1).toEqual(1);
    });

    it("csv-1", function() {
        const x = parseCsv('1, 2 2 ,3 3,4\n 5 , 6 , 7 , 8 \n\n" a , b , ""\n c  ","",9,"",');
        // console.log(JSON.stringify(x, void 0, 2));
        expect(x).toEqual([
            ['1', '2 2', '3 3', '4'],
            ['5', '6', '7', '8'],
            [''],
            [' a , b , "\n c  ', '', '9', '', ''],
        ]);
    });

    it("formula-1", function() {
        const code = `-77,+88,-99-5,+77+1, 10,(11),((12)),(99,98,97),[],{},[[1],2,3,{foo:1}],{bar:[4,{baz:5},[],{}]}
            ,'ccc\\'\\"\\\`\\v\\t\\b\\f\\r\\n\\u26F1\\u{1F608}\\xa9\\256'
            , 20 ,-one(),one(),11 + 13,2+3*4**2+5+2 +twice(5)+max(13,one(),twice(3),17,3)+(3) * 4 + 5 + (6,7,8)+5+10-2*11*(1)`; // 102
        //                                                                       55+2 +     10 +                      17   +     12 + 5 +      8 +5+10-22
        //                                                                                                                                   109 +5+10-22
        //                                                                                                                                         124-22
        const one = () => 1;
        const twice = (a: number) => a * 2;
        const max = Math.max;
        const x = parseFormula(code);
        // console.log(JSON.stringify(x, void 0, 2));
        const z = evaluateFormula(code);
        console.log(z);
        expect(z).toEqual(eval(code
            .replace(/# /g, '// ')
            .replace(/0555/, '0o555')
            .replace(/\\256/, '\\xae')));
    });

    it("formula-2", function() {
        const code = `-77,+88,-99-5,+77+1, 10,(11),((12)),(99,98,97),[],{},[[1],2,3,{foo:1}],{bar:[4,{baz:5},[],{}]}
            ,'ccc\\'\\"\\\`\\v\\t\\b\\f\\r\\n\\u26F1\\u{1F608}\\xa9\\256'
            , 20 ,-one(),one(),11 + 13,2+3*4**2+5+2 +twice(5)+max(13,one(),twice(3),17,3)+(3) * 4 + 5 + (6,7,8)+5+10-2*11*(1)+true?3:4+one()+(22+33)+44`; // 3
        //                                                                       55+2 +     10 +                      17   +     12 + 5 +      8 +5+10-22      +3
        //                                                                                                                                   109 +5+10-22      +3
        //                                                                                                                                         124-22      +3
        const one = () => 1;
        const twice = (a: number) => a * 2;
        const max = Math.max;
        const x = parseFormula(code);
        console.log(JSON.stringify(x, void 0, 2));
        const z = evaluateFormula(code);
        console.log(z);
        expect(z).toEqual(eval(code
            .replace(/# /g, '// ')
            .replace(/0555/, '0o555')
            .replace(/\\256/, '\\xae')));
    });

    it("formula-3", function() {
        const code = `[
            12+3*4-2,
            [1,2,3+5]
        ]`;
        const one = () => 1;
        const twice = (a: number) => a * 2;
        const max = Math.max;
        const x = parseFormula(code);
        // console.log(JSON.stringify(x, void 0, 2));
        const z = evaluateFormula(code);
        // console.log(z);
        expect(z).toEqual(eval(code
            .replace(/# /g, '// ')
            .replace(/0555/, '0o555')
            .replace(/\\256/, '\\xae')));
    });

    it("formula-4-0", function() {
        const code = `
        {
            "bar":[
                (7,6,5),            // ===  5 //
                ((3)),              // ===  3 //
            ],
        }`;
        const one = () => 1;
        const twice = (a: number) => a * 2;
        const max = Math.max;
        const x = parseFormula(code);
        // console.log(JSON.stringify(x, void 0, 2));
        const z = evaluateFormula(code);
        // console.log(z);
        expect(z).toEqual(eval(
            ('(' + code + ')')
            .replace(/# /g, '// ')
            .replace(/0555/, '0o555')
            .replace(/\\256/, '\\xae')));
    });

    it("formula-4", function() {
        const code = `
        # qqqqqqqqqqqqqq
        {
            "foo":null,
            "bar":[
                {
                    "baz":[null,[1,2,[],3]]// ffffffff ff aaaaa
                    /*
                    ggggggggggggggggggg ffffff
                    */
                   ,"zzz" : -5432,
                   'zzzz':+1-2+3-4,
                   wwwwwww: {"p":7},
                   wwwww: {},
                   qwerty: -4321.342e-1,
                   qqq:\`aa
                   a\\
                   bbb\`, asdf :'ccc\\'\\"\\\`\\v\\t\\b\\f\\r\\n\\u26F1\\u{1F608}\\xa9\\256'
                },12,
                null,undefined,0x1,0b111,0o777,0555,-777,+4321.342,
                5*3,                // === 15
                7 * 2 + 3 + 4,      // === 21
                7 + 2 * 3 + 4,      // === 17
                7 + 2 * 3 ** 4,     // === 169
                1 + (2 * 3) + 4,    // === 11
                (1 + 2) * 3,        // ===  9
                2 * (3 + 4),        // === 14
                2 * (3 + 4) + 5,    // === 19
                (7,6,5),            // ===  5
                (7),                // ===  7
                ((3)),              // ===  3
                +1-2+3-4,
            ],
        }`;
        const one = () => 1;
        const twice = (a: number) => a * 2;
        const max = Math.max;
        const x = parseFormula(code);
        // console.log(JSON.stringify(x, void 0, 2));
        const z = evaluateFormula(code);
        // console.log(z);
        expect(z).toEqual(eval(
            ('(' + code + ')')
            .replace(/# /g, '// ')
            .replace(/0555/, '0o555')
            .replace(/\\256/, '\\xae')));
    });

    it("json-1", function() {
        const src = `1234`;
        const x = parseJson(src);
        // console.log(JSON.stringify(x, void 0, 2));
        expect(x).toEqual(eval(src));
    });

    it("json-2", function() {
        const src = `{"foo":null,"bar":[],}`;
        const x = parseJson(src);
        // console.log(JSON.stringify(x, void 0, 2));
        expect(x).toEqual(eval('(' + src + ')'));
    });

    it("json-3", function() {
        const src = `
        {
            "foo" : null ,
            "bar" : [ null , 1 ,2, "aaaaaa", ] ,
        } `;
        const x = parseJson(src);
        // console.log(JSON.stringify(x, void 0, 2));
        expect(x).toEqual(eval('(' + src + ')'));
    });

    it("json-4", function() {
        const src = `
        # qqqqqqqqqqqqqq
        {
            "foo":null,
            "bar":[
                {
                    "baz":[null,[1,2,[],3]]// ffffffff ff aaaaa
                    /*
                    ggggggggggggggggggg ffffff
                    */
                   ,"zzz" : -5432,
                   'zzzz':+1-2+3-4,
                   wwwwwww: {"p":7},
                   wwwww: {},
                   qwerty: -4321.342e-1,
                   qqq:\`aa
                   a\\
                   bbb\`, asdf :'ccc\\'\\"\\\`\\v\\t\\b\\f\\r\\n\\u26F1\\u{1F608}\\xa9\\256'
                },12,
                null,undefined,0x1,0b111,0o777,0555,-777,+4321.342,
                5*3,                // === 15
                7 * 2 + 3 + 4,      // === 21
                7 + 2 * 3 + 4,      // === 17
                7 + 2 * 3 ** 4,     // === 169
                1 + (2 * 3) + 4,    // === 11
                (1 + 2) * 3,        // ===  9
                2 * (3 + 4),        // === 14
                2 * (3 + 4) + 5,    // === 19
                (7,6,5),            // ===  5
                (7),                // ===  7
                ((3)),              // ===  3
                +1-2+3-4,
            ],
        }`;
        const x = parseJson(src);
        // console.log(JSON.stringify(x, void 0, 2));
        expect(x).toEqual(eval('(' +
            src.replace(/# /g, '// ')
            .replace(/0555/, '0o555')
            .replace(/\\256/, '\\xae') + ')'));
    });
});
