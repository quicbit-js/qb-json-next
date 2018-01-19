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
  while (qbnext.next(ps) !== 0) {
    toks.push(qbnext.tokstr(ps))
  }
  toks.push(qbnext.tokstr(ps, true))
  return toks.join(',')
}

function err (msg) { throw Error(msg) }

test('init', function (t) {
  t.table_assert([
    [ 'ps',                     'exp' ],
    [ {src: [99]},              '!@0:A_BF' ],
  ], function (ps) { return qbnext.tokstr(qbnext.init(ps), true) })
})

test('next', function (t) {
  t.table_assert([
    [ 'src',     'iterations', 'exp' ],
    [ '"a"',     3,            's3@0,!@3:A_AV,!@3:A_AV' ],
    [ '"a",',    3,            's3@0,!@4:A_BV,!@4:A_BV' ],
    [ '"a",3',   4,            's3@0,!1@4D:A_BV,!@5:A_BV,!@5:A_BV' ],
    [ '"a",3,',  4,            's3@0,d1@4,!@6:A_BV,!@6:A_BV' ],
    [ '"a",3,t', 5,            's3@0,d1@4,!1@6T:A_BV,!@7:A_BV,!@7:A_BV' ],
    //
    //   [ '',                                         0,     null,  [ 'B@0,E@0', '0/0/F' ] ],
    // [ '1',                                        0,     null,  [ 'B@0,d1@0,E@1', '1/0/W' ] ],
    // [ '1,2,3',                                    0,     null,  [ 'B@0,d1@0,d1@2,d1@4,E@5', '5/2/W' ] ],
    // [ '[1, 2], 3',                                0,     null,  [ 'B@0,[@0,d1@1,d1@4,]@5,d1@8,E@9', '9/3/W' ] ],
    // [ '"x"',                                      0,     null,  [ 'B@0,s3@0,E@3', '3/1/W' ] ],
    // [ '-3.05',                                    0,     null,  [ 'B@0,d5@0,E@5', '5/0/W' ] ],
    // [ '-3.05',                                    1,     null,  [ 'B@1,d4@1,E@5', '5/0/W' ] ],
    // [ '\b  true',                                 0,     null,  [ 'B@0,t@3,E@7', '7/1/W' ] ],
    // [ '  true',                                   0,     null,  [ 'B@0,t@2,E@6', '6/1/W' ] ],
    // [ 'false',                                    0,     null,  [ 'B@0,f@0,E@5', '5/1/W' ] ],
    // [ ' false  ',                                 0,     null,  [ 'B@0,f@1,E@8', '8/1/W' ] ],
    // [ ' false   ',                                1,     null,  [ 'B@1,f@1,E@9', '9/1/W' ] ],
    // [ '[1, 2, 3]',                                0,     null,  [ 'B@0,[@0,d1@1,d1@4,d1@7,]@8,E@9', '9/4/W' ] ],
    // [ '[3.05E-2]',                                0,     null,  [ 'B@0,[@0,d7@1,]@8,E@9', '9/2/W' ] ],
    // [ '[3.05E-2]',                                4,     5,     [ 'B@4,d1@4,E@5', '5/0/W' ] ],
    // [ '{"a":1}',                                  0,     null,  [ 'B@0,{@0,k3@1:d1@5,}@6,E@7', '7/2/W' ] ],
    // [ '{"a":1,"b":{}}',                           0,     null,  [ 'B@0,{@0,k3@1:d1@5,k3@7:{@11,}@12,}@13,E@14', '14/3/W' ] ],
    // [ '{"a"  :1}',                                0,     null,  [ 'B@0,{@0,k3@1:d1@7,}@8,E@9', '9/2/W' ] ],
    // [ '{ "a" : 1 }',                              0,     null,  [ 'B@0,{@0,k3@2:d1@8,}@10,E@11', '11/2/W' ] ],
    // [ '"\\""',                                    0,     null,  [ 'B@0,s4@0,E@4', '4/1/W' ] ],
    // [ '"\\\\"',                                   0,     null,  [ 'B@0,s4@0,E@4', '4/1/W' ] ],
    // [ '\t\t"x\\a\r"  ',                           0,     null,  [ 'B@0,s6@2,E@10', '10/1/W' ] ],
    // [ '"\\"x\\"a\r\\""',                          0,     null,  [ 'B@0,s11@0,E@11', '11/1/W' ] ],
    // [ ' [0,1,2]',                                 0,     null,  [ 'B@0,[@1,d1@2,d1@4,d1@6,]@7,E@8', '8/4/W' ] ],
    // [ '["a", "bb"] ',                             0,     null,  [ 'B@0,[@0,s3@1,s4@6,]@10,E@12', '12/3/W' ] ],
    // [ '"x", 4\n, null, 3.2e5 , true, false',      null,  null,  [ 'B@0,s3@0,d1@5,n@9,d5@15,t@23,f@29,E@34', '34/6/W' ] ],
    // [ '["a",1.3,\n\t{ "b" : ["v", "w"]\n}\t\n ]', null,  null,  [ 'B@0,[@0,s3@1,d3@5,{@11,k3@13:[@19,s3@20,s3@25,]@28,}@30,]@34,E@35', '35/7/W' ] ],

  ], function (src, iterations) {
    var ps = qbnext.init({src: utf8.buffer(src)})

    var results = []
    for (var i = 0; i < iterations; i++) {
      var ret = qbnext.next(ps)
      ps.tok === ret || err('returned wrong token')
      results.push(qbnext.tokstr(ps, ps.tok === 0))
    }
    return results.join(',')
  })
})

test('object - no spaces', function (t) {
  t.table_assert(
    [
      [ 'src',            'exp' ],
      [ '',               '!@0:A_BF' ],
      [ '{',              '{@0,!@1:O_BF:{' ],
      [ '{"',             '{@0,k1@1:!@2T:O_BF:{' ],
      [ '{"a',            '{@0,k2@1:!@3T:O_BF:{' ],
      [ '{"a"',           '{@0,k3@1:!@4:O_AK:{' ],
      [ '{"a":',          '{@0,k3@1:!@5:O_BV:{' ],
      [ '{"a":7',         '{@0,k3@1:!1@5D:O_BV:{' ],
      [ '{"a":71',        '{@0,k3@1:!2@5D:O_BV:{' ],
      [ '{"a":71,',       '{@0,k3@1:d2@5,!@8:O_BK:{' ],
      [ '{"a":71,"',      '{@0,k3@1:d2@5,k1@8:!@9T:O_BK:{' ],
      [ '{"a":71,"b',     '{@0,k3@1:d2@5,k2@8:!@10T:O_BK:{' ],
      [ '{"a":71,"b"',    '{@0,k3@1:d2@5,k3@8:!@11:O_AK:{' ],
      [ '{"a":71,"b":',   '{@0,k3@1:d2@5,k3@8:!@12:O_BV:{' ],
      [ '{"a":71,"b":2',  '{@0,k3@1:d2@5,k3@8:!1@12D:O_BV:{' ],
      [ '{"a":71,"b":2}', '{@0,k3@1:d2@5,k3@8:d1@12,}@13,!@14:A_AV' ],
    ], function (src) { return src_tokens(qbnext.init({src: utf8.buffer(src)})) })
})

test('array - no spaces', function (t) {
  t.table_assert(
    [
      [ 'input',      'exp' ],
      [ '',           '!@0:A_BF' ],
      [ '[',          '[@0,!@1:A_BF:[' ],
      [ '[8',         '[@0,!1@1D:A_BF:[' ],
      [ '[83',        '[@0,!2@1D:A_BF:[' ],
      [ '[83 ',       '[@0,d2@1,!@4:A_AV:[' ],
      [ '[83,',       '[@0,d2@1,!@4:A_BV:[' ],
      [ '[83,"',      '[@0,d2@1,!1@4T:A_BV:[' ],
      [ '[83,"a',     '[@0,d2@1,!2@4T:A_BV:[' ],
      [ '[83,"a"',    '[@0,d2@1,s3@4,!@7:A_AV:[' ],
      [ '[83,"a",',   '[@0,d2@1,s3@4,!@8:A_BV:[' ],
      [ '[83,"a",2',  '[@0,d2@1,s3@4,!1@8D:A_BV:[' ],
      [ '[83,"a",2]', '[@0,d2@1,s3@4,d1@8,]@9,!@10:A_AV' ],
    ], function (src) { return src_tokens(qbnext.init({src: utf8.buffer(src)})) })
})

test('array - spaces', function (t) {
  t.table_assert(
    [
      [ 'input',           'exp' ],
      [ '',                '!@0:A_BF' ],
      [ '[',               '[@0,!@1:A_BF:[' ],
      [ '[ ',              '[@0,!@2:A_BF:[' ],
      [ '[ 8',             '[@0,!1@2D:A_BF:[' ],
      [ '[ 83',            '[@0,!2@2D:A_BF:[' ],
      [ '[ 83,',           '[@0,d2@2,!@5:A_BV:[' ],
      [ '[ 83, ',          '[@0,d2@2,!@6:A_BV:[' ],
      [ '[ 83, "',         '[@0,d2@2,!1@6T:A_BV:[' ],
      [ '[ 83, "a',        '[@0,d2@2,!2@6T:A_BV:[' ],
      [ '[ 83, "a"',       '[@0,d2@2,s3@6,!@9:A_AV:[' ],
      [ '[ 83, "a" ',      '[@0,d2@2,s3@6,!@10:A_AV:[' ],
      [ '[ 83, "a" ,',     '[@0,d2@2,s3@6,!@11:A_BV:[' ],
      [ '[ 83, "a" , ',    '[@0,d2@2,s3@6,!@12:A_BV:[' ],
      [ '[ 83, "a" , 2',   '[@0,d2@2,s3@6,!1@12D:A_BV:[' ],
      [ '[ 83, "a" , 2 ',  '[@0,d2@2,s3@6,d1@12,!@14:A_AV:[' ],
      [ '[ 83, "a" , 2 ]', '[@0,d2@2,s3@6,d1@12,]@14,!@15:A_AV' ],
    ], function (src) { return src_tokens(qbnext.init({src: utf8.buffer(src)})) })
})

test('object - spaces', function (t) {
  t.table_assert(
    [
      [ 'input',          'exp' ],
      [ ' ',              '!@1:A_BF' ],
      [ ' {',             '{@1,!@2:O_BF:{' ],
      [ ' { ',            '{@1,!@3:O_BF:{' ],
      [ ' { "',           '{@1,k1@3:!@4T:O_BF:{' ],
      [ ' { "a',          '{@1,k2@3:!@5T:O_BF:{' ],
      [ ' { "a"',         '{@1,k3@3:!@6:O_AK:{' ],
      [ ' { "a":',        '{@1,k3@3:!@7:O_BV:{' ],
      [ ' { "a": ',       '{@1,k3@3:!@8:O_BV:{' ],
      [ ' { "a": "',      '{@1,k3@3:!1@8T:O_BV:{' ],
      [ ' { "a": "x',     '{@1,k3@3:!2@8T:O_BV:{' ],
      [ ' { "a": "x"',    '{@1,k3@3:s3@8,!@11:O_AV:{' ],
      [ ' { "a": "x" }',  '{@1,k3@3:s3@8,}@12,!@13:A_AV' ],
      [ ' { "a" ',        '{@1,k3@3:!@7:O_AK:{' ],
      [ ' { "a" :',       '{@1,k3@3:!@8:O_BV:{' ],
      [ ' { "a" : ',      '{@1,k3@3:!@9:O_BV:{' ],
      [ ' { "a" : "',     '{@1,k3@3:!1@9T:O_BV:{' ],
      [ ' { "a" : "x',    '{@1,k3@3:!2@9T:O_BV:{' ],
      [ ' { "a" : "x" ',  '{@1,k3@3:s3@9,!@13:O_AV:{' ],
      [ ' { "a" : "x" }', '{@1,k3@3:s3@9,}@13,!@14:A_AV' ],
    ], function (src) { return src_tokens(qbnext.init({src: utf8.buffer(src)})) })
})

test('incremental array', function (t) {
  t.table_assert([
    [ 'src1',               'src2',               'exp' ],
    [ '',                   '1,[[[7,89.4],"c"]]', [ '!@0:A_BF', 'd1@0,[@2,[@3,[@4,d1@5,d4@7,]@11,s3@13,]@16,]@17,!@18:A_AV' ] ],
    [ '1,',                 '[[[7,89.4],"c"]]',   [ 'd1@0,!@2:A_BV', '[@0,[@1,[@2,d1@3,d4@5,]@9,s3@11,]@14,]@15,!@16:A_AV' ] ],
    [ '1,[',                '[[7,89.4],"c"]]',    [ 'd1@0,[@2,!@3:A_BF:[', '[@0,[@1,d1@2,d4@4,]@8,s3@10,]@13,]@14,!@15:A_AV' ] ],
    [ '1,[[',               '[7,89.4],"c"]]',     [ 'd1@0,[@2,[@3,!@4:A_BF:[[', '[@0,d1@1,d4@3,]@7,s3@9,]@12,]@13,!@14:A_AV' ] ],
    [ '1,[[[',              '7,89.4],"c"]]',      [ 'd1@0,[@2,[@3,[@4,!@5:A_BF:[[[', 'd1@0,d4@2,]@6,s3@8,]@11,]@12,!@13:A_AV' ] ],
    [ '1,[[[7,',            '89.4],"c"]]',        [ 'd1@0,[@2,[@3,[@4,d1@5,!@7:A_BV:[[[', 'd4@0,]@4,s3@6,]@9,]@10,!@11:A_AV' ] ],
    [ '1,[[[7,89.4]',       ',"c"]]',             [ 'd1@0,[@2,[@3,[@4,d1@5,d4@7,]@11,!@12:A_AV:[[', 's3@1,]@4,]@5,!@6:A_AV' ] ],
    [ '1,[[[7,89.4],',      '"c"]]',              [ 'd1@0,[@2,[@3,[@4,d1@5,d4@7,]@11,!@13:A_BV:[[', 's3@0,]@3,]@4,!@5:A_AV' ] ],
    [ '1,[[[7,89.4],"c"',   ']]',                 [ 'd1@0,[@2,[@3,[@4,d1@5,d4@7,]@11,s3@13,!@16:A_AV:[[', ']@0,]@1,!@2:A_AV' ] ],
    [ '1,[[[7,89.4],"c"]',  ']',                  [ 'd1@0,[@2,[@3,[@4,d1@5,d4@7,]@11,s3@13,]@16,!@17:A_AV:[', ']@0,!@1:A_AV' ] ],
    [ '1,[[[7,89.4],"c"]]', '',                   [ 'd1@0,[@2,[@3,[@4,d1@5,d4@7,]@11,s3@13,]@16,]@17,!@18:A_AV', '!@0:A_AV' ] ],
  ], function (src1, src2) {
    return parse_split([src1, src2])
  })
})

test('incremental array - spaces', function (t) {
  t.table_assert([
    [ 'src1',                        'src2',                        'exp' ],
    [ '',                            ' 1 , [ [ [7,89.4], "c" ] ] ', [ '!@0:A_BF', 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,s3@19,]@23,]@25,!@27:A_AV' ] ],
    [ ' ',                           '1 , [ [ [7,89.4], "c" ] ] ',  [ '!@1:A_BF', 'd1@0,[@4,[@6,[@8,d1@9,d4@11,]@15,s3@18,]@22,]@24,!@26:A_AV' ] ],
    [ ' 1 ',                         ', [ [ [7,89.4], "c" ] ] ',    [ 'd1@1,!@3:A_AV', '[@2,[@4,[@6,d1@7,d4@9,]@13,s3@16,]@20,]@22,!@24:A_AV' ] ],
    [ ' 1 ,',                        ' [ [ [7,89.4], "c" ] ] ',     [ 'd1@1,!@4:A_BV', '[@1,[@3,[@5,d1@6,d4@8,]@12,s3@15,]@19,]@21,!@23:A_AV' ] ],
    [ ' 1 , ',                       '[ [ [7,89.4], "c" ] ] ',      [ 'd1@1,!@5:A_BV', '[@0,[@2,[@4,d1@5,d4@7,]@11,s3@14,]@18,]@20,!@22:A_AV' ] ],
    [ ' 1 , [',                      ' [ [7,89.4], "c" ] ] ',       [ 'd1@1,[@5,!@6:A_BF:[', '[@1,[@3,d1@4,d4@6,]@10,s3@13,]@17,]@19,!@21:A_AV' ] ],
    [ ' 1 , [ ',                     '[ [7,89.4], "c" ] ] ',        [ 'd1@1,[@5,!@7:A_BF:[', '[@0,[@2,d1@3,d4@5,]@9,s3@12,]@16,]@18,!@20:A_AV' ] ],
    [ ' 1 , [ [',                    ' [7,89.4], "c" ] ] ',         [ 'd1@1,[@5,[@7,!@8:A_BF:[[', '[@1,d1@2,d4@4,]@8,s3@11,]@15,]@17,!@19:A_AV' ] ],
    [ ' 1 , [ [ ',                   '[7,89.4], "c" ] ] ',          [ 'd1@1,[@5,[@7,!@9:A_BF:[[', '[@0,d1@1,d4@3,]@7,s3@10,]@14,]@16,!@18:A_AV' ] ],
    [ ' 1 , [ [ [',                  '7,89.4], "c" ] ] ',           [ 'd1@1,[@5,[@7,[@9,!@10:A_BF:[[[', 'd1@0,d4@2,]@6,s3@9,]@13,]@15,!@17:A_AV' ] ],
    [ ' 1 , [ [ [7,',                '89.4], "c" ] ] ',             [ 'd1@1,[@5,[@7,[@9,d1@10,!@12:A_BV:[[[', 'd4@0,]@4,s3@7,]@11,]@13,!@15:A_AV' ] ],
    [ ' 1 , [ [ [7,89.4]',           ', "c" ] ] ',                  [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,!@17:A_AV:[[', 's3@2,]@6,]@8,!@10:A_AV' ] ],
    [ ' 1 , [ [ [7,89.4],',          ' "c" ] ] ',                   [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,!@18:A_BV:[[', 's3@1,]@5,]@7,!@9:A_AV' ] ],
    [ ' 1 , [ [ [7,89.4], ',         '"c" ] ] ',                    [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,!@19:A_BV:[[', 's3@0,]@4,]@6,!@8:A_AV' ] ],
    [ ' 1 , [ [ [7,89.4], "c"',      ' ] ] ',                       [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,s3@19,!@22:A_AV:[[', ']@1,]@3,!@5:A_AV' ] ],
    [ ' 1 , [ [ [7,89.4], "c" ',     '] ] ',                        [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,s3@19,!@23:A_AV:[[', ']@0,]@2,!@4:A_AV' ] ],
    [ ' 1 , [ [ [7,89.4], "c" ]',    ' ] ',                         [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,s3@19,]@23,!@24:A_AV:[', ']@1,!@3:A_AV' ] ],
    [ ' 1 , [ [ [7,89.4], "c" ] ',   '] ',                          [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,s3@19,]@23,!@25:A_AV:[', ']@0,!@2:A_AV' ] ],
    [ ' 1 , [ [ [7,89.4], "c" ] ]',  ' ',                           [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,s3@19,]@23,]@25,!@26:A_AV', '!@1:A_AV' ] ],
    [ ' 1 , [ [ [7,89.4], "c" ] ] ', '',                            [ 'd1@1,[@5,[@7,[@9,d1@10,d4@12,]@16,s3@19,]@23,]@25,!@27:A_AV', '!@0:A_AV' ] ],
  ], function (src1, src2) {
    return parse_split([src1, src2])
  })
})

test('incremental object', function (t) {
  t.table_assert([
    [ 'src1',                  'src2',                  'exp' ],
    [ '',                      '1,{"a":"one","b":[2]}', [ '!@0:A_BF', 'd1@0,{@2,k3@3:s5@7,k3@13:[@17,d1@18,]@19,}@20,!@21:A_AV' ] ],
    [ '1,',                    '{"a":"one","b":[2]}',   [ 'd1@0,!@2:A_BV', '{@0,k3@1:s5@5,k3@11:[@15,d1@16,]@17,}@18,!@19:A_AV' ] ],
    [ '1,{',                   '"a":"one","b":[2]}',    [ 'd1@0,{@2,!@3:O_BF:{', 'k3@0:s5@4,k3@10:[@14,d1@15,]@16,}@17,!@18:A_AV' ] ],
    [ '1,{"a":"one"',          ',"b":[2]}',             [ 'd1@0,{@2,k3@3:s5@7,!@12:O_AV:{', 'k3@1:[@5,d1@6,]@7,}@8,!@9:A_AV' ] ],
    [ '1,{"a":"one",',         '"b":[2]}',              [ 'd1@0,{@2,k3@3:s5@7,!@13:O_BK:{', 'k3@0:[@4,d1@5,]@6,}@7,!@8:A_AV' ] ],
    [ '1,{"a":"one","b":[2]',  '}',                     [ 'd1@0,{@2,k3@3:s5@7,k3@13:[@17,d1@18,]@19,!@20:O_AV:{', '}@0,!@1:A_AV' ] ],
    [ '1,{"a":"one","b":[2]}', '',                      [ 'd1@0,{@2,k3@3:s5@7,k3@13:[@17,d1@18,]@19,}@20,!@21:A_AV', '!@0:A_AV' ] ],
  ], function (src1, src2) {
    return parse_split([src1, src2])
  })
})

function parse_split (sources) {
  var results = []
  var ps = qbnext.init({src: utf8.buffer(sources.shift())})
  results.push(src_tokens(ps))

  while (sources.length) {
    ps.src = utf8.buffer(sources.shift())
    ps.koff = ps.klim = ps.voff = ps.vlim = ps.tok = ps.ecode = 0
    ps.lim = ps.src.length
    results.push(src_tokens(ps))
  }
  return results
}
