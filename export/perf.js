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
const next = require('..')

function parse (buf) {
  const t0 = new Date()
  const ps = {next_src: buf}
  while (next(ps)) {}
  return new Date() - t0;
}

const fname = '/Users/dad/dev/json-samples/cache_150mb.json'
const buf = fs.readFileSync(fname)
console.log('tokenized with jnext:')
console.log('read', fname)

const iter = 5
let total_ms = 0
for (let i=0; i<iter; i++) {
  let ms = parse(buf)
  console.log('parsed ' + (buf.length/(1024*1024)) + ' MB in', ms/1000, 'seconds')
  total_ms += ms
}

console.log(iter * buf.length / ((total_ms/1000) * 1024 * 1024) + ' MB/second')

/*
Test result on 2014 Macbook Pro: 2023-06-16:

dads-MacBook-Pro:export dad$ node perf.js 
tokenized with jnext:
read /Users/dad/dev/json-samples/cache_150mb.json
parsed 144.33352184295654 MB in 0.453 seconds
parsed 144.33352184295654 MB in 0.454 seconds
parsed 144.33352184295654 MB in 0.441 seconds
parsed 144.33352184295654 MB in 0.437 seconds
parsed 144.33352184295654 MB in 0.458 seconds
321.742135182694 MB/second

Result on 2023 MacBook Pro M2 chip (x64 interpreted): 2024-01-20
read /Users/dad/dev/json-samples/cache_150mb.json
parsed 144.33352184295654 MB in 0.612 seconds
parsed 144.33352184295654 MB in 0.642 seconds
parsed 144.33352184295654 MB in 0.636 seconds
parsed 144.33352184295654 MB in 0.636 seconds
parsed 144.33352184295654 MB in 0.635 seconds
228.30357773324351 MB/second

Result on 2023 MacBook Pro M2 chip (arm native): 2024-01-20

read /Users/dad/dev/json-samples/cache_150mb.json
parsed 144.33352184295654 MB in 0.319 seconds
parsed 144.33352184295654 MB in 0.329 seconds
parsed 144.33352184295654 MB in 0.325 seconds
parsed 144.33352184295654 MB in 0.326 seconds
parsed 144.33352184295654 MB in 0.325 seconds
444.3766066593489 MB/second

 */