import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Trash2, Plus, Tags, Wallet, Receipt } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, EmptyState, ConfirmDialog, RowMenu } from '../components/ui.jsx'
import { colorHex, colorName } from '../utils/colors.js'
const GROUPS = [
  { type: 'income', title: 'Income categories', hint: 'Money coming in', icon: Wallet, empty: 'Create an income category, such as Salary, to organize what you earn.', add: 'Add income category' },
  { type: 'expense', title: 'Expense categories', hint: 'Money going out', icon: Receipt, empty: 'Create an expense category, such as Food, to organize what you spend.', add: 'Add expense category' },
]
export default function Categories() {
  const { categories, transactions, budgets, deleteCategory, notify } = useApp(), [del, setDel] = useState(null)
  // Only what the delete check needs: a category that transactions or budgets use cannot be deleted.
  const stats = (cat) => ({ used: transactions.filter((t) => t.categoryId === cat.id).length, budgets: budgets.filter((b) => b.categoryId === cat.id).length })
  const s = del && stats(del), blocked = s && (s.used > 0 || s.budgets > 0)
  // The database only allows 'income' or 'expense', but an unexpected value must never hide a category: it is listed under "Other".
  const other = categories.filter((c) => c.type !== 'income' && c.type !== 'expense')
  // A plain render function (not a nested component) so rows are not remounted on every render; the row menu keeps its state and focus.
  // Wide screens keep the direct Edit / Delete links; phones get one overflow menu per row (the action menu is built from this row's category only).
  const table = (rows, group) => (<div className="table-wrap"><table className="table stack cat-table"><caption className="sr-only">{group.title}</caption>
    <thead><tr><th className="label">Category</th><th className="label">Actions</th></tr></thead>
    <tbody>{rows.map((cat) => <tr className="row" key={cat.id}>
      <td className="cell-title"><span className="dot" style={{ background: colorHex(cat.color) }} title={colorName(cat.color)} aria-hidden="true" />{cat.name}</td>
      <td className="cell-actions"><div className="act-links desk-only"><Link to={`/categories/${cat.id}/edit`} aria-label={`Edit ${cat.name}`}>Edit</Link><button className="btn-link danger" aria-label={`Delete ${cat.name}`} onClick={() => setDel(cat)}>Delete</button></div>
        <div className="row-menu-wrap"><RowMenu label={`Category options for ${cat.name}`} items={[{ label: 'Edit category', icon: Pencil, to: `/categories/${cat.id}/edit` }, { label: 'Delete category', icon: Trash2, danger: true, onSelect: () => setDel(cat) }]} /></div></td></tr>)}</tbody></table></div>)
  return (<>
    <PageHeader title="Categories" subtitle="Group your income and expenses"><Link className="btn btn-primary" to="/categories/new">Create category</Link></PageHeader>
    {categories.length === 0 ? <EmptyState icon={Tags} title="No categories found" text="Create a category to start organizing your transactions." to="/categories/new" action="Create category" /> : <>
      {GROUPS.map((g) => { const rows = categories.filter((c) => c.type === g.type); return (<section className="cat-group" key={g.type} aria-labelledby={`cg-${g.type}`}>
        <div className="cat-head"><div><h2 id={`cg-${g.type}`}>{g.title}</h2><p className="muted small">{g.hint} · {rows.length} categor{rows.length === 1 ? 'y' : 'ies'}</p></div></div>
        {rows.length === 0 ? <EmptyState compact icon={g.icon} title={`No ${g.type} categories yet`} text={g.empty} to={`/categories/new?type=${g.type}`} action={g.add} />
          : <>{table(rows, g)}<Link className="add-link" to={`/categories/new?type=${g.type}`}><Plus size={16} aria-hidden="true" />{g.add}</Link></>}</section>) })}
      {other.length > 0 && <section className="cat-group" aria-labelledby="cg-other"><div className="cat-head"><div><h2 id="cg-other">Other categories</h2><p className="muted small">These need a type. Edit each one to choose Income or Expense.</p></div></div>
        {table(other, { title: 'Other categories' })}</section>}</>}
    {del && (blocked ? <ConfirmDialog infoOnly title="This category is in use" onCancel={() => setDel(null)}><p>{del.name} is used by {s.used} transaction{s.used === 1 ? '' : 's'}{s.budgets ? ` and ${s.budgets} budget${s.budgets === 1 ? '' : 's'}` : ''}. Move or delete those first, then delete the category.</p></ConfirmDialog>
      : <ConfirmDialog title="Delete category?" confirmLabel="Delete category" onCancel={() => setDel(null)} onConfirm={async () => { const e = await deleteCategory(del.id); setDel(null); notify(e || 'Category deleted.') }}><p className="muted">{del.name} is not used by any transactions or budgets.</p><p>This action cannot be undone.</p></ConfirmDialog>)}
  </>)
}
