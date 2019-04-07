// Software License Agreement (ISC License)
//
// Copyright (c) 2019, Matthew Voss
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

// values for ps.pos(ition).  LSB (0x7F) are reserved for token ascii value.
var POS = {
  A_BF: 0x080,   // in array, before first value
  A_BV: 0x100,   // in array, before value
  A_AV: 0x180,   // in array, after value
  O_BF: 0x200,   // in object, before first key
  O_BK: 0x280,   // in object, before key
  O_AK: 0x300,   // in object, after key
  O_BV: 0x380,   // in object, before value
  O_AV: 0x400,   // in object, after value
}

// values for ps.tok(en).  All but string and decimal are represented by the first ascii byte encountered
var TOK = {
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

// ASCII flags
var NON_TOKEN = 1           // '\b\f\n\t\r ,:',     
var DELIM = 2               // '\b\f\n\t\r ,:{}[]',
var DECIMAL_END = 4         // '0123456789',
var DECIMAL_ASCII = 8       // '-0123456789+.eE',
var NO_LEN_TOKENS = 16      // 'tfn[]{}()',

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

// CMAP was lovingly crafted by util.js
var CMAP = [
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

// for an unexpected or illegal value, or if src limit is reached before a value is complete, ps.tok will be zero
// and ps.ecode will be one of the following:
var ECODE = {
  BAD_VALUE: 66,    // 'B'  encountered invalid byte or series of bytes
  TRUNC_DEC: 68,    // 'D'  end of buffer was a decimal ending with a digit (0-9). it is *possibly* unfinished
  KEY_NO_VAL: 75,   // 'K'  object key complete, but value did not start
  TRUNCATED: 84,    // 'T'  key or value was unfinished at end of buffer
  UNEXPECTED: 85,   // 'U'  encountered a recognized token in wrong place/context
}

function as_buffer (s) {
  return Uint8Array.from(s.split('').map(function (c) { return c.charCodeAt(0) }))
}

var FALSE_BYTES = as_buffer('alse')
var TRUE_BYTES = as_buffer('rue')
var NULL_BYTES = as_buffer('ull')

var POS2NAME = Object.keys(POS).reduce(function (a, n) { a[POS[n]] = n; return a }, [])

function posname (pos) { return POS2NAME[pos] || '???' }

function pos_map () {
  var ret = []
  var max = 0x400 + 0xFF            // max pos + max ascii
  for (var i = 0; i <= max; i++) {
    ret[i] = 0
  }
  // pos_pairs is generated by utils.js
  var pos_pairs = [
    219,128,221,384,228,384,230,384,238,384,243,384,244,384,251,512,
    347,128,356,384,358,384,366,384,371,384,372,384,379,512,428,256,
    477,384,627,768,637,384,755,768,826,896,987,128,996,1024,998,1024,
    1006,1024,1011,1024,1012,1024,1019,512,1068,640,1149,384,
  ]
  for (i=0; i<pos_pairs.length; i+=2) {
    ret[pos_pairs[i]] = pos_pairs[i+1]
  }
  return ret
}

var POS_MAP = pos_map()

// skip as many bytes of src that match bsrc, up to lim.
// return
//     i    the new index after all bytes are matched (past matched bytes)
//    -i    (negative) the index of the first unmatched byte (past matched bytes)
function skip_bytes (src, off, lim, bsrc) {
  var blen = bsrc.length
  if (blen > lim - off) { blen = lim - off }
  var i = 0
  while (bsrc[i] === src[i + off] && i < blen) { i++ }
  return i === bsrc.length ? i + off : -(i + off)
}

function skip_str (src, off, lim) {
  for (var i = off; i < lim; i++) {
    if (src[i] === 34) {
      if (src[i - 1] === 92) {
        // count number of escapes going backwards (n = escape count +1)
        for (var n = 2; src[i - n] === 92 && i - n >= off; n++) {}          // \ BACKSLASH escape
        if (n % 2 === 1) {
          return i + 1  // skip quote
        }
      } else {
        return i + 1  // skip quote
      }
    }
  }
  return -i
}

function skip_dec (src, off, lim) {
  while (off < lim && (CMAP[src[off]] & DECIMAL_ASCII)) { off++ }
  return (off < lim && (CMAP[src[off]] & DELIM)) ? off : -off
}

function init (ps) {
  ps.soff = ps.soff || 0                  // prior src offset.  e.g. ps.soff + ps.vlim = total byte offset from start
  ps.src = ps.src || []
  ps.lim = ps.lim == null ? ps.src.length : ps.lim
  ps.koff = ps.koff || ps.soff            // key offset
  ps.klim = ps.klim || ps.koff            // key limit
  ps.voff = ps.voff || ps.klim            // value offset
  ps.vlim = ps.vlim || ps.voff            // value limit
  ps.tok = ps.tok || 0                    // token/byte being handled
  ps.stack = ps.stack || []               // context ascii codes 91 (array) and 123 (object)
  ps.pos = ps.pos || POS.A_BF             // container context and relative position encoded as an int
  ps.ecode = ps.ecode || 0                // end-code (error or state after ending, where ps.tok === 0)
  ps.vcount = ps.vcount || 0              // number of complete values parsed
  ps.line = ps.line || 1                  // newline count (char 0x0A) + 1
  ps.lineoff = ps.lineoff || ps.soff      // offset after last line. (column = vlim - lineoff)
  if (ps.next_src) { next_src(ps) }
}

// switch ps.src to ps.next_src if conditions are right (ps.src is null or is complete without errors)
function next_src (ps) {
  if (ps.ecode || (ps.src && ps.vlim < ps.lim)) {
    return false
  }
  if (ps.next_src.length === 0) {
    ps.next_src = null
    return false
  }
  ps.soff += ps.src && ps.src.length || 0
  ps.src = ps.next_src
  ps.next_src = null
  ps.koff = ps.klim = ps.voff = ps.vlim = ps.tok = ps.ecode = 0
  ps.lim = ps.src.length
  return true
}

function next (ps, opt) {
  if (!ps.pos) { init(ps) }
  if (ps.ecode !== 0) {                               // ecode is sticky (requires intentional fix)
    return ps.tok = 0
  }
  ps.koff = ps.klim = ps.voff = ps.vlim
  var pos1 = ps.pos
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
        ps.vlim = skip_bytes(ps.src, ps.vlim, ps.lim, FALSE_BYTES)
        pos1 = POS_MAP[ps.pos | ps.tok]
        if (pos1 === 0) return handle_unexp(ps, opt)
        if (ps.vlim > 0) { ps.pos = pos1; ps.vcount++; return ps.tok } else return handle_neg(ps, opt)
      case 110:                                         // n    null
        ps.vlim = skip_bytes(ps.src, ps.vlim, ps.lim, NULL_BYTES)
        pos1 = POS_MAP[ps.pos | ps.tok]
        if (pos1 === 0) return handle_unexp(ps, opt)
        if (ps.vlim > 0) { ps.pos = pos1; ps.vcount++; return ps.tok } else return handle_neg(ps, opt)
      case 116:                                         // t    true
        ps.vlim = skip_bytes(ps.src, ps.vlim, ps.lim, TRUE_BYTES)
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
  return end_src(ps)
}

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

function err (msg, ps) {
  var ctx = '(line ' + (ps.line + 1) + ', col ' + (ps.soff + ps.voff - ps.lineoff) + ', tokstr ' + tokstr(ps, true) + ')'
  var e = new Error(msg + ': ' + ctx)
  e.parse_state = ps
  throw e
}

function checke (ps) {
  ps.ecode !== ECODE.UNEXPECTED || err('unexpected token at ' + ps.voff + '..' + ps.vlim, ps)
  ps.ecode !== ECODE.BAD_VALUE || err('bad value at ' + ps.voff + '..' + ps.vlim, ps)
}

function tokstr (ps, detail) {
  var keystr = ps.koff === ps.klim ? '' : 'k' + (ps.klim - ps.koff) + '@' + ps.koff + ':'
  var vlen = (ps.vlim === ps.voff || (CMAP[ps.tok] & NO_LEN_TOKENS)) ? '' : ps.vlim - ps.voff

  var tchar = ps.tok && String.fromCharCode(ps.tok) || '!'
  var ret = keystr + tchar + vlen + '@' + ps.voff
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

//
// The following functions are NOT highly optimized like the super-charged code above.  These functions
// support some convenient operations of the optional ParseState object, which make working with
// raw buffers a bit simpler.
//
function buf2str (src, off, lim) {
  return src.slice(off, lim).toString()
}

function buf2num (src, off, lim) {
  return Number(buf2str(src, off, lim))
}

function arr_equal (a, aoff, alim, b, boff, blim) {
  return arr_cmp(a, aoff, alim, b, boff, blim) === 0
}

function arr_cmp (a, off_a, lim_a, b, off_b, lim_b) {
   off_a = off_a || 0
   off_b = off_b || 0
   if (lim_a == null) { lim_a = a.length }
   if (lim_b == null) { lim_b = b.length }

   var len_a = lim_a - off_a
   var len_b = lim_b - off_b
   var lim = off_a + (len_a < len_b ? len_a : len_b)
   var adj = off_a - off_b
   while (off_a < lim) {
     if (a[off_a] !== b[off_a - adj]) {
       return a[off_a] > b[off_a - adj] ? 1 : -1
     }
     off_a++
   }
   return len_a === len_b ? 0 : len_a > len_b ? 1 : -1
}

function ParseState (src, opt) {
  opt = opt || {}
  if (opt.buf2str == null && src.constructor.name !== 'Buffer') {
    throw Error('ParseState requires a Buffer src (in node) or a custom buf2str method')
  }
  this.src = src
  init(this)
  this.buf2str = opt.buf2str || buf2str
  this.buf2num = opt.buf2num || buf2num
}

//
// ParseState is an optional object for holding parse state. Though only a simple plain
// object is required, ParseState provides convenience for viewing keys and values.  It is NOT
// complete and thorough (does not check finite numbers etc), but helpful for getting started.
//
ParseState.prototype = {
  constructor: ParseState,
  get key () {
    if (this.klim <= this.koff) {
      return null
    }
    return this.buf2str(this.src, this.koff + 1, this.klim - 1)
  },
  get val () {
    if (this.vlim <= this.voff) {
      return null
    }
    switch (this.tok) {
      case TOK.TRU:
        return true
      case TOK.FAL:
        return false
      case TOK.ARR: case TOK.ARR_END:
      case TOK.OBJ: case TOK.OBJ_END:
      return String.fromCharCode(this.tok)
      case TOK.STR:
        return this.buf2str(this.src, this.voff + 1, this.vlim - 1)  // strip quotes
      case TOK.DEC:
        return this.buf2num(this.src, this.voff, this.vlim)
      default:
        return null
    }
  },
  key_equal: function (a, off, lim) {
    return this.key_cmp(a, off, lim) === 0
  },
  key_cmp: function (a, off, lim) {
    return arr_cmp(this.src, this.koff + 1, this.klim - 1, a, off || 0, lim == null ? a.length : lim)
  },
  val_equal: function (a, off, lim) {
    return this.val_cmp(a, off, lim) === 0
  },
  val_cmp: function (a, off, lim) {
    off = off || 0
    if (lim == null) { lim = a.length }
    return (this.tok === TOK.STR)
      ? arr_cmp(this.src, this.voff + 1, this.vlim - 1, a, off, lim)  // strip quotes
      : arr_cmp(this.src, this.voff, this.vlim, a, off, lim)
  },
  tokstr: function (detail) {
    return tokstr(this, detail)
  },
  to_obj () {
    return {
      tokstr: this.tokstr(),
      key: this.key,
      val: this.val,
      line: this.line,
      col: this.soff + this.vlim - this.lineoff,
      pos: POS2NAME[this.pos]
    }
  },
  toString: function () {
    return JSON.stringify(this.to_obj())
  },
}

next.new_ps = function (src, opt) { return new ParseState(src, opt) }
next.arr_equal = arr_equal
next.arr_cmp = arr_cmp
next.next = next
next.tokstr = tokstr
next.posname = posname
next.checke = checke
next.err = err
next.TOK = TOK
next.POS = POS
next.ECODE = ECODE

next._init = init
next._skip_str = skip_str
next._skip_dec = skip_dec
next._skip_bytes = skip_bytes
next._POS_MAP = POS_MAP
next._AFLAG = {
  NON_TOKEN: NON_TOKEN,
  DELIM: DELIM,
  DECIMAL_END: DECIMAL_END,
  DECIMAL_ASCII: DECIMAL_ASCII,
  NO_LEN_TOKENS: NO_LEN_TOKENS,
}

module.exports = next