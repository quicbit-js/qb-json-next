// simply time parsing a json file.

const fs = require('fs')
const next = require('..')

const fname = process.argv[2]
if (!fname) {
  console.error('usage: node time-parse JSON-FILE')
  process.exit(1)
}

fs.readFile(fname, function (err, data) {
  if (err) throw err
  const ps = { next_src: data }
  const t0 = new Date()
  while (next(ps)) {}
  const t1 = new Date()
  console.log('time:', (t1 - t0)/1000, 'seconds')
})
