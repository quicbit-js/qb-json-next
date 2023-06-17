const fs = require('fs')
const next = require('..')
const fname = '/Users/dad/dev/json-samples/cache_150mb.json'
fs.readFile(fname, function (err, data) {
  console.log(
    '\n' +
    'Count the occurences of "license" keys in a npm index and occurences where license is "ISC"' +
    '\n'
  )
  const t0 = new Date()
  const license_buf = str2buf('license')
  const ISC_buf = str2buf('ISC')
  const MIT_buf = str2buf('MIT')

  if (err) throw err
  const ps = { next_src: data }
  let num_tok = 0
  let num_ISC = 0
  let num_MIT = 0
  let num_license = 0
  while (next(ps)) {
    // CUSTOM condition checks on raw buffer (fastest to slowest)
    if (
      ps.stack.length < 4 && 
      ps.klim > ps.koff &&                                                                    // is a key/value pair
      arr_cmp(license_buf, 0, license_buf.length, ps.src, ps.koff + 1, ps.klim - 1) === 0     // key === 'license'
    ) {
      num_license++
      if (arr_cmp(ISC_buf, 0, ISC_buf.length, ps.src, ps.voff + 1, ps.vlim - 1) === 0) {            // val === 'ISC
        num_ISC++
      } else if (arr_cmp(MIT_buf, 0, MIT_buf.length, ps.src, ps.voff+1, ps.vlim-1) === 0) {
        num_MIT++
      }
    }
    num_tok++
  }
  const t1 = new Date()
  console.log('parsed ' + (data.length/(1024*1024)) + ' MB in', (t1-t0)/1000, 'seconds')
  console.log(`${num_tok} tokens. ${num_license} license fields. ${num_ISC} ISC. ${num_MIT} MIT.`)
})

// Convert string to browser-supported buffer. ASCII-only. Not a production-worthy approach. Just for this demo.
function str2buf (s) {
  return Uint8Array.from(s.split('').map(function (c) { return c.charCodeAt(0) }))
}

// Convert buffer range with ascii into string. Not a production-worthy approach. Just for this demo.
function buf2str (b, off, lim) {
  return String.fromCharCode.apply(null, b.slice(off, lim))
}

// Utility function to compare two segments for two buffers.
// Note that qb-json-tokenizer includes this function and other similar helpers.
function arr_cmp (a, off_a, lim_a, b, off_b, lim_b) {
  off_a = off_a || 0
  off_b = off_b || 0
  if (lim_a == null) { lim_a = a.length }
  if (lim_b == null) { lim_b = b.length }

  const len_a = lim_a - off_a
  const len_b = lim_b - off_b
  const lim = off_a + (len_a < len_b ? len_a : len_b)
  const adj = off_a - off_b
  while (off_a < lim) {
    if (a[off_a] !== b[off_a - adj]) {
      return a[off_a] > b[off_a - adj] ? 1 : -1
    }
    off_a++
  }
  return len_a === len_b ? 0 : len_a > len_b ? 1 : -1
}


/*

Output on mid-2014 macbook pro with 8 CPU:

dads-MacBook-Pro:examples dad$ node npm-license-count.js 
Count the occurences of "license" keys in a npm index and occurences where license is "ISC"
parsed 202.25560569763184 MB in 0.788 seconds
9330237 tokens. 173384 license fields. 26220 ISC. 119328 MIT.

That's the formatted version. No whitespace is a bit quicker:
ads-MacBook-Pro:examples dad$ node npm-license-count.js 
Count the occurences of "license" keys in a npm index and occurences where license is "ISC"
parsed 144.33352184295654 MB in 0.552 seconds
9330240 tokens. 173384 license fields. 26220 ISC. 119328 MIT.

FOR COMPARISON, heres jq (jquery) and command-line count for the formatted version:
dads-MacBook-Pro:examples dad$ jq '.[] | .license' t2.json | grep  '^"ISC"$' | wc -l
   26220
(jq command took 10 seconds)
jq is also sensitive to the npm index file format so failed on one object in the actual NPM index file.

*/