import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { formatDate, signed, monthLabel } from '../utils/format.js'
import { allMonths } from '../utils/calc.js'
import { CURRENT_MONTH } from '../utils/dates.js'
import { PageHeader, EmptyState, ConfirmDialog, LoadingState, useLoading } from '../components/ui.jsx'
const PAGE = 10
export default function Transactions() {
  const { transactions, categories, deleteTransaction, notify } = useApp(), [sp] = useSearchParams(), loading = useLoading(250)
  const [f, setF] = useState({ q: '', type: 'all', cat: sp.get('category') || 'all', month: CURRENT_MONTH }), [sort, setSort] = useState({ key: 'date', dir: 'desc' }), [page, setPage] = useState(1), [del, setDel] = useState(null)
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1) }
  const name = (id) => categories.find((c) => c.id === id)?.name ?? 'Uncategorized'
  const dir = sort.dir === 'asc' ? 1 : -1
  const rows = transactions.filter((t) => (f.type === 'all' || t.type === f.type) && (f.cat === 'all' || t.categoryId === f.cat) && (f.month === 'all' || t.date.startsWith(f.month)) && `${t.description} ${name(t.categoryId)}`.toLowerCase().includes(f.q.trim().toLowerCase()))
    .sort((a, b) => dir * (sort.key === 'amount' ? a.amount - b.amount : a.date.localeCompare(b.date)))
  const pages = Math.max(1, Math.ceil(rows.length / PAGE)), cur = Math.min(page, pages), view = rows.slice((cur - 1) * PAGE, cur * PAGE)
  const toggle = (key) => setSort({ key, dir: sort.key === key && sort.dir === 'desc' ? 'asc' : 'desc' })
  const SortTh = ({ k, children, cls }) => <th className={`label ${cls || ''}`} aria-sort={sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}><button className="sort" onClick={() => toggle(k)}>{children}{sort.key === k && (sort.dir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</button></th>
  return (<>
    <PageHeader title="Transactions" subtitle={`${rows.length} transaction${rows.length === 1 ? '' : 's'}${f.month === 'all' ? '' : ' in ' + monthLabel(f.month)}`}><Link to="/transactions/new" className="btn btn-primary">Add transaction</Link></PageHeader>
    {transactions.length === 0 ? <EmptyState title="No transactions yet" text="Add your first transaction to start tracking your money." to="/transactions/new" action="Add transaction" /> : <>
      <div className="toolbar">
        <input className="input" type="search" placeholder="Search description or category" aria-label="Search transactions" value={f.q} onChange={set('q')} />
        <select className="input" aria-label="Month" value={f.month} onChange={set('month')}><option value="all">All dates</option>{allMonths(transactions, [CURRENT_MONTH]).reverse().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
        <select className="input" aria-label="Type" value={f.type} onChange={set('type')}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option></select>
        <select className="input" aria-label="Category" value={f.cat} onChange={set('cat')}><option value="all">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      {loading ? <LoadingState rows={6} label="Loading your transactions..." /> : rows.length === 0 ? <EmptyState title="No transactions found" text="Try adjusting your filters." /> : <>
        <table className="table"><thead><tr><SortTh k="date" cls="hide-m">Date</SortTh><th className="label">Description</th><th className="label hide-m">Category</th><th className="label hide-m">Type</th><SortTh k="amount" cls="amount">Amount</SortTh><th className="label hide-m">Actions</th></tr></thead>
          <tbody>{view.map((t) => <tr className="row" key={t.id}><td className="hide-m">{formatDate(t.date)}</td>
            <td><Link to={`/transactions/${t.id}`}>{t.description}</Link><div className="muted small show-m">{name(t.categoryId)} · {formatDate(t.date)}</div></td>
            <td className="hide-m">{name(t.categoryId)}</td><td className="hide-m">{t.type === 'income' ? 'Income' : 'Expense'}</td>
            <td className={`amount ${t.type === 'income' ? 'pos' : 'neg'}`}>{signed(t.amount, t.type)}</td>
            <td className="hide-m"><div className="row-actions"><Link to={`/transactions/${t.id}`}>View</Link><Link to={`/transactions/${t.id}/edit`}>Edit</Link><button className="btn-link danger" onClick={() => setDel(t)}>Delete</button></div></td></tr>)}</tbody></table>
        <div className="pager"><span className="muted small">Showing {(cur - 1) * PAGE + 1} to {(cur - 1) * PAGE + view.length} of {rows.length}</span>
          <span className="form-actions"><button className="btn" disabled={cur <= 1} onClick={() => setPage(cur - 1)}>Previous</button><button className="btn" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>Next</button></span></div></>}</>}
    {del && <ConfirmDialog title="Delete transaction?" confirmLabel="Delete transaction" onCancel={() => setDel(null)} onConfirm={async () => { const e = await deleteTransaction(del.id); setDel(null); notify(e || 'Transaction deleted.') }}>
      <p className="muted">{del.description}, {signed(del.amount, del.type)}, {formatDate(del.date)}.</p><p>This action cannot be undone.</p></ConfirmDialog>}
  </>)
}
