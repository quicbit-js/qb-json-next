// Type definitions for qb-json-next
// Note: Buffer is intentionally NOT referenced — Node's Buffer is a Uint8Array, so it is
// already assignable to Source. This keeps the types zero-dependency (no @types/node needed).

export = next

/**
 * Parse the next token from ps.src, updating ps in place. Returns the token code (see TOK),
 * or 0 when the buffer is exhausted or an error/truncation occurs (see ps.ecode).
 *
 * Accepts either a full ParseState (e.g. from next.ps()) or a seed object with just
 * `src` and/or `next_src` — the remaining fields are initialized on the first call.
 */
declare function next(ps: next.ParseStateInit, opt?: next.Options): number

declare namespace next {
    /** Any array-like of UTF-8 bytes. Node Buffer qualifies (it is a Uint8Array). */
    type Source = Uint8Array | ReadonlyArray<number>

    /** A position/context code; one of the values in POS. */
    type Position = number

    /** Called instead of throwing when tokenization hits a bad/unexpected value. */
    type ErrorHandler = (ps: ParseState) => void

    type Options = {
        err?: ErrorHandler;
    };

    /**
     * State updated in place by every call to next(ps). Create a fully-initialized one with
     * next.ps(); fields are all present after the first next() call.
     */
    type ParseState = {
        src: Source;      // data to parse — any array-like of UTF-8 bytes
        soff: number;     // prior src offset. ps.soff + ps.vlim = total byte offset from start
        lim: number;      // limit offset to stop reading from src (non-inclusive)
        koff: number;     // key byte-offset to opening quote (when inside an object)
        klim: number;     // key byte-offset just after closing quote (klim > koff only inside an object)
        voff: number;     // value byte-offset where value starts
        vlim: number;     // value byte-offset of value end (non-inclusive; vlim > voff for a parsed value)
        tok: number;      // token code of the value (a TOK value), or 0 if incomplete/error
        pos: number;      // position and context encoded as an integer (a POS value)
        ecode: number;    // error code if tokenize hit an error (0 = none; an ECODE value)
        vcount: number;   // number of completed values (a key/value pair counts once)
        line: number;     // current src line being parsed
        lineoff: number;  // total byte offset to start of current line (col = soff + vlim - lineoff)
        stack: number[];  // open array/object context bytes: 91 for '[', 123 for '{'
        next_src: Source; // next source to continue with after src is consumed
    };

    /**
     * Seed accepted by next(): provide `src` and/or `next_src`; everything else is optional
     * and filled in on the first call. For clean typed reads of ps.tok/voff/etc, prefer
     * creating state with next.ps().
     */
    type ParseStateInit = Partial<ParseState> & { src?: Source; next_src?: Source };

    /** Self-reference: next.next === next. Provided for the `const next = require(...); next.next(ps)` style. */
    function next(ps: ParseStateInit, opt?: Options): number;

    /** Throw an Error if ps shows an unexpected or invalid value (no-op otherwise). */
    function checke(ps: ParseState): void;

    /** Brief string name for a POS code (e.g. 'O_BV'), or '???' if unknown. */
    function posname(pos: number): string;

    /** Create a fully-initialized ParseState for the given source. */
    function ps(src: Source): ParseState;

    /** Compact string describing the current token (pass detail=true for pos/stack context). */
    function tokstr(ps: ParseState, detail?: boolean): string;

    /** End-codes set on ps.ecode when tokenization stops at a special state. */
    const ECODE: {
        BAD_VALUE: number;
        TRUNC_DEC: number;
        KEY_NO_VAL: number;
        TRUNCATED: number;
        UNEXPECTED: number;
    };

    /** Position/context codes for ps.pos. LSB (0x7F) is reserved for the token ascii value. */
    const POS: {
        A_BF: number;
        A_BV: number;
        A_AV: number;
        O_BF: number;
        O_BK: number;
        O_AK: number;
        O_BV: number;
        O_AV: number;
    };

    /** Token codes for ps.tok. All but string ('s') and decimal ('d') are the first ascii byte. */
    const TOK: {
        ARR: number;
        ARR_END: number;
        DEC: number;
        FAL: number;
        NUL: number;
        STR: number;
        TRU: number;
        OBJ: number;
        OBJ_END: number;
    };
}
