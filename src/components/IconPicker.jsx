import { useId } from 'react'
import { ICON_GROUPS } from '../utils/icons.js'
import { CategoryIcon } from './ui.jsx'
// Grid of every selectable icon, grouped by subject. One shared picker for categories and budgets, so both store the same icon ids.
// Radio semantics: one selected icon, arrow keys move between icons, every icon has a text label (also shown as a tooltip).
export default function IconPicker({ value, onChange, label = 'Icon' }) {
  const name = useId()
  return (<div className="icon-picker" role="radiogroup" aria-label={label}>
    {ICON_GROUPS.map(({ group, icons }) => (<div key={group} className="ip-group">
      <div className="ip-title">{group}</div>
      <div className="ip-grid">{icons.map((i) => (<label key={i.id} className={'ip-item' + (value === i.id ? ' selected' : '')} title={i.label}>
        <input type="radio" name={name} value={i.id} checked={value === i.id} onChange={() => onChange(i.id)} aria-label={i.label} />
        <CategoryIcon id={i.id} size={22} /></label>))}</div></div>))}</div>)
}
