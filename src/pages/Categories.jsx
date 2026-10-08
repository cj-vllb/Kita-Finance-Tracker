import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { money, monthLabel } from '../utils/format.js'
import { inMonth } from '../utils/calc.js'
import { CURRENT_MONTH } from '../utils/dates.js'
import { PageHeader, EmptyState, ConfirmDialog } from '../components/ui.jsx'
import { colorHex, colorName } from '../utils/colors.js'
const GROUPS = [
  { type: 'income', title: 'Income categories', hint: 'Money coming in', empty: 'No income categories yet. Add one such as Salary to sort what you earn.', add: 'Add income category', sign: '+', tone: 'pos' },
  { type: 'expense', title: 'Expense categories', hint: 'Money going out', empty: 'No expense categories yet. Add one such as Food to sort what you spend.', add: 'Add expense category', sign: '−', tone: 'neg' },
]
export default function Categories() {
  const { categories, transactions, budgets, deleteCategory, notify } = useApp(), [del, setDel] = useState(null)
  const month = inMonth(transactions, CURRENT_MONTH)
  const stats = (cat) => ({ count: month.filter((t) => t.categoryId === cat.id).length, used: transactions.filter((t) => t.categoryId === cat.id).length, budgets: budgets.filter((b) => b.categoryId === cat.id).length,
    total: month.filter((t) => t.categoryId === cat.id).reduce((s, t) => s + t.amount, 0) })
  const s = del && stats(del), blocked = s && (s.used > 0 || s.budgets > 0)
  // The database only allows 'income' or 'expense', but an unexpected value must never hide a category: it is listed under "Other".
  const other = categories.filter((c) => c.type !== 'income' && c.type !== 'expense')
  const Table = ({ rows, group }) => (<div className="table-wrap"><table className="table stack"><caption className="sr-only">{group.title}</caption>
    <thead><tr><th className="label">Category</th><th className="label amount">Transactions</th><th className="label amount">This month</th><th className="label">Actions</th></tr></thead>
    <tbody>{rows.map((cat) => { const st = stats(cat); return <tr className="row" key={cat.id}>
      <td className="cell-title"><span className="dot" style={{ background: colorHex(cat.color) }} title={colorName(cat.color)} aria-hidden="true" />{cat.name}</td>
      <td className="amount" data-label="Transactions this month">{st.count ? <Link to={`/transactions?category=${cat.id}`}>{st.count}</Link> : 0}</td>
      <td className={`amount ${st.total ? group.tone : 'muted'}`} data-label="This month">{st.total ? group.sign : ''}{money(st.total)}</td>
      <td className="cell-actions"><div className="act-links"><Link to={`/categories/${cat.id}/edit`} aria-label={`Edit ${cat.name}`}>Edit</Link><button className="btn-link danger" aria-label={`Delete ${cat.name}`} onClick={() => setDel(cat)}>Delete</button></div></td></tr> })}</tbody></table></div>)
  return (<>
    <PageHeader title="Categories" subtitle={`Counts and totals for ${monthLabel(CURRENT_MONTH)}`}><Link className="btn btn-primary" to="/categories/new">Create category</Link></PageHeader>
    {categories.length === 0 ? <EmptyState title="No categories found" text="Create a category to start organizing your transactions." to="/categories/new" action="Create category" /> : <>
      {GROUPS.map((g) => { const rows = categories.filter((c) => c.type === g.type); return (<section className="cat-group" key={g.type} aria-labelledby={`cg-${g.type}`}>
        <div className="cat-head"><div><h2 id={`cg-${g.type}`}>{g.title}</h2><p className="muted small">{g.hint} · {rows.length} categor{rows.length === 1 ? 'y' : 'ies'}</p></div><Link className="btn" to={`/categories/new?type=${g.type}`}>{g.add}</Link></div>
        {rows.length === 0 ? <p className="muted cat-empty">{g.empty}</p> : <Table rows={rows} group={g} />}</section>) })}
      {other.length > 0 && <section className="cat-group" aria-labelledby="cg-other"><div className="cat-head"><div><h2 id="cg-other">Other categories</h2><p className="muted small">These need a type. Edit each one to choose Income or Expense.</p></div></div>
        <Table rows={other} group={{ title: 'Other categories', tone: '', sign: '' }} /></section>}</>}
    {del && (blocked ? <ConfirmDialog infoOnly title="This category is in use" onCancel={() => setDel(null)}><p>{del.name} is used by {s.used} transaction{s.used === 1 ? '' : 's'}{s.budgets ? ` and ${s.budgets} budget${s.budgets === 1 ? '' : 's'}` : ''}. Move or delete those first, then delete the category.</p></ConfirmDialog>
      : <ConfirmDialog title="Delete category?" confirmLabel="Delete category" onCancel={() => setDel(null)} onConfirm={async () => { const e = await deleteCategory(del.id); setDel(null); notify(e || 'Category deleted.') }}><p className="muted">{del.name} is not used by any transactions or budgets.</p><p>This action cannot be undone.</p></ConfirmDialog>)}
  </>)
}
