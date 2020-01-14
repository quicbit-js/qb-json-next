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

var fs = require('fs')
var next = require('..')

function parse (buf) {
  var t0 = new Date()
  var ps = {src: buf}
  while (next(ps)) {}
  var t1 = new Date()
  console.log('parsed ' + (buf.length/(1024*1024)) + ' MB in', (t1 - t0)/1000, 'seconds')
}

var fname = '/Users/dad/dev/json-samples/cache_150mb.json'
var buf = fs.readFileSync(fname)
console.log('read', fname)

for (var i=0; i<5; i++) {
  parse(buf)
}

