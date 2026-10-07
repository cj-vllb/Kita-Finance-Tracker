import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, Field, Segmented, ErrorState } from '../components/ui.jsx'
import { COLORS } from './Categories.jsx'
export default function CategoryForm() {
  const { id } = useParams(), nav = useNavigate(), { categories, transactions, budgets, saveCategory, notify } = useApp(), existing = id ? categories.find((c) => c.id === id) : null
  const [f, setF] = useState(() => existing || { name: '', type: 'expense', color: 'grey' }), [err, setErr] = useState({}), [saving, setSaving] = useState(false)
  if (id && !existing) return <ErrorState title="Category not found" text="It may have been deleted." />
  const inUse = existing && (transactions.some((t) => t.categoryId === id) || budgets.some((b) => b.categoryId === id))
  const submit = async (e) => {
    e.preventDefault(); const name = f.name.trim(), er = {}
    if (!name) er.name = 'Enter a category name.'; else if (name.length > 30) er.name = 'Use 30 characters or fewer.'
    else if (categories.some((c) => c.id !== existing?.id && c.name.toLowerCase() === name.toLowerCase())) er.name = 'A category with this name already exists.'
    setErr(er); if (er.name) return
    setSaving(true); const error = await saveCategory({ ...f, name, id: existing?.id || 'new' }); if (error) { setSaving(false); setErr({ form: error }); return } notify(existing ? 'Category updated successfully.' : 'Category created successfully.'); nav('/categories')
  }
  return (<>
    <PageHeader title={existing ? 'Edit category' : 'Create category'} subtitle="Group transactions in a way that suits you." />
    <form className="form" onSubmit={submit} noValidate>
      <Field label="Type" hint={inUse ? 'Type is locked because transactions or budgets use this category.' : undefined}><Segmented label="Type" disabled={inUse} value={f.type} onChange={(type) => setF({ ...f, type })} options={[['expense', 'Expense'], ['income', 'Income']]} /></Field>
      <Field label="Category name" error={err.name}><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} aria-invalid={!!err.name} autoFocus /></Field>
      <Field label="Color (optional)"><select className="input" value={f.color || 'grey'} onChange={(e) => setF({ ...f, color: e.target.value })}>{Object.entries(COLORS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}</select></Field>
      {err.form && <p className="field-error" role="alert">{err.form}</p>}
      <div className="form-actions"><button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : existing ? 'Save changes' : 'Save category'}</button><button type="button" className="btn" onClick={() => nav('/categories')}>Cancel</button></div></form></>)
}
