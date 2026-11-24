import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, MoreVertical, Eye, Pencil, Trash2, ArrowLeftRight, Search, ArrowDownLeft, ArrowUpRight, ChevronRight, PiggyBank } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { formatDate, signed, txLabel, txKind } from '../utils/format.js'
import { inPeriod, periodLabel, formatDateHeading, localToday } from '../utils/dateRange.js'
import { PageHeader, EmptyState, DeleteTransactionDialog, ActionSheet, RowMenu, TxIcon, CatLabel } from '../components/ui.jsx'
import DateFilter from '../components/DateFilter.jsx'
import { PeriodButton } from '../components/PeriodFilter.jsx'
import { useMedia } from '../components/SidebarSearch.jsx'
import { historyRows, savingsAmountText } from '../utils/historyRows.js'
const ALL = { kind: 'all' } // the date filter always starts on All dates
const PAGE = 10
// Small marker for anything that belongs to Savings (a transaction on the Savings balance, or a Savings transfer/contribution/move). Ordinary rows never get it.
const SavingsBadge = () => <span className="sv-badge" title="Savings activity"><PiggyBank size={11} strokeWidth={2.2} aria-hidden="true" />Savings</span>
// A Savings activity row (only listed when "Include Savings Activity" is on, phones and tablets). It is read-only here: it opens the Savings page, where it can be undone.
function SavingsRow({ r, head }) {
  const Icon = r.dir === 'in' ? ArrowDownLeft : r.dir === 'out' ? ArrowUpRight : ArrowLeftRight
  return (<li className="tx-li">{head && <div className="date-head">{formatDateHeading(r.date)}</div>}
    <div className="tx-row tx-savings"><span className={'dir-icon tx-cat-icon ' + (r.dir === 'in' ? 'in' : r.dir === 'out' ? 'out' : 'mid')} aria-hidden="true"><Icon size={18} strokeWidth={2} /></span>
      <div className="tx-main"><span className="tx-link">{r.title}</span><span className="muted small meta"><SavingsBadge />{r.meta}<span className="meta-date"> · {formatDate(r.date)}</span></span></div>
      <div className="tx-amt"><span className="amount">{savingsAmountText(r)}</span><span className="small muted tx-kind">{r.label}</span></div>
      <div className="rm-mob"><Link className="icon-btn" to="/savings" aria-label={`Open Savings: ${r.title}`}><ChevronRight size={20} aria-hidden="true" /></Link></div></div></li>)
}
export default function Transactions() {
  const { transactions, categories, deleteTransaction, notify, transfers, contributions, reallocations, goals } = useApp(), [sp] = useSearchParams(), compact = useMedia('(max-width:1100px)')
  const [f, setF] = useState({ q: sp.get('q') || '', type: 'all', cat: sp.get('category') || 'all', period: ALL, savings: false }), [sort, setSort] = useState({ key: 'date', dir: 'desc' }), [page, setPage] = useState(1), [del, setDel] = useState(null), [sheet, setSheet] = useState(null), [fOpen, setFOpen] = useState(false)
  const qParam = sp.get('q')
  useEffect(() => { if (qParam) { setF((p) => ({ ...p, q: qParam, period: ALL })); setPage(1) } }, [qParam])
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1) }
  const label = (t) => txLabel(t, categories), includeSavings = compact && f.savings, active = (f.period.kind !== 'all') + (f.type !== 'all') + (f.cat !== 'all') + includeSavings // the Savings switch only exists on phones and tablets
  const reset = () => { setF({ q: '', type: 'all', cat: 'all', period: ALL, savings: false }); setPage(1) }
  const name = (id) => categories.find((c) => c.id === id)?.name ?? 'Uncategorized'
  const dir = sort.dir === 'asc' ? 1 : -1
  const q = f.q.trim().toLowerCase()
  // With the Savings switch off this is exactly the list the page always showed. Savings rows have no type or category, so those two filters hide them.
  const rows = historyRows({ transactions, includeSavings, hideSavingsTx: compact, transfers, contributions, reallocations, goals })
    .filter((r) => r.row === 'savings' ? f.type === 'all' && f.cat === 'all' && inPeriod(r.date, f.period) && `${r.title} ${r.meta} ${r.label}`.toLowerCase().includes(q)
      : (f.type === 'all' || r.t.type === f.type) && (f.cat === 'all' || (f.cat === 'none' ? !r.t.categoryId : r.t.categoryId === f.cat)) && inPeriod(r.t.date, f.period) && `${label(r.t)} ${name(r.t.categoryId)}`.toLowerCase().includes(q))
    .sort((a, b) => dir * (sort.key === 'amount' ? a.amount - b.amount : a.date.localeCompare(b.date)))
  const pages = Math.max(1, Math.ceil(rows.length / PAGE)), cur = Math.min(page, pages), view = rows.slice((cur - 1) * PAGE, cur * PAGE)
  const today = localToday(), firstYear = transactions.reduce((m, t) => Math.min(m, +t.date.slice(0, 4)), +today.slice(0, 4))
  const grouped = sort.key === 'date' // date headers only make sense when the list is in date order
  return (<>
    <PageHeader title="Transactions"><Link to="/transactions/new" className="btn btn-primary hide-compact" aria-label="Add transaction">Add</Link></PageHeader>
    {transactions.length === 0 ? <EmptyState icon={ArrowLeftRight} title="No transactions yet" text={compact ? 'Tap the + button to add your first one.' : 'Add your first one to get started.'} to={compact ? undefined : '/transactions/new'} action="Add" /> : <>
      <div className="toolbar tx-toolbar">
        <div className="search"><Search size={16} aria-hidden="true" /><input className="input" type="search" placeholder="Search title or category" aria-label="Search transactions" value={f.q} onChange={set('q')} /></div>
        <button type="button" className="btn filter-btn" aria-expanded={fOpen} aria-controls="tx-filters" onClick={() => setFOpen(!fOpen)}><SlidersHorizontal size={16} aria-hidden="true" />Filter{active > 0 && <span className="count" aria-label={`${active} active`}>{active}</span>}</button>
        {fOpen && <div className="filters-scrim" aria-hidden="true" onClick={() => setFOpen(false)} />}
        <div id="tx-filters" className={'filters' + (fOpen ? ' open' : '')} role={fOpen ? 'group' : undefined} aria-label="Filters">
          <span className="filters-title">Filters</span>
          {compact ? <PeriodButton label="Period" period={f.period} onChange={(period) => { setF({ ...f, period }); setPage(1) }} today={today} firstYear={firstYear} kinds={['all', 'day', 'week', 'month']} allLabel="All dates" /> : <DateFilter idPrefix="tx" period={f.period} onChange={(period) => { setF({ ...f, period }); setPage(1) }} today={today} firstYear={firstYear} kinds={['all', 'day', 'week', 'month']} allLabel="All dates" />}
          <label className="fsel"><span className="flabel">Type</span><select className="input" aria-label="Type" value={f.type} onChange={set('type')}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option></select></label>
          <label className="fsel"><span className="flabel">Category</span><select className="input" aria-label="Category" value={f.cat} onChange={set('cat')}><option value="all">All categories</option><option value="none">No category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="fsel"><span className="flabel">Sort by</span><select className="input" aria-label="Sort by" value={`${sort.key}:${sort.dir}`} onChange={(e) => { const [key, dir] = e.target.value.split(':'); setSort({ key, dir }); setPage(1) }}><option value="date:desc">Newest first</option><option value="date:asc">Oldest first</option><option value="amount:desc">Highest amount</option><option value="amount:asc">Lowest amount</option></select></label>
          {compact && <label className="fsw"><span className="fsw-title">Include Savings Activity</span><input type="checkbox" role="switch" className="fsw-input" checked={f.savings} onChange={(e) => { setF({ ...f, savings: e.target.checked }); setPage(1) }} /><span className="fsw-track" aria-hidden="true" /></label>}
          {(active > 0 || f.q) && <button type="button" className="btn-link reset" onClick={reset}>Reset</button>}
          <button type="button" className="btn btn-primary filters-done" onClick={() => setFOpen(false)}>Done</button></div></div>
      {f.period.kind !== 'all' && <p className="muted small tx-showing">Showing transactions for <strong>{periodLabel(f.period)}</strong></p>}
      {rows.length === 0 ? <EmptyState title="No transactions found" text="Try adjusting your filters." /> : <>
        <ul className={'tx-rows' + (grouped ? '' : ' ungrouped')} aria-label="Transactions">{view.map((r, i) => { const t = r.t; if (r.row === 'savings') return <SavingsRow key={r.id} r={r} head={grouped && (i === 0 || view[i - 1].date !== r.date)} />; return <li key={t.id} className="tx-li">
          {grouped && (i === 0 || view[i - 1].date !== r.date) && <div className="date-head">{formatDateHeading(t.date)}</div>}
          <div className={'tx-row' + (t.notes?.trim() ? ' has-note' : '')}><TxIcon type={t.type} category={categories.find((c) => c.id === t.categoryId)} />
            <div className="tx-main"><Link className="tx-link" to={`/transactions/${t.id}`}>{label(t)}</Link><span className="muted small meta">{r.savings && <SavingsBadge />}<CatLabel id={t.categoryId} categories={categories} /><span className="meta-date"> · {formatDate(t.date)}</span></span></div>
            {t.notes?.trim() && <p className="tx-note" title={t.notes}>{t.notes}</p>}
            <div className="tx-amt"><span className={`amount ${t.type === 'income' ? 'pos' : 'neg'}`}>{signed(t.amount, t.type)}</span><span className="small muted tx-kind">{txKind(t)}</span></div>
            <div className="rm-desk"><RowMenu label={`Actions for ${label(t)}`} items={[{ label: 'View', icon: Eye, to: `/transactions/${t.id}` }, { label: 'Edit', icon: Pencil, to: `/transactions/${t.id}/edit` }, { label: 'Delete', icon: Trash2, danger: true, onSelect: () => setDel(t) }]} /></div>
            <div className="rm-mob"><button type="button" className="icon-btn" aria-label={`Actions for ${label(t)}`} aria-haspopup="dialog" onClick={() => setSheet(t)}><MoreVertical size={20} aria-hidden="true" /></button></div></div></li> })}</ul>
        <div className="pager"><span className="muted small">Showing {(cur - 1) * PAGE + 1} to {(cur - 1) * PAGE + view.length} of {rows.length}</span>
          <span className="form-actions"><button className="btn" disabled={cur <= 1} onClick={() => setPage(cur - 1)}>Previous</button><button className="btn" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>Next</button></span></div></>}</>}
    {sheet && <ActionSheet title={label(sheet)} subtitle={`${signed(sheet.amount, sheet.type)} · ${formatDate(sheet.date)}`} onClose={() => setSheet(null)}>
      <Link className="sheet-item" to={`/transactions/${sheet.id}`}><Eye size={18} aria-hidden="true" />View</Link><Link className="sheet-item" to={`/transactions/${sheet.id}/edit`}><Pencil size={18} aria-hidden="true" />Edit</Link>
      <button type="button" className="sheet-item danger" onClick={() => { setDel(sheet); setSheet(null) }}><Trash2 size={18} aria-hidden="true" />Delete</button></ActionSheet>}
    {del && <DeleteTransactionDialog summary={`${label(del)}, ${signed(del.amount, del.type)}, ${formatDate(del.date)}.`} onCancel={() => setDel(null)} onConfirm={async () => { const e = await deleteTransaction(del.id); setDel(null); notify(e || 'Transaction deleted.') }} />}
  </>)
}
