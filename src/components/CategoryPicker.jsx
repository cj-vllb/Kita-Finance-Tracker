import { useId } from 'react'
import { Plus, Ban } from 'lucide-react'
import { CategoryIcon } from './ui.jsx'
import { categoryIconId } from '../utils/categories.js'
// Category choice for a transaction: the same icon tiles as the Categories page, in a grid, instead of a drop-down list.
// A real radio group (arrow keys move between options, one is selected, every tile has its name as text), so it needs no extra keyboard code.
// `type` decides which categories are offered (income or expense); a deleted category is only listed while it is the one already chosen, so an old
// transaction keeps showing it. "None" keeps a category optional. Choosing never creates or changes a category; "Add category" opens the usual dialog.
export default function CategoryPicker({ type, categories, value, onChange, onAdd, labelledBy }) {
  const group = useId(), tone = type === 'income' ? 'in' : 'out'
  const list = categories.filter((c) => c.type === type && (!c.archived || c.id === value))
  const Tile = ({ id, name, icon, extra }) => (<li><label className={'catg-tile catpick-opt' + (value === id ? ' selected' : '')} title={name}>
    <input type="radio" name={group} className="sr-only" checked={value === id} onChange={() => onChange(id)} aria-label={name} />
    <span className={'catg-icon ' + (extra || tone)}>{icon}</span><span className="catg-name">{name}</span></label></li>)
  return (<ul className="catg catpick" role="radiogroup" aria-labelledby={labelledBy}>
    <Tile id="" name="None" icon={<Ban size={24} aria-hidden="true" />} extra="none" />
    {list.map((c) => <Tile key={c.id} id={c.id} name={c.archived ? `${c.name} (deleted)` : c.name} icon={<CategoryIcon id={categoryIconId(c)} size={24} />} />)}
    <li><button type="button" className="catg-tile catg-add" onClick={onAdd} aria-label={`Add ${type} category`}><span className="catg-icon"><Plus size={24} aria-hidden="true" /></span><span className="catg-name">Add Category</span></button></li>
  </ul>)
}
