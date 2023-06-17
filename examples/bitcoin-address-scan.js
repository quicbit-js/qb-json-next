const fs = require('fs')
const next = require('..')

// find all 'addr' fields that start with '3'
fs.readFile('bitcoin-transactions.json', function (err, data) {
  console.log(
    '\n' +
    'Find all addresses that start with "3" using only binary comparisons in the search (no string creation).' +
    '\n'
  )
  const addr_buf = str2buf('addr')
  const ascii_3 = '3'.charCodeAt(0)

  if (err) throw err
  const ps = { next_src: data }
  while (next(ps)) {
    // CUSTOM condition checks on raw buffer (fastest to slowest)
    if (
      ps.klim > ps.koff &&                                                            // is a key/value pair
      ps.src[ps.voff + 1] === ascii_3 &&                                              // value starts with '3'
      arr_cmp(addr_buf, 0, addr_buf.length, ps.src, ps.koff + 1, ps.klim - 1) === 0   // key === 'addr'
    ){
      console.log('address:', buf2str(ps.src, ps.voff + 1, ps.vlim - 1))
    }
  }
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


