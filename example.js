var next = require('.')

console.log('First object:')
var ps = {src: new Buffer('{ "a": [1,2,3] }')}
while (next(ps)) {
  console.log(next.tokstr(ps))
}

console.log('Second object with detail = true:')
ps.next_src = new Buffer(', { "b": [4,5,6] }')
while (next(ps)) {
  console.log(next.tokstr(ps, true))
}
