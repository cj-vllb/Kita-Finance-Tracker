import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { money, monthLabel } from '../utils/format.js'
import { inMonth } from '../utils/calc.js'
import { CURRENT_MONTH } from '../utils/dates.js'
import { PageHeader, EmptyState, ConfirmDialog } from '../components/ui.jsx'
export const COLORS = { green: ['Green', '#24543F'], amber: ['Amber', '#A8741A'], brick: ['Brick', '#A23B2F'], slate: ['Slate', '#4A5A66'], grey: ['Grey', '#6B706C'] }
export default function Categories() {
  const { categories, transactions, budgets, deleteCategory, notify } = useApp(), [del, setDel] = useState(null)
  const month = inMonth(transactions, CURRENT_MONTH)
  const stats = (cat) => ({ count: month.filter((t) => t.categoryId === cat.id).length, used: transactions.filter((t) => t.categoryId === cat.id).length, budgets: budgets.filter((b) => b.categoryId === cat.id).length,
    total: month.filter((t) => t.categoryId === cat.id).reduce((s, t) => s + t.amount, 0) })
  const s = del && stats(del), blocked = s && (s.used > 0 || s.budgets > 0)
  return (<>
    <PageHeader title="Categories" subtitle={`Counts and totals for ${monthLabel(CURRENT_MONTH)}`}><Link className="btn btn-primary" to="/categories/new">Create category</Link></PageHeader>
    {categories.length === 0 ? <EmptyState title="No categories found" text="Create a category to start organizing your transactions." to="/categories/new" action="Create category" /> :
      <table className="table"><thead><tr><th className="label">Category</th><th className="label hide-m">Type</th><th className="label amount">Transactions</th><th className="label amount">This month</th><th className="label">Actions</th></tr></thead>
        <tbody>{categories.map((cat) => { const st = stats(cat); return <tr className="row" key={cat.id}>
          <td><span className="dot" style={{ background: COLORS[cat.color || 'grey'][1] }} />{cat.name}</td><td className="hide-m">{cat.type === 'income' ? 'Income' : 'Expense'}</td>
          <td className="amount">{st.count ? <Link to={`/transactions?category=${cat.id}`}>{st.count}</Link> : 0}</td><td className={`amount ${cat.type === 'income' ? 'pos' : 'neg'}`}>{cat.type === 'income' ? '+' : '−'}{money(st.total)}</td>
          <td><div className="form-actions" style={{ gap: 12 }}><Link to={`/categories/${cat.id}/edit`}>Edit</Link><button className="btn-link danger" onClick={() => setDel(cat)}>Delete</button></div></td></tr> })}</tbody></table>}
    {del && (blocked ? <ConfirmDialog infoOnly title="This category is in use" onCancel={() => setDel(null)}><p>{del.name} is used by {s.used} transaction{s.used === 1 ? '' : 's'}{s.budgets ? ` and ${s.budgets} budget${s.budgets === 1 ? '' : 's'}` : ''}. Move or delete those first, then delete the category.</p></ConfirmDialog>
      : <ConfirmDialog title="Delete category?" confirmLabel="Delete category" onCancel={() => setDel(null)} onConfirm={async () => { const e = await deleteCategory(del.id); setDel(null); notify(e || 'Category deleted.') }}><p className="muted">{del.name} is not used by any transactions or budgets.</p><p>This action cannot be undone.</p></ConfirmDialog>)}
  </>)
}
