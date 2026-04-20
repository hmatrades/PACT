import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { runPACT, tokenize, parse } = require('../pact-engine.js')

// ───────────────────────────────────────────────────────────────────────
// primitives — 15 tests
// ───────────────────────────────────────────────────────────────────────
describe('primitives', () => {
  test('integer literal', () => {
    const { result, error } = runPACT('42')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 42)
  })

  test('float literal', () => {
    const { result, error } = runPACT('3.14')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 3.14)
  })

  test('negative number literal', () => {
    const { result, error } = runPACT('-5')
    assert.strictEqual(error, null)
    assert.strictEqual(result, -5)
  })

  test('scientific notation', () => {
    const { result, error } = runPACT('1e3')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 1000)
  })

  test('hex literal', () => {
    const { result, error } = runPACT('0x10')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 16)
  })

  test('single-quoted string', () => {
    const { result, error } = runPACT(`'hello'`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'hello')
  })

  test('empty string', () => {
    const { result, error } = runPACT(`''`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, '')
  })

  test('string with spaces', () => {
    const { result, error } = runPACT(`'hello world'`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'hello world')
  })

  test('true literal', () => {
    const { result, error } = runPACT('true')
    assert.strictEqual(error, null)
    assert.strictEqual(result, true)
  })

  test('false literal', () => {
    const { result, error } = runPACT('false')
    assert.strictEqual(error, null)
    assert.strictEqual(result, false)
  })

  test('nil literal', () => {
    const { result, error } = runPACT('nil')
    assert.strictEqual(error, null)
    assert.strictEqual(result, null)
  })

  test('PI constant', () => {
    const { result, error } = runPACT('PI')
    assert.strictEqual(error, null)
    assert.strictEqual(result, Math.PI)
  })

  test('E constant', () => {
    const { result, error } = runPACT('E')
    assert.strictEqual(error, null)
    assert.strictEqual(result, Math.E)
  })

  test('INF constant', () => {
    const { result, error } = runPACT('INF')
    assert.strictEqual(error, null)
    assert.strictEqual(result, Infinity)
  })

  test('print operator pushes fmt-value to output', () => {
    const { output, error } = runPACT('. 42')
    assert.strictEqual(error, null)
    assert.deepStrictEqual(output, ['42'])
  })
})

// ───────────────────────────────────────────────────────────────────────
// arithmetic — 15 tests
// ───────────────────────────────────────────────────────────────────────
describe('arithmetic', () => {
  test('addition', () => {
    const { result, error } = runPACT('1 + 2')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 3)
  })

  test('subtraction', () => {
    const { result, error } = runPACT('10 - 3')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 7)
  })

  test('multiplication', () => {
    const { result, error } = runPACT('4 * 5')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 20)
  })

  test('division', () => {
    const { result, error } = runPACT('8 / 2')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 4)
  })

  test('modulo', () => {
    const { result, error } = runPACT('7 % 3')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 1)
  })

  test('exponentiation', () => {
    const { result, error } = runPACT('2 ^ 8')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 256)
  })

  test('division by zero returns 0 (safe)', () => {
    const { result, error } = runPACT('1 / 0')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 0)
  })

  test('modulo by zero returns 0 (safe)', () => {
    const { result, error } = runPACT('5 % 0')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 0)
  })

  test('operator precedence: * before +', () => {
    const { result, error } = runPACT('1 + 2 * 3')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 7)
  })

  test('parentheses override precedence', () => {
    const { result, error } = runPACT('(1 + 2) * 3')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 9)
  })

  test('right-associative exponentiation', () => {
    const { result, error } = runPACT('2 ^ 2 ^ 3')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 256)
  })

  test('unary minus', () => {
    const { result, error } = runPACT('-(-5)')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 5)
  })

  test('float arithmetic', () => {
    const { result, error } = runPACT('1.5 + 2.5')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 4)
  })

  test('mixed sign arithmetic', () => {
    const { result, error } = runPACT('-5 + 10')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 5)
  })

  test('nil treated as 0 in arithmetic', () => {
    const { result, error } = runPACT('5 + nil')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 5)
  })
})

// ───────────────────────────────────────────────────────────────────────
// comparison — 10 tests
// ───────────────────────────────────────────────────────────────────────
describe('comparison', () => {
  test('less than true', () => {
    const { result, error } = runPACT('1 < 2')
    assert.strictEqual(error, null)
    assert.strictEqual(result, true)
  })

  test('greater than false', () => {
    const { result, error } = runPACT('3 > 5')
    assert.strictEqual(error, null)
    assert.strictEqual(result, false)
  })

  test('less than or equal', () => {
    const { result, error } = runPACT('1 <= 1')
    assert.strictEqual(error, null)
    assert.strictEqual(result, true)
  })

  test('greater than or equal', () => {
    const { result, error } = runPACT('2 >= 2')
    assert.strictEqual(error, null)
    assert.strictEqual(result, true)
  })

  test('equality ~= true', () => {
    const { result, error } = runPACT('1 ~= 1')
    assert.strictEqual(error, null)
    assert.strictEqual(result, true)
  })

  test('inequality != true', () => {
    const { result, error } = runPACT('1 != 2')
    assert.strictEqual(error, null)
    assert.strictEqual(result, true)
  })

  test('string equality', () => {
    const { result, error } = runPACT(`'a' ~= 'a'`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, true)
  })

  test('string inequality', () => {
    const { result, error } = runPACT(`'a' != 'b'`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, true)
  })

  test('greater than false case', () => {
    const { result, error } = runPACT('2 > 5')
    assert.strictEqual(error, null)
    assert.strictEqual(result, false)
  })

  test('greater than or equal false', () => {
    const { result, error } = runPACT('1 >= 5')
    assert.strictEqual(error, null)
    assert.strictEqual(result, false)
  })
})

// ───────────────────────────────────────────────────────────────────────
// logical — 8 tests
// ───────────────────────────────────────────────────────────────────────
describe('logical', () => {
  test('logical AND true', () => {
    const { result, error } = runPACT('true && true')
    assert.strictEqual(error, null)
    assert.strictEqual(result, true)
  })

  test('logical AND false', () => {
    const { result, error } = runPACT('true && false')
    assert.strictEqual(error, null)
    assert.strictEqual(result, false)
  })

  test('logical OR true', () => {
    const { result, error } = runPACT('true || false')
    assert.strictEqual(error, null)
    assert.strictEqual(result, true)
  })

  test('logical OR false', () => {
    const { result, error } = runPACT('false || false')
    assert.strictEqual(error, null)
    assert.strictEqual(result, false)
  })

  test('logical NOT true', () => {
    const { result, error } = runPACT('!true')
    assert.strictEqual(error, null)
    assert.strictEqual(result, false)
  })

  test('logical NOT false', () => {
    const { result, error } = runPACT('!false')
    assert.strictEqual(error, null)
    assert.strictEqual(result, true)
  })

  test('double NOT', () => {
    const { result, error } = runPACT('!!true')
    assert.strictEqual(error, null)
    assert.strictEqual(result, true)
  })

  test('AND chained with comparison', () => {
    const { result, error } = runPACT('1 < 2 && 2 < 3')
    assert.strictEqual(error, null)
    assert.strictEqual(result, true)
  })
})

// ───────────────────────────────────────────────────────────────────────
// strings — 12 tests
// ───────────────────────────────────────────────────────────────────────
describe('strings', () => {
  test('string concatenation', () => {
    const { result, error } = runPACT(`'ab' + 'cd'`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'abcd')
  })

  test('triple string concat', () => {
    const { result, error } = runPACT(`'hello' + ' ' + 'world'`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'hello world')
  })

  test('string interpolation basic', () => {
    const { result, error } = runPACT(`'val={1+1}'`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'val=2')
  })

  test('string length via #', () => {
    const { result, error } = runPACT(`#'hello'`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 5)
  })

  test('string length via len builtin', () => {
    const { result, error } = runPACT(`len('hello')`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 5)
  })

  test('upper', () => {
    const { result, error } = runPACT(`upper('hi')`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'HI')
  })

  test('lower', () => {
    const { result, error } = runPACT(`lower('HI')`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'hi')
  })

  test('trim', () => {
    const { result, error } = runPACT(`trim('  hi  ')`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'hi')
  })

  test('string reverse', () => {
    const { result, error } = runPACT(`rev('hello')`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'olleh')
  })

  test('starts', () => {
    const { result, error } = runPACT(`starts('hello', 'he')`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, true)
  })

  test('ends', () => {
    const { result, error } = runPACT(`ends('hello', 'lo')`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, true)
  })

  test('replace', () => {
    const { result, error } = runPACT(`replace('abc', 'b', 'X')`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'aXc')
  })
})

// ───────────────────────────────────────────────────────────────────────
// variables — 5 tests
// ───────────────────────────────────────────────────────────────────────
describe('variables', () => {
  test('assignment and recall', () => {
    const { result, error } = runPACT('x = 5\nx + 1')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 6)
  })

  test('reassignment', () => {
    const { result, error } = runPACT('x = 5\nx = x + 10\nx')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 15)
  })

  test('compound += assignment', () => {
    const { result, error } = runPACT('x = 10\nx += 5\nx')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 15)
  })

  test('compound -= assignment', () => {
    const { result, error } = runPACT('x = 10\nx -= 3\nx')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 7)
  })

  test('compound *= assignment', () => {
    const { result, error } = runPACT('x = 4\nx *= 2\nx')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 8)
  })
})

// ───────────────────────────────────────────────────────────────────────
// control flow — 15 tests
// ───────────────────────────────────────────────────────────────────────
describe('control flow', () => {
  test('if true branch', () => {
    const { result, error } = runPACT(`if true { 'yes' } el { 'no' }`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'yes')
  })

  test('if false branch', () => {
    const { result, error } = runPACT(`if false { 'yes' } el { 'no' }`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'no')
  })

  test('if without else', () => {
    const { result, error } = runPACT(`if 1 > 0 { 'pos' }`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'pos')
  })

  test('if without else, false test', () => {
    const { result, error } = runPACT(`if 1 > 5 { 'pos' }`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, undefined)
  })

  test('else-if chain middle branch', () => {
    const { result, error } = runPACT(`if 5 > 10 { 'big' } el if 5 > 3 { 'mid' } el { 'small' }`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'mid')
  })

  test('else-if chain final branch', () => {
    const { result, error } = runPACT(`if 1 > 10 { 'big' } el if 1 > 5 { 'mid' } el { 'small' }`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'small')
  })

  test('ternary true', () => {
    const { result, error } = runPACT(`1 > 0 ? 'yes' : 'no'`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'yes')
  })

  test('ternary false', () => {
    const { result, error } = runPACT(`1 < 0 ? 'yes' : 'no'`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'no')
  })

  test('while loop counts down', () => {
    const { result, error } = runPACT('x = 3\nwh x > 0 { x = x - 1 }\nx')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 0)
  })

  test('while loop counts up to threshold', () => {
    const { result, error } = runPACT('x = 0\nwh x < 3 { x = x + 1 }\nx')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 3)
  })

  test('while false never runs', () => {
    const { result, error } = runPACT('wh false { . 1 }\n42')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 42)
  })

  test('for over array sums', () => {
    const { result, error } = runPACT('out = 0\nfor i in [1 2 3] { out = out + i }\nout')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 6)
  })

  test('for loop prints each element', () => {
    const { output, error } = runPACT('for i in [1 2 3] { . i }')
    assert.strictEqual(error, null)
    assert.deepStrictEqual(output, ['1', '2', '3'])
  })

  test('break exits while', () => {
    const { result, error } = runPACT('x = 0\nwh x < 10 { if x ~= 3 { br }\nx = x + 1 }\nx')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 3)
  })

  test('break exits for', () => {
    const { result, error } = runPACT('x = 0\nfor i in [1 2 3] { if i ~= 2 { br }\nx = x + i }\nx')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 1)
  })
})

// ───────────────────────────────────────────────────────────────────────
// functions — 10 tests
// ───────────────────────────────────────────────────────────────────────
describe('functions', () => {
  test('named function with colon body', () => {
    const { result, error } = runPACT('add => a b : a + b\nadd(1, 2)')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 3)
  })

  test('named function with block body', () => {
    const { result, error } = runPACT('mul => a b { ret a * b }\nmul(3, 4)')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 12)
  })

  test('lambda with fn keyword', () => {
    const { result, error } = runPACT('sq = fn x : x * x\nsq(6)')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 36)
  })

  test('immediately invoked lambda', () => {
    const { result, error } = runPACT('(fn x : x * 2)(5)')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 10)
  })

  test('zero-arg function', () => {
    const { result, error } = runPACT('f => : 42\nf()')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 42)
  })

  test('three-arg function', () => {
    const { result, error } = runPACT('g => a b c : a + b + c\ng(1, 2, 3)')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 6)
  })

  test('recursive factorial', () => {
    const { result, error } = runPACT('fact => n : n <= 1 ? 1 : n * fact(n - 1)\nfact(5)')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 120)
  })

  test('function used inside array literal', () => {
    const { result, error } = runPACT('inc => x : x + 1\n[inc(1), inc(2), inc(3)]')
    assert.strictEqual(error, null)
    assert.deepStrictEqual(result, [2, 3, 4])
  })

  test('function with explicit return in block', () => {
    const { result, error } = runPACT('f => x { ret x * 2 }\nf(5)')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 10)
  })

  test('nested function calls', () => {
    const { result, error } = runPACT('inc => x : x + 1\ninc(inc(inc(0)))')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 3)
  })
})

// ───────────────────────────────────────────────────────────────────────
// arrays and maps — 10 tests
// ───────────────────────────────────────────────────────────────────────
describe('arrays and maps', () => {
  test('empty array', () => {
    const { result, error } = runPACT('[]')
    assert.strictEqual(error, null)
    assert.deepStrictEqual(result, [])
  })

  test('array literal space-separated', () => {
    const { result, error } = runPACT('[1 2 3]')
    assert.strictEqual(error, null)
    assert.deepStrictEqual(result, [1, 2, 3])
  })

  test('array index access', () => {
    const { result, error } = runPACT('[1 2 3][0]')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 1)
  })

  test('array index via variable', () => {
    const { result, error } = runPACT('arr = [1 2 3]\narr[1]')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 2)
  })

  test('array length via #', () => {
    const { result, error } = runPACT('#[1 2 3]')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 3)
  })

  test('empty map', () => {
    const { result, error } = runPACT('{}')
    assert.strictEqual(error, null)
    assert.deepStrictEqual(result, {})
  })

  test('map literal', () => {
    const { result, error } = runPACT(`{name: 'alice' age: 30}`)
    assert.strictEqual(error, null)
    assert.deepStrictEqual(result, { name: 'alice', age: 30 })
  })

  test('map member access', () => {
    const { result, error } = runPACT(`m = {name: 'alice'}\nm.name`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'alice')
  })

  test('map index access with string key', () => {
    const { result, error } = runPACT(`{name: 'alice'}['name']`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'alice')
  })

  test('nested array', () => {
    const { result, error } = runPACT('[[1,2],[3,4]]')
    assert.strictEqual(error, null)
    assert.deepStrictEqual(result, [[1, 2], [3, 4]])
  })
})

// ───────────────────────────────────────────────────────────────────────
// builtins — 20 tests
// ───────────────────────────────────────────────────────────────────────
describe('builtins', () => {
  test('len on array', () => {
    const { result, error } = runPACT('len([1 2 3 4])')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 4)
  })

  test('sum on array', () => {
    const { result, error } = runPACT('sum([1 2 3 4 5])')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 15)
  })

  test('map doubles each element', () => {
    const { result, error } = runPACT('map([1 2 3], fn x : x * 2)')
    assert.strictEqual(error, null)
    assert.deepStrictEqual(result, [2, 4, 6])
  })

  test('fil keeps passing elements', () => {
    const { result, error } = runPACT('fil([1 2 3 4], fn x : x > 2)')
    assert.strictEqual(error, null)
    assert.deepStrictEqual(result, [3, 4])
  })

  test('sort ascending', () => {
    const { result, error } = runPACT('sort([3 1 2])')
    assert.strictEqual(error, null)
    assert.deepStrictEqual(result, [1, 2, 3])
  })

  test('join with separator', () => {
    const { result, error } = runPACT(`join([1 2 3], '-')`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, '1-2-3')
  })

  test('split with delimiter', () => {
    const { result, error } = runPACT(`split('a,b,c', ',')`)
    assert.strictEqual(error, null)
    assert.deepStrictEqual(result, ['a', 'b', 'c'])
  })

  test('upper on string', () => {
    const { result, error } = runPACT(`upper('hi')`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'HI')
  })

  test('lower on string', () => {
    const { result, error } = runPACT(`lower('HI')`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'hi')
  })

  test('trim whitespace', () => {
    const { result, error } = runPACT(`trim('  hi  ')`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'hi')
  })

  test('push appends element', () => {
    const { result, error } = runPACT('push([1 2], 3)')
    assert.strictEqual(error, null)
    assert.deepStrictEqual(result, [1, 2, 3])
  })

  test('pop removes last', () => {
    const { result, error } = runPACT('pop([1 2 3])')
    assert.strictEqual(error, null)
    assert.deepStrictEqual(result, [1, 2])
  })

  test('head returns first element', () => {
    const { result, error } = runPACT('head([1 2 3])')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 1)
  })

  test('tail returns all but first', () => {
    const { result, error } = runPACT('tail([1 2 3])')
    assert.strictEqual(error, null)
    assert.deepStrictEqual(result, [2, 3])
  })

  test('type of number', () => {
    const { result, error } = runPACT('type(42)')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'number')
  })

  test('str converts number to string', () => {
    const { result, error } = runPACT('str(42)')
    assert.strictEqual(error, null)
    assert.strictEqual(result, '42')
  })

  test('num parses string to number', () => {
    const { result, error } = runPACT(`num('42')`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 42)
  })

  test('round to nearest integer', () => {
    const { result, error } = runPACT('round(3.7)')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 4)
  })

  test('abs of negative', () => {
    const { result, error } = runPACT('abs(-5)')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 5)
  })

  test('min and max of array', () => {
    const r1 = runPACT('min([5 3 8 1 9])')
    const r2 = runPACT('max([5 3 8 1 9])')
    assert.strictEqual(r1.error, null)
    assert.strictEqual(r1.result, 1)
    assert.strictEqual(r2.error, null)
    assert.strictEqual(r2.result, 9)
  })
})

// ───────────────────────────────────────────────────────────────────────
// pipes — 7 tests
// ───────────────────────────────────────────────────────────────────────
describe('pipes', () => {
  test('pipe array to len', () => {
    const { result, error } = runPACT('[1 2 3] | len')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 3)
  })

  test('pipe array to sum', () => {
    const { result, error } = runPACT('[1 2 3] | sum')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 6)
  })

  test('pipe array to rev', () => {
    const { result, error } = runPACT('[1 2 3] | rev')
    assert.strictEqual(error, null)
    assert.deepStrictEqual(result, [3, 2, 1])
  })

  test('pipe string to upper', () => {
    const { result, error } = runPACT(`'hello' | upper`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 'HELLO')
  })

  test('pipe string to len', () => {
    const { result, error } = runPACT(`'hi' | len`)
    assert.strictEqual(error, null)
    assert.strictEqual(result, 2)
  })

  test('pipe array to sort', () => {
    const { result, error } = runPACT('[3 1 2] | sort')
    assert.strictEqual(error, null)
    assert.deepStrictEqual(result, [1, 2, 3])
  })

  test('pipe chain array → sum', () => {
    const { result, error } = runPACT('1..6 | sum')
    assert.strictEqual(error, null)
    assert.strictEqual(result, 15)
  })
})

// ───────────────────────────────────────────────────────────────────────
// error contract — 5 tests (engine must NEVER throw)
// ───────────────────────────────────────────────────────────────────────
describe('error contract', () => {
  test('bad syntax does not throw, returns error string', () => {
    assert.doesNotThrow(() => {
      const r = runPACT('bad $$$')
      assert.notStrictEqual(r.error, null)
      assert.strictEqual(typeof r.error, 'string')
    })
  })

  test('division by zero does not throw', () => {
    assert.doesNotThrow(() => {
      const r = runPACT('1 / 0')
      assert.strictEqual(r.error, null)
    })
  })

  test('unknown variable returns undefined, no throw', () => {
    assert.doesNotThrow(() => {
      const r = runPACT('unknown_var_name')
      assert.strictEqual(r.error, null)
      assert.strictEqual(r.result, undefined)
    })
  })

  test('unclosed brace returns error, no throw', () => {
    assert.doesNotThrow(() => {
      const r = runPACT('if true { ')
      assert.notStrictEqual(r.error, null)
    })
  })

  test('unknown function call returns error, no throw', () => {
    assert.doesNotThrow(() => {
      const r = runPACT('not_a_fn(1, 2)')
      assert.notStrictEqual(r.error, null)
    })
  })
})
