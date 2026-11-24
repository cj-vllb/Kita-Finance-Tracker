// "Include Savings Activity" for the Transactions history (phone/tablet filter). Ordinary transactions are exactly what the page always showed;
// when the switch is on, the three Savings tables are added as separate, labelled rows. A transaction that used Savings (balance 'savings') is
// ALREADY an ordinary transaction row, so it is never added a second time. Savings rows have no category and are neither income nor expense,
// so a Type or Category filter hides them (they could never match).
import { money } from './format.js'
import { isSavings } from './ledger.js'

const name = (goals, id) => { if (!id) return 'General Savings'; const g = goals.find((x) => x.id === id); return g ? g.name + (g.archived ? ' (deleted)' : '') : 'a goal' }
export function savingsRows({ transfers = [], contributions = [], reallocations = [], goals = [] }) {
  return [
    ...transfers.map((t) => ({ kind: 'transfer', id: 'transfer:' + t.id, date: t.date, createdAt: t.createdAt, amount: t.amount, sign: t.direction === 'to_savings' ? '+' : '−', dir: t.direction === 'to_savings' ? 'in' : 'out',
      title: t.note || (t.direction === 'to_savings' ? 'Transfer to Savings' : 'Transfer to Current Balance'), meta: t.direction === 'to_savings' ? `Current Balance → ${name(goals, t.goalId)}` : `${name(goals, t.goalId)} → Current Balance`, label: 'Transfer' })),
    ...contributions.map((k) => ({ kind: 'contribution', id: 'contribution:' + k.id, date: k.date, createdAt: k.createdAt, amount: k.amount, sign: '+', dir: 'in',
      title: k.note || 'Added to Savings', meta: `New money → ${name(goals, k.goalId)}`, label: 'Savings contribution' })),
    ...reallocations.map((r) => ({ kind: 'move', id: 'move:' + r.id, date: r.date, createdAt: r.createdAt, amount: r.amount, sign: '', dir: 'mid',
      title: r.note || 'Moved within Savings', meta: `${name(goals, r.fromGoalId)} → ${name(goals, r.toGoalId)}`, label: 'Savings move' })),
  ]
}
// Everything the list shows, before the filters. Each row is { row: 'tx' | 'savings', ... } so the page can render it the right way.
// `hideSavingsTx` (phone/tablet, switch off) leaves only ordinary Current Balance transactions; a transaction made on the Savings balance (Add Money / Remove
// Money, or income/expense saved to Savings) is Savings activity and shows only when the switch is on. Desktop passes false and lists everything as before.
export function historyRows({ transactions, includeSavings, hideSavingsTx = false, ...savings }) {
  const rows = transactions.filter((t) => !(hideSavingsTx && !includeSavings && isSavings(t))).map((t) => ({ row: 'tx', id: t.id, date: t.date, createdAt: t.createdAt, amount: t.amount, savings: isSavings(t), t }))
  return includeSavings ? rows.concat(savingsRows(savings).map((s) => ({ row: 'savings', ...s }))) : rows
}
export const savingsAmountText = (s) => s.sign + money(s.amount)
