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

const fs = require('fs')

function parse (buf) {
  const t0 = new Date()
  const len = buf.length
  for (let i=0; i<len; i++) {
    if (buf[i] == 0)
      throw Error('oops')
  }
  return new Date() - t0;
}

const fname = '/Users/dad/dev/json-samples/cache_150mb.json'
const buf = fs.readFileSync(fname)
console.log('theoretical maximum - no processing')
console.log('read', fname)

const size_mb = buf.length/(1024*1024)
const iter = 5
let total_ms = 0
for (let i=0; i<iter; i++) {
  let ms = parse(buf)
  total_ms += ms
  console.log('parsed ' + size_mb + ' MB in', ms/1000, 'seconds')
}

console.log(iter * size_mb / (total_ms/1000) + ' MB/second')

/*
Test result on 2014 Macbook Pro: 2023-06-16:

dads-MacBook-Pro:export dad$ node perf_max.js
theoretical maximum - no processing
read /Users/dad/dev/json-samples/cache_150mb.json
parsed 144.33352184295654 MB in 0.285 seconds
parsed 144.33352184295654 MB in 0.292 seconds
parsed 144.33352184295654 MB in 0.334 seconds
parsed 144.33352184295654 MB in 0.352 seconds
parsed 144.33352184295654 MB in 0.334 seconds
451.8895486629823 MB/second
 */