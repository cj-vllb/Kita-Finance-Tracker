import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, ArrowUpRight, ArrowDownRight, Minus, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { money, monthLabel } from '../utils/format.js'
import { TODAY } from '../utils/dates.js'
import { calendarMonthFor } from '../utils/calendar.js'
import { PageHeader, EmptyState, Segmented, CategoryIcon, InfoTip } from '../components/ui.jsx'
import MonthCalendar from '../components/MonthCalendar.jsx'
import DateFilter from '../components/DateFilter.jsx'
import { PieChart, FlowBars, TrendLines, BudgetBars, pct1 } from '../components/reportCharts.jsx'
import { localToday, periodFor, periodLabel, previousPeriod, previousWord } from '../utils/dateRange.js'
import * as rs from '../utils/reportStats.js'
import { goalProgress, bucketAmount, pctText } from '../utils/ledger.js'
const KINDS = ['day', 'week', 'month', 'year', 'all']
const signedMoney = (n) => (n < 0 ? '−' : n > 0 ? '+' : '') + money(Math.abs(n))
// One selected period and one set of calculations feed BOTH views, so Stats and Charts can never disagree, and switching views keeps the period.
export default function Reports() {
  const { transactions, categories, budgets, transfers, reallocations, contributions, goals, ledger, savingsReady } = useApp()
  const today = localToday(), [view, setView] = useState('stats'), [period, setPeriod] = useState(() => periodFor('month', today)) // default: the current month
  const R = useMemo(() => {
    const txs = rs.filterByPeriod(transactions, period), prevP = previousPeriod(period), prevTxs = prevP ? rs.filterByPeriod(transactions, prevP) : []
    const totals = rs.totalsOf(txs)
    return {
      period, txs, totals, prevP, prevCount: prevTxs.length, cmp: prevP ? rs.compareTotals(totals, rs.totalsOf(prevTxs), prevTxs.length) : null,
      expense: rs.breakdownByCategory(txs, 'expense', categories), income: rs.breakdownByCategory(txs, 'income', categories),
      summary: rs.spendingSummary(txs, period), series: rs.seriesFor(period, txs), budget: rs.budgetProgress(period, budgets, transactions, categories), savings: rs.savingsFlows(period, transfers, reallocations, contributions),
    }
  }, [period, transactions, categories, budgets, transfers, reallocations, contributions])
  const firstYear = transactions.reduce((m, t) => Math.min(m, +t.date.slice(0, 4)), +today.slice(0, 4))
  const hasAnything = transactions.length > 0 || budgets.length > 0 || goals.length > 0
  if (!hasAnything) return <><PageHeader title="Reports" /><EmptyState icon={BarChart3} title="No report data available" text="Add a transaction to see reports." to="/transactions/new" action="Add transaction" /></>
  return (<>
    <PageHeader title="Reports" />
    <div className="rpt-top">
      <DateFilter idPrefix="rp" period={period} onChange={setPeriod} today={today} firstYear={firstYear} kinds={KINDS} allLabel="All time" pills />
      <Segmented label="Report view" value={view} onChange={setView} options={[['stats', 'Stats'], ['charts', 'Charts']]} />
    </div>
    <Overview R={R} period={period} transactions={transactions} />
    {view === 'stats' ? <Stats R={R} period={period} goals={goals} ledger={ledger} savingsReady={savingsReady} /> : <Charts R={R} />}
  </>)
}

function Change({ m, goodWhenUp, previousText }) {
  if (m.pct === null) return previousText ? <span className="muted small">{previousText}</span> : null
  const up = m.change > 0, flat = m.change === 0, good = flat ? null : up === goodWhenUp
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight
  return <span className={'chg small ' + (flat ? 'muted' : good ? 'pos' : 'neg')}><Icon size={14} aria-hidden="true" />{flat ? 'No change' : `${signedMoney(m.change)} (${up ? '+' : '−'}${Math.abs(m.pct) < 10 ? Math.abs(m.pct).toFixed(1) : Math.round(Math.abs(m.pct))}%)`}</span>
}

// Summary at the top of both views: the period's totals next to the same calendar the Dashboard shows (same component, same transactions, same date handling).
// The calendar shows the month of the selected period (see calendarMonthFor), and today is highlighted from the same TODAY the Dashboard uses.
function Overview({ R, period, transactions }) {
  const { totals, cmp } = R, label = periodLabel(period, 'All time'), prevWord = previousWord(period), total = totals.income + totals.expenses, calMonth = calendarMonthFor(period, TODAY)
  const noPrev = cmp && !cmp.hasPrevious ? `No transactions in ${prevWord} to compare with.` : ''
  return (<div className="rpt-hero">
    <section className="card rpt-sec rpt-over" aria-labelledby="st-over"><h2 id="st-over">Overview <span className="muted small rpt-period">{label}</span>
      <InfoTip><span className="info-line">Moving money between balances and goals is not income or spending. It is shown under Savings.</span>
        <span className="info-line">{cmp && cmp.hasPrevious ? `Compared with ${periodLabel(R.prevP)}: ${R.prevCount} transaction${R.prevCount === 1 ? '' : 's'}.` : cmp ? noPrev : 'All time has no earlier period to compare with.'}</span></InfoTip></h2>
      <div className="rpt-kpis">
        <div><div className="muted small">Income</div><div className="big pos">{money(totals.income)}</div>{cmp && <Change m={cmp.income} goodWhenUp previousText="" />}</div>
        <div><div className="muted small">Expenses</div><div className="big neg">{money(totals.expenses)}</div>{cmp && <Change m={cmp.expenses} goodWhenUp={false} previousText="" />}</div>
        <div><div className="muted small">Net cash flow</div><div className={'big ' + (totals.net >= 0 ? 'pos' : 'neg')}>{signedMoney(totals.net)}</div>{cmp && <Change m={cmp.net} goodWhenUp previousText="" />}</div></div>
      <div className="ivs" role="img" aria-label={`Income ${money(totals.income)} versus expenses ${money(totals.expenses)}`}>
        <div className="ivs-bar"><span className="ivs-in" style={{ width: total ? (totals.income / total) * 100 + '%' : '0%' }} /><span className="ivs-out" style={{ width: total ? (totals.expenses / total) * 100 + '%' : '0%' }} /></div>
        <div className="muted small">{total ? `Expenses are ${totals.income > 0 ? pct1((totals.expenses / totals.income) * 100) + ' of income' : 'all of the money recorded'}.` : 'No income or expenses in this period.'}</div></div>
      <div className="muted small">{totals.count} transaction{totals.count === 1 ? '' : 's'} ({totals.incomeCount} income, {totals.expenseCount} expense)</div></section>
    <section className="preview rpt-cal" aria-label="Calendar"><div className="pv-head"><div className="pv-title"><h2>Calendar</h2><p className="muted small">{monthLabel(calMonth)}</p></div></div>
      <div className="pv-body cal"><MonthCalendar transactions={transactions} month={calMonth} today={TODAY} /></div></section>
  </div>)
}

function Stats({ R, period, goals, ledger, savingsReady }) {
  const { totals, expense, income, summary, budget, savings } = R, label = periodLabel(period, 'All time')
  return (<div className="rpt-stack">
    {totals.count === 0 && <EmptyState compact icon={BarChart3} title="No transactions in this period" text={`Nothing was recorded for ${label}. Pick another period to see activity.`} />}

    <div className="rpt-pair">
      <section className="card rpt-sec" aria-labelledby="st-exp"><h2 id="st-exp">Expenses</h2>
        {expense.rows.length === 0 ? <p className="muted">No expenses in this period.</p> : <>
          <div className="rpt-facts"><div><div className="muted small">Total</div><strong>{money(expense.total)}</strong></div><div><div className="muted small">Transactions</div><strong>{summary.count}</strong></div><div><div className="muted small">Average</div><strong>{money(summary.average)}</strong></div>{summary.perDay !== null && period.kind !== 'day' && <div><div className="muted small">Per day</div><strong>{money(summary.perDay)}</strong></div>}</div>
          {summary.largest && <p className="muted small">Largest: <strong>{money(summary.largest.amount)}</strong>{summary.largest.description ? ` (${summary.largest.description})` : ''} on {summary.largest.date.slice(0, 10)}.</p>}
          <CatTable rows={expense.rows} caption="Spending by category" tone="out" /></>}</section>

      <section className="card rpt-sec" aria-labelledby="st-inc"><h2 id="st-inc">Income</h2>
        {income.rows.length === 0 ? <p className="muted">No income in this period.</p> : <>
          <div className="rpt-facts"><div><div className="muted small">Total</div><strong>{money(income.total)}</strong></div><div><div className="muted small">Largest source</div><strong>{income.rows[0].name}</strong></div></div>
          <CatTable rows={income.rows} caption="Income by category" tone="in" /></>}</section>
    </div>

    <section className="card rpt-sec" aria-labelledby="st-bud"><h2 id="st-bud">Budgets{budget.rows.length > 0 && budget.note && <InfoTip>{budget.note}</InfoTip>}</h2>
      {budget.rows.length === 0 ? <p className="muted">{period.kind === 'month' ? 'No budgets are set for this month.' : 'No budgets cover this period.'} <Link className="btn-link" to="/budgets">Go to Budgets</Link></p> : <>
        <div className="rpt-facts"><div><div className="muted small">Budgeted</div><strong>{money(budget.budgeted)}</strong></div><div><div className="muted small">Spent</div><strong>{money(budget.spent)}</strong></div>
          <div><div className="muted small">Remaining</div><strong className={budget.remaining < 0 ? 'neg' : ''}>{budget.remaining < 0 ? '−' : ''}{money(Math.abs(budget.remaining))}</strong></div><div><div className="muted small">Used</div><strong>{budget.pct}%</strong></div></div>
        {budget.over.length > 0 && <p className="neg small rpt-flag"><AlertTriangle size={14} aria-hidden="true" /> Over budget: {budget.over.map((r) => r.name).join(', ')}.</p>}
        {budget.approaching.length > 0 && <p className="warnline small rpt-flag"><AlertTriangle size={14} aria-hidden="true" /> Close to the limit (80% or more): {budget.approaching.map((r) => r.name).join(', ')}.</p>}
        <ul className="rpt-bud">{budget.rows.map((r) => (<li key={r.key}><div className="rpt-bud-top"><span className="rpt-name"><CategoryIcon id={r.icon} size={16} />{r.name}</span><span className="small muted">{r.tracked ? `${money(r.spent)} of ${money(r.budgeted)}` : `${money(r.budgeted)} · spending not tracked`}</span></div>
          <div className="bar" role="progressbar" aria-valuenow={Math.min(r.pct, 100)} aria-valuemin="0" aria-valuemax="100" aria-label={`${r.name} budget used`}><div className={`bar-fill ${r.level}`} style={{ width: Math.min(r.pct, 100) + '%' }} /></div>
          {r.tracked && <div className={'small ' + (r.remaining < 0 ? 'neg' : 'muted')}>{r.remaining < 0 ? `${money(-r.remaining)} over budget` : `${money(r.remaining)} left`} · {r.pct}% used</div>}</li>))}</ul>
        <p className="muted small">Left in categories that are not over: <strong>{money(budget.unusedTotal)}</strong>.{budget.hasUntracked ? ' Budget-only budgets do not track spending.' : ''}</p></>}</section>

    <section className="card rpt-sec" aria-labelledby="st-sav"><h2 id="st-sav">Savings{savingsReady && <InfoTip>Moves between balances and goals, and money added directly to Savings, are not in the income and expense totals.</InfoTip>}</h2>
      {!savingsReady ? <p className="muted">Savings is not available yet.</p> : <>
        <div className="rpt-facts"><div><div className="muted small">Savings balance now</div><strong>{money(ledger.savings)}</strong></div><div><div className="muted small">Current Balance now</div><strong>{money(ledger.current)}</strong></div></div>
        <div className="rpt-facts"><div><div className="muted small">Moved into Savings</div><strong>{money(savings.toSavings)}</strong></div><div><div className="muted small">Moved out of Savings</div><strong>{money(savings.toCurrent)}</strong></div><div><div className="muted small">Net moved to Savings</div><strong>{signedMoney(savings.net)}</strong></div>{savings.added > 0 && <div><div className="muted small">New money added</div><strong>{money(savings.added)}</strong></div>}{savings.reallocated > 0 && <div><div className="muted small">Moved between goals</div><strong>{money(savings.reallocated)}</strong></div>}</div>
        {goals.filter((g) => !g.archived).length === 0 ? <p className="muted">No savings goals yet. <Link className="btn-link" to="/savings">Add one</Link></p> : <ul className="rpt-bud">{goals.filter((g) => !g.archived).map((g) => { const p = goalProgress(g, bucketAmount(ledger, g.id)); return (<li key={g.id}><div className="rpt-bud-top"><span className="rpt-name">{g.name}</span><span className="small muted">{money(p.saved)} of {money(p.target)}</span></div>
          <div className="bar" role="progressbar" aria-valuenow={Math.min(p.pct, 100)} aria-valuemin="0" aria-valuemax="100" aria-label={`${g.name} progress`}><div className="bar-fill ok" style={{ width: Math.min(p.pct, 100) + '%' }} /></div>
          <div className="small muted">{p.reached ? 'Goal reached' : `${money(p.remaining)} to go`} · {pctText(p.pct)}</div></li>) })}</ul>}</>}</section>

    {(period.kind === 'year' || period.kind === 'all') && R.series.length > 0 && (() => { const byYear = period.kind === 'all' && R.series[0].key.length === 4; return (
      <section className="card rpt-sec" aria-labelledby="st-sum"><h2 id="st-sum">{byYear ? 'By year' : 'By month'}</h2>
        <div className="table-wrap"><table className="table rpt-table"><caption className="sr-only">Income, expenses and net by {byYear ? 'year' : 'month'}</caption>
          <thead><tr><th className="label">Period</th><th className="label amount">Income</th><th className="label amount">Expenses</th><th className="label amount">Net</th></tr></thead>
          <tbody>{[...R.series].reverse().map((d) => <tr key={d.key}><td>{d.label}</td><td className="amount">{money(d.income)}</td><td className="amount">{money(d.expenses)}</td><td className={'amount ' + (d.net >= 0 ? 'pos' : 'neg')}>{signedMoney(d.net)}</td></tr>)}</tbody></table></div></section>) })()}
  </div>)
}

// Exact amounts in a table, so nobody has to read a value off a chart.
function CatTable({ rows, caption, tone }) {
  return (<div className="table-wrap"><table className="table rpt-table"><caption className="sr-only">{caption}</caption>
    <thead><tr><th className="label">Category</th><th className="label amount">Amount</th><th className="label amount">Share</th></tr></thead>
    <tbody>{rows.map((r) => (<tr key={r.categoryId || 'none'}><td><span className="rpt-name"><span className={'rpt-ic ' + tone}><CategoryIcon id={r.icon} size={16} /></span>{r.known ? r.name : <em className="uncat">Uncategorized</em>}<span className="muted small"> · {r.count}</span></span></td><td className="amount">{money(r.amount)}</td>
      <td className="amount"><span className="share-cell"><span className="share-mini" aria-hidden="true"><span style={{ width: r.share + '%' }} /></span>{pct1(r.share)}</span></td></tr>))}</tbody></table></div>)
}

function Charts({ R }) {
  const { expense, income, series, budget } = R, label = periodLabel(R.period, 'All time')
  return (<div className="rpt-stack">
    {/* Income and Expenses by category sit side by side on desktop (one section, two columns) and stack on narrow screens. */}
    <section className="card rpt-sec" aria-labelledby="ch-pie"><h2 id="ch-pie">By category</h2>
      <div className="rpt-pies">
        <div className="rpt-pie"><h3>Income{income.rows.length > 0 && <span className="muted small rpt-period">{money(income.total)}</span>}</h3>
          {income.rows.length === 0 ? <p className="muted">No income in this period.</p> : <PieChart rows={income.rows} title={`Income distribution by category, ${label}`} totalLabel="Total income" />}</div>
        <div className="rpt-pie"><h3>Expenses{expense.rows.length > 0 && <span className="muted small rpt-period">{money(expense.total)}</span>}</h3>
          {expense.rows.length === 0 ? <p className="muted">No expenses in this period.</p> : <PieChart rows={expense.rows} title={`Expense distribution by category, ${label}`} totalLabel="Total expenses" />}</div></div></section>
    <section className="card rpt-sec" aria-labelledby="ch-bars"><h2 id="ch-bars">Income vs expenses</h2>
      {R.totals.count === 0 ? <p className="muted">No income or expenses in this period.</p> : <FlowBars series={series} title={`Income versus expenses, ${label}`} />}</section>
    <section className="card rpt-sec" aria-labelledby="ch-line"><h2 id="ch-line">Cash flow trend</h2>
      {R.totals.count === 0 ? <p className="muted">No income or expenses in this period.</p> : series.length < 2 ? <p className="muted">A trend needs at least two points in time. Choose a week, month, year or all time.</p> : <TrendLines series={series} title={`Cash flow trend, ${label}`} />}</section>
    {budget.rows.length > 0 && <section className="card rpt-sec" aria-labelledby="ch-bud"><h2 id="ch-bud">Budget vs actual{budget.note && <InfoTip>{budget.note}</InfoTip>}</h2><BudgetBars rows={budget.rows} /></section>}
  </div>)
}
