import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Tags, RotateCcw } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, EmptyState, Segmented, CategoryIcon } from '../components/ui.jsx'
import CategoryModal from '../components/CategoryModal.jsx'
import { colorHex } from '../utils/colors.js'
import { PRESETS } from '../data/presetCategories.js'
import { isValidIconId } from '../utils/icons.js'
// Icon grid, four per row. Presets come first (in their original order), then the user's own categories, oldest to newest, so a newly created
// category lands at the end. The Add Category tile is always the last tile. Nothing is capped: the grid just keeps growing.
export default function Categories() {
  const { activeCategories, categories, restoreDefaultCategories, dataToolsReady, notify } = useApp(), [sp, setSp] = useSearchParams()
  const [type, setType] = useState(sp.get('new') === 'income' || sp.get('type') === 'income' ? 'income' : 'expense')
  const [modal, setModal] = useState(() => (sp.has('new') ? { mode: 'create' } : null)) // /categories?new=income comes from the old Create category links
  useEffect(() => { if (sp.has('new') || sp.has('type')) setSp({}, { replace: true }) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const rows = activeCategories.filter((c) => c.type === type)
  const missing = PRESETS.filter((p) => p.type === type && !categories.some((c) => c.presetKey === p.key && !c.archived)).length
  // A category that predates icons (or has an unknown icon id) shows its preset's icon when it is one, else the generic tag icon.
  const iconOf = (c) => (isValidIconId(c.icon) ? c.icon : PRESETS.find((p) => p.key === c.presetKey)?.icon)
  const restore = async () => { const e = await restoreDefaultCategories(); notify(e || 'Default categories restored.') }
  return (<>
    <PageHeader title="Categories"><button type="button" className="btn btn-primary" onClick={() => setModal({ mode: 'create' })}>Create category</button></PageHeader>
    <div className="cat-type-seg"><Segmented label="Category type" value={type} onChange={setType} options={[['income', 'Income'], ['expense', 'Expense']]} /></div>
    {activeCategories.length === 0 && !dataToolsReady
      ? <EmptyState icon={Tags} title="No categories found" text="Create a category to start organizing your transactions." />
      : <ul className="catg" aria-label={type === 'income' ? 'Income categories' : 'Expense categories'}>
        {rows.map((c) => (<li key={c.id}><button type="button" className="catg-tile" title={c.name} onClick={() => setModal({ mode: 'edit', category: c })} aria-label={`${c.name}. Edit category`}>
          <span className="catg-icon" style={{ '--cat': colorHex(c.color) }}><CategoryIcon id={iconOf(c)} size={26} /></span><span className="catg-name">{c.name}</span></button></li>))}
        <li><button type="button" className="catg-tile catg-add" onClick={() => setModal({ mode: 'create' })} aria-label={`Add ${type} category`}>
          <span className="catg-icon"><Plus size={26} aria-hidden="true" /></span><span className="catg-name">Add Category</span></button></li></ul>}
    {dataToolsReady && missing > 0 && <p className="muted small catg-restore">{missing} built-in {type} categor{missing === 1 ? 'y was' : 'ies were'} deleted. <button type="button" className="btn-link" onClick={restore}><RotateCcw size={14} aria-hidden="true" /> Restore default categories</button></p>}
    {modal && <CategoryModal category={modal.category} defaultType={type} onClose={() => setModal(null)} />}
  </>)
}
