/// <reference types="typescript" />
export = next
declare function next(ps: ParseState, opt?: Options): number
declare namespace next {
    export { 
        checke, 
        next, 
        posname, 
        ps, 
        tokstr, 
        ECODE, 
        POS, 
        TOK, 
        Source, 
        ParseState, 
        ErrorHandler, 
        Options, 
        Position, 
    };
}
/**
 * State that is updated-in-place with every call to next(ps). Create new parse state with the
 * next.ps() function.
 */
type ParseState = {
    src: Source;      // data to parse. any array-like object containing utf-8 data.
    soff: number;     // prior src offset.  e.g. ps.soff + ps.vlim = total byte offset from start.
    lim: number;      // limit offset to stop reading from src (non-inclusive).
    koff: number;     // key byte-offset to opening quote (when parsing inside object)
    klim: number;     // key byte-offset of byte just after closing quote. (klim > koff) only if inside of an object.
    voff: number;     // value byte-offset where value starts
    vlim: number;     // value byte-offset of value end (non-inclusive). (vlim > voff) only if a valid value has ben parsed.
    tok: number;      // token indicating the type of value tokenized which is zero if not tokenized (incomplete or error)
    pos: number;      // position and context encoded as an integer
    ecode: number;    // error code if tokenize hit an error (zero for no error).
    vcount: number;   // number of completed token values (key/value pairs count as a single count)
    line: number;     // current src line being parsed (newline context)
    lineoff: number;  // current total byte offset to beginning of current line (col = soff + vlim - lineoff)
    stack: number[];  // array/object context ascii codes which are 91 for array or 123 for object
    next_src: Source; // next source to continue tokenizing after completing src - but use qb-json-tokenizer for seamless continuation of buffers.
};

type Options = {
    err?: ErrorHandler;
};
declare function checke(ps: ParseState): undefined;
declare function posname(pos: number): string
declare function ps(src: Source): ParseState;
declare function tokstr(ps: ParseState, detail?: boolean): string;
/**
 * * For an unexpected or illegal value, or if src limit is reached before a value is complete, ps.tok will be zero
 * and ps.ecode will be one of the following
 */
type ECODE = number;
declare namespace ECODE {
    let BAD_VALUE: number;
    let TRUNC_DEC: number;
    let KEY_NO_VAL: number;
    let TRUNCATED: number;
    let UNEXPECTED: number;
}
/**
 * possible values for ps.pos(ition).
 *
 * Note that LSB (0x7F) are reserved for token ascii value.
 */
type POS = number;
declare namespace POS {
    let A_BF: number;
    let A_BV: number;
    let A_AV: number;
    let O_BF: number;
    let O_BK: number;
    let O_AK: number;
    let O_BV: number;
    let O_AV: number;
}
/**
 * Possible values for ps.tok(en).  All but string and decimal are represented by the first ascii byte encountered
 */
type TOK = number;
declare namespace TOK {
    let ARR: number;
    let ARR_END: number;
    let DEC: number;
    let FAL: number;
    let NUL: number;
    let STR: number;
    let TRU: number;
    let OBJ: number;
    let OBJ_END: number;
}
export type Source = Uint8Array | ReadonlyArray<number> | Buffer;
type ErrorHandler = function (ParseState);
