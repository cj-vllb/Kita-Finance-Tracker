import { useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { ConfirmDialog, Field } from './ui.jsx'
import { validateCategoryName } from '../utils/categories.js'
import { DEFAULT_COLOR } from '../utils/colors.js'
// Create one category without leaving the form behind it. The type is fixed by the caller (the form's transaction type, or expense for budgets),
// so this can never create the wrong kind. Uses the same name rule and the same save as the Categories page. Color can be changed later by editing the category.
export default function CategoryDialog({ type, onCreated, onClose }) {
  const { categories, createCategory } = useApp(), [name, setName] = useState(''), [err, setErr] = useState(null), input = useRef(), saving = useRef(false)
  const submit = async () => {
    if (saving.current) return // no duplicate submissions while the first is still saving
    const invalid = validateCategoryName(name, categories); if (invalid) { setErr(invalid); input.current?.focus(); return }
    saving.current = true; const { error, category } = await createCategory({ name: name.trim(), type, color: DEFAULT_COLOR }); saving.current = false
    if (error) { setErr(error); input.current?.focus(); return }
    onCreated(category)
  }
  return (<ConfirmDialog title={`Add ${type} category`} confirmLabel="Add category" danger={false} focusRef={input} onCancel={onClose} onConfirm={submit}>
    <Field label="Category name" error={err} hint={type === 'income' ? 'Income categories are for money coming in, like salary.' : 'Expense categories are for money going out, like food or rent.'}>
      <input ref={input} className="input" value={name} onChange={(e) => { setName(e.target.value); setErr(null) }} aria-invalid={!!err} autoComplete="off" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }} /></Field></ConfirmDialog>)
}
