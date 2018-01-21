# qb-json-next

Fast and simple incremental JSON parsing with full represnetation of any parse state.

(see qb-json-next-src for how to parse across buffers from any point)

# install

npm install qb-json-next

# parsing a single JSON buffer

    var next = require('qb-json-next')
    
    var ps = {src: new Buffer('{ "a": [1,2,3] }') }}
    while (next(ps)) {
      console.log(next.tokstr(ps))  // ps ("parse-state") has token and offset information
    }
    
    Output:
    
    > {@0                       // start of object at 0
    > k3@2:[@7                  // key (3 bytes) at 2, start of array at 7                        
    > d1@8                      // decimal (1 byte) at 8
    > d1@10                     // decimal (1 byte) at 10
    > d1@12                     // decimal (1 byte) at 12
    > ]@13                      // end array at 13
    > }@15                      // end object at 15

# the parse-state (ps)

Each call to next(ps) updates the given parse-state object, abbreviated 'ps'.  parse-state has the following 
properties:

    {
        src:        // [byt] - the source buffer being read
        next_src    // [byt] - the next source buffer to continue reading (optional)
        vcount:     // int   - value count - number of values or key-values parsed so far (completed)
        koff:       // int   - key offset
        klim:       // int   - key limit
        tok:        // int   - token - integer indicating what was parsed or encountered, see chart
        voff:       // int   - value offset
        vlim:       // int   - value limit
        stack:      // [byt] - ascii open brackets representing array or object containers and depth
        pos:        // int   - relative parse position code (before value, after key...) - see qb-json-tokv
    }
    
src and next_src are the current buffer and next buffer to parse.  When next reaches the src limit,
next_src is moved to src and parsing is set to continue with the new buffer 
(koff, klim, voff, and vlim are set to zero).

parse-state is designed to be as efficient as possible at the cost of some readability, using the same fast integers that
allows next() to work quickly.  The following functions and data are included as properties of next() to
help work with this data:

## next.tokstr(ps, detail)

Given a parse state, return an abbreviated string representation of the type of token, the length
of key and value and the byte offset into ps.src. 

Setting detail option to true will include the abbreviated position name (see POS), and a string representation of
the stack.  For example:

    var next = require('qb-json-next')
    
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
    
    outputs:
    
    First object:
    {@0
    k3@2:[@7
    d1@8
    d1@10
    d1@12
    ]@13
    }@15
    Second object with detail = true:
    {@2:O_BF:{
    k3@4:[@9:A_BF:{[
    d1@10:A_AV:{[
    d1@12:A_AV:{[
    d1@14:A_AV:{[
    ]@15:O_AV:{
    }@17:A_AV


# next.posname(pos)

Takes a ps.pos integer as input and returns a brief string code - same name codes used for next.POS.  see next.POS
for details.

# next.POS

The POS object maps names to the ps.pos values used by next().  
ps.pos integers allow super-fast performance, but are not user-friendly, so these POS
give some level readability (though admittedly still very brief).  Here they are just as they
are defined in the code:

    // values for ps.pos(ition).  LSB (0x7F) are reserved for token ascii value.
    var POS = {
      A_BF: 0x080,   // in array, before first value
      A_BV: 0x100,   // in array, before value
      A_AV: 0x180,   // in array, after value
      O_BF: 0x200,   // in object, before first key
      O_BK: 0x280,   // in object, before key
      O_AK: 0x300,   // in object, after key
      O_BV: 0x380,   // in object, before value
      O_AV: 0x400,   // in object, after value
    }
 

(The object/array context is redundant with stack information, but is included in ps.pos to allow one-step 
lookup and validation which is a factor in making next() validation so fast.) 

# next.TOK

The TOK object maps names to the ps.tok integers returned by next().  For all but string and decimal, the
token returned is simply the same as the first byte encountered.  't' for true, '{' for object start, etc.
Here they are just as they are defined in the code:

    var TOK = {
      ARR: 91,        // '['
      ARR_END: 93,    // ']'
      DEC: 100,       // 'd'  - a decimal value starting with: -, 0, 1, ..., 9
      FAL: 102,       // 'f'
      NUL: 110,       // 'n'
      STR: 115,       // 's'  - a string value starting with "
      TRU: 116,       // 't'
      OBJ: 123,       // '{'
      OBJ_END:  125,  // '}'
    }

# next.ECODE

The ECODE object maps names of special parsing "end" states to integers used by ps.ecode.   When one of these special
states occurs, ps.tok is set to zero and ps.ecode is set to one of the following:

    var ECODE = {
      BAD_VALUE: 66,    // 'B'  encountered invalid byte or series of bytes
      TRUNC_DEC: 68,    // 'D'  end of buffer was value was a decimal ending with a digit (0-9). it is *possibly* unfinished
      TRUNCATED: 84,    // 'T'  key or value was unfinished at end of buffer
      UNEXPECTED: 85,   // 'U'  encountered a recognized token in wrong place/context
    }

# parsing multiple / split buffers with ps.next_src

The ps.next_src property is checked before returning from next() whenever ps.src is empty or finished.  It 
allows clients to continue parsing so long as values are cleanly separated between buffers.

    var next = require('qb-json-next')
    
    var ps = {}
    
    while (ps.next_src = get_next_buffer_somehow()) {
        while (next(ps)) {
          console.log(next.tokstr(ps))  // ps ("parse-state") has token and offset information
        }
    }
    
A buffer can stop at any point, but it may continue parsing only after whole values or key-value pairs.  That is,
it cannot continue after part of a key, value or key without the subsequent value:

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
sometimes creating a new buffer to span the values. **The module qb-json-align** allows continued parsing from
any split point.

