import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Eye, EyeOff } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { money, signed, txKind, greeting, firstName, monthLabel, monthName, monthShort, formatDate, formatDateLong, txLabel } from '../utils/format.js'
import * as c from '../utils/calc.js'
import { CURRENT_MONTH, TODAY } from '../utils/dates.js'
import { CashFlowChart, MiniBars } from '../components/charts.jsx'
import { CategoryLabel, CatLabel, DirIcon, PageHeader } from '../components/ui.jsx'
import { useMedia } from '../components/SidebarSearch.jsx'
import { VISIBILITY_KEYS, MASK, readVisibility, writeVisibility } from '../utils/balanceVisibility.js'
// One independent show/hide preference per balance, remembered in this browser (see utils/balanceVisibility.js).
function useVisibility(key) {
  const [visible, set] = useState(() => readVisibility(key))
  return [visible, () => set((v) => { writeVisibility(key, !v); return !v })]
}
const EyeButton = ({ name, visible, onToggle }) => <button type="button" className="eye-btn" onClick={onToggle} aria-label={`${visible ? 'Hide' : 'Show'} ${name}`} title={`${visible ? 'Hide' : 'Show'} ${name}`}>{visible ? <Eye size={18} strokeWidth={1.75} aria-hidden="true" /> : <EyeOff size={18} strokeWidth={1.75} aria-hidden="true" />}</button>
const Masked = () => <span role="img" aria-label="Amount hidden">{MASK}</span>
const TABS = [['balance', 'Balance'], ['savings', 'Savings']]
export default function Dashboard() {
  const { user, transactions, budgets, categories, ledger, savingsReady, activeGoals } = useApp()
  const compact = useMedia('(max-width:1100px)') // tablet and phone get the Balance/Savings selector; desktop shows both balances as before
  const [tab, setTab] = useState('balance') // deliberately not persisted: the dashboard always opens on Balance
  const [showCurrent, toggleCurrent] = useVisibility(VISIBILITY_KEYS.current), [showSavings, toggleSavings] = useVisibility(VISIBILITY_KEYS.savings)
  // On tablet/phone both panels stay mounted, each in a slot inside one two-row grid. The selected slot's row is 1fr and the other is 0fr, so the
  // area animates between each panel's own natural height (CSS only) and the dashboard below reflows with it. The hidden panel is not focusable or read out.
  const selector = compact && savingsReady, showBalance = true, showSavingsCard = savingsReady
  const stage = (kids) => selector ? <div className="bal-stage" data-tab={tab}>{kids}</div> : kids
  const slot = (id, node) => selector ? <div className="bal-slot" data-active={String(tab === id)}>{node}</div> : node
  const panel = (id) => (selector ? { role: 'tabpanel', id: 'bal-panel-' + id, 'aria-labelledby': 'bal-tab-' + id, 'data-active': String(tab === id) } : {})
  const onTabKey = (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
    e.preventDefault(); const next = e.key === 'Home' ? 'balance' : e.key === 'End' ? 'savings' : tab === 'balance' ? 'savings' : 'balance'
    setTab(next); requestAnimationFrame(() => document.getElementById('bal-tab-' + next)?.focus())
  }
  const name = (id) => categories.find((x) => x.id === id)?.name ?? 'Uncategorized'
  const month = c.inMonth(transactions, CURRENT_MONTH), income = c.calculateIncome(month), expenses = c.calculateExpenses(month), net = income - expenses
  const [top] = c.groupExpensesByCategory(month), prev = c.inMonth(transactions, c.shiftMonth(CURRENT_MONTH, -1)), prevExp = c.calculateExpenses(prev)
  const diff = prevExp ? Math.round((1 - expenses / prevExp) * 100) : null
  const rows = budgets.filter((b) => b.month === CURRENT_MONTH).map((b) => ({ b, spent: c.calculateBudgetSpent(b, transactions), remaining: c.calculateBudgetRemaining(b, transactions), pct: c.calculateBudgetPercentage(b, transactions) }))
  const within = rows.filter((r) => r.pct <= 100).length, worst = [...rows].sort((a, b) => b.pct - a.pct)[0]
  // Previews: all derived from the same in-memory data the other pages use. Nothing is written or duplicated.
  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5)
  const budgetTop = [...rows].sort((a, b) => b.pct - a.pct).slice(0, 3)
  const trend = c.groupTransactionsByMonth(transactions, c.allMonths(transactions, [CURRENT_MONTH]).filter((m) => m <= CURRENT_MONTH).slice(-6))
  const days = Number(TODAY.slice(8))
  const chart = c.runningTotals(transactions, CURRENT_MONTH, days).map((d) => ({ ...d, label: `${monthShort(CURRENT_MONTH)} ${d.day}` }))
  return (<>
    <PageHeader title={`${greeting()}, ${firstName(user)}`} subtitle={`Here is your financial overview for ${monthLabel(CURRENT_MONTH)}.`} />
    <>
      <div className={'balances' + (selector ? ' is-selector' : '')}>
      {selector && <div className="seg bal-seg" role="tablist" aria-label="Balance view" onKeyDown={onTabKey}>{TABS.map(([id, text]) => <button key={id} type="button" role="tab" id={'bal-tab-' + id} aria-selected={tab === id} aria-controls={'bal-panel-' + id} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)}>{text}</button>)}</div>}
      {stage(<>
      {showBalance && slot('balance', <section aria-label="Current Balance" className={'hero-balance' + (selector ? ' bal-panel' : '')} {...panel('balance')}><div className="hero-main"><div className="balance-label bal-head">Current Balance<EyeButton name="Current Balance" visible={showCurrent} onToggle={toggleCurrent} /></div><div className="balance bal-amount">{showCurrent ? money(ledger.current) : <Masked />}</div><div className="small hero-updated bal-note">Updated today, {formatDateLong(TODAY).replace(/, \d+$/, '')}</div></div>
        <div className="figures">
          <div><div className="muted">Monthly income</div><div className="v pos">+{money(income)}</div></div>
          <div><div className="muted">Monthly expenses</div><div className="v neg">−{money(expenses)}</div></div>
          <div><div className="muted">Net change</div><div className="v">{net >= 0 ? '+' : '−'}{money(Math.abs(net))}</div>{income > 0 && <div className="muted small">{Math.round((net / income) * 100)}% of income kept this month</div>}</div></div></section>)}
      {showSavingsCard && slot('savings', <section className={'savings-balance' + (selector ? ' bal-panel' : '')} aria-label="Savings" {...panel('savings')}><div><div className="balance-label bal-head">Savings<EyeButton name="Savings" visible={showSavings} onToggle={toggleSavings} /></div><div className="sb-amount bal-amount">{showSavings ? money(ledger.savings) : <Masked />}</div>
          <div className="muted small sb-note bal-note">{activeGoals.length ? (showSavings ? `${money(ledger.allocated)} set aside for goals` : 'Set aside for goals') : 'Money you have put aside'}</div></div>
          <Link to="/savings" className="pv-link">Manage savings<ChevronRight size={16} aria-hidden="true" /></Link></section>)}
      </>)}
      </div>
      <div className="previews charts">
        <section className="preview flow-card" aria-label="Monthly money flow"><div className="pv-body"><CashFlowChart title="Monthly money flow" data={chart} /></div></section>
        <Preview title="Reports" to="/reports" action="View Reports" pad>
          {transactions.length === 0 ? <p className="muted pv-empty">Add transactions and your reports will fill in.</p> : <>
            <MiniBars data={trend} />
            <div className="legend small"><span><span className="dot" style={{ background: 'var(--color-primary)' }} />Income</span><span><span className="dot" style={{ background: 'var(--color-negative)' }} />Expenses</span></div>
            {top && <p className="small muted" style={{ marginTop: 8 }}>{name(top.categoryId)} is {Math.round((top.amount / expenses) * 100)}% of this month's expenses.</p>}</>}</Preview></div>
      <div className="previews cards">
        <Preview title="Recent transactions" to="/transactions" action="View All Transaction History">
          {recent.length === 0 ? <p className="muted pv-empty">No transactions yet. <Link to="/transactions/new">Add your first transaction</Link></p> :
            <ul className="tx-list">{recent.map((t) => <li key={t.id}><Link to={`/transactions/${t.id}`} className="tx-item"><DirIcon type={t.type} /><span className="tx-main"><span className="tx-title">{txLabel(t, categories)}</span><span className="muted small meta"><CatLabel id={t.categoryId} categories={categories} /><span className="meta-date"> · {formatDate(t.date)}</span></span></span><span className="tx-amt"><span className={`amount ${t.type === 'income' ? 'pos' : 'neg'}`}>{signed(t.amount, t.type)}</span><span className="small muted tx-kind">{txKind(t)}</span></span></Link></li>)}</ul>}</Preview>
        <Preview title="Budgets" sub={monthLabel(CURRENT_MONTH)} to="/budgets" action="View All Budgets">
          {budgetTop.length === 0 ? <p className="muted pv-empty">No budgets set for this month. <Link to="/budgets/new">Create a budget</Link></p> :
            <ul className="bp-list">{budgetTop.map(({ b, spent, remaining, pct }) => <li key={b.id}><div className="bp-top"><span>{name(b.categoryId)}</span><span className="muted small">{money(spent)} of {money(b.amount)}</span></div>
              <div className="bar" role="progressbar" aria-valuenow={Math.min(pct, 100)} aria-valuemin="0" aria-valuemax="100" aria-label={`${name(b.categoryId)} budget used`}><div className={`bar-fill ${c.budgetLevel(pct)}`} style={{ width: Math.min(pct, 100) + '%' }} /></div>
              <div className={`small bp-note ${remaining < 0 ? 'neg' : 'muted'}`}>{remaining < 0 ? `${money(-remaining)} over budget` : `${money(remaining)} left`} · {pct}% used</div></li>)}</ul>}</Preview></div>
      <section className="section glance-section"><h2>This month at a glance</h2><div className="glance">
        <div><div className="muted">Highest spending category</div>{top ? <><div className="v"><CategoryLabel id={top.categoryId} categories={categories} /> · {money(top.amount)}</div><div className="muted small">{Math.round((top.amount / expenses) * 100)}% of this month's expenses</div></> : <div className="v">No expenses yet</div>}</div>
        <div><div className="muted">Compared with {monthName(c.shiftMonth(CURRENT_MONTH, -1))}</div>{diff === null ? <div className="v">No earlier data</div> : <><div className="v">{Math.abs(diff)}% {diff >= 0 ? 'less' : 'more'} spent</div><div className="muted small">{money(expenses)} so far, {money(prevExp)} last month</div></>}</div>
        <div><div className="muted">Budget status</div>{rows.length ? <><div className="v">{within === rows.length ? `All ${rows.length} within limit` : `${within} of ${rows.length} within limit`}</div>{worst.pct >= 80 && <div className="muted small">{name(worst.b.categoryId)} is at {worst.pct}%</div>}</> : <div className="v">No budgets set</div>}</div></div></section>
</>
  </>)
}
const Preview = ({ title, sub, to, action, pad, children }) => (
  <section className="preview" aria-label={title}><div className="pv-head"><div className="pv-title"><h2>{title}</h2>{sub && <p className="muted small">{sub}</p>}</div>
    <Link to={to} className="pv-link">{action}<ChevronRight size={16} aria-hidden="true" /></Link></div><div className={'pv-body' + (pad ? ' pad' : '')}>{children}</div></section>)
