# qb-json-next

Fast and simple incremental json parsing - can start and stop at any offset

# install

npm install qb-json-next

# usage

    var next = require('qb-json-next')
    
    // get a raw buffer or array of JSON somehow
    var src = new Buffer('{ "a": [1,2,3')    
    
    var ps = next.init({src: src})
    while (next(ps)) {
      // do whatever we need with the token and offset information here.  
      console.log(next.tokstr(ps))  // just print out a short summary of ps for this example
    }
    
    // we can continue parsing by setting ps.next_src to more content
    ps.next_src = new Buffer('",4,5], "b": true,')
    
    while (next(ps)) {
      console.log(next.tokstr(ps)) 
    }
    
    // and finish up
    ps.next_src = new Buffer(' }')
    
    while (next(ps)) {
        console.log(next.tokstr(ps)) 
    }
    

However, note that next_src will not handle split values or separation
of key and value:

    var ps = next.init(src: new Buffer('{ "a split'))
    while (next(ps)) { console.log(next.tokstr(ps)) }
    ps.next_src = new Buffer(' key": true }')
    
    next(ps)    // ERROR! - cannot complete split keys or values.  use qb-json-next-src to handle any split. 
    
Use qb-json-next-src to merge buffers at any valid state.    
