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
  var len = buf.length
  for (var i=0; i<len; i++) {
    if (buf[i] == 0)
      throw Error('oops')
  }
  return new Date() - t0;
}

var fname = '/Users/dad/dev/json-samples/cache_150mb.json'
var buf = fs.readFileSync(fname)
console.log('read', fname)

var total_ms = 0
var size_mb = buf.length/(1024*1024)
var iter = 5
for (var i=0; i<iter; i++) {
  var ms = parse(buf)
  total_ms += ms
  console.log('parsed ' + size_mb + ' MB in', ms/1000, 'seconds')
}

console.log(iter * size_mb / (total_ms/1000) + ' MB/second')

/*
Mid-2014 Macbook Pro:

/Users/dad/.nvm/versions/node/v8.10.0/bin/node /Users/dad/ghub/qb-json-next/export/perf_max.js
read /Users/dad/dev/json-samples/cache_150mb.json
parsed 144.33352184295654 MB in 0.328 seconds
parsed 144.33352184295654 MB in 0.28 seconds
parsed 144.33352184295654 MB in 0.279 seconds
parsed 144.33352184295654 MB in 0.296 seconds
parsed 144.33352184295654 MB in 0.28 seconds
493.27929543047344 MB/second

 */