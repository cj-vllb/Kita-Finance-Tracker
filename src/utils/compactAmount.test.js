import test from 'node:test'
import assert from 'node:assert/strict'
import { compact } from './compactAmount.js'
test('compact: positive amounts are unchanged from before', () => {
  for (const [v, s] of [[0, '0'], [950, '950'], [999.4, '999'], [1000, '1k'], [1250, '1.3k'], [9999, '10k'], [20000, '20k'], [123456, '123k'], [1500000, '1.5M'], [2e9, '2B']]) assert.equal(compact(v), s, String(v))
})
test('compact: negative amounts keep the sign and the same short form', () => {
  for (const [v, s] of [[-20000, '-20k'], [-950, '-950'], [-1250, '-1.3k'], [-1500000, '-1.5M'], [-2e9, '-2B']]) assert.equal(compact(v), s, String(v))
})
test('compact: values that round to zero, -0 and bad input are plain 0', () => {
  for (const v of [-0, -0.4, 0.4, NaN, undefined, null, Infinity]) assert.equal(compact(v), '0', String(v))
})
