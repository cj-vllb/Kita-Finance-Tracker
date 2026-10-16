// Run with: npm test   (Node's built-in test runner; no extra dependency). Covers the money rules of 1.3.1 on the pure ledger calculation.
import test from 'node:test'
import assert from 'node:assert/strict'
import { computeLedger, ledgerProblem, goalProgress, pctText, bucketAmount, toMoney, CURRENT, GENERAL, transferDefaults, transferPlan, transferProblem, placeAmount } from './ledger.js'
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

test('General Savings to a goal: only the earmark moves, nothing else changes', () => {
  const t = [inc(10000), inc(5000, 'savings')], g = [phone]
  const before = computeLedger({ transactions: t, goals: g }), after = computeLedger({ transactions: t, reallocations: [mv('', 'phone', 1000)], goals: g })
  assert.deepEqual([before.current, before.savings, before.unassigned, bucketAmount(before, 'phone')], [10000, 5000, 5000, 0])
  assert.deepEqual([after.current, after.savings, after.unassigned, bucketAmount(after, 'phone')], [10000, 5000, 4000, 1000])
  assert.equal(after.current + after.savings, before.current + before.savings) // total money unchanged
  assert.equal(calculateIncome(t), 15000); assert.equal(calculateExpenses(t), 0) // not income, not an expense
  assert.equal(ledgerProblem(after, g), null)
  assert.equal(goalProgress(phone, bucketAmount(after, 'phone')).pct, (1000 / 15000) * 100)
})
test('General Savings to a goal: the exact available amount is allowed, one cent more is not', () => {
  const t = [inc(5000, 'savings')], g = [phone]
  assert.equal(ledgerProblem(computeLedger({ transactions: t, reallocations: [mv('', 'phone', 5000)], goals: g }), g), null)
  assert.match(ledgerProblem(computeLedger({ transactions: t, reallocations: [mv('', 'phone', 5000.01)], goals: g }), g), /unassigned Savings/)
})
test('General Savings to a goal: two 800 transfers cannot both fit in 1000', () => {
  const t = [inc(1000, 'savings')], g = [phone]
  assert.equal(ledgerProblem(computeLedger({ transactions: t, reallocations: [mv('', 'phone', 800)], goals: g }), g), null)
  assert.notEqual(ledgerProblem(computeLedger({ transactions: t, reallocations: [mv('', 'phone', 800), mv('', 'phone', 800)], goals: g }), g), null)
})
test('General Savings to a goal: a deleted goal cannot receive money', () => {
  const t = [inc(1000, 'savings')], g = [{ ...phone, archived: true }]
  assert.match(ledgerProblem(computeLedger({ transactions: t, reallocations: [mv('', 'phone', 100)], goals: g }), g), /deleted/)
})

// ---------- unified Add money form: every From -> To combination ----------
const travel = { id: 'travel', name: 'Travel Fund', target: 5000 }, emerg = { id: 'emerg', name: 'Emergency Fund', target: 9000 }
// Money: 10,000 Current; Savings 5,000 = General 3,000 + Travel 1,200 + Emergency 800.
const base = () => ({ transactions: [inc(10000), inc(3000, 'savings'), inc(1200, 'savings', 'travel'), inc(800, 'savings', 'emerg')], transfers: [], reallocations: [], goals: [travel, emerg] })
// Applies a plan the way the app writes it (one transfer row or one reallocation row), then returns the new ledger.
function apply(from, to, amount) {
  const d = base(), plan = transferPlan(from, to)
  if (plan.kind === 'transfer') d.transfers.push(tr(plan.direction, amount, plan.goalId)); else d.reallocations.push(mv(plan.fromGoalId, plan.toGoalId, amount))
  return { d, l: computeLedger(d) }
}
const snap = (l) => [l.current, l.unassigned, l.goals.travel, l.goals.emerg]
const TOTAL = 15000
test('defaults: from a goal, to that goal from Current Balance; from General Savings, to General Savings', () => {
  assert.deepEqual(transferDefaults('travel'), { from: CURRENT, to: 'travel' })
  assert.deepEqual(transferDefaults(''), { from: CURRENT, to: GENERAL })
  assert.deepEqual(transferDefaults(), { from: CURRENT, to: GENERAL })
})
test('plans: the right database write for each combination', () => {
  assert.deepEqual(transferPlan(CURRENT, GENERAL), { kind: 'transfer', direction: 'to_savings', goalId: '' })
  assert.deepEqual(transferPlan(CURRENT, 'travel'), { kind: 'transfer', direction: 'to_savings', goalId: 'travel' })
  assert.deepEqual(transferPlan(GENERAL, CURRENT), { kind: 'transfer', direction: 'to_current', goalId: '' })
  assert.deepEqual(transferPlan('emerg', CURRENT), { kind: 'transfer', direction: 'to_current', goalId: 'emerg' })
  assert.deepEqual(transferPlan(GENERAL, 'emerg'), { kind: 'move', fromGoalId: '', toGoalId: 'emerg' })
  assert.deepEqual(transferPlan('travel', GENERAL), { kind: 'move', fromGoalId: 'travel', toGoalId: '' })
  assert.deepEqual(transferPlan('travel', 'emerg'), { kind: 'move', fromGoalId: 'travel', toGoalId: 'emerg' })
  assert.equal(transferPlan(CURRENT, CURRENT), null); assert.equal(transferPlan(GENERAL, GENERAL), null); assert.equal(transferPlan('travel', 'travel'), null)
})
const cases = [
  ['Current -> General', CURRENT, GENERAL, 1000, [9000, 4000, 1200, 800]],
  ['Current -> goal (A)', CURRENT, 'travel', 1000, [9000, 3000, 2200, 800]],
  ['General -> goal (B)', GENERAL, 'emerg', 500, [10000, 2500, 1200, 1300]],
  ['goal -> goal (C)', 'travel', 'emerg', 300, [10000, 3000, 900, 1100]],
  ['goal -> Current (D)', 'emerg', CURRENT, 200, [10200, 3000, 1200, 600]],
  ['goal -> General (E)', 'travel', GENERAL, 400, [10000, 3400, 800, 800]],
  ['General -> Current', GENERAL, CURRENT, 700, [10700, 2300, 1200, 800]],
]
for (const [name, from, to, amt, want] of cases) test('transfer ' + name + ': balances, total, no income or expense', () => {
  const { d, l } = apply(from, to, amt)
  assert.deepEqual(snap(l), want)
  assert.equal(l.current + l.savings, TOTAL)                                  // no money created or destroyed
  assert.equal(l.allocated + l.unassigned, l.savings)                         // goals only earmark Savings
  assert.equal(calculateIncome(d.transactions), 15000); assert.equal(calculateExpenses(d.transactions), 0) // reports see no income/expense
  assert.equal(ledgerProblem(l, d.goals), null)
  assert.equal(d.transfers.length + d.reallocations.length, 1)                // exactly one record per transfer
  if (from !== CURRENT && to !== CURRENT) assert.equal(l.savings, 5000)       // Savings-to-Savings never changes total Savings
})
const L = computeLedger(base()), goals = [travel, emerg], ok = (x) => transferProblem(L, goals, x, (n) => '₱' + n)
test('validation: accepts good transfers, including the exact available amount', () => {
  assert.equal(ok({ from: CURRENT, to: 'travel', amount: '1000' }), null)
  assert.equal(ok({ from: CURRENT, to: 'travel', amount: 10000 }), null)
  assert.equal(ok({ from: 'travel', to: GENERAL, amount: '1200' }), null)
})
test('validation: same place, bad amounts, too much', () => {
  assert.equal(ok({ from: 'travel', to: 'travel', amount: '1' }).field, 'to')
  assert.equal(ok({ from: CURRENT, to: CURRENT, amount: '1' }).field, 'to')
  for (const bad of ['', '  ', 'abc', 0, '0', -5, '-1', Infinity, NaN, null, undefined, '0.001']) assert.equal(ok({ from: CURRENT, to: 'travel', amount: bad })?.field, 'amount', String(bad))
  assert.match(ok({ from: 'travel', to: 'emerg', amount: '1200.01' }).message, /Travel Fund only has ₱1200 available/)
  assert.match(ok({ from: GENERAL, to: 'emerg', amount: '3000.01' }).message, /General Savings only has/)
  assert.match(ok({ from: CURRENT, to: GENERAL, amount: '10000.01' }).message, /Current Balance only has/)
})
test('validation: a deleted or unknown goal cannot be used on either side', () => {
  assert.equal(transferProblem(L, [emerg], { from: 'travel', to: GENERAL, amount: '1' }).field, 'from')
  assert.equal(transferProblem(L, [emerg], { from: CURRENT, to: 'travel', amount: '1' }).field, 'to')
  assert.equal(ok({ from: 'ghost', to: GENERAL, amount: '1' }).field, 'from')
})
test('a rejected transfer is never applied: the ledger stays as it was', () => {
  const before = snap(L)
  assert.notEqual(ok({ from: 'travel', to: 'emerg', amount: '5000' }), null) // the form stops here, no row is written
  assert.deepEqual(snap(computeLedger(base())), before)
  assert.equal(placeAmount(L, GENERAL), 3000)
})
test('history rows: a General Savings to goal move is a reallocation, not income or expense', () => {
  const { d } = apply(GENERAL, 'emerg', 500)
  assert.deepEqual(d.reallocations, [{ ...d.reallocations[0], fromGoalId: '', toGoalId: 'emerg', amount: 500 }])
  assert.equal(d.transactions.length, 4)
})
