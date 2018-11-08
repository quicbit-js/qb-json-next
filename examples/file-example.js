// parsing a file in one read (small to medium files)
// see qb-json-align for an example of incrementally parsing any-size large file with qb-json-next.

var fs = require('fs')
var next = require('..')

fs.readFile('./bitcoin-transactions.json', function (err, data) {
    console.log(
        'This is the simplest approach.  It uses next.new_ps() and ps.key to print all ' + '\n' +
        'bitcoin "addr" fields.' + '\n' +
        '(like other parsers, this approach creates string keys which is costly' + '\n' +
        'for very large files)' + '\n'
    )
    if (err) throw err
    var ps = next.new_ps(data)
    while (next(ps)) {
        if (ps.key === 'addr') {
            console.log('address:', ps.val)
        }
    }
})

fs.readFile('./bitcoin-transactions.json', function (err, data) {
    console.log(
        '\n' +
        'Here is a simple approach using buffer for comparison instead of ps.key - it creates ' + '\n' +
        'no strings until a match is found and so can be much more efficient than ps.key.' + '\n'
    )
    var addr = Uint8Array.from('addr'.split('').map(function (c) {return c.charCodeAt(0)}))
    if (err) throw err
    var ps = next.new_ps(data)
    while (next(ps)) {
        if (ps.key_equal(addr)) {
            console.log('address:', ps.val)
        }
    }
})

fs.readFile('./bitcoin-transactions.json', function (err, data) {
    console.log(
        '\n' +
        'This is a raw approach to do the same thing.\n' +
        'It does not create any strings and works in any environment or browser (no node required).  A method ' + '\n' +
        'like this in conjunction with qb-json-align for incremental file' + '\n' +
        'handling can approach the best possible performance.' + '\n'
    )
    var addr = Uint8Array.from('addr'.split('').map(function (c) {return c.charCodeAt(0)}))
    if (err) throw err
    var ps = {src: data}        // using a plain object for parse state
    while (next(ps)) {
        if (ps.klim > ps.koff && next.arr_equal(addr, 0, addr.length, ps.src, ps.koff + 1, ps.klim - 1)) {
            console.log('address:', String.fromCharCode.apply(null, ps.src.slice(ps.voff+1, ps.vlim-1)))
        }
    }
})


