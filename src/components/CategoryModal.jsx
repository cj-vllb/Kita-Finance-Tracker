import { useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { Modal, Field, Segmented, ConfirmDialog, focusFirstInvalid } from './ui.jsx'
import IconPicker from './IconPicker.jsx'
import { validateCategoryName } from '../utils/categories.js'
import { CATEGORY_COLORS, normalizeColor, DEFAULT_COLOR } from '../utils/colors.js'
import { FALLBACK_ICON, isValidIconId } from '../utils/icons.js'
import { presetByKey } from '../data/presetCategories.js'
// One modal for creating a category and for editing / deleting an existing one. Icons come from the shared picker, so the same icon ids are
// used by categories, budgets, transaction rows and reports. `category` set = edit mode; otherwise create mode with `defaultType` preselected.
export default function CategoryModal({ category, defaultType = 'expense', lockType = false, onClose, onSaved }) {
  const { activeCategories, transactions, budgets, saveCategory, createCategory, deleteCategory, notify } = useApp()
  const edit = !!category, input = useRef()
  const [f, setF] = useState(() => ({ type: category?.type || defaultType, name: category?.name || '', icon: isValidIconId(category?.icon) ? category.icon : (presetByKey(category?.presetKey)?.icon || FALLBACK_ICON), color: category?.color || DEFAULT_COLOR }))
  const [err, setErr] = useState({}), [saving, setSaving] = useState(false), [confirm, setConfirm] = useState(false)
  const uses = edit ? { tx: transactions.filter((t) => t.categoryId === category.id).length, bud: budgets.filter((b) => b.categoryId === category.id).length } : { tx: 0, bud: 0 }
  const inUse = uses.tx > 0 || uses.bud > 0, typeLocked = lockType || inUse
  const submit = async (dismiss) => {
    if (saving) return
    const name = f.name.trim(), nameError = validateCategoryName(name, activeCategories.filter((c) => c.type === f.type), category?.id)
    if (nameError) { setErr({ name: nameError }); focusFirstInvalid(); return }
    if (!isValidIconId(f.icon)) { setErr({ icon: 'Choose an icon.' }); return }
    setSaving(true)
    const x = { name, type: f.type, color: f.color, icon: f.icon }
    let error, saved = null
    if (edit) error = await saveCategory({ ...x, id: category.id })
    else ({ error, category: saved } = await createCategory(x))
    if (error) { setSaving(false); setErr({ form: error }); return }
    notify(edit ? 'Category updated successfully.' : 'Category created successfully.'); onSaved?.(saved); dismiss()
  }
  const remove = async () => { const e = await deleteCategory(category.id); setConfirm(false); if (e) { setErr({ form: e }); return } notify('Category deleted.'); onClose() }
  const hint = typeLocked && edit && !lockType ? 'Type is locked because transactions or budgets use this category.' : f.type === 'income' ? 'Income categories are for money coming in, like salary.' : 'Expense categories are for money going out, like food or rent.'
  return (<>
    {!confirm && <Modal title={edit ? 'Edit category' : 'Create category'} onClose={onClose} initialFocus={input} wide labelledBy="cat-modal-title"
      footer={(dismiss) => (<>
        {edit && <button type="button" className="btn btn-danger modal-delete" onClick={() => setConfirm(true)} disabled={saving}>Delete</button>}
        <button type="button" className="btn" onClick={dismiss}>Cancel</button>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={() => submit(dismiss)}>{saving ? 'Saving...' : edit ? 'Save' : 'Create'}</button></>)}>
      <Field label="Category type" hint={hint}><Segmented label="Category type" disabled={typeLocked} value={f.type} onChange={(type) => setF({ ...f, type })} options={[['income', 'Income'], ['expense', 'Expense']]} /></Field>
      <Field label="Category name" error={err.name}><input ref={input} className="input" value={f.name} maxLength={60} onChange={(e) => { setF({ ...f, name: e.target.value }); setErr({}) }} aria-invalid={!!err.name} autoComplete="off" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.closest('.modal')?.querySelector('.dialog-actions .btn-primary')?.click() } }} /></Field>
      <fieldset className="color-field"><legend className="field-label">Color (optional)</legend>
        <div className="color-grid" role="radiogroup" aria-label="Category color">{CATEGORY_COLORS.map(([k, label, hex]) => <label className="color-opt" key={k}>
          <input type="radio" name="cat-color" className="sr-only" value={k} checked={normalizeColor(f.color) === k} onChange={() => setF({ ...f, color: k })} />
          <span className="color-box"><span className="swatch" style={{ background: hex }} aria-hidden="true" /><span>{label}</span></span></label>)}</div></fieldset>
      <div className="field"><span className="field-label">Icon</span><IconPicker value={f.icon} onChange={(icon) => { setF({ ...f, icon }); setErr({}) }} />{err.icon && <span className="field-error" role="alert">{err.icon}</span>}</div>
      {err.form && <p className="field-error" role="alert">{err.form}</p>}
    </Modal>}
    {confirm && (<ConfirmDialog title="Delete category?" confirmLabel="Delete category" onCancel={() => setConfirm(false)} onConfirm={remove}>
      {category.presetKey || inUse
        ? <><p>{category.name} will be removed from your category lists.</p><p className="muted">{inUse ? `Its ${uses.tx} transaction${uses.tx === 1 ? '' : 's'}${uses.bud ? ` and ${uses.bud} budget${uses.bud === 1 ? '' : 's'}` : ''} stay exactly as they are and keep showing this category.` : 'No transactions use it.'} No transaction is deleted or moved to another category.</p>{category.presetKey && <p className="muted small">This is a built-in category. You can bring it back later with Restore default categories.</p>}</>
        : <><p className="muted">{category.name} is not used by any transactions or budgets.</p><p>This action cannot be undone.</p></>}
    </ConfirmDialog>)}
  </>)
}
