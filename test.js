// Software License Agreement (ISC License)
//
// Copyright (c) 2018, Matthew Voss
//
// Permission to use, copy, modify, and/or distribute this software for
// any purpose with or without fee is hereby granted, provided that the
// above copyright notice and this permission notice appear in all copies.
//
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

var test = require('test-kit').tape()
var utf8 = require('qb-utf8-ez')
var qbnext = require('.')

function map_ascii (s, code) {
  return s.split('').reduce(function (m,c) { m[c] = code; return m }, {})
}
var NO_LEN_TOKENS = map_ascii('tfn[]{}()', 1)


function pos_str(pos) {
  switch (pos) {
    case 0x080: return 'BFV'
    case 0x100: return 'B_V'
    case 0x180: return 'A_V'
    case 0x200: return 'BFK'
    case 0x280: return 'B_K'
    case 0x300: return 'A_K'
    case 0x380: return 'B_V'
    case 0x400: return 'A_V'
    default: return '???'
  }
}
function tokstr (ps) {
  var tchar = String.fromCharCode(ps.tok)
  var keystr = ps.koff === ps.klim ? '' : 'k' + (ps.klim - ps.koff) + '@' + ps.koff + ':'
  var vlen = (NO_LEN_TOKENS[tchar] || ps.vlim === ps.voff) ? '' : ps.vlim - ps.voff

  var ret = keystr + tchar + vlen + '@' + ps.voff
  if (ps.ecode) {
    ret += '!' + String.fromCharCode(ps.ecode)
  }
  if (ps.tok === 69) {
    ret += ':' + pos_str(ps.pos)
    if (ps.stack.length) {
      ret += ':' + ps.stack.map(function (c) { return String.fromCharCode(c) }).join('')
    }
  }
  return ret
}

function src_tokens (ps) {
  var toks = []
  while (qbnext.next(ps) !== 69) {
    toks.push(tokstr(ps))
  }
  toks.push(tokstr(ps))
  return toks.join(',')
}

function err (msg) { throw Error(msg) }

test('next', function (t) {
  t.table_assert([
    [ 'src',     'iterations', 'exp' ],
    [ '"a"',     3,            's3@0,E@3:A_V,E@3:A_V' ],
    [ '"a",',    3,            's3@0,E@4:B_V,E@4:B_V' ],
    [ '"a",3',   4,            's3@0,E1@4!D:B_V,E@5:B_V,E@5:B_V' ],
    [ '"a",3,',  4,            's3@0,d1@4,E@6:B_V,E@6:B_V' ],
    [ '"a",3,t', 5,            's3@0,d1@4,E1@6!T:B_V,E@7:B_V,E@7:B_V' ],
  ], function (src, iterations) {
    var ps = qbnext.init({src: utf8.buffer(src)})

    var results = []
    for (var i=0; i<iterations; i++) {
      var ret = qbnext.next(ps)
      ps.tok === ret || err('returned wrong token')
      results.push(tokstr(ps))
    }
    return results.join(',')
  })
})

test('object - no spaces', function (t) {
  t.table_assert(
    [
      [ 'src',          'exp' ],
      [ '',               'E@0:BFV' ],
      [ '{',              '{@0,E@1:BFK:{' ],
      [ '{"',             '{@0,k1@1:E@2!T:BFK:{' ],
      [ '{"a',            '{@0,k2@1:E@3!T:BFK:{' ],
      [ '{"a"',           '{@0,k3@1:E@4:A_K:{' ],
      [ '{"a":',          '{@0,k3@1:E@5:B_V:{' ],
      [ '{"a":7',         '{@0,k3@1:E1@5!D:B_V:{' ],
      [ '{"a":71',        '{@0,k3@1:E2@5!D:B_V:{' ],
      [ '{"a":71,',       '{@0,k3@1:d2@5,E@8:B_K:{' ],
      [ '{"a":71,"',      '{@0,k3@1:d2@5,k1@8:E@9!T:B_K:{' ],
      [ '{"a":71,"b',     '{@0,k3@1:d2@5,k2@8:E@10!T:B_K:{' ],
      [ '{"a":71,"b"',    '{@0,k3@1:d2@5,k3@8:E@11:A_K:{' ],
      [ '{"a":71,"b":',   '{@0,k3@1:d2@5,k3@8:E@12:B_V:{' ],
      [ '{"a":71,"b":2',  '{@0,k3@1:d2@5,k3@8:E1@12!D:B_V:{' ],
      [ '{"a":71,"b":2}', '{@0,k3@1:d2@5,k3@8:d1@12,}@13,E@14:A_V' ],
    ], function (src) { return src_tokens(qbnext.init( {src: utf8.buffer(src)} )) })
})

test('array - no spaces', function (t) {
  t.table_assert(
    [
      [ 'input',      'exp' ],
      [ '',           'E@0:BFV' ],
      [ '[',          '[@0,E@1:BFV:[' ],
      [ '[8',         '[@0,E1@1!D:BFV:[' ],
      [ '[83',        '[@0,E2@1!D:BFV:[' ],
      [ '[83 ',       '[@0,d2@1,E@4:A_V:[' ],
      [ '[83,',       '[@0,d2@1,E@4:B_V:[' ],
      [ '[83,"',      '[@0,d2@1,E1@4!T:B_V:[' ],
      [ '[83,"a',     '[@0,d2@1,E2@4!T:B_V:[' ],
      [ '[83,"a"',    '[@0,d2@1,s3@4,E@7:A_V:[' ],
      [ '[83,"a",',   '[@0,d2@1,s3@4,E@8:B_V:[' ],
      [ '[83,"a",2',  '[@0,d2@1,s3@4,E1@8!D:B_V:[' ],
      [ '[83,"a",2]', '[@0,d2@1,s3@4,d1@8,]@9,E@10:A_V' ],
    ], function (src) { return src_tokens(qbnext.init( {src: utf8.buffer(src)} )) })
})

test('array - spaces', function (t) {
  t.table_assert(
    [
      [ 'input',           'exp' ],
      [ '',                'E@0:BFV' ],
      [ '[',               '[@0,E@1:BFV:[' ],
      [ '[ ',              '[@0,E@2:BFV:[' ],
      [ '[ 8',             '[@0,E1@2!D:BFV:[' ],
      [ '[ 83',            '[@0,E2@2!D:BFV:[' ],
      [ '[ 83,',           '[@0,d2@2,E@5:B_V:[' ],
      [ '[ 83, ',          '[@0,d2@2,E@6:B_V:[' ],
      [ '[ 83, "',         '[@0,d2@2,E1@6!T:B_V:[' ],
      [ '[ 83, "a',        '[@0,d2@2,E2@6!T:B_V:[' ],
      [ '[ 83, "a"',       '[@0,d2@2,s3@6,E@9:A_V:[' ],
      [ '[ 83, "a" ',      '[@0,d2@2,s3@6,E@10:A_V:[' ],
      [ '[ 83, "a" ,',     '[@0,d2@2,s3@6,E@11:B_V:[' ],
      [ '[ 83, "a" , ',    '[@0,d2@2,s3@6,E@12:B_V:[' ],
      [ '[ 83, "a" , 2',   '[@0,d2@2,s3@6,E1@12!D:B_V:[' ],
      [ '[ 83, "a" , 2 ',  '[@0,d2@2,s3@6,d1@12,E@14:A_V:[' ],
      [ '[ 83, "a" , 2 ]', '[@0,d2@2,s3@6,d1@12,]@14,E@15:A_V' ],
    ], function (src) { return src_tokens(qbnext.init( {src: utf8.buffer(src)} )) })
})

test('object - spaces', function (t) {
  t.table_assert(
    [
      [ 'input',          'exp' ],
      [ ' ',              'E@1:BFV' ],
      [ ' {',             '{@1,E@2:BFK:{' ],
      [ ' { ',            '{@1,E@3:BFK:{' ],
      [ ' { "',           '{@1,k1@3:E@4!T:BFK:{' ],
      [ ' { "a',          '{@1,k2@3:E@5!T:BFK:{' ],
      [ ' { "a"',         '{@1,k3@3:E@6:A_K:{' ],
      [ ' { "a":',        '{@1,k3@3:E@7:B_V:{' ],
      [ ' { "a": ',       '{@1,k3@3:E@8:B_V:{' ],
      [ ' { "a": "',      '{@1,k3@3:E1@8!T:B_V:{' ],
      [ ' { "a": "x',     '{@1,k3@3:E2@8!T:B_V:{' ],
      [ ' { "a": "x"',    '{@1,k3@3:s3@8,E@11:A_V:{' ],
      [ ' { "a": "x" }',  '{@1,k3@3:s3@8,}@12,E@13:A_V' ],
      [ ' { "a" ',        '{@1,k3@3:E@7:A_K:{' ],
      [ ' { "a" :',       '{@1,k3@3:E@8:B_V:{' ],
      [ ' { "a" : ',      '{@1,k3@3:E@9:B_V:{' ],
      [ ' { "a" : "',     '{@1,k3@3:E1@9!T:B_V:{' ],
      [ ' { "a" : "x',    '{@1,k3@3:E2@9!T:B_V:{' ],
      [ ' { "a" : "x" ',  '{@1,k3@3:s3@9,E@13:A_V:{' ],
      [ ' { "a" : "x" }', '{@1,k3@3:s3@9,}@13,E@14:A_V' ],
    ], function (src) { return src_tokens(qbnext.init( {src: utf8.buffer(src)} )) })
})

test('incremental array', function (t) {
  t.table_assert([
    [ 'src1',               'src2',               'exp' ],
    [ '',                   '1,[[[7,89.4],"c"]]', [ 'E@0:BFV', 'd1@0,[@2,[@3,[@4,d1@5,d4@7,]@11,s3@13,]@16,]@17,E@18:A_V' ] ],
    [ '1,',                 '[[[7,89.4],"c"]]',   [ 'd1@0,E@2:B_V', '[@0,[@1,[@2,d1@3,d4@5,]@9,s3@11,]@14,]@15,E@16:A_V' ] ],
    [ '1,[',                '[[7,89.4],"c"]]',    [ 'd1@0,[@2,E@3:BFV:[', '[@0,[@1,d1@2,d4@4,]@8,s3@10,]@13,]@14,E@15:A_V' ] ],
    [ '1,[[',               '[7,89.4],"c"]]',     [ 'd1@0,[@2,[@3,E@4:BFV:[[', '[@0,d1@1,d4@3,]@7,s3@9,]@12,]@13,E@14:A_V' ] ],
    [ '1,[[[',              '7,89.4],"c"]]',      [ 'd1@0,[@2,[@3,[@4,E@5:BFV:[[[', 'd1@0,d4@2,]@6,s3@8,]@11,]@12,E@13:A_V' ] ],
    [ '1,[[[7,',            '89.4],"c"]]',        [ 'd1@0,[@2,[@3,[@4,d1@5,E@7:B_V:[[[', 'd4@0,]@4,s3@6,]@9,]@10,E@11:A_V' ] ],
    [ '1,[[[7,89.4]',       ',"c"]]',             [ 'd1@0,[@2,[@3,[@4,d1@5,d4@7,]@11,E@12:A_V:[[', 's3@1,]@4,]@5,E@6:A_V' ] ],
    [ '1,[[[7,89.4],',      '"c"]]',              [ 'd1@0,[@2,[@3,[@4,d1@5,d4@7,]@11,E@13:B_V:[[', 's3@0,]@3,]@4,E@5:A_V' ] ],
    [ '1,[[[7,89.4],"c"',   ']]',                 [ 'd1@0,[@2,[@3,[@4,d1@5,d4@7,]@11,s3@13,E@16:A_V:[[', ']@0,]@1,E@2:A_V' ] ],
    [ '1,[[[7,89.4],"c"]',  ']',                  [ 'd1@0,[@2,[@3,[@4,d1@5,d4@7,]@11,s3@13,]@16,E@17:A_V:[', ']@0,E@1:A_V' ] ],
    [ '1,[[[7,89.4],"c"]]', '',                   [ 'd1@0,[@2,[@3,[@4,d1@5,d4@7,]@11,s3@13,]@16,]@17,E@18:A_V', 'E@0:A_V' ] ],
  ], function (src1, src2) {
    return parse_split([src1, src2])
  })
})

test('incremental array - spaces', function (t) {
  t.table_assert([
    [ 'src1',                        'src2',                        'exp' ],
    [ '',                            ' 1 , [ [ [7,89.4], "c" ] ] ', [ 'E@0:BFV', 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,s3@19,]@23,]@25,E@27:A_V' ] ],
    [ ' ',                           '1 , [ [ [7,89.4], "c" ] ] ',  [ 'E@1:BFV', 'd1@0,[@4,[@6,[@8,d1@9,d4@11,]@15,s3@18,]@22,]@24,E@26:A_V' ] ],
    [ ' 1 ',                         ', [ [ [7,89.4], "c" ] ] ',    [ 'd1@1,E@3:A_V', '[@2,[@4,[@6,d1@7,d4@9,]@13,s3@16,]@20,]@22,E@24:A_V' ] ],
    [ ' 1 ,',                        ' [ [ [7,89.4], "c" ] ] ',     [ 'd1@1,E@4:B_V', '[@1,[@3,[@5,d1@6,d4@8,]@12,s3@15,]@19,]@21,E@23:A_V' ] ],
    [ ' 1 , ',                       '[ [ [7,89.4], "c" ] ] ',      [ 'd1@1,E@5:B_V', '[@0,[@2,[@4,d1@5,d4@7,]@11,s3@14,]@18,]@20,E@22:A_V' ] ],
    [ ' 1 , [',                      ' [ [7,89.4], "c" ] ] ',       [ 'd1@1,[@5,E@6:BFV:[', '[@1,[@3,d1@4,d4@6,]@10,s3@13,]@17,]@19,E@21:A_V' ] ],
    [ ' 1 , [ ',                     '[ [7,89.4], "c" ] ] ',        [ 'd1@1,[@5,E@7:BFV:[', '[@0,[@2,d1@3,d4@5,]@9,s3@12,]@16,]@18,E@20:A_V' ] ],
    [ ' 1 , [ [',                    ' [7,89.4], "c" ] ] ',         [ 'd1@1,[@5,[@7,E@8:BFV:[[', '[@1,d1@2,d4@4,]@8,s3@11,]@15,]@17,E@19:A_V' ] ],
    [ ' 1 , [ [ ',                   '[7,89.4], "c" ] ] ',          [ 'd1@1,[@5,[@7,E@9:BFV:[[', '[@0,d1@1,d4@3,]@7,s3@10,]@14,]@16,E@18:A_V' ] ],
    [ ' 1 , [ [ [',                  '7,89.4], "c" ] ] ',           [ 'd1@1,[@5,[@7,[@9,E@10:BFV:[[[', 'd1@0,d4@2,]@6,s3@9,]@13,]@15,E@17:A_V' ] ],
    [ ' 1 , [ [ [7,',                '89.4], "c" ] ] ',             [ 'd1@1,[@5,[@7,[@9,d1@10,E@12:B_V:[[[', 'd4@0,]@4,s3@7,]@11,]@13,E@15:A_V' ] ],
    [ ' 1 , [ [ [7,89.4]',           ', "c" ] ] ',                  [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,E@17:A_V:[[', 's3@2,]@6,]@8,E@10:A_V' ] ],
    [ ' 1 , [ [ [7,89.4],',          ' "c" ] ] ',                   [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,E@18:B_V:[[', 's3@1,]@5,]@7,E@9:A_V' ] ],
    [ ' 1 , [ [ [7,89.4], ',         '"c" ] ] ',                    [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,E@19:B_V:[[', 's3@0,]@4,]@6,E@8:A_V' ] ],
    [ ' 1 , [ [ [7,89.4], "c"',      ' ] ] ',                       [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,s3@19,E@22:A_V:[[', ']@1,]@3,E@5:A_V' ] ],
    [ ' 1 , [ [ [7,89.4], "c" ',     '] ] ',                        [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,s3@19,E@23:A_V:[[', ']@0,]@2,E@4:A_V' ] ],
    [ ' 1 , [ [ [7,89.4], "c" ]',    ' ] ',                         [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,s3@19,]@23,E@24:A_V:[', ']@1,E@3:A_V' ] ],
    [ ' 1 , [ [ [7,89.4], "c" ] ',   '] ',                          [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,s3@19,]@23,E@25:A_V:[', ']@0,E@2:A_V' ] ],
    [ ' 1 , [ [ [7,89.4], "c" ] ]',  ' ',                           [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,s3@19,]@23,]@25,E@26:A_V', 'E@1:A_V' ] ],
    [ ' 1 , [ [ [7,89.4], "c" ] ] ', '',                            [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,s3@19,]@23,]@25,E@27:A_V', 'E@0:A_V' ] ],
  ], function (src1, src2) {
    return parse_split([src1, src2])
  })
})

test('incremental object', function (t) {
  t.table_assert([
    [ 'src1',                  'src2',                  'exp' ],
    [ '',                      '1,{"a":"one","b":[2]}', [ 'E@0:BFV', 'd1@0,{@2,k3@3:s5@7,k3@13:[@17,d1@18,]@19,}@20,E@21:A_V' ] ],
    [ '1,',                    '{"a":"one","b":[2]}',   [ 'd1@0,E@2:B_V', '{@0,k3@1:s5@5,k3@11:[@15,d1@16,]@17,}@18,E@19:A_V' ] ],
    [ '1,{',                   '"a":"one","b":[2]}',    [ 'd1@0,{@2,E@3:BFK:{', 'k3@0:s5@4,k3@10:[@14,d1@15,]@16,}@17,E@18:A_V' ] ],
    [ '1,{"a":"one"',          ',"b":[2]}',             [ 'd1@0,{@2,k3@3:s5@7,E@12:A_V:{', 'k3@1:[@5,d1@6,]@7,}@8,E@9:A_V' ] ],
    [ '1,{"a":"one",',         '"b":[2]}',              [ 'd1@0,{@2,k3@3:s5@7,E@13:B_K:{', 'k3@0:[@4,d1@5,]@6,}@7,E@8:A_V' ] ],
    [ '1,{"a":"one","b":[2]',  '}',                     [ 'd1@0,{@2,k3@3:s5@7,k3@13:[@17,d1@18,]@19,E@20:A_V:{', '}@0,E@1:A_V' ] ],
    [ '1,{"a":"one","b":[2]}', '',                      [ 'd1@0,{@2,k3@3:s5@7,k3@13:[@17,d1@18,]@19,}@20,E@21:A_V', 'E@0:A_V' ] ],
  ], function (src1, src2) {
    return parse_split([src1, src2])
  })
})

function parse_split (sources) {
  var results = []
  var ps = qbnext.init( {src: utf8.buffer(sources.shift())} )
  results.push(src_tokens(ps))

  while (sources.length) {
    ps.src = utf8.buffer(sources.shift())
    ps.koff = ps.klim = ps.voff = ps.vlim = ps.tok = ps.ecode = 0
    ps.lim = ps.src.length
    results.push(src_tokens(ps))
  }
  return results
}

