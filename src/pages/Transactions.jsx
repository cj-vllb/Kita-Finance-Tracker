import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, MoreVertical, Eye, Pencil, Trash2, ArrowLeftRight, Search } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { formatDate, signed, monthLabel, txLabel, txKind } from '../utils/format.js'
import { allMonths } from '../utils/calc.js'
import { CURRENT_MONTH } from '../utils/dates.js'
import { PageHeader, EmptyState, DeleteTransactionDialog, ActionSheet, RowMenu, DirIcon, CatLabel } from '../components/ui.jsx'
const PAGE = 10
export default function Transactions() {
  const { transactions, categories, deleteTransaction, notify } = useApp(), [sp] = useSearchParams()
  const [f, setF] = useState({ q: sp.get('q') || '', type: 'all', cat: sp.get('category') || 'all', month: 'all' }), [sort, setSort] = useState({ key: 'date', dir: 'desc' }), [page, setPage] = useState(1), [del, setDel] = useState(null), [sheet, setSheet] = useState(null), [fOpen, setFOpen] = useState(false)
  const qParam = sp.get('q')
  useEffect(() => { if (qParam) { setF((p) => ({ ...p, q: qParam, month: 'all' })); setPage(1) } }, [qParam])
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1) }
  const label = (t) => txLabel(t, categories), active = (f.month !== 'all') + (f.type !== 'all') + (f.cat !== 'all')
  const reset = () => { setF({ q: '', type: 'all', cat: 'all', month: 'all' }); setPage(1) }
  const name = (id) => categories.find((c) => c.id === id)?.name ?? 'Uncategorized'
  const dir = sort.dir === 'asc' ? 1 : -1
  const rows = transactions.filter((t) => (f.type === 'all' || t.type === f.type) && (f.cat === 'all' || (f.cat === 'none' ? !t.categoryId : t.categoryId === f.cat)) && (f.month === 'all' || t.date.startsWith(f.month)) && `${label(t)} ${name(t.categoryId)}`.toLowerCase().includes(f.q.trim().toLowerCase()))
    .sort((a, b) => dir * (sort.key === 'amount' ? a.amount - b.amount : a.date.localeCompare(b.date)))
  const pages = Math.max(1, Math.ceil(rows.length / PAGE)), cur = Math.min(page, pages), view = rows.slice((cur - 1) * PAGE, cur * PAGE)
  const grouped = sort.key === 'date' // date headers only make sense when the list is in date order
  return (<>
    <PageHeader title="Transactions"><Link to="/transactions/new" className="btn btn-primary">Add transaction</Link></PageHeader>
    {transactions.length === 0 ? <EmptyState icon={ArrowLeftRight} title="No transactions yet" text="Your transactions will appear here once you add your first one." to="/transactions/new" action="Add transaction" /> : <>
      <div className="toolbar tx-toolbar">
        <div className="search"><Search size={16} aria-hidden="true" /><input className="input" type="search" placeholder="Search title or category" aria-label="Search transactions" value={f.q} onChange={set('q')} /></div>
        <button type="button" className="btn filter-btn" aria-expanded={fOpen} aria-controls="tx-filters" onClick={() => setFOpen(!fOpen)}><SlidersHorizontal size={16} aria-hidden="true" />Filter{active > 0 && <span className="count" aria-label={`${active} active`}>{active}</span>}</button>
        {fOpen && <div className="filters-scrim" aria-hidden="true" onClick={() => setFOpen(false)} />}
        <div id="tx-filters" className={'filters' + (fOpen ? ' open' : '')} role={fOpen ? 'group' : undefined} aria-label="Filters">
          <span className="filters-title">Filters</span>
          <label className="fsel"><span className="flabel">Date</span><select className="input" aria-label="Date" value={f.month} onChange={set('month')}><option value="all">All dates</option>{allMonths(transactions, [CURRENT_MONTH]).reverse().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select></label>
          <label className="fsel"><span className="flabel">Type</span><select className="input" aria-label="Type" value={f.type} onChange={set('type')}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option></select></label>
          <label className="fsel"><span className="flabel">Category</span><select className="input" aria-label="Category" value={f.cat} onChange={set('cat')}><option value="all">All categories</option><option value="none">No category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="fsel"><span className="flabel">Sort by</span><select className="input" aria-label="Sort by" value={`${sort.key}:${sort.dir}`} onChange={(e) => { const [key, dir] = e.target.value.split(':'); setSort({ key, dir }); setPage(1) }}><option value="date:desc">Newest first</option><option value="date:asc">Oldest first</option><option value="amount:desc">Highest amount</option><option value="amount:asc">Lowest amount</option></select></label>
          {(active > 0 || f.q) && <button type="button" className="btn-link reset" onClick={reset}>Reset</button>}
          <button type="button" className="btn btn-primary filters-done" onClick={() => setFOpen(false)}>Done</button></div></div>
      {rows.length === 0 ? <EmptyState title="No transactions found" text="Try adjusting your filters." /> : <>
        <ul className={'tx-rows' + (grouped ? '' : ' ungrouped')} aria-label="Transactions">{view.map((t, i) => <li key={t.id} className="tx-li">
          {grouped && (i === 0 || view[i - 1].date !== t.date) && <div className="date-head">{formatDate(t.date)}</div>}
          <div className={'tx-row' + (t.notes?.trim() ? ' has-note' : '')}><DirIcon type={t.type} />
            <div className="tx-main"><Link className="tx-link" to={`/transactions/${t.id}`}>{label(t)}</Link><span className="muted small meta"><CatLabel id={t.categoryId} categories={categories} /><span className="meta-date"> · {formatDate(t.date)}</span></span></div>
            {t.notes?.trim() && <p className="tx-note" title={t.notes}>{t.notes}</p>}
            <div className="tx-amt"><span className={`amount ${t.type === 'income' ? 'pos' : 'neg'}`}>{signed(t.amount, t.type)}</span><span className="small muted tx-kind">{txKind(t)}</span></div>
            <div className="rm-desk"><RowMenu label={`Actions for ${label(t)}`} items={[{ label: 'View', icon: Eye, to: `/transactions/${t.id}` }, { label: 'Edit', icon: Pencil, to: `/transactions/${t.id}/edit` }, { label: 'Delete', icon: Trash2, danger: true, onSelect: () => setDel(t) }]} /></div>
            <div className="rm-mob"><button type="button" className="icon-btn" aria-label={`Actions for ${label(t)}`} aria-haspopup="dialog" onClick={() => setSheet(t)}><MoreVertical size={20} aria-hidden="true" /></button></div></div></li>)}</ul>
        <div className="pager"><span className="muted small">Showing {(cur - 1) * PAGE + 1} to {(cur - 1) * PAGE + view.length} of {rows.length}</span>
          <span className="form-actions"><button className="btn" disabled={cur <= 1} onClick={() => setPage(cur - 1)}>Previous</button><button className="btn" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>Next</button></span></div></>}</>}
    {sheet && <ActionSheet title={label(sheet)} subtitle={`${signed(sheet.amount, sheet.type)} · ${formatDate(sheet.date)}`} onClose={() => setSheet(null)}>
      <Link className="sheet-item" to={`/transactions/${sheet.id}`}><Eye size={18} aria-hidden="true" />View</Link><Link className="sheet-item" to={`/transactions/${sheet.id}/edit`}><Pencil size={18} aria-hidden="true" />Edit</Link>
      <button type="button" className="sheet-item danger" onClick={() => { setDel(sheet); setSheet(null) }}><Trash2 size={18} aria-hidden="true" />Delete</button></ActionSheet>}
    {del && <DeleteTransactionDialog summary={`${label(del)}, ${signed(del.amount, del.type)}, ${formatDate(del.date)}.`} onCancel={() => setDel(null)} onConfirm={async () => { const e = await deleteTransaction(del.id); setDel(null); notify(e || 'Transaction deleted.') }} />}
  </>)
}
