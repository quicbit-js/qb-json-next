# qb-json-next

[![npm][npm-image]][npm-url]
[![downloads][downloads-image]][npm-url]
[![bitHound Dependencies][proddep-image]][proddep-link]
[![dev dependencies][devdep-image]][devdep-link]
[![code analysis][code-image]][code-link]

[npm-image]:       https://img.shields.io/npm/v/qb-json-next.svg
[downloads-image]: https://img.shields.io/npm/dm/qb-json-next.svg
[npm-url]:         https://npmjs.org/package/qb-json-next
[proddep-image]:   https://www.bithound.io/github/quicbit-js/qb-json-next/badges/dependencies.svg
[proddep-link]:    https://www.bithound.io/github/quicbit-js/qb-json-next/master/dependencies/npm
[devdep-image]:    https://www.bithound.io/github/quicbit-js/qb-json-next/badges/devDependencies.svg
[devdep-link]:     https://www.bithound.io/github/quicbit-js/qb-json-next/master/dependencies/npm
[code-image]:      https://www.bithound.io/github/quicbit-js/qb-json-next/badges/code.svg
[code-link]:       https://www.bithound.io/github/quicbit-js/qb-json-next

A fast, zero-dependency, *validating* JSON parser (~300 MB/sec running node 6 on 2.2 GHz Intel i7).

**qb-json-next introduces validation and incremental parsing!**

qb-json-next started out as an update to qb-json-tok (which is a bit faster but with no validation), but 
made sense as a new package when finished.  The features and simplicity of qb-json-next make it far better choice for
most use cases.


**Complies with the 100% test coverage and minimum dependency requirements** of 
[qb-standard](http://github.com/quicbit-js/qb-standard) . 


# install

npm install qb-json-next

# Parsing a JSON buffer with next()

    var next = require('qb-json-next')
    
    var ps = { src: new Buffer( '{ "a": [1,2,3] }' ) }  // ps properties are updated in-place by next()
    while ( next(ps) ) {
      console.log( next.tokstr(ps) )                    // see 
    }
    
    output:
    
    > {@0                       // start of object at 0
    > k3@2:[@7                  // key (3 bytes) at 2, start of array at 7                        
    > d1@8                      // decimal (1 byte) at 8
    > d1@10                     // decimal (1 byte) at 10
    > d1@12                     // decimal (1 byte) at 12
    > ]@13                      // end array at 13
    > }@15                      // end object at 15


# next (ps)

The next() function is the function returned by require('qb-json-next').  next() works by updating a ps or "parse-state" object.  The ps object can start out as any object with a
'src' or 'next_src' property to parse.  Other properties of the ps object are updated with every call to next().

Note that the next() function also has some other properties such as TOK, POS, ECODE, posname() and tokstr() which are
explained below.

next() returns the last token parsed, which is the ps.tok property.  ps properties are also explained below:


# The parse-state object (ps)

Each call to next(ps) updates the parse-state object or 'ps'.  parse-state has the following 
properties:

    {
        src         // [byt] - the source buffer being read
        next_src    // [byt] - the next source buffer to continue reading (optional)
        vcount      // int   - value count - number of complete values or key-values read so far
        koff        // int   - key offset
        klim        // int   - key limit
        tok         // int   - token - integer indicating what was parsed or encountered, see chart
        voff        // int   - value offset
        vlim        // int   - value limit
        stack       // [byt] - ascii open braces/brackets representing array or object containers and depth
        pos         // int   - relative parse position code (before value, after key...) 
        ecode       // int   - end-code used to indicate special termination state such as truncated or illegal values      
    }
    
The parse-state object is designed to be as efficient as possible at the cost of readability, using the same fast codes that
allow next() to work quickly.
    
Here are the properties described in detail:

## ps.src and ps.next_src

ps.src and ps.next_src can be any array-type object containing UTF-8 encoded JSON.  Javascript arrays and typed arrays
(and so node Buffers as well) are acceptable src buffers.

ps.src is the current active buffer being parsed.  The parsed token, ecode, four offset properties, stack, vcount, and pos properties are all 
relative to this buffer.

src and next_src are the current buffer and next buffer to parse.  

When next() reaches the src limit,
next_src is moved to src and parsing is set to continue with the new buffer 
(koff, klim, voff, and vlim are set to zero).

### Parsing across buffers with whole values

The ps.next_src property is checked before returning from next() whenever ps.src is empty or finished.  If set,
ps.next_src is moved to ps.src, limits are reset to zero, and parsing continues with the new buffer.  This 
allows parsing across buffers:

    var next = require('qb-json-next')
    
    var ps = {}
    
    while (ps.next_src = get_next_buffer_somehow()) {
        while (next(ps)) {
          console.log(next.tokstr(ps))  
        }
    }
    
Parsing stopping at any point retains exact information about the stop state, but next() can only continue parsing 
after a whole value or key-value pair.  

(You can use [qb-json-align](https://github.com/quicbit-js/qb-json-align) to handle arbitrary buffer splits)


next() cannot continue after part of a key, part of a value or after a key 
with no subsequent value (array and object start brackets count as a whole value).


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


### Parsing buffers with any arbitrary split

**The module [qb-json-align](https://github.com/quicbit-js/qb-json-align) supports continued parsing from any split buffer** including truncated keys and values.  
It's simple to use - just call align(ps) after setting ps.next_src and before calling next(ps) and split values are handled for you:

    while (ps.next_src = get_next_buffer_somehow()) {
        align(ps)                                               // add this call after next_src is set to handle any split.
        while (next(ps)) {
          console.log(next.tokstr(ps))
        }
    }


## ps.vcount

The number of completed values.  Array and object start brackets are not counted, while array and object end brackets
are counted.  Strings are only counted after vlim passes the closing quote and numbers are only counted after
a non-number delimiter byte is read.  Keys are not counted, only the completed value following the key is counted 
counting every key-value pair as "1" value.

## offsets: ps.koff, ps.klim, ps.voff, and ps.vlim

The offsets describe key and value start and end points.  ps.koff and ps.voff are inclusive offsets where the key 
and value start (starting at zero), while ps.klim and ps.vlim are exclusive limits which are one byte after the
last key or value byte.  

When ps.koff = ps.klim, then there is no key.  Object values always have a key, while array values never do.

When ps.voff = ps.vlim, then there is no value.  

Remember that src data is UTF-8 encouded, not UTF-16 encoded like javascript strings so non-asci will
not directly translate to strings.  **[qb-utf8-to-str-tiny](https://github.com/quicbit-js/qb-utf8-to-str-tiny)** is a light-weight library (though not fast) for 
converting UTF-8 to javascript strings.  Also note that string offsets include the quotes (ascii 34)

For example:    

                                                                                  (ascii as strings)
                                                                                  
                                              koff    klim    voff    vlim        key   value   stack
    |-----------------------------------------   0       0       0       0                         
    |                                                                                              
    | |---------------------------------------   0       0       1       2                 {       {         
    | |                                                                                            
    | |       |-------------------------------   9      10      10      10        "                {
    | |       |                                                                                    
    | |       | |-----------------------------   9      12      12      12        "a"              {
    | |       | |                                                                                  
    | |       | | |---------------------------   9      12      14      14        "a"              {
    | |       | | |                                                                                
    | |       | | | |-------------------------   9      12      15      16        "a"      "       {
    | |       | | | |                                                                              
    | |       | | | |  |----------------------   9      12      15      19        "a"   "hi"       {
    | |       | | | |  |                                                                           
    | |       | | | |  |                       (key/value flushed out - to callback)               
    | |       | | | |  |                        12      12      19      19                         {
    | |       | | | |  |                                                                           
    | |       | | | |  |     |----------------  21      24      25      25        "b"              {
    | |       | | | |  |     |                                                                     
    | |       | | | |  |     | |--------------  21      24      26      27        "b"      [      {[
    | |       | | | |  |     | |                                                                   
    | |       | | | |  |     | |    |---------  24      24      32      32                        {[
    | |       | | | |  |     | |    |                                                              
    | |       | | | |  |     | |    | |-------  24      24      32      33                 ]       {
    | |       | | | |  |     | |    | |
    | |       | | | |  |     | |    | | |-----  24      24      35      36                 ]       
    | |       | | | |  |     | |    | | |
              1         2         3      
    01234567890123456789012345678901234567
     {       "a":  "hi", "b": [ 1, 2 ] }                           
    

## ps.tok

The ps.tok property holds an ascii byte representing the type of value last read, or zero if parsing ended (at src limit
or on error).  Possible values for tok are defined in the next.TOK object property:

### next.TOK

The TOK object maps names to the ps.tok integers returned by next().  For all but string and decimal, the
token returned is simply the same as the first byte encountered.  't' for true, '{' for object start, etc.
Here they are just as they are defined in the code:

    var TOK = {
      ARR: 91,        // '['    - array start   
      ARR_END: 93,    // ']'    - array end
      DEC: 100,       // 'd'    - a decimal value starting with: -, 0, 1, ..., 9
      FAL: 102,       // 'f'    - false
      NUL: 110,       // 'n'    - null
      STR: 115,       // 's'    - a string value starting with "
      TRU: 116,       // 't'    - true
      OBJ: 123,       // '{'    - object start
      OBJ_END:  125,  // '}'    - object end
    }

### next.tokstr(ps, detail)

Given a parse state, next.tokstr() returns an abbreviated string representation of the type of token, the length
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


### ps.stack and ps.pos

ps.stack and ps.pos keep track of the nested context and relative position of parsing.  

ps.stack uses an array of integers (object and array open-braces ascii) to track depth and context

    91      // ascii for '[' - array start
    123     // ascii for '{' - object start                                    
    
    stack:  [] | [123]                      | [123,91]       | [123]  | []
               |                            |                |        |
               {  name :  "Samuel" , tags : [ "Sam", "Sammy" ]        } ,  "another value"
    

ps.pos describes parser position relative to a JSON **key** or **value**.  Note that
both the start and end brackets of arrays and objects
are considered values when describing position. 

      value                                          value
       |   key    value    key  value            value |
       |    |       |       |     | value   value  |   |
       |    |       |       |     |   |       |    |   |
       {  name : "Samuel", tags : [ "Sam", "Sammy" ]   }
        

There are 2 possible *positions* **before**, and **after** that define parse position relative to a key 
or value plus a **first** indicator to indicate if it is the first item in a new context: 

    before-first-value                                                          stack = ''
      |  
      |  before-first-key                                                       stack = '{'
      |  |
      |  |    after-key
      |  |    |
      |  |    | before-value
      |  |    | |
      |  |    | | 
      |  |    | |  
      |  |    | |         after-value
      |  |    | |         |
      |  |    | |         | before-key        
      |  |    | |         | |
      |  |    | |         | | 
      |  |    | |         | |  
      |  |    | |         | |    after-key
      |  |    | |         | |    |
      |  |    | |         | |    | before-value
      |  |    | |         | |    | |
      |  |    | |         | |    | | before-first-value                         stack = '{['
      |  |    | |         | |    | | |
      |  |    | |         | |    | | |  
      |  |    | |         | |    | | |    
      |  |    | |         | |    | | |     after-value
      |  |    | |         | |    | | |     |
      |  |    | |         | |    | | |     |before-value
      |  |    | |         | |    | | |     ||
      |  |    | |         | |    | | |     ||
      |  |    | |         | |    | | |     ||   
      |  |    | |         | |    | | |     ||       after-value
      |  |    | |         | |    | | |     ||       | 
      |  |    | |         | |    | | |     ||       | after-value               stack = '{'
      |  |    | |         | |    | | |     ||       | |           after-value   stack = ''
      |  |    | |         | |    | | |     ||       | |           |
      |  |    | |         | |    | | |     ||       | |           | before-value
      |  |    | |         | |    | | |     ||       | |           | |
      |  |    | |         | |    | | |     ||       | |           | | 
      |  |    | |         | |    | | |     ||       | |           | |  
      |  |    | |         | |    | | |     ||       | |           | |                after-value
      |  |    | |         | |    | | |     ||       | |           | |                |
       {  name :  "Samuel" , tags : [ "Sam", "Sammy" ]        }    ,  "another value"
    

Most state management in next() is the matter of a bitwise-or and one or two array lookups per token, which is why next()
can validate so quickly.

next.pos positions are defined in the next.POS object:

### next.POS

The POS object maps names to the ps.pos values used by next().  
ps.pos integers allow super-fast performance, but are not user-friendly, so these POS names
give some level readability (though admittedly still very brief).  Here they are as
defined in the code:

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
 

(Design note - the object/array context is redundant with stack information, but is included in ps.pos to allow one-step 
lookup and validation which is a factor in making next() validation so fast.) 

### next.posname (pos)

Given a ps.pos integer as input next.posname() returns a brief string code (A_BF, A_BV, O_BF...)- the same names used for next.POS

## ps.ecode

The ps.ecode or "end-code" describes special parsing end states.  The four possible end states are defined by
the next.ECODE object:

### next.ECODE

The ECODE object maps names of special parsing "end" states to integers used by ps.ecode.   When one of these special
states occurs, **ps.tok is set to zero** and ps.ecode is set to one of the following:

    var ECODE = {
      BAD_VALUE: 66,    // 'B'  encountered invalid byte or series of bytes
      TRUNC_DEC: 68,    // 'D'  end of buffer was value was a decimal ending with a digit (0-9). it is *possibly* unfinished
      TRUNCATED: 84,    // 'T'  key or value was unfinished at end of buffer
      UNEXPECTED: 85,   // 'U'  encountered a recognized token in wrong place/context
    }


## How it works - Understanding the parse graph (state and stack)

The parse graph is a simple mapping of parse states to other allowed states.  For next(), we employ an integer array to do this 
in the most efficent manner possible.  We encode position state (ps.pos) along with ascii values in the same 
low integer to create the graph.

    var state1 = states[state0 + ascii-value]

If the state isn't allowed, then state1 is zero.  If allowed, it is the new ps.pos value - the next position.

    var state2 = states[state1 + ascii-value]
    
This simple mechanism works for all state transitions, except when we leave context of an object or array.  
When a '}' or ']' is encountered, the new state will have no context set (you can see this for yourself in
the Adding Custom Rules to Parsing section, below).

When closing an object or array, the 'stack' is used to supplement missing context (91 is ascii for array-close):

    if (stack.length !== 0) { state1 |= (stack[stack.length - 1] === 91 ? in_arr : in_obj) }
 

## Adding Custom Rules to Parsing

Though qb-json-next uses bit manipulation, I have tried to make the rules as readable as possible so even if
you aren't comfortable with bit twiddling, you may understand and modify the parse rules.  Can you see how
to make parsing tolerant of trailing commas by looking at the states below? (the answer is at the bottom of this section).
    
First, the setup.  We create an integer-to-integer mapping of all the allowed states.  The full parse graph is 
defined with 10 lines of configuration:

    //   position(s) + token(s) -> new position
    map([POS.A_BF, POS.A_BV], val, POS.A_AV)
    map([POS.A_AV], ',', POS.A_BV)
    
    map([POS.A_BF, POS.A_BV, POS.O_BV], '[', POS.A_BF)
    map([POS.A_BF, POS.A_BV, POS.O_BV], '{', POS.O_BF)
    
    map([POS.A_BF, POS.A_AV], ']', POS.A_AV)      // use any non-zero value here - stack is used to check new position
    map([POS.O_BF, POS.O_AV], '}', POS.A_AV)      // use any non-zero value here - stack is used to check new position
    
    map([POS.O_AV], ',', POS.O_BK)
    map([POS.O_BF, POS.O_BK], 's', POS.O_AK)      // s = string
    map([POS.O_AK], ':', POS.O_BV)
    map([POS.O_BV], val, POS.O_AV)
     

That's pretty dense, and the codes look cryptic, but it is easy to see the 'big picture' once
you understand the abbreviations.

    map([POS.A_BF, POS.A_BV], val, POS.A_AV)

... maps positions 
    
        "in-array, before-first-value" and "in-array, before-value"
            for tokens (null, true, false, decimal, string)
                to position ("in-array, after-value")

And this statement:

    map([POS.O_AV], ',', POS.O_BK)

... maps position
 
        "in-object, after-value" 
            for token ',' (comma) 
                to position "in-object, before-key"
        
                
If that made sense, I encourage looking at the map code - it is just as understandable as that... 

To make the graph tolerate trailing commas in arrays <code>[1,2,3,]</code>, add an array-end rule where a 
value is expected (before-value):

      map([POS.A_BV], ']', POS.A_AV )
      
  In fact, if you look above, this looks extremely similar to the existing 'A_BF' + ']' rule that allows arrays to close without
  any content at all:

      map([POS.A_BF, POS.A_AV], ']', POS.A_AV)        
      
      ... and we could have just added our case to that rule instead, if we liked
      
      map([POS.A_BF, POS.A_AV, POS.A_BV], ']', POS.A_AV)        
      
To make the graph also tolerate trailing commas in an empty array <code>[,]</code>, add an array-comma rule where 
a first value is expected (before-first-value):

      map([POS.A_BF], ',',  POS.A_BV )


