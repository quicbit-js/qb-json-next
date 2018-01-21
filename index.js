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

// quick parse positions - LSB (0x7F) are reserved for token ascii value.
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

var TOK = {
  // ascii codes - for all but decimal, token is represented by the first ascii byte encountered
  ARR: 91,   // '['
  ARR_END: 93,   // ']'
  DEC: 100,  // 'd'  - a decimal value starting with: -, 0, 1, ..., 9
  FAL: 102,  // 'f'
  NUL: 110,  // 'n'
  STR: 115,  // 's'  - a string value starting with "
  TRU: 116,  // 't'
  OBJ: 123,  // '{'
  OBJ_END:  125,  // '}'
}

var ECODE = {
  // for an unexpected or illegal value, or if src limit is reached before a value is complete, ps.tok will be zero
  // and ps.ecode will be one of the following:
  BAD_VALUE: 66,    // 'B'  encountered invalid byte or series of bytes
  TRUNC_DEC: 68,    // 'D'  end of buffer was value was a decimal ending with a digit (0-9). it is *possibly* unfinished
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

  // 0 = no context (comma separated values)
  // (s0 ctxs +       s0 positions + tokens) -> s1
  map([POS.A_BF, POS.A_BV], val, POS.A_AV)
  map([POS.A_AV], ',', POS.A_BV)

  map([POS.A_BF, POS.A_BV, POS.O_BV], '[', POS.A_BF)
  map([POS.A_BF, POS.A_BV, POS.O_BV], '{', POS.O_BF)

  map([POS.O_AV], ',', POS.O_BK)
  map([POS.O_BF, POS.O_BK], 's', POS.O_AK)      // s = string
  map([POS.O_AK], ':', POS.O_BV)
  map([POS.O_BV], val, POS.O_AV)

  // ending of object and array '}' and ']' are handled by checking the stack
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

var WHITESPACE = ascii_to_code('\b\f\n\t\r ', 1)
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
  ps.src || err('missing src property', ps)
  ps.lim = ps.lim == null ? ps.src.length : ps.lim
  ps.koff = ps.koff || 0                  // key offset
  ps.klim = ps.klim || ps.koff            // key limit
  ps.voff = ps.voff || ps.klim            // value offset
  ps.vlim = ps.vlim || ps.voff            // value limit
  ps.tok = ps.tok || 0                    // token/byte being handled
  ps.stack = ps.stack || []               // ascii codes 91 and 123 for array / object depth
  ps.pos = ps.pos || POS.A_BF             // container context and relative position encoded as an int
  ps.ecode = ps.ecode || 0                // end-code (error or state after ending, where ps.tok === 0)
  ps.vcount = ps.vcount || 0              // number of complete values parsed
  return ps
}

function next (ps) {
  ps.koff = ps.klim
  ps.voff = ps.vlim
  var pos1 = ps.pos
  while (ps.vlim < ps.lim) {
    ps.voff = ps.vlim
    ps.tok = ps.src[ps.vlim++]
    switch (ps.tok) {
      case 8: case 9: case 10: case 12: case 13: case 32:
        if (WHITESPACE[ps.src[ps.vlim]] === 1 && ps.vlim < ps.lim) {             // 119 = 'w' whitespace
          while (WHITESPACE[ps.src[++ps.vlim]] === 1 && ps.vlim < ps.lim) {}
        }
        continue

      case 44:                                          // ,    COMMA
      case 58:                                          // :    COLON
        pos1 = POS_MAP[ps.pos | ps.tok]
        if (pos1 === 0) { ps.voff = ps.vlim - 1; return handle_unexp(ps) }
        ps.pos = pos1
        continue

      case 34:                                          // "    QUOTE
        ps.tok = 115                                    // s for string
        ps.vlim = skip_str(ps.src, ps.vlim, ps.lim)
        pos1 = POS_MAP[ps.pos | ps.tok]
        if (pos1 === 0) return handle_unexp(ps)
        if (pos1 === POS.O_AK) {
          // key
          ps.koff = ps.voff
          if (ps.vlim > 0) { ps.pos = pos1; ps.klim = ps.voff = ps.vlim; continue } else { ps.klim = ps.voff = -ps.vlim; return handle_neg(ps) }
        } else {
          // value
          if (ps.vlim > 0) { ps.pos = pos1; ps.vcount++; return ps.tok } else return handle_neg(ps)
        }

      case 102:                                         // f    false
      case 110:                                         // n    null
      case 116:                                         // t    true
        ps.vlim = skip_bytes(ps.src, ps.vlim, ps.lim, TOK_BYTES[ps.tok])
        pos1 = POS_MAP[ps.pos | ps.tok]
        if (pos1 === 0) return handle_unexp(ps)
        if (ps.vlim > 0) { ps.pos = pos1; ps.vcount++; return ps.tok } else return handle_neg(ps)

      case 48:case 49:case 50:case 51:case 52:          // 0-4    digits
      case 53:case 54:case 55:case 56:case 57:          // 5-9    digits
      case 45:                                          // '-'    ('+' is not legal here)
        ps.tok = 100                                    // d for decimal
        ps.vlim = skip_dec(ps.src, ps.vlim, ps.lim)
        pos1 = POS_MAP[ps.pos | ps.tok]
        if (pos1 === 0) return handle_unexp(ps)
        if (ps.vlim > 0) { ps.pos = pos1; ps.vcount++; return ps.tok } else return handle_neg(ps)

      case 91:                                          // [    ARRAY START
      case 123:                                         // {    OBJECT START
        pos1 = POS_MAP[ps.pos | ps.tok]
        if (pos1 === 0) return handle_unexp(ps)
        ps.pos = pos1
        ps.stack.push(ps.tok)
        return ps.tok

      case 93:                                          // ]    ARRAY END
        if (ps.pos !== POS.A_BF && ps.pos !== POS.A_AV) return handle_unexp(ps)
        ps.stack.pop()
        ps.pos = ps.stack[ps.stack.length - 1] === 123 ? POS.O_AV : POS.A_AV
        ps.vcount++; return ps.tok

      case 125:                                         // }    OBJECT END
        if (ps.pos !== POS.O_BF && ps.pos !== POS.O_AV) return handle_unexp(ps)
        ps.stack.pop()
        ps.pos = ps.stack[ps.stack.length - 1] === 123 ? POS.O_AV : POS.A_AV
        ps.vcount++; return ps.tok

      default:
        --ps.vlim
        ps.ecode = ECODE.BAD_VALUE
        return end_src(ps)
    }
  }

  // reached src limit without error or truncation
  ps.ecode = 0
  if (NON_TOKEN[ps.tok]) {
    ps.voff = ps.vlim
  }
  return end_src(ps)
}

function end_src (ps) {
  if (ps.koff === ps.klim) { ps.koff = ps.klim = ps.voff }  // simplify state
  return ps.tok = 0    // End
}

function handle_neg (ps) {
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
  return end_src(ps)
}

function handle_unexp (ps) {
  if (ps.vlim < 0) { ps.vlim = -ps.vlim }
  ps.ecode = ECODE.UNEXPECTED
  return end_src(ps)
}

function err (msg, ps) {
  var e = new Error(msg + ': ' + tokstr(ps, true))
  e.parse_state = ps
  throw e
}

function tokstr (ps, detail) {
  var keystr = ps.koff === ps.klim ? '' : 'k' + (ps.klim - ps.koff) + '@' + ps.koff + ':'
  var vlen = (NO_LEN_TOKENS[ps.tok] || ps.vlim === ps.voff) ? '' : ps.vlim - ps.voff

  var tchar = ps.tok && String.fromCharCode(ps.tok) || '!'
  var ret = keystr + tchar + vlen + '@' + ps.voff
  if (ps.ecode) {
    ret += String.fromCharCode(ps.ecode)
  }
  if (detail) {
    ret += ':' + posname(ps.pos)
    if (ps.stack && ps.stack.length) {
      ret += ':' + ps.stack.map(function (c) { return String.fromCharCode(c) }).join('')
    }
  }
  return ret
}

next.init = init
next.next = next
next.tokstr = tokstr
next.posname = posname
next.TOK = TOK
next.POS = POS
next.ECODE = ECODE

module.exports = next