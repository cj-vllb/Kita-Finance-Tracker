import test from 'node:test'
import assert from 'node:assert/strict'
import { budgetNotifications, savingsNotifications, systemNotifications, buildNotifications } from './notifications.js'
import { readIds, writeIds } from './notificationState.js'
import { computeLedger } from './ledger.js'
import { historyRows } from './historyRows.js'

const bud = (id, amount, categoryId = 'c1') => ({ id, month: '2026-11', amount, categoryId, name: 'Food' })
const exp = (amount, date = '2026-11-05', categoryId = 'c1') => ({ type: 'expense', amount, date, categoryId })
test('budget alerts: nothing under 80%, then approaching, reached and exceeded', () => {
  const at = (spent) => budgetNotifications({ budgets: [bud('b1', 1000)], transactions: [exp(spent)], month: '2026-11' })
  assert.equal(at(799).length, 0)
  assert.equal(at(800)[0].level, 'approaching'); assert.equal(at(999.99)[0].level, 'approaching')
  assert.equal(at(1000)[0].level, 'reached'); assert.equal(at(1000.01)[0].level, 'over')
  assert.equal(at(1200)[0].id, 'budget:b1:over')
})
test('budget alert titles use the category name', () => {
  const n = budgetNotifications({ budgets: [{ id: 'b1', month: '2026-11', amount: 100, categoryId: 'c1' }], transactions: [exp(90)], categories: [{ id: 'c1', name: 'Food' }], month: '2026-11' })
  assert.equal(n[0].title, 'Food budget is nearly used')
})
test('budget alerts: same condition = same id (no repeats), other months and category-less budgets are ignored', () => {
  const a = budgetNotifications({ budgets: [bud('b1', 1000)], transactions: [exp(900)], month: '2026-11' }), b = budgetNotifications({ budgets: [bud('b1', 1000)], transactions: [exp(850), exp(10, '2026-11-09')], month: '2026-11' })
  assert.equal(a[0].id, b[0].id); assert.equal(b[0].at, '2026-11-09')
  assert.equal(budgetNotifications({ budgets: [bud('b1', 1000, '')], transactions: [exp(5000)], month: '2026-11' }).length, 0)
  assert.equal(budgetNotifications({ budgets: [bud('b1', 1000)], transactions: [exp(5000, '2026-10-30')], month: '2026-11' }).length, 0)
})
test('savings progress: highest milestone actually reached, completed at the target, deleted goals ignored', () => {
  const goals = [{ id: 'g1', name: 'Trip', target: 1000 }, { id: 'g2', name: 'Old', target: 100, archived: true }]
  const run = (amount) => savingsNotifications({ goals, ledger: computeLedger({ contributions: [{ goalId: 'g1', amount, date: '2026-11-02' }], goals }), contributions: [{ goalId: 'g1', amount, date: '2026-11-02' }] })
  assert.equal(run(240).length, 0)
  assert.equal(run(260)[0].id, 'goal:g1:25'); assert.equal(run(760)[0].id, 'goal:g1:75'); assert.equal(run(1000)[0].level, 'done'); assert.equal(run(1000)[0].at, '2026-11-02')
})
test('system notice comes from the changelog and the full list is ordered newest first', () => {
  const s = systemNotifications([{ version: '1.3.7', date: null, title: 'New things' }, { version: '1.3.6' }]); assert.equal(s.length, 1); assert.equal(s[0].id, 'release:1.3.7')
  const list = buildNotifications({ budgets: [bud('b1', 1000)], transactions: [exp(900, '2026-11-09')], goals: [], ledger: computeLedger({}), transfers: [], contributions: [], reallocations: [], changelog: [{ version: '1.3.7', title: 't' }], month: '2026-11' })
  assert.deepEqual(list.map((n) => n.kind), ['budget', 'system'])
})
test('read state is per user, only holds ids, and survives missing storage', () => {
  const mem = new Map(), storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) }
  writeIds('u1', new Set(['a', 'b']), null, storage); assert.deepEqual([...readIds('u1', storage)], ['a', 'b']); assert.equal(readIds('u2', storage).size, 0)
  writeIds('u1', new Set(['a', 'b']), new Set(['b']), storage); assert.deepEqual([...readIds('u1', storage)], ['b'])
  assert.equal(readIds('u1', null).size, 0); assert.doesNotThrow(() => writeIds('u1', new Set(['a']), null, { setItem() { throw new Error('full') } })); assert.equal(readIds(null).size, 0)
})
test('history: savings activity is only added when asked, and a Savings transaction is never listed twice', () => {
  const transactions = [{ id: 't1', type: 'income', amount: 5, date: '2026-11-01', balance: 'savings', goalId: '' }]
  const savings = { transfers: [{ id: 'x', direction: 'to_savings', amount: 10, date: '2026-11-02', goalId: '' }], contributions: [{ id: 'k', amount: 20, date: '2026-11-03', goalId: '' }], reallocations: [{ id: 'r', amount: 3, date: '2026-11-04', fromGoalId: '', toGoalId: 'g1' }], goals: [{ id: 'g1', name: 'Trip' }] }
  assert.equal(historyRows({ transactions, includeSavings: false, ...savings }).length, 1)
  const on = historyRows({ transactions, includeSavings: true, ...savings }); assert.equal(on.length, 4); assert.equal(on.filter((r) => r.t?.id === 't1').length, 1)
  assert.deepEqual(on.filter((r) => r.row === 'savings').map((r) => r.kind), ['transfer', 'contribution', 'move'])
})
