// Validation and database payloads for the phone/tablet quick-add sheets (Add Transaction, Add Savings, Transfer Money).
// NOTHING here changes how money is recorded: each function only decides which EXISTING write a sheet should call, using the same checks the desktop
// dialogs use (utils/ledger.js). The database still re-checks every write under its own lock.
import { evaluateKeypad } from './amountKeypad.js'
import { isDay } from './dateRange.js'
import { CURRENT, GENERAL, MAX_AMOUNT, transferPlan, transferProblem, placeAmount } from './ledger.js'

const TITLE_MAX = 120, NOTE_MAX = 1000
const clean = (s) => String(s ?? '').trim()

// ---- Add Transaction: always Current Balance (the sheet has no Savings choice; Savings and transfers have their own actions) ----
export function quickTransaction(f) {
  const errors = {}, calc = evaluateKeypad(f.amount)
  if (!calc.ok) errors.amount = calc.error
  if (f.type !== 'income' && f.type !== 'expense') errors.type = 'Choose Income or Expense.'
  if (!isDay(f.date)) errors.date = 'Choose a date.'
  if (clean(f.description).length > TITLE_MAX) errors.title = `Keep the title under ${TITLE_MAX} characters.`
  if (clean(f.notes).length > NOTE_MAX) errors.note = `Keep the note under ${NOTE_MAX} characters.`
  if (Object.keys(errors).length) return { ok: false, errors }
  // Same shape the full form hands to saveTransaction (balance 'current', no goal), so the stored row is identical to one made on desktop.
  return { ok: true, row: { id: 'new', type: f.type, amount: calc.amount, date: f.date, categoryId: f.categoryId || '', description: clean(f.description), notes: clean(f.notes), balance: 'current', goalId: '' } }
}

// ---- Add Savings (1.3.7 rule) ----
// Add Money    = an INCOME transaction whose balance is Savings (transactions.balance = 'savings', income category). Savings goes up, Current Balance is untouched.
// Remove Money = an EXPENSE transaction whose balance is Savings (expense category). Savings goes down, Current Balance is untouched.
// Both are ordinary rows in `transactions` (the table the ledger, the history and the reports already read), saved through the same saveTransaction as every
// other transaction. No contribution row and no transfer row is written, so one action is exactly one record and can never be counted twice.
// Moving money BETWEEN balances is a different action (Transfer Money).
export const SAVINGS_MODES = {
  add: { label: 'Add Money', type: 'income', dest: 'Added to Savings', tip: 'Records income in Savings. It raises your Savings balance and does not change Current Balance.' },
  remove: { label: 'Remove Money', type: 'expense', dest: 'Deducted from Savings', tip: 'Records an expense from Savings. It lowers your Savings balance and does not change Current Balance. To move money between balances, use Transfer Money.' },
}
export function quickSavings({ mode, amount, date, title, notes, categoryId, ledger }, fmt = String) {
  const errors = {}, calc = evaluateKeypad(amount), m = SAVINGS_MODES[mode]
  if (!m) errors.form = 'Choose Add Money or Remove Money.'
  if (!isDay(date)) errors.date = 'Choose a date.'
  if (clean(title).length > TITLE_MAX) errors.title = `Keep the title under ${TITLE_MAX} characters.`
  if (clean(notes).length > NOTE_MAX) errors.note = `Keep the note under ${NOTE_MAX} characters.`
  if (!calc.ok) errors.amount = calc.error
  else if (m) {
    if (calc.amount > MAX_AMOUNT) errors.amount = 'That amount is too large.'
    // An expense may only take what General Savings holds (the database refuses anything that would leave it below zero).
    else if (mode === 'remove' && Math.round(calc.amount * 100) > Math.round(Math.max(0, ledger.unassigned) * 100)) errors.amount = `General Savings only has ${fmt(Math.max(0, ledger.unassigned))} available. To take money from a goal, use Transfer Money.`
  }
  if (Object.keys(errors).length) return { ok: false, errors }
  return { ok: true, row: { id: 'new', type: m.type, amount: calc.amount, date, categoryId: categoryId || '', description: clean(title), notes: clean(notes), balance: 'savings', goalId: '' } }
}

// ---- Transfer Money (the existing "Move existing money" logic, unchanged) ----
export function quickTransfer({ from, to, amount, date, title, ledger, activeGoals = [] }, fmt = String) {
  const errors = {}, calc = evaluateKeypad(amount)
  if (!isDay(date)) errors.date = 'Choose a date.'
  if (clean(title).length > TITLE_MAX) errors.title = `Keep the title under ${TITLE_MAX} characters.`
  if (from && from === to) errors.to = 'Choose a different place to move the money to.'
  if (!calc.ok) errors.amount = calc.error
  else if (!errors.to) { const p = transferProblem(ledger, activeGoals, { from, to, amount: calc.amount }, fmt); if (p) errors[p.field] = p.message }
  if (Object.keys(errors).length) return { ok: false, errors }
  const plan = transferPlan(from, to), note = clean(title)
  if (!plan) return { ok: false, errors: { to: 'Choose a different place to move the money to.' } }
  return plan.kind === 'transfer'
    ? { ok: true, kind: 'transfer', payload: { direction: plan.direction, goalId: plan.goalId, amount: calc.amount, date, note } }
    : { ok: true, kind: 'move', payload: { fromGoalId: plan.fromGoalId, toGoalId: plan.toGoalId, amount: calc.amount, date, note } }
}
export const placeName = (place, goals = []) => (place === CURRENT ? 'Current Balance' : place === GENERAL ? 'General Savings' : goals.find((g) => g.id === place)?.name || 'that goal')
export { placeAmount }
