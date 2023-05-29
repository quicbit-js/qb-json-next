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

var fs = require('fs')
var next = require('..')

function parse (buf) {
  var t0 = new Date()
  var ps = {src: buf}
  while (next(ps)) {}
  return new Date() - t0;
}

var fname = '/Users/dad/dev/json-samples/cache_150mb.json'
var buf = fs.readFileSync(fname)
console.log('read', fname)

var total_ms = 0
var iter = 5
for (var i=0; i<iter; i++) {
  var ms = parse(buf)
  console.log('parsed ' + (buf.length/(1024*1024)) + ' MB in', ms/1000, 'seconds')
  total_ms += ms
}

console.log(iter * buf.length / ((total_ms/1000) * 1024 * 1024) + ' MB/second')

/*
Test result on 2014 Macbook Pro: 2020-02-15:

/Users/dad/.nvm/versions/node/v8.10.0/bin/node /Users/dad/ghub/qb-json-next/export/perf.js
read /Users/dad/dev/json-samples/cache_150mb.json
parsed 144.33352184295654 MB in 0.549 seconds
parsed 144.33352184295654 MB in 0.549 seconds
parsed 144.33352184295654 MB in 0.565 seconds
parsed 144.33352184295654 MB in 0.545 seconds
parsed 144.33352184295654 MB in 0.534 seconds
263.19022947293314 MB/second


 */