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

function src_tokens (ps) {
  var toks = []
  while (qbnext.next(ps) !== 69) {
    toks.push(qbnext.tokstr(ps))
  }
  toks.push(qbnext.tokstr(ps))
  return toks.join(',')
}

function err (msg) { throw Error(msg) }

test('next', function (t) {
  t.table_assert([
    [ 'src',     'iterations', 'exp' ],
    [ '"a"',     3,            's3@0,E@3:A_AV,E@3:A_AV' ],
    [ '"a",',    3,            's3@0,E@4:A_BV,E@4:A_BV' ],
    [ '"a",3',   4,            's3@0,E1@4!D:A_BV,E@5:A_BV,E@5:A_BV' ],
    [ '"a",3,',  4,            's3@0,d1@4,E@6:A_BV,E@6:A_BV' ],
    [ '"a",3,t', 5,            's3@0,d1@4,E1@6!T:A_BV,E@7:A_BV,E@7:A_BV' ],
  ], function (src, iterations) {
    var ps = qbnext.init({src: utf8.buffer(src)})

    var results = []
    for (var i=0; i<iterations; i++) {
      var ret = qbnext.next(ps)
      ps.tok === ret || err('returned wrong token')
      results.push(qbnext.tokstr(ps))
    }
    return results.join(',')
  })
})

test('object - no spaces', function (t) {
  t.table_assert(
    [
      [ 'src',          'exp' ],
      [ '',               'E@0:A_BF' ],
      [ '{',              '{@0,E@1:O_BF:{' ],
      [ '{"',             '{@0,k1@1:E@2!T:O_BF:{' ],
      [ '{"a',            '{@0,k2@1:E@3!T:O_BF:{' ],
      [ '{"a"',           '{@0,k3@1:E@4:O_AK:{' ],
      [ '{"a":',          '{@0,k3@1:E@5:O_BV:{' ],
      [ '{"a":7',         '{@0,k3@1:E1@5!D:O_BV:{' ],
      [ '{"a":71',        '{@0,k3@1:E2@5!D:O_BV:{' ],
      [ '{"a":71,',       '{@0,k3@1:d2@5,E@8:O_BK:{' ],
      [ '{"a":71,"',      '{@0,k3@1:d2@5,k1@8:E@9!T:O_BK:{' ],
      [ '{"a":71,"b',     '{@0,k3@1:d2@5,k2@8:E@10!T:O_BK:{' ],
      [ '{"a":71,"b"',    '{@0,k3@1:d2@5,k3@8:E@11:O_AK:{' ],
      [ '{"a":71,"b":',   '{@0,k3@1:d2@5,k3@8:E@12:O_BV:{' ],
      [ '{"a":71,"b":2',  '{@0,k3@1:d2@5,k3@8:E1@12!D:O_BV:{' ],
      [ '{"a":71,"b":2}', '{@0,k3@1:d2@5,k3@8:d1@12,}@13,E@14:A_AV' ],
    ], function (src) { return src_tokens(qbnext.init( {src: utf8.buffer(src)} )) })
})

test('array - no spaces', function (t) {
  t.table_assert(
    [
      [ 'input',      'exp' ],
      [ '',           'E@0:A_BF' ],
      [ '[',          '[@0,E@1:A_BF:[' ],
      [ '[8',         '[@0,E1@1!D:A_BF:[' ],
      [ '[83',        '[@0,E2@1!D:A_BF:[' ],
      [ '[83 ',       '[@0,d2@1,E@4:A_AV:[' ],
      [ '[83,',       '[@0,d2@1,E@4:A_BV:[' ],
      [ '[83,"',      '[@0,d2@1,E1@4!T:A_BV:[' ],
      [ '[83,"a',     '[@0,d2@1,E2@4!T:A_BV:[' ],
      [ '[83,"a"',    '[@0,d2@1,s3@4,E@7:A_AV:[' ],
      [ '[83,"a",',   '[@0,d2@1,s3@4,E@8:A_BV:[' ],
      [ '[83,"a",2',  '[@0,d2@1,s3@4,E1@8!D:A_BV:[' ],
      [ '[83,"a",2]', '[@0,d2@1,s3@4,d1@8,]@9,E@10:A_AV' ],
    ], function (src) { return src_tokens(qbnext.init( {src: utf8.buffer(src)} )) })
})

test('array - spaces', function (t) {
  t.table_assert(
    [
      [ 'input',           'exp' ],
      [ '',                'E@0:A_BF' ],
      [ '[',               '[@0,E@1:A_BF:[' ],
      [ '[ ',              '[@0,E@2:A_BF:[' ],
      [ '[ 8',             '[@0,E1@2!D:A_BF:[' ],
      [ '[ 83',            '[@0,E2@2!D:A_BF:[' ],
      [ '[ 83,',           '[@0,d2@2,E@5:A_BV:[' ],
      [ '[ 83, ',          '[@0,d2@2,E@6:A_BV:[' ],
      [ '[ 83, "',         '[@0,d2@2,E1@6!T:A_BV:[' ],
      [ '[ 83, "a',        '[@0,d2@2,E2@6!T:A_BV:[' ],
      [ '[ 83, "a"',       '[@0,d2@2,s3@6,E@9:A_AV:[' ],
      [ '[ 83, "a" ',      '[@0,d2@2,s3@6,E@10:A_AV:[' ],
      [ '[ 83, "a" ,',     '[@0,d2@2,s3@6,E@11:A_BV:[' ],
      [ '[ 83, "a" , ',    '[@0,d2@2,s3@6,E@12:A_BV:[' ],
      [ '[ 83, "a" , 2',   '[@0,d2@2,s3@6,E1@12!D:A_BV:[' ],
      [ '[ 83, "a" , 2 ',  '[@0,d2@2,s3@6,d1@12,E@14:A_AV:[' ],
      [ '[ 83, "a" , 2 ]', '[@0,d2@2,s3@6,d1@12,]@14,E@15:A_AV' ],
    ], function (src) { return src_tokens(qbnext.init( {src: utf8.buffer(src)} )) })
})

test('object - spaces', function (t) {
  t.table_assert(
    [
      [ 'input',          'exp' ],
      [ ' ',              'E@1:A_BF' ],
      [ ' {',             '{@1,E@2:O_BF:{' ],
      [ ' { ',            '{@1,E@3:O_BF:{' ],
      [ ' { "',           '{@1,k1@3:E@4!T:O_BF:{' ],
      [ ' { "a',          '{@1,k2@3:E@5!T:O_BF:{' ],
      [ ' { "a"',         '{@1,k3@3:E@6:O_AK:{' ],
      [ ' { "a":',        '{@1,k3@3:E@7:O_BV:{' ],
      [ ' { "a": ',       '{@1,k3@3:E@8:O_BV:{' ],
      [ ' { "a": "',      '{@1,k3@3:E1@8!T:O_BV:{' ],
      [ ' { "a": "x',     '{@1,k3@3:E2@8!T:O_BV:{' ],
      [ ' { "a": "x"',    '{@1,k3@3:s3@8,E@11:O_AV:{' ],
      [ ' { "a": "x" }',  '{@1,k3@3:s3@8,}@12,E@13:A_AV' ],
      [ ' { "a" ',        '{@1,k3@3:E@7:O_AK:{' ],
      [ ' { "a" :',       '{@1,k3@3:E@8:O_BV:{' ],
      [ ' { "a" : ',      '{@1,k3@3:E@9:O_BV:{' ],
      [ ' { "a" : "',     '{@1,k3@3:E1@9!T:O_BV:{' ],
      [ ' { "a" : "x',    '{@1,k3@3:E2@9!T:O_BV:{' ],
      [ ' { "a" : "x" ',  '{@1,k3@3:s3@9,E@13:O_AV:{' ],
      [ ' { "a" : "x" }', '{@1,k3@3:s3@9,}@13,E@14:A_AV' ],
    ], function (src) { return src_tokens(qbnext.init( {src: utf8.buffer(src)} )) })
})

test('incremental array', function (t) {
  t.table_assert([
    [ 'src1',               'src2',               'exp' ],
    [ '',                   '1,[[[7,89.4],"c"]]', [ 'E@0:A_BF', 'd1@0,[@2,[@3,[@4,d1@5,d4@7,]@11,s3@13,]@16,]@17,E@18:A_AV' ] ],
    [ '1,',                 '[[[7,89.4],"c"]]',   [ 'd1@0,E@2:A_BV', '[@0,[@1,[@2,d1@3,d4@5,]@9,s3@11,]@14,]@15,E@16:A_AV' ] ],
    [ '1,[',                '[[7,89.4],"c"]]',    [ 'd1@0,[@2,E@3:A_BF:[', '[@0,[@1,d1@2,d4@4,]@8,s3@10,]@13,]@14,E@15:A_AV' ] ],
    [ '1,[[',               '[7,89.4],"c"]]',     [ 'd1@0,[@2,[@3,E@4:A_BF:[[', '[@0,d1@1,d4@3,]@7,s3@9,]@12,]@13,E@14:A_AV' ] ],
    [ '1,[[[',              '7,89.4],"c"]]',      [ 'd1@0,[@2,[@3,[@4,E@5:A_BF:[[[', 'd1@0,d4@2,]@6,s3@8,]@11,]@12,E@13:A_AV' ] ],
    [ '1,[[[7,',            '89.4],"c"]]',        [ 'd1@0,[@2,[@3,[@4,d1@5,E@7:A_BV:[[[', 'd4@0,]@4,s3@6,]@9,]@10,E@11:A_AV' ] ],
    [ '1,[[[7,89.4]',       ',"c"]]',             [ 'd1@0,[@2,[@3,[@4,d1@5,d4@7,]@11,E@12:A_AV:[[', 's3@1,]@4,]@5,E@6:A_AV' ] ],
    [ '1,[[[7,89.4],',      '"c"]]',              [ 'd1@0,[@2,[@3,[@4,d1@5,d4@7,]@11,E@13:A_BV:[[', 's3@0,]@3,]@4,E@5:A_AV' ] ],
    [ '1,[[[7,89.4],"c"',   ']]',                 [ 'd1@0,[@2,[@3,[@4,d1@5,d4@7,]@11,s3@13,E@16:A_AV:[[', ']@0,]@1,E@2:A_AV' ] ],
    [ '1,[[[7,89.4],"c"]',  ']',                  [ 'd1@0,[@2,[@3,[@4,d1@5,d4@7,]@11,s3@13,]@16,E@17:A_AV:[', ']@0,E@1:A_AV' ] ],
    [ '1,[[[7,89.4],"c"]]', '',                   [ 'd1@0,[@2,[@3,[@4,d1@5,d4@7,]@11,s3@13,]@16,]@17,E@18:A_AV', 'E@0:A_AV' ] ],
  ], function (src1, src2) {
    return parse_split([src1, src2])
  })
})

test('incremental array - spaces', function (t) {
  t.table_assert([
    [ 'src1',                        'src2',                        'exp' ],
    [ '',                            ' 1 , [ [ [7,89.4], "c" ] ] ', [ 'E@0:A_BF', 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,s3@19,]@23,]@25,E@27:A_AV' ] ],
    [ ' ',                           '1 , [ [ [7,89.4], "c" ] ] ',  [ 'E@1:A_BF', 'd1@0,[@4,[@6,[@8,d1@9,d4@11,]@15,s3@18,]@22,]@24,E@26:A_AV' ] ],
    [ ' 1 ',                         ', [ [ [7,89.4], "c" ] ] ',    [ 'd1@1,E@3:A_AV', '[@2,[@4,[@6,d1@7,d4@9,]@13,s3@16,]@20,]@22,E@24:A_AV' ] ],
    [ ' 1 ,',                        ' [ [ [7,89.4], "c" ] ] ',     [ 'd1@1,E@4:A_BV', '[@1,[@3,[@5,d1@6,d4@8,]@12,s3@15,]@19,]@21,E@23:A_AV' ] ],
    [ ' 1 , ',                       '[ [ [7,89.4], "c" ] ] ',      [ 'd1@1,E@5:A_BV', '[@0,[@2,[@4,d1@5,d4@7,]@11,s3@14,]@18,]@20,E@22:A_AV' ] ],
    [ ' 1 , [',                      ' [ [7,89.4], "c" ] ] ',       [ 'd1@1,[@5,E@6:A_BF:[', '[@1,[@3,d1@4,d4@6,]@10,s3@13,]@17,]@19,E@21:A_AV' ] ],
    [ ' 1 , [ ',                     '[ [7,89.4], "c" ] ] ',        [ 'd1@1,[@5,E@7:A_BF:[', '[@0,[@2,d1@3,d4@5,]@9,s3@12,]@16,]@18,E@20:A_AV' ] ],
    [ ' 1 , [ [',                    ' [7,89.4], "c" ] ] ',         [ 'd1@1,[@5,[@7,E@8:A_BF:[[', '[@1,d1@2,d4@4,]@8,s3@11,]@15,]@17,E@19:A_AV' ] ],
    [ ' 1 , [ [ ',                   '[7,89.4], "c" ] ] ',          [ 'd1@1,[@5,[@7,E@9:A_BF:[[', '[@0,d1@1,d4@3,]@7,s3@10,]@14,]@16,E@18:A_AV' ] ],
    [ ' 1 , [ [ [',                  '7,89.4], "c" ] ] ',           [ 'd1@1,[@5,[@7,[@9,E@10:A_BF:[[[', 'd1@0,d4@2,]@6,s3@9,]@13,]@15,E@17:A_AV' ] ],
    [ ' 1 , [ [ [7,',                '89.4], "c" ] ] ',             [ 'd1@1,[@5,[@7,[@9,d1@10,E@12:A_BV:[[[', 'd4@0,]@4,s3@7,]@11,]@13,E@15:A_AV' ] ],
    [ ' 1 , [ [ [7,89.4]',           ', "c" ] ] ',                  [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,E@17:A_AV:[[', 's3@2,]@6,]@8,E@10:A_AV' ] ],
    [ ' 1 , [ [ [7,89.4],',          ' "c" ] ] ',                   [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,E@18:A_BV:[[', 's3@1,]@5,]@7,E@9:A_AV' ] ],
    [ ' 1 , [ [ [7,89.4], ',         '"c" ] ] ',                    [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,E@19:A_BV:[[', 's3@0,]@4,]@6,E@8:A_AV' ] ],
    [ ' 1 , [ [ [7,89.4], "c"',      ' ] ] ',                       [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,s3@19,E@22:A_AV:[[', ']@1,]@3,E@5:A_AV' ] ],
    [ ' 1 , [ [ [7,89.4], "c" ',     '] ] ',                        [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,s3@19,E@23:A_AV:[[', ']@0,]@2,E@4:A_AV' ] ],
    [ ' 1 , [ [ [7,89.4], "c" ]',    ' ] ',                         [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,s3@19,]@23,E@24:A_AV:[', ']@1,E@3:A_AV' ] ],
    [ ' 1 , [ [ [7,89.4], "c" ] ',   '] ',                          [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,s3@19,]@23,E@25:A_AV:[', ']@0,E@2:A_AV' ] ],
    [ ' 1 , [ [ [7,89.4], "c" ] ]',  ' ',                           [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,s3@19,]@23,]@25,E@26:A_AV', 'E@1:A_AV' ] ],
    [ ' 1 , [ [ [7,89.4], "c" ] ] ', '',                            [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,s3@19,]@23,]@25,E@27:A_AV', 'E@0:A_AV' ] ],
  ], function (src1, src2) {
    return parse_split([src1, src2])
  })
})

test('incremental object', function (t) {
  t.table_assert([
    [ 'src1',                  'src2',                  'exp' ],
    [ '',                      '1,{"a":"one","b":[2]}', [ 'E@0:A_BF', 'd1@0,{@2,k3@3:s5@7,k3@13:[@17,d1@18,]@19,}@20,E@21:A_AV' ] ],
    [ '1,',                    '{"a":"one","b":[2]}',   [ 'd1@0,E@2:A_BV', '{@0,k3@1:s5@5,k3@11:[@15,d1@16,]@17,}@18,E@19:A_AV' ] ],
    [ '1,{',                   '"a":"one","b":[2]}',    [ 'd1@0,{@2,E@3:O_BF:{', 'k3@0:s5@4,k3@10:[@14,d1@15,]@16,}@17,E@18:A_AV' ] ],
    [ '1,{"a":"one"',          ',"b":[2]}',             [ 'd1@0,{@2,k3@3:s5@7,E@12:O_AV:{', 'k3@1:[@5,d1@6,]@7,}@8,E@9:A_AV' ] ],
    [ '1,{"a":"one",',         '"b":[2]}',              [ 'd1@0,{@2,k3@3:s5@7,E@13:O_BK:{', 'k3@0:[@4,d1@5,]@6,}@7,E@8:A_AV' ] ],
    [ '1,{"a":"one","b":[2]',  '}',                     [ 'd1@0,{@2,k3@3:s5@7,k3@13:[@17,d1@18,]@19,E@20:O_AV:{', '}@0,E@1:A_AV' ] ],
    [ '1,{"a":"one","b":[2]}', '',                      [ 'd1@0,{@2,k3@3:s5@7,k3@13:[@17,d1@18,]@19,}@20,E@21:A_AV', 'E@0:A_AV' ] ],
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

