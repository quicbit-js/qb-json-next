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

// run this script to generate pos_pairs and CMAP variables to stdout (can be copied and
// pasted into index.js).

var next = require('.')

var POS = next.POS
var AFLAG = next._AFLAG

// create an int-int map from (pos + tok) -- to --> (new pos)
function define_pos_map () {
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

function print_pos_map (items_per_line) {
  var pos_map = define_pos_map()
  var flat = []
  for (var i=0; i<pos_map.length; i++) {
    if (pos_map[i] !== 0) {
      flat.push(i)
      flat.push(pos_map[i])
    }
  }
  // segment into lines of length 20
  var lines = []
  while (flat.length) {
    var rem = Math.min(flat.length, items_per_line)
    var line = []
    for (j=0; j<rem; j++) {
      line.push(flat.shift())
    }
    lines.push(line)
  }

  console.log('var pos_pairs = [')
  lines.forEach(function (line) {
    // line = line.map(function (v) { return '0x' + v.toString(16).toUpperCase() })
    console.log('  ', line.join(',') + ',')
  })
  console.log(']')
}

function map_ascii (s, code, map) {
  s.split('').forEach(function (c) { map[c.charCodeAt(0)] |= code })
}

function define_ascii_map () {
  var ret = new Uint8Array(0x800)
  map_ascii('\b\f\n\t\r ,:',      AFLAG.NON_TOKEN, ret)
  map_ascii('\b\f\n\t\r ,:{}[]',  AFLAG.DELIM, ret)
  map_ascii('0123456789',         AFLAG.DECIMAL_END, ret)
  map_ascii('-0123456789+.eE',    AFLAG.DECIMAL_ASCII, ret)
  map_ascii('tfn[]{}()',          AFLAG.NO_LEN_TOKENS, ret)
  return ret
}

function lpad (s, c, l) {
  while (s.length < l) {s = c + s}
  return s
}

function print_ascii_map () {
  var m = define_ascii_map()
  console.log('var CMAP = [')
  console.log('//0     1     2     3     4     5     6     7     8     9     A     B     C     D     E     F')
  for (var row=0; row<16; row++) {
    var line = []
    for (var col=0; col<16; col++) {
      var v = m[(row * 16) + col]
      var vstr = v ? '0x' + lpad(v.toString(16).toUpperCase(), 0, 2) + ', ' : '0,    '
      line.push(vstr)
    }
    console.log(' ', line.join('') + '//', row.toString(16).toUpperCase())
  }
  console.log(']')
}

console.log('Place these generated character mappings into the index.js code when changes are made:')
print_pos_map(16)
print_ascii_map()
