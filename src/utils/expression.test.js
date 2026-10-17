import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateAmount as ev } from './expression.js'
const amount = (s) => { const r = ev(s); assert.equal(r.ok, true, `${s}: ${r.error}`); return r.amount }
const bad = (s) => { const r = ev(s); assert.equal(r.ok, false, `${s} should be rejected`); return r.error }

test('the four operations', () => {
  assert.equal(amount('100+200+430+100'), 830)
  assert.equal(amount('1000-250'), 750)
  assert.equal(amount('50*12'), 600)
  assert.equal(amount('600/3'), 200)
})
test('plain numbers and decimals, with spaces', () => {
  assert.equal(amount('250'), 250)
  assert.equal(amount('  12.5  '), 12.5)
  assert.equal(amount('100 + 200 + 430'), 730)
  assert.equal(amount('.5+.25'), 0.75)
  assert.equal(ev('250').isExpression, false)
  assert.equal(ev('1+1').isExpression, true)
})
test('no floating-point drift', () => {
  assert.equal(amount('0.1+0.2'), 0.3)
  assert.equal(amount('1.1*3'), 3.3)
  assert.equal(amount('19.99*3'), 59.97)
  assert.equal(amount('0.07+0.01'), 0.08)
  assert.equal(amount('1000/3'), 333.33)
  assert.equal(amount('2/3'), 0.67)
  assert.equal(amount('1.005+0'), 1.01) // half rounds away from zero, exactly
})
test('precedence, brackets and unary signs', () => {
  assert.equal(amount('2+3*4'), 14)
  assert.equal(amount('(2+3)*4'), 20)
  assert.equal(amount('10-2-3'), 5)
  assert.equal(amount('100/4/5'), 5)
  assert.equal(amount('-5+10'), 5)
  assert.equal(amount('10*-2+30'), 10)
  assert.equal(amount('((1+2)*(3+4))'), 21)
})
test('phone keyboard operator characters', () => {
  assert.equal(amount('50\u00d712'), 600)
  assert.equal(amount('600\u00f73'), 200)
  assert.equal(amount('1000\u2212250'), 750)
})
test('rejects empty and incomplete input', () => {
  for (const s of ['', '   ', '+', '100+', '100+*2', '*5', '(1+2', '1+2)', '()', '100 200', '1..2', '.', '1.2.3']) bad(s)
  assert.equal(ev(null).ok, false)
  assert.equal(ev(undefined).ok, false)
})
test('rejects division by zero', () => {
  assert.match(bad('5/0'), /divide by zero/i)
  assert.match(bad('5/(2-2)'), /divide by zero/i)
  assert.match(bad('5/0.00000000'), /divide by zero/i)
})
test('rejects anything outside the arithmetic syntax', () => {
  for (const s of ['abc', '1e3', '1,000', '2**3', '2^3', '5%', 'alert(1)', 'Math.PI', '1;2', '1+2 // x', '`1`', '${1}', 'constructor', '0x10', '1_000', 'Infinity', 'NaN', '१२३', '1+\n2x']) bad(s)
})
test('rejects results the transaction rules refuse', () => {
  assert.match(bad('0'), /above zero/)
  assert.match(bad('5-5'), /above zero/)
  assert.match(bad('5-10'), /above zero/)
  assert.match(bad('-5'), /above zero/)
  assert.match(bad('0.004'), /above zero/) // rounds to 0.00
  assert.match(bad('999999999999.99+0.01'), /too large/)
  assert.match(bad('1000000000000'), /too large/)
  assert.match(bad('9999999999999999'), /too large/) // 16 digits
  assert.equal(amount('999999999999.99'), 999999999999.99)
  assert.equal(amount('0.005'), 0.01)
})
test('limits on length, decimals and nesting', () => {
  bad('1'.repeat(201))
  bad('1.123456789')
  bad('('.repeat(25) + '1' + ')'.repeat(25))
  assert.equal(amount('('.repeat(15) + '1' + ')'.repeat(15)), 1)
})
test('the source never uses eval or Function', async () => {
  const { readFile } = await import('node:fs/promises')
  const src = (await readFile(new URL('./expression.js', import.meta.url), 'utf8')).replace(/\/\/.*$/gm, '')
  assert.doesNotMatch(src, /\beval\s*\(|new Function|Function\s*\(/)
})
