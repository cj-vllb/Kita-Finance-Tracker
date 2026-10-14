// Run with: npm test   (Node's built-in test runner; no extra dependency). Covers the money rules of 1.3.1 on the pure ledger calculation.
import test from 'node:test'
import assert from 'node:assert/strict'
import { computeLedger, ledgerProblem, goalProgress, pctText, bucketAmount, toMoney } from './ledger.js'
import { calculateIncome, calculateExpenses, calculateNet } from './calc.js'

const inc = (amount, balance = 'current', goalId = '', date = '2026-10-01') => ({ id: Math.random().toString(36), type: 'income', amount, balance, goalId, date })
const exp = (amount, balance = 'current', goalId = '', date = '2026-10-02') => ({ id: Math.random().toString(36), type: 'expense', amount, balance, goalId, date })
const tr = (direction, amount, goalId = '') => ({ id: Math.random().toString(36), direction, amount, goalId })
const mv = (fromGoalId, toGoalId, amount) => ({ id: Math.random().toString(36), fromGoalId, toGoalId, amount })
const phone = { id: 'phone', name: 'New Phone', target: 15000 }, fund = { id: 'fund', name: 'Emergency Fund', target: 5000 }

test('A: income to Current Balance', () => {
  const t = [inc(2000)], l = computeLedger({ transactions: t })
  assert.equal(l.current, 2000); assert.equal(l.savings, 0); assert.equal(calculateIncome(t), 2000)
})
test('B: income to general Savings', () => {
  const t = [inc(2000, 'savings')], l = computeLedger({ transactions: t })
  assert.deepEqual([l.current, l.savings, l.unassigned], [0, 2000, 2000]); assert.equal(calculateIncome(t), 2000); assert.equal(calculateExpenses(t), 0)
})
test('C: income to a goal counts once and leaves Current Balance alone', () => {
  const t = [inc(2000, 'savings', 'phone')], l = computeLedger({ transactions: t, goals: [phone] }), p = goalProgress(phone, l.goals.phone)
  assert.deepEqual([l.current, l.savings, l.goals.phone, l.unassigned], [0, 2000, 2000, 0])
  assert.equal(p.remaining, 13000); assert.equal(pctText(p.pct), '13.3%'); assert.equal(calculateIncome(t), 2000)
})
test('D/E: transfers move money without touching income or expenses', () => {
  const t = [inc(2000)], d = computeLedger({ transactions: t, transfers: [tr('to_savings', 500)] })
  assert.deepEqual([d.current, d.savings], [1500, 500])
  const e = computeLedger({ transactions: t, transfers: [tr('to_savings', 500), tr('to_current', 200)] })
  assert.deepEqual([e.current, e.savings], [1700, 300]); assert.equal(calculateIncome(t), 2000); assert.equal(calculateExpenses(t), 0)
})
test('F/G: expenses from either balance are real expenses, once', () => {
  const base = [inc(2000), inc(1000, 'savings')]
  const f = [...base, exp(300)], g = [...base, exp(300, 'savings')]
  assert.deepEqual([computeLedger({ transactions: f }).current, computeLedger({ transactions: f }).savings], [1700, 1000])
  assert.deepEqual([computeLedger({ transactions: g }).current, computeLedger({ transactions: g }).savings], [2000, 700])
  assert.equal(calculateExpenses(f), 300); assert.equal(calculateExpenses(g), 300); assert.equal(calculateNet(g), 3000 - 300)
})
test('H: allocating existing Savings to a goal changes no balance', () => {
  const t = [inc(2000, 'savings')], l = computeLedger({ transactions: t, reallocations: [mv('', 'phone', 1000)], goals: [phone] })
  assert.deepEqual([l.savings, l.goals.phone, l.unassigned], [2000, 1000, 1000]); assert.equal(l.current, 0)
})
test('I: creating a goal moves nothing; a goal with 0 allocated shows 0 saved, not the target', () => {
  const l = computeLedger({ transactions: [inc(2000), inc(500, 'savings')], goals: [phone] }), p = goalProgress(phone, l.goals.phone)
  assert.deepEqual([l.current, l.savings, l.goals.phone], [2000, 500, 0]); assert.equal(p.saved, 0); assert.equal(p.remaining, 15000)
})
test('goals reconcile with Savings: 3,000 + 1,500 + 500 = 5,000, and goals are never extra money', () => {
  const t = [inc(5000, 'savings')], r = [mv('', 'phone', 3000), mv('', 'fund', 1500)], l = computeLedger({ transactions: t, reallocations: r, goals: [phone, fund] })
  assert.deepEqual([l.savings, l.goals.phone, l.goals.fund, l.unassigned, l.allocated], [5000, 3000, 1500, 500, 4500])
  assert.equal(l.goals.phone + l.goals.fund + l.unassigned, l.savings)
})
test('withdrawals reduce the bucket they come from', () => {
  const t = [inc(1000), inc(2000, 'savings')], r = [mv('', 'phone', 1200)]
  const l = computeLedger({ transactions: t, reallocations: r, transfers: [tr('to_current', 300)], goals: [phone] })
  assert.deepEqual([l.current, l.savings, l.goals.phone, l.unassigned], [1300, 1700, 1200, 500])
})
test('add to Savings for a goal, and moving between goals', () => {
  const l = computeLedger({ transactions: [inc(2000), inc(500, 'savings', 'phone')], transfers: [tr('to_savings', 500, 'phone')], reallocations: [mv('phone', 'fund', 200)], goals: [phone, fund] })
  assert.deepEqual([l.current, l.savings, l.goals.phone, l.goals.fund], [1500, 1000, 800, 200])
})
test('J: editing a goal income into Current Balance is refused once it would leave the goal negative', () => {
  const spent = [exp(1500, 'savings', 'phone')], before = computeLedger({ transactions: [inc(2000, 'savings', 'phone'), ...spent], goals: [phone] })
  assert.equal(ledgerProblem(before, [phone]), null)
  const after = computeLedger({ transactions: [inc(2000), ...spent], goals: [phone] })
  assert.match(ledgerProblem(after, [phone]), /New Phone/)
  const free = computeLedger({ transactions: [inc(2000)], goals: [phone] }) // nothing spent from the goal yet: the move is fine
  assert.equal(ledgerProblem(free, [phone]), null); assert.deepEqual([free.current, free.savings], [2000, 0])
})
test('K: allocating more than the unassigned Savings is a problem; so is an expense that eats earmarked money', () => {
  const t = [inc(2000, 'savings')]
  assert.match(ledgerProblem(computeLedger({ transactions: t, reallocations: [mv('', 'phone', 2500)], goals: [phone] }), [phone]), /unassigned/i)
  const eatsGoal = computeLedger({ transactions: [inc(500, 'savings'), exp(300, 'savings')], reallocations: [mv('', 'phone', 500)], goals: [phone] })
  assert.match(ledgerProblem(eatsGoal, [phone]), /unassigned/i)
})
test('a deleted (archived) goal must stay empty', () => {
  const gone = { ...phone, archived: true }
  const ok = computeLedger({ transactions: [inc(500, 'savings', 'phone'), exp(500, 'savings', 'phone')], goals: [gone] })
  assert.equal(ledgerProblem(ok, [gone]), null) // nets to zero
  const bad = computeLedger({ transactions: [inc(500, 'savings', 'phone')], goals: [gone] })
  assert.match(ledgerProblem(bad, [gone]), /was deleted/)
})
test('no floating-point drift', () => {
  const l = computeLedger({ transactions: [inc(0.1, 'savings'), inc(0.2, 'savings')] })
  assert.equal(l.savings, 0.3); assert.equal(toMoney('12.345678'), 12.35)
  assert.equal(bucketAmount(l, ''), 0.3)
})
test('rows saved before 1.3.1 (no balance field) count as Current Balance', () => {
  const l = computeLedger({ transactions: [{ id: 'x', type: 'income', amount: 100 }, { id: 'y', type: 'expense', amount: 40 }] })
  assert.deepEqual([l.current, l.savings], [60, 0])
})
