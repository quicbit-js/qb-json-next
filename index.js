// Software License Agreement (ISC License)
//
// Copyright (c) 2018, Matthew Voss
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
  ARR: 91,        // '['    - array start
  ARR_END: 93,    // ']'    - array end
  DEC: 100,       // 'd'    - a decimal value starting with: -, 0, 1, ..., 9
  FAL: 102,       // 'f'    - false
  NUL: 110,       // 'n'    - null
  STR: 115,       // 's'    - a string value starting with "
  TRU: 116,       // 't'    - true
  OBJ: 123,       // '{'    - object start
  OBJ_END:  125,  // '}'    - object end
}

// for an unexpected or illegal value, or if src limit is reached before a value is complete, ps.tok will be zero
// and ps.ecode will be one of the following:
var ECODE = {
  BAD_VALUE: 66,    // 'B'  encountered invalid byte or series of bytes
  TRUNC_DEC: 68,    // 'D'  end of buffer was a decimal ending with a digit (0-9). it is *possibly* unfinished
  KEY_NO_VAL: 75,   // 'K'  object key complete, but value did not start
  TRUNCATED: 84,    // 'T'  key or value was unfinished at end of buffer
  UNEXPECTED: 85,   // 'U'  encountered a recognized token in wrong place/context
}

var POS2NAME = Object.keys(POS).reduce(function (a, n) { a[POS[n]] = n; return a }, [])

function posname (pos) { return POS2NAME[pos] || '???' }

// create an int-int map from (pos + tok) -- to --> (new pos)
function pos_map () {
  var ret = []
  var max = 0x400 + 0x7F            // max pos + max ascii
  for (var i = 0; i <= max; i++) {
    ret[i] = 0
  }

  // map ( [ctx], [pos0], [ascii] ) => pos1
  var map = function (s0_arr, chars, s1) {
    s0_arr.forEach(function (s0) {
      for (var i = 0; i < chars.length; i++) {
        ret[s0 | chars.charCodeAt(i)] = s1
      }
    })
  }

  var val = 'ntfds' // legal value starts (null, true, false, decimal, string)

  //   position(s) + token(s) -> new position
  map([POS.A_BF, POS.A_BV], val, POS.A_AV)
  map([POS.A_AV], ',', POS.A_BV)

  map([POS.A_BF, POS.A_BV, POS.O_BV], '[', POS.A_BF)
  map([POS.A_BF, POS.A_BV, POS.O_BV], '{', POS.O_BF)

  map([POS.A_BF, POS.A_AV], ']', POS.A_AV)      // use any non-zero value for new position - stack is used instead
  map([POS.O_BF, POS.O_AV], '}', POS.A_AV)      // use any non-zero value for new position - stack is used instead

  map([POS.O_AV], ',', POS.O_BK)
  map([POS.O_BF, POS.O_BK], 's', POS.O_AK)      // s = string
  map([POS.O_AK], ':', POS.O_BV)
  map([POS.O_BV], val, POS.O_AV)

  return ret
}

var POS_MAP = pos_map()

function ascii_to_code (s, code, ret) {
  ret = ret || new Uint8Array(0x7F)
  s.split('').forEach(function (c) { ret[c.charCodeAt(0)] = code })
  return ret
}

// convert map of strings to array of arrays (of bytes)
function ascii_to_bytes (strings) {
  return Object.keys(strings).reduce(function (a, c) {
    a[c.charCodeAt(0)] = strings[c].split('').map(function (c) { return c.charCodeAt(0) })
    return a
  }, [])
}

var NON_TOKEN = ascii_to_code('\b\f\n\t\r ,:', 1)     // token values used internally (and not returned)
var DELIM = ascii_to_code('\b\f\n\t\r ,:{}[]', 1)
var DECIMAL_END = ascii_to_code('0123456789', 1)
var DECIMAL_ASCII = ascii_to_code('-0123456789+.eE', 1)
var TOK_BYTES = ascii_to_bytes({ f: 'alse', t: 'rue', n: 'ull' })
var NO_LEN_TOKENS = ascii_to_code('tfn[]{}()', 1)

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
  while (off < lim && DECIMAL_ASCII[src[off]] === 1) { off++ }
  return (off < lim && DELIM[src[off]] === 1) ? off : -off
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
  ps.line = ps.line || 0                  // line count (0x0A)
  ps.lineoff = ps.lineoff || ps.soff      // offset after last line. (column = vlim - lineoff)
  if (ps.next_src) { next_src(ps) }
  return ps
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
  if (NON_TOKEN[ps.tok]) {
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
        // return ps.next_src && next_src(ps) ? next(ps) : ps.tok
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
      ps.tok === TOK.DEC &&
      DECIMAL_END[ps.src[ps.vlim - 1]]
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
  var ctx = '(line ' + (ps.line + 1) + ', col ' + (ps.soff + ps.voff - ps.lineoff + 1) + ', tokstr ' + tokstr(ps, true) + ')'
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
  var vlen = (NO_LEN_TOKENS[ps.tok] || ps.vlim === ps.voff) ? '' : ps.vlim - ps.voff

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
next._TOK_BYTES = TOK_BYTES

module.exports = next