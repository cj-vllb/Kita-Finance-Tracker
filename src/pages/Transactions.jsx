import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronUp, ChevronDown, SlidersHorizontal, MoreVertical, Eye, Pencil, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { formatDate, signed, monthLabel, txLabel } from '../utils/format.js'
import { allMonths } from '../utils/calc.js'
import { CURRENT_MONTH } from '../utils/dates.js'
import { PageHeader, EmptyState, DeleteTransactionDialog, ActionSheet, LoadingState, useLoading } from '../components/ui.jsx'
const PAGE = 10
export default function Transactions() {
  const { transactions, categories, deleteTransaction, notify } = useApp(), [sp] = useSearchParams(), loading = useLoading(250)
  const [f, setF] = useState({ q: '', type: 'all', cat: sp.get('category') || 'all', month: CURRENT_MONTH }), [sort, setSort] = useState({ key: 'date', dir: 'desc' }), [page, setPage] = useState(1), [del, setDel] = useState(null), [sheet, setSheet] = useState(null), [fOpen, setFOpen] = useState(false)
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1) }
  const label = (t) => txLabel(t, categories), active = (f.month !== CURRENT_MONTH) + (f.type !== 'all') + (f.cat !== 'all')
  const reset = () => { setF({ q: '', type: 'all', cat: 'all', month: CURRENT_MONTH }); setPage(1) }
  const name = (id) => categories.find((c) => c.id === id)?.name ?? 'Uncategorized'
  const dir = sort.dir === 'asc' ? 1 : -1
  const rows = transactions.filter((t) => (f.type === 'all' || t.type === f.type) && (f.cat === 'all' || (f.cat === 'none' ? !t.categoryId : t.categoryId === f.cat)) && (f.month === 'all' || t.date.startsWith(f.month)) && `${label(t)} ${name(t.categoryId)}`.toLowerCase().includes(f.q.trim().toLowerCase()))
    .sort((a, b) => dir * (sort.key === 'amount' ? a.amount - b.amount : a.date.localeCompare(b.date)))
  const pages = Math.max(1, Math.ceil(rows.length / PAGE)), cur = Math.min(page, pages), view = rows.slice((cur - 1) * PAGE, cur * PAGE)
  const toggle = (key) => setSort({ key, dir: sort.key === key && sort.dir === 'desc' ? 'asc' : 'desc' })
  const SortTh = ({ k, children, cls }) => <th className={`label ${cls || ''}`} aria-sort={sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}><button className="sort" onClick={() => toggle(k)}>{children}{sort.key === k && (sort.dir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</button></th>
  return (<>
    <PageHeader title="Transactions" subtitle={`${rows.length} transaction${rows.length === 1 ? '' : 's'}${f.month === 'all' ? '' : ' in ' + monthLabel(f.month)}`}><Link to="/transactions/new" className="btn btn-primary">Add transaction</Link></PageHeader>
    {transactions.length === 0 ? <EmptyState title="No transactions yet" text="Add your first transaction to start tracking your money." to="/transactions/new" action="Add transaction" /> : <>
      <div className="toolbar">
        <input className="input" type="search" placeholder="Search description or category" aria-label="Search transactions" value={f.q} onChange={set('q')} />
        <button type="button" className="btn filter-btn" aria-expanded={fOpen} aria-controls="tx-filters" onClick={() => setFOpen(!fOpen)}><SlidersHorizontal size={16} aria-hidden="true" />Filter{active > 0 && <span className="count" aria-label={`${active} active`}>{active}</span>}</button>
        <div id="tx-filters" className={'filters' + (fOpen ? ' open' : '')}>
          <select className="input" aria-label="Date" value={f.month} onChange={set('month')}><option value="all">All dates</option>{allMonths(transactions, [CURRENT_MONTH]).reverse().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
          <select className="input" aria-label="Type" value={f.type} onChange={set('type')}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option></select>
          <select className="input" aria-label="Category" value={f.cat} onChange={set('cat')}><option value="all">All categories</option><option value="none">No category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select className="input sort-m" aria-label="Sort by" value={`${sort.key}:${sort.dir}`} onChange={(e) => { const [key, dir] = e.target.value.split(':'); setSort({ key, dir }); setPage(1) }}><option value="date:desc">Newest first</option><option value="date:asc">Oldest first</option><option value="amount:desc">Highest amount</option><option value="amount:asc">Lowest amount</option></select>
          {(active > 0 || f.q) && <button type="button" className="btn-link reset" onClick={reset}>Reset</button>}</div></div>
      {loading ? <LoadingState rows={6} label="Loading your transactions..." /> : rows.length === 0 ? <EmptyState title="No transactions found" text="Try adjusting your filters." /> : <>
        <div className="table-wrap"><table className="table"><caption className="sr-only">Transactions</caption><thead><tr><SortTh k="date" cls="hide-m">Date</SortTh><th className="label">Description</th><th className="label hide-m">Category</th><th className="label hide-m">Type</th><SortTh k="amount" cls="amount">Amount</SortTh><th className="label hide-m">Actions</th><th className="only-m"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{view.map((t) => <tr className="row" key={t.id}><td className="hide-m">{formatDate(t.date)}</td>
            <td><Link className="tx-link" to={`/transactions/${t.id}`}>{label(t)}</Link><div className="muted small show-m">{name(t.categoryId)} · {formatDate(t.date)}</div></td>
            <td className="hide-m">{name(t.categoryId)}</td><td className="hide-m">{t.type === 'income' ? 'Income' : 'Expense'}</td>
            <td className={`amount ${t.type === 'income' ? 'pos' : 'neg'}`}>{signed(t.amount, t.type)}</td>
            <td className="hide-m"><div className="row-actions"><Link to={`/transactions/${t.id}`} aria-label={`View ${label(t)}`}>View</Link><Link to={`/transactions/${t.id}/edit`} aria-label={`Edit ${label(t)}`}>Edit</Link><button className="btn-link danger" aria-label={`Delete ${label(t)}`} onClick={() => setDel(t)}>Delete</button></div></td>
            <td className="only-m act"><button type="button" className="icon-btn" aria-label={`Actions for ${label(t)}`} aria-haspopup="dialog" onClick={() => setSheet(t)}><MoreVertical size={20} aria-hidden="true" /></button></td></tr>)}</tbody></table></div>
        <div className="pager"><span className="muted small">Showing {(cur - 1) * PAGE + 1} to {(cur - 1) * PAGE + view.length} of {rows.length}</span>
          <span className="form-actions"><button className="btn" disabled={cur <= 1} onClick={() => setPage(cur - 1)}>Previous</button><button className="btn" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>Next</button></span></div></>}</>}
    {sheet && <ActionSheet title={label(sheet)} subtitle={`${signed(sheet.amount, sheet.type)} · ${formatDate(sheet.date)}`} onClose={() => setSheet(null)}>
      <Link className="sheet-item" to={`/transactions/${sheet.id}`}><Eye size={18} aria-hidden="true" />View</Link><Link className="sheet-item" to={`/transactions/${sheet.id}/edit`}><Pencil size={18} aria-hidden="true" />Edit</Link>
      <button type="button" className="sheet-item danger" onClick={() => { setDel(sheet); setSheet(null) }}><Trash2 size={18} aria-hidden="true" />Delete</button></ActionSheet>}
    {del && <DeleteTransactionDialog summary={`${label(del)}, ${signed(del.amount, del.type)}, ${formatDate(del.date)}.`} onCancel={() => setDel(null)} onConfirm={async () => { const e = await deleteTransaction(del.id); setDel(null); notify(e || 'Transaction deleted.') }} />}
  </>)
}
