// Software License Agreement (ISC License)
//
// Copyright (c) 2023, Matthew Voss
//
// Permission to use, copy, modify, and/or distribute this software for
// any purpose with or without fee is hereby granted, provided that the
// above copyright notice and this permission notice appear in all copies.
//
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

// @ts-check

// possible values for ps.pos(ition).  
// Note that LSB (0x7F) are reserved for token ascii value.
const POS = {
  A_BF: 0x080,   // in array, before first value
  A_BV: 0x100,   // in array, before value
  A_AV: 0x180,   // in array, after value
  O_BF: 0x200,   // in object, before first key
  O_BK: 0x280,   // in object, before key
  O_AK: 0x300,   // in object, after key
  O_BV: 0x380,   // in object, before value
  O_AV: 0x400,   // in object, after value
}

// Possible values for ps.tok(en).  All but string and decimal are represented 
// by the first ascii byte encountered
const TOK = {
  ARR: 91,        // [    array start
  ARR_END: 93,    // ]    array end
  DEC: 100,       // d    a decimal value starting with: -, 0, 1, ..., 9
  FAL: 102,       // f    false
  // INT: 105        // i    integer, reserved token
  NUL: 110,       // n    null
  STR: 115,       // s    a string value starting with "
  TRU: 116,       // t    true
  // UNT: 117,       // u    unsigned integer, reserved token
  // BYT: 120        // x   byte, reserved token
  OBJ: 123,       // {    object start
  OBJ_END: 125,   // }    object end
}

// For an unexpected or illegal value, or if src limit is reached before a value is complete, ps.tok will be zero
// and ps.ecode will be one of the following
const ECODE = {
  BAD_VALUE: 66,    // 'B'  encountered invalid byte or series of bytes
  TRUNC_DEC: 68,    // 'D'  end of buffer was a decimal ending with a digit (0-9). it is *possibly* unfinished
  KEY_NO_VAL: 75,   // 'K'  object key complete, but value did not start
  TRUNCATED: 84,    // 'T'  key or value was unfinished at end of buffer
  UNEXPECTED: 85,   // 'U'  encountered a recognized token in wrong place/context
}

// ASCII flags
const NON_TOKEN = 1           // '\b\f\n\t\r ,:',     
const DELIM = 2               // '\b\f\n\t\r ,:{}[]',
const DECIMAL_END = 4         // '0123456789',
const DECIMAL_ASCII = 8       // '-0123456789+.eE',
const NO_LEN_TOKENS = 16      // 'tfn[]{}()',

//       0    1    2    3    4    5    6    7    8    9    A    B    C    D    E    F
//    -----------------------------------------------------------------------------------
// 0  |  NUL  SOH  STX  ETX  EOT  ENQ  ACK  BEL  BS   TAB  LF   VT   FF   CR   SO   SI  |  // 0
// 1  |  DLE  DC1  DC2  DC3  DC4  NAK  SYN  ETB  CAN  EM   SUB  ESC  FS   GS   RS   US  |  // 1
// 2  |  SPC  !    "    #    $    %    &    '    (    )    *    +    ,    -    .    /   |  // 2
// 3  |  0    1    2    3    4    5    6    7    8    9    :    ;    <    =    >    ?   |  // 3
// 4  |  @    A    B    C    D    E    F    G    H    I    J    K    L    M    N    O   |  // 4
// 5  |  P    Q    R    S    T    U    V    W    X    Y    Z    [    \    ]    ^    _   |  // 5
// 6  |  `    a    b    c    d    e    f    g    h    i    j    k    l    m    n    o   |  // 6
// 7  |  p    q    r    s    t    u    v    w    x    y    z    {    |    }    ~        |  // 7
//    -----------------------------------------------------------------------------------

// CMAP was lovingly crafted by https://github.com/quicbit-js/qb-json-next/blob/master/export/generate-maps.js
const CMAP = [
//0     1     2     3     4     5     6     7     8     9     A     B     C     D     E     F
  0,    0,    0,    0,    0,    0,    0,    0,    0x03, 0x03, 0x03, 0,    0x03, 0x03, 0,    0,    // 0
  0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    // 1
  0x03, 0,    0,    0,    0,    0,    0,    0,    0x10, 0x10, 0,    0x08, 0x03, 0x08, 0x08, 0,    // 2
  0x0C, 0x0C, 0x0C, 0x0C, 0x0C, 0x0C, 0x0C, 0x0C, 0x0C, 0x0C, 0x03, 0,    0,    0,    0,    0,    // 3
  0,    0,    0,    0,    0,    0x08, 0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    // 4
  0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0x12, 0,    0x12, 0,    0,    // 5
  0,    0,    0,    0,    0,    0x08, 0x10, 0,    0,    0,    0,    0,    0,    0,    0x10, 0,    // 6
  0,    0,    0,    0,    0x10, 0,    0,    0,    0,    0,    0,    0x12, 0,    0x12, 0,    0,    // 7
  0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    // 8
  0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    // 9
  0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    // A
  0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    // B
  0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    // C
  0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    // D
  0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    // E
  0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    // F
]

// convert {first-ascii-char: remaining-ascii-string} to  {first-ascii-byte: remaining-ascii-bytes}
function ascii_to_bytes (strings) {
  return Object.keys(strings).reduce(
    /** @type {function(number[][], string): number[][]} */
    function (a, c ) {
    a[c.charCodeAt(0)] = strings[c].split('').map(function (c) { return c.charCodeAt(0) })
    return a
  }, [])
}

const TOK_BYTES = ascii_to_bytes({ f: 'alse', t: 'rue', n: 'ull' })

const POS2NAME = Object.keys(POS).reduce(function (/** @type {string[]}*/ a, /** @type {string} */ n) { a[POS[n]] = n; return a }, [])

function pos_map () {
  const ret = []
  const max = 0x400 + 0xFF            // max pos + max ascii
  for (let i = 0; i <= max; i++) {
    ret[i] = 0
  }
  // pos_pairs is generated by utils.js
  const pos_pairs = [
    219,128,221,384,228,384,230,384,238,384,243,384,244,384,251,512,
    347,128,356,384,358,384,366,384,371,384,372,384,379,512,428,256,
    477,384,627,768,637,384,755,768,826,896,987,128,996,1024,998,1024,
    1006,1024,1011,1024,1012,1024,1019,512,1068,640,1149,384,
  ]
  for (let i=0; i<pos_pairs.length; i+=2) {
    ret[pos_pairs[i]] = pos_pairs[i+1]
  }
  return ret
}

const POS_MAP = pos_map()

// skip as many bytes of src that match bsrc, up to lim.
// return (byte offset) after all bytes from bsrc are matched or -(byte offset) of first
//                  unmatched byte, if unmatched. 
function skip_bytes (src, off, lim, bsrc) {
  let blen = bsrc.length
  if (blen > lim - off) { blen = lim - off }
  let i = 0
  while (bsrc[i] === src[i + off] && i < blen) { i++ }
  return i === bsrc.length ? i + off : -(i + off)
}

function skip_str (src, off, lim) {
  let i = off
  while (i < lim) {
    if (src[i] === 34) {
      if (src[i - 1] === 92) {
        // count number of escapes going backwards (n = escape count +1)
        let n = 2
        while (src[i - n] === 92 && i - n >= off) {n++}          // \ BACKSLASH escape
        if (n % 2 === 1) {
          return i + 1  // skip quote
        }
      } else {
        return i + 1  // skip quote
      }
    }
    i++
  }
  return -i
}

function skip_dec (src, off, lim) {
  while (off < lim && (CMAP[src[off]] & DECIMAL_ASCII)) { off++ }
  return (off < lim && (CMAP[src[off]] & DELIM)) ? off : -off
}

//
// switch ps.src to ps.next_src if conditions are right (ps.src is null or is complete without errors)
// 
function next_src (ps) {
  if (ps.ecode || (ps.src && ps.vlim < ps.lim)) {
    return false
  }
  if (ps.next_src.length === 0) {
    return false
  }
  ps.soff += ps.src && ps.src.length || 0
  ps.src = ps.next_src
  ps.next_src = []
  ps.koff = ps.klim = ps.voff = ps.vlim = ps.tok = ps.ecode = 0
  ps.lim = ps.src.length
  return true
}

 // Lazy-initialize an object properties to hold all ParseState values/defaults. The object is modified in place to support
 // legacy usage. The object is also returned as a typed ParseState to support Type clarity with type script and documentation. 
 // Though functionaly equivalent, use the returned object to show type-clarity.
function init (ps) {
  ps.soff = ps.soff || 0                  // prior src offset.  e.g. ps.soff + ps.vlim = total byte offset from start
  ps.src = ps.src || []
  ps.lim = ps.lim == null ? ps.src.length : ps.lim
  ps.koff = ps.koff || ps.soff            
  ps.klim = ps.klim || ps.koff            
  ps.voff = ps.voff || ps.klim            
  ps.vlim = ps.vlim || ps.voff            
  ps.tok = ps.tok || 0                    
  ps.stack = ps.stack || []               
  ps.pos = ps.pos || POS.A_BF             
  ps.ecode = ps.ecode || 0                
  ps.vcount = ps.vcount || 0              
  ps.line = ps.line || 1                  
  ps.lineoff = ps.lineoff || 0            
  ps.next_src = ps.next_src || []         
  if (ps.next_src.length) { next_src(ps) }
  return ps
}

// Handle cases where tokenization has stopped due to unexpected
// or invalid bytes or running out of buffer. If smooth buffer
// transition is possible, seamless transition is executed with next_src.
// If not, ecode is updated to facilitate further handling. Err handling is 
// invoked for bad or invalid bytes.
function end_src (ps, opt) {
  switch (ps.ecode) {
    case 0:
      if (ps.pos === POS.O_AK || ps.pos === POS.O_BV) {
        ps.ecode = ECODE.KEY_NO_VAL
      } else {
        if (ps.next_src && next_src(ps)) { return next(ps) }
      }
      break
    case ECODE.BAD_VALUE: case ECODE.UNEXPECTED:
      ps.tok = 0
      if (opt && (typeof opt.err === 'function')) {
        opt.err(ps)
        return ps.tok
      } else {
        checke(ps)  // throws error
      }
    // any other ecode is just sticky (prevents progress)
  }
  return ps.tok = 0
}

function handle_neg (ps, opt) {
  ps.vlim = -ps.vlim
  if (ps.vlim >= ps.lim) {
    ps.ecode =
      ps.tok === TOK.DEC && (CMAP[ps.src[ps.vlim - 1]] & DECIMAL_END)
        ? ECODE.TRUNC_DEC
        : ECODE.TRUNCATED
  } else {
    ps.ecode = ECODE.BAD_VALUE
    ps.vlim++
  }
  return end_src(ps, opt)
}

function handle_unexp (ps, opt) {
  if (ps.vlim < 0) { ps.vlim = -ps.vlim }
  ps.ecode = ECODE.UNEXPECTED
  return end_src(ps, opt)
}


// Default error handler. Throws an error with the given message and parse_state as a property of the error.
function err (msg, ps) {
  const ctx = '(line ' + (ps.line + 1) + ', col ' + (ps.soff + ps.voff - ps.lineoff) + ', tokstr ' + tokstr(ps, true) + ')'
  /** @type {*} */
  const e = new Error(msg + ': ' + ctx)
  e.parse_state = ps
  throw e
}

//
// PUBLIC API
//


/**
 * Return the abbreviated string name for a Position integer code.
 * 
 * @param {number} pos Position integer state-code as stored in ParseState.pos
 * @returns {string}   Abbreviated string name for the code
 */
function posname (pos) { return POS2NAME[pos] || '???' }

/**
 * Create and return a new ParseState object.
 */
function ps (src) {
  let ret = {src: src}
  return init(ret)
}

// Parses next token from ps.src, *very quickly*. Call this function repeatedly to tokenize JSON buffers
// passing in the same ParseState which is updated in place to the next key/value in the buffer.
// 
//    ps  object holding parse state context/position and current token to be updated to next token state.
//    opt optional override for error handling
//    
// Return the token value successfully parsed TOK.string, TOK.number... or zero if incomplete or error
// 
// For Example:
// 
//   const next = require('qb-json-next')
//   const someJSON = '{"a": "some",\n "b": "json to parse", \n: "c": [1.1, 2.5, 33]}'
//   const ps = next.ps(Buffer.from(someJSON)
//   while (next(ps)) {
//      console.log(next.tokstr(ps))
//   }
function next (ps, opt) {
  if (!ps.pos) { init(ps) }
  if (ps.ecode !== 0) {                               // ecode is sticky (requires intentional fix)
    return ps.tok = 0
  }
  ps.koff = ps.klim = ps.voff = ps.vlim
  let pos1 = ps.pos
  while (ps.vlim < ps.lim) {
    ps.voff = ps.vlim
    ps.tok = ps.src[ps.vlim++]
    switch (ps.tok) {
      case 10:                                          // new-line
        ps.lineoff = ps.soff + ps.vlim
        ps.line++
        continue

      case 13:                                          // carriage return
        ps.lineoff = ps.soff + ps.vlim
        continue

      case 8: case 9: case 12: case 32:                 // other white-space
        continue

      case 44:                                          // ,    COMMA
      case 58:                                          // :    COLON
        pos1 = POS_MAP[ps.pos | ps.tok]
        if (pos1 === 0) { ps.voff = ps.vlim - 1; return handle_unexp(ps, opt) }
        ps.pos = pos1
        continue

      case 34:                                          // "    QUOTE
        ps.tok = 115                                    // s for string
        ps.vlim = skip_str(ps.src, ps.vlim, ps.lim)
        pos1 = POS_MAP[ps.pos | ps.tok]
        if (pos1 === 0) return handle_unexp(ps, opt)
        if (pos1 === POS.O_AK) {
          // key
          ps.koff = ps.voff
          if (ps.vlim > 0) { ps.pos = pos1; ps.klim = ps.voff = ps.vlim; continue } else { ps.klim = ps.voff = -ps.vlim; return handle_neg(ps, opt) }
        } else {
          // value
          if (ps.vlim > 0) { ps.pos = pos1; ps.vcount++; return ps.tok } else return handle_neg(ps, opt)
        }

      case 102:                                         // f    false
      case 110:                                         // n    null
      case 116:                                         // t    true
        ps.vlim = skip_bytes(ps.src, ps.vlim, ps.lim, TOK_BYTES[ps.tok])
        pos1 = POS_MAP[ps.pos | ps.tok]
        if (pos1 === 0) return handle_unexp(ps, opt)
        if (ps.vlim > 0) { ps.pos = pos1; ps.vcount++; return ps.tok } else return handle_neg(ps, opt)

      case 48:case 49:case 50:case 51:case 52:          // 0-4    digits
      case 53:case 54:case 55:case 56:case 57:          // 5-9    digits
      case 45:                                          // '-'    ('+' is not legal here)
        ps.tok = 100                                    // d for decimal
        ps.vlim = skip_dec(ps.src, ps.vlim, ps.lim)
        pos1 = POS_MAP[ps.pos | ps.tok]
        if (pos1 === 0) return handle_unexp(ps, opt)
        if (ps.vlim > 0) { ps.pos = pos1; ps.vcount++; return ps.tok } else return handle_neg(ps, opt)

      case 91:                                          // [    ARRAY START
      case 123:                                         // {    OBJECT START
        pos1 = POS_MAP[ps.pos | ps.tok]
        if (pos1 === 0) return handle_unexp(ps, opt)
        ps.pos = pos1
        ps.stack.push(ps.tok)
        return ps.tok

      case 93:                                          // ]    ARRAY END
        if (POS_MAP[ps.pos | ps.tok] === 0) return handle_unexp(ps, opt)
        ps.stack.pop()
        ps.pos = ps.stack[ps.stack.length - 1] === 123 ? POS.O_AV : POS.A_AV
        ps.vcount++; return ps.tok

      case 125:                                         // }    OBJECT END
        if (POS_MAP[ps.pos | ps.tok] === 0) return handle_unexp(ps, opt)
        ps.stack.pop()
        ps.pos = ps.stack[ps.stack.length - 1] === 123 ? POS.O_AV : POS.A_AV
        ps.vcount++; return ps.tok

      default:
        --ps.vlim
        ps.ecode = ECODE.BAD_VALUE
        return end_src(ps, opt)
    }
  }

  // reached src limit without error or truncation
  if (CMAP[ps.tok] & NON_TOKEN) {
    ps.voff = ps.vlim
  }
  return end_src(ps, opt)
}

// Convenience function to throw error if parse state shows unexpected or invalid value encountered.
// Throw error is the default behavior of next(), but can be overridden with the err override
// option:
// 
//    next(ps, { err: (ps) => {handle-error-my-way...} })
function checke (ps) {
  ps.ecode !== ECODE.UNEXPECTED || err('unexpected token at ' + ps.voff + '..' + ps.vlim, ps)
  ps.ecode !== ECODE.BAD_VALUE || err('bad value at ' + ps.voff + '..' + ps.vlim, ps)
}

// Return the parse state as a brief string.
//    ps Parse state that was updated by calling next(ps)
//    detail (optional)  Pass true to print more detail including the position state and stack context
function tokstr (ps, detail) {
  const keystr = ps.koff === ps.klim ? '' : 'k' + (ps.klim - ps.koff) + '@' + ps.koff + ':'
  const vlen = (ps.vlim === ps.voff || (CMAP[ps.tok] & NO_LEN_TOKENS)) ? '' : ps.vlim - ps.voff

  const tchar = ps.tok && String.fromCharCode(ps.tok) || '!'
  let ret = keystr + tchar + vlen + '@' + ps.voff
  if (ps.ecode) {
    ret += ':' + String.fromCharCode(ps.ecode)
  }
  if (detail) {
    ret += ':' + posname(ps.pos)
    if (ps.stack && ps.stack.length) {
      ret += ':' + ps.stack.map(function (c) { return String.fromCharCode(c) }).join('')
    }
  }
  return ret
}

next.checke = checke
next.next = next
next.posname = posname
next.ps = ps
next.tokstr = tokstr

next.ECODE = ECODE
next.POS = POS
next.TOK = TOK

module.exports = next