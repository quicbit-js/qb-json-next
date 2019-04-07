// simply time parsing a json file.

var fs = require('fs')
var next = require('..')

var fname = process.argv[2]
if (!fname) {
  console.error('usage: time-parse json-file')
  process.exit(1)
}

fs.readFile(fname, function (err, data) {
  if (err) throw err
  var ps = next.new_ps(data)
  var t0 = new Date()
  while (next(ps)) {}
  var t1 = new Date()
  console.log('time:', (t1 - t0)/1000, 'seconds')
})
