# qb-json-next

Fast and simple incremental JSON parsing with full represnetation of any parse state.

(see qb-json-next-src for how to parse across buffers from any point)

# install

npm install qb-json-next

# parsing a single JSON buffer

    var next = require('qb-json-next')
    var src = new Buffer('{ "a": [1,2,3] }') }
    var ps = next.init({src: src})
    while (next(ps)) {
      console.log(next.tokstr(ps))  // count or use ps token and offset properties
    }

# parsing multiple / split buffers with ps.next_src

The ps.next_src property is checked before returning from next() whenever ps.src is empty of finished.  It 
allows clients to continue parsing so long as values are cleanly separated between buffers.

    var next = require('qb-json-next')
    
    var ps = {}
    
    while (var src = getNextBufferSomehow()) {
        ps.next_src = src
        while (next(ps)) {
          console.log(next.tokstr(ps))  // count or use ps token and offset properties
        }
    }
    
A buffer can continue at any point so long as it does not divide a single value (string, number, true, false, null) 
or separate key and value start into separate buffers:

    src1                        src2                            split allowed?
    '['                         '11, 12, 13]'                   YES 
    '[11, 12'                   ', 13]'                         YES 
    '[11, 12, 13'               ']'                             YES 
    '{ '                        '}'                             YES   
    '{ "a": true '              '}'                             YES  
    '{ "a": true'               ', "b": false }'                YES  
    '{ "a": true, '             '"b": false }'                  YES  
    '{ "a": true, "b": ['       '82] }'                         YES - key "b" is in same buffer as array start
                                
    '[ 11, 1'                   '2, 13 ]'                       NO - split number 12
    '{ "a'                      '": true, "b": [82] }'          NO - split key "a" 
    '{ "a": true, "b": '        '[82] }'                        NO - key "b" is in different buffer as array start [  
    
To handle arbitrary buffer splits in a way that allows the client to use ps key and value offsets requires 
creation/concatenation of underlying sources.  **See qb-json-next-src** for a simple way to seamlessly manage
any buffer split.

