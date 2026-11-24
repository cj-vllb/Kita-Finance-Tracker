import test from 'node:test'
import assert from 'node:assert/strict'
import { pressKey, settle, evaluateKeypad, sanitizeTyped } from './amountKeypad.js'
import { quickTransaction, quickSavings, quickTransfer } from './quickEntry.js'
import { computeLedger, CURRENT, GENERAL } from './ledger.js'

const press = (keys, start = '') => keys.reduce((t, k) => pressKey(t, k), start)
test('keypad: digits, one decimal point, no leading zeros', () => {
  assert.equal(press(['1', '2', '.', '5', '.', '5']), '12.55')
  assert.equal(press(['0', '5']), '5')
  assert.equal(press(['0', '0', '0']), '0')
  assert.equal(press(['.', '5']), '0.5')
  assert.equal(press(['1', '.', '2', '3', '9']), '1.23') // two decimals at most
})
test('keypad: operators are never first, never doubled, and a trailing one is dropped', () => {
  assert.equal(press(['+']), '')
  assert.equal(press(['1', '0', '+', '-', '*', '5']), '10*5')
  assert.equal(settle('100+'), '100'); assert.equal(settle('100.'), '100')
  assert.deepEqual(evaluateKeypad('100+25.5'), { ok: true, amount: 125.5, isExpression: true })
  assert.equal(evaluateKeypad('600/3').amount, 200)
  assert.equal(evaluateKeypad('').ok, false); assert.equal(evaluateKeypad('0').ok, false)
})
test('keypad: back and clear, and pasted text is cleaned', () => {
  assert.equal(press(['back'], '12+3'), '12+'); assert.equal(press(['clear'], '12+3'), '')
  assert.equal(sanitizeTyped('1,2a3$+4'), '1.23+4'); assert.equal(sanitizeTyped('<script>'), '')
})
test('keypad: a number can never exceed the database limit silently', () => {
  assert.equal(press(Array(20).fill('9')).length, 12)
  assert.equal(evaluateKeypad('999999999999').ok, true); assert.equal(evaluateKeypad('9999999999999').ok, false)
})

test('quick transaction: always Current Balance, amount from the keypad, optional parts trimmed', () => {
  const r = quickTransaction({ type: 'expense', amount: '100+20', date: '2026-11-17', categoryId: 'c1', description: '  Lunch ', notes: ' ' })
  assert.equal(r.ok, true); assert.deepEqual(r.row, { id: 'new', type: 'expense', amount: 120, date: '2026-11-17', categoryId: 'c1', description: 'Lunch', notes: '', balance: 'current', goalId: '' })
  assert.equal(quickTransaction({ type: 'income', amount: '', date: '2026-11-17' }).errors.amount, 'Enter an amount.')
  assert.ok(quickTransaction({ type: 'income', amount: '5', date: '' }).errors.date)
  assert.ok(quickTransaction({ type: 'x', amount: '5', date: '2026-11-17' }).errors.type)
})

const ledger = computeLedger({ transactions: [{ type: 'income', amount: 1000, balance: 'current' }], contributions: [{ amount: 300, goalId: '' }], goals: [] })
test('quick savings: Add Money is ONE income transaction on the Savings balance (no contribution, no transfer)', () => {
  const r = quickSavings({ mode: 'add', amount: '50', date: '2026-11-17', title: ' Gift ', notes: ' Birthday money ', categoryId: 'ci', ledger })
  assert.deepEqual(r, { ok: true, row: { id: 'new', type: 'income', amount: 50, date: '2026-11-17', categoryId: 'ci', description: 'Gift', notes: 'Birthday money', balance: 'savings', goalId: '' } })
  assert.equal(r.kind, undefined) // nothing but a transaction row is produced
})
test('quick savings: Remove Money is ONE expense transaction on the Savings balance and is limited to General Savings', () => {
  const r = quickSavings({ mode: 'remove', amount: '300', date: '2026-11-17', categoryId: 'ce', ledger })
  assert.equal(r.ok, true); assert.deepEqual([r.row.type, r.row.balance, r.row.goalId, r.row.amount, r.row.categoryId], ['expense', 'savings', '', 300, 'ce'])
  const bad = quickSavings({ mode: 'remove', amount: '300.01', date: '2026-11-17', ledger }); assert.equal(bad.ok, false); assert.match(bad.errors.amount, /only has/)
})
test('quick savings: the accounting rules, checked through the real ledger', () => {
  const base = { transactions: [{ type: 'income', amount: 1000, balance: 'current' }], contributions: [{ amount: 300, goalId: '' }], goals: [] }
  const before = computeLedger(base)
  const add = quickSavings({ mode: 'add', amount: '200', date: '2026-11-17', ledger: before }).row
  const afterAdd = computeLedger({ ...base, transactions: [...base.transactions, add] })
  assert.equal(afterAdd.current, before.current); assert.equal(afterAdd.savings, before.savings + 200) // Savings up, Current Balance unchanged
  const rem = quickSavings({ mode: 'remove', amount: '150', date: '2026-11-17', ledger: afterAdd }).row
  const afterRem = computeLedger({ ...base, transactions: [...base.transactions, add, rem] })
  assert.equal(afterRem.current, before.current); assert.equal(afterRem.savings, before.savings + 50) // Savings down, Current Balance unchanged
  // it is a transaction, so the existing reports see exactly one income and one expense for it
  assert.deepEqual([add.type, rem.type], ['income', 'expense'])
})
test('quick transfer: same place rejected, funds checked, plan matches the existing rules', () => {
  const g = [{ id: 'g1', name: 'Trip' }]
  assert.ok(quickTransfer({ from: CURRENT, to: CURRENT, amount: '5', date: '2026-11-17', ledger, activeGoals: g }).errors.to)
  assert.equal(quickTransfer({ from: CURRENT, to: GENERAL, amount: '1000.01', date: '2026-11-17', ledger, activeGoals: g }).ok, false)
  assert.deepEqual(quickTransfer({ from: CURRENT, to: 'g1', amount: '10', date: '2026-11-17', title: 'x', ledger, activeGoals: g }), { ok: true, kind: 'transfer', payload: { direction: 'to_savings', goalId: 'g1', amount: 10, date: '2026-11-17', note: 'x' } })
  assert.equal(quickTransfer({ from: GENERAL, to: 'g1', amount: '100', date: '2026-11-17', ledger, activeGoals: g }).kind, 'move')
})
