import test from 'node:test'
import assert from 'node:assert/strict'
import { parseVisibility, readVisibility, writeVisibility, VISIBILITY_KEYS, MASK } from './balanceVisibility.js'
const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m } }
const broken = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') } }
test('defaults to visible when nothing is stored', () => { assert.equal(readVisibility(VISIBILITY_KEYS.current, memory()), true) })
test('malformed or unexpected values read as visible', () => { for (const v of [null, '', 'true', 'false', '0', '{}', 'HIDDEN', 'undefined']) assert.equal(parseVisibility(v), true) })
test('only "hidden" hides', () => { assert.equal(parseVisibility('hidden'), false) })
test('the two balances are stored independently', () => {
  const s = memory()
  writeVisibility(VISIBILITY_KEYS.current, false, s)
  assert.equal(readVisibility(VISIBILITY_KEYS.current, s), false)
  assert.equal(readVisibility(VISIBILITY_KEYS.savings, s), true)
  writeVisibility(VISIBILITY_KEYS.savings, false, s)
  writeVisibility(VISIBILITY_KEYS.current, true, s)
  assert.equal(readVisibility(VISIBILITY_KEYS.current, s), true)
  assert.equal(readVisibility(VISIBILITY_KEYS.savings, s), false)
})
test('only the words visible/hidden are stored', () => { const s = memory(); writeVisibility(VISIBILITY_KEYS.current, false, s); writeVisibility(VISIBILITY_KEYS.savings, true, s); assert.deepEqual([...s.m.values()].sort(), ['hidden', 'visible']) })
test('unavailable storage never throws', () => { assert.equal(readVisibility(VISIBILITY_KEYS.current, broken), true); assert.doesNotThrow(() => writeVisibility(VISIBILITY_KEYS.current, false, broken)) })
test('mask contains no digits', () => { assert.doesNotMatch(MASK, /\d/) })
