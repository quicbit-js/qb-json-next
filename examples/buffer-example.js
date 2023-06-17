const next = require('../index')
const ps = {}   // to hold parse state

console.log('First object:')
ps.next_src = Buffer.from('{ "a": [1,2,3] }')
while (next(ps)) {
  console.log(next.tokstr(ps))
}

console.log()
console.log('Second object with detail = true:')
ps.next_src = Buffer.from(', { "b": [4,5,6] }')
while (next(ps)) {
  console.log(next.tokstr(ps, true))
}
