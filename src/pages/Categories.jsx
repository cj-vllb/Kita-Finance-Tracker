import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Tags, RotateCcw } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, EmptyState, Segmented, CategoryIcon } from '../components/ui.jsx'
import CategoryModal from '../components/CategoryModal.jsx'
import { useMedia } from '../components/SidebarSearch.jsx'
import { PRESETS } from '../data/presetCategories.js'
import { categoryIconId } from '../utils/categories.js'
// Icon grid, four per row. On a desktop screen the Income and Expense groups sit side by side; on tablets and phones the Income/Expense switch shows one group at a time
// (the same categories either way: only the layout changes, nothing is duplicated).
// Icon grid, four per row. Presets come first (in their original order), then the user's own categories, oldest to newest, so a newly created
// category lands at the end. The Add Category tile is always the last tile. Nothing is capped: the grid just keeps growing.
export default function Categories() {
  const { activeCategories, categories, restoreDefaultCategories, dataToolsReady, notify } = useApp(), [sp, setSp] = useSearchParams()
  const sideBySide = useMedia('(min-width:1101px)') // the app's existing desktop breakpoint (see AppShell)
  const [type, setType] = useState(sp.get('new') === 'income' || sp.get('type') === 'income' ? 'income' : 'expense')
  const [modal, setModal] = useState(() => (sp.has('new') ? { mode: 'create' } : null)) // /categories?new=income comes from the old Create category links
  useEffect(() => { if (sp.has('new') || sp.has('type')) setSp({}, { replace: true }) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // A category that predates icons (or has an unknown icon id) shows its preset's icon when it is one, else the generic tag icon.
  const iconOf = categoryIconId
  const restore = async () => { const e = await restoreDefaultCategories(); notify(e || 'Default categories restored.') }
  // Icon and tile colors come from the category TYPE only (income green, expense red). The stored `color` column is ignored.
  const group = (t) => {
    const rows = activeCategories.filter((c) => c.type === t), tone = t === 'income' ? 'in' : 'out', title = t === 'income' ? 'Income' : 'Expense'
    const missing = PRESETS.filter((p) => p.type === t && !categories.some((c) => c.presetKey === p.key && !c.archived)).length
    return (<section className={'catg-group' + (sideBySide ? ' is-col' : '')} key={t} aria-labelledby={'catg-h-' + t}>
      {sideBySide && <h2 className="catg-heading" id={'catg-h-' + t}>{title} categories</h2>}
      <ul className="catg" aria-label={`${title} categories`}>
        {rows.map((c) => (<li key={c.id}><button type="button" className="catg-tile" title={c.name} onClick={() => setModal({ mode: 'edit', category: c })} aria-label={`${c.name}. Edit category`}>
          <span className={'catg-icon ' + tone}><CategoryIcon id={iconOf(c)} size={26} /></span><span className="catg-name">{c.name}</span></button></li>))}
        <li><button type="button" className="catg-tile catg-add" onClick={() => setModal({ mode: 'create', type: t })} aria-label={`Add ${t} category`}>
          <span className="catg-icon"><Plus size={26} aria-hidden="true" /></span><span className="catg-name">Add</span></button></li></ul>
      {dataToolsReady && missing > 0 && <p className="muted small catg-restore">{missing} built-in {t} categor{missing === 1 ? 'y was' : 'ies were'} deleted. <button type="button" className="btn-link" onClick={restore}><RotateCcw size={14} aria-hidden="true" /> Restore default categories</button></p>}
    </section>)
  }
  return (<>
    <PageHeader title="Categories"><button type="button" className="btn btn-primary hide-compact" onClick={() => setModal({ mode: 'create', type: sideBySide ? undefined : type })} aria-label="Add category">Add</button></PageHeader>
    {!sideBySide && <div className="cat-type-seg"><Segmented label="Category type" value={type} onChange={setType} options={[['income', 'Income'], ['expense', 'Expense']]} /></div>}
    {activeCategories.length === 0 && !dataToolsReady
      ? <EmptyState icon={Tags} title="No categories found" text="Add a category to get started." />
      : <div className={sideBySide ? 'catg-cols' : undefined}>{(sideBySide ? ['income', 'expense'] : [type]).map(group)}</div>}
    {modal && <CategoryModal category={modal.category} defaultType={modal.type || type} onClose={() => setModal(null)} />}
  </>)
}
