import CategoryModal from './CategoryModal.jsx'
// "+ Add category" inside the transaction form: the same creation modal as the Categories page, with the type fixed by the form
// (so a category of the wrong kind can never be made). The new category is handed back so the form can select it straight away.
export default function CategoryDialog({ type, onCreated, onClose }) {
  return <CategoryModal defaultType={type} lockType onClose={onClose} onSaved={(category) => category && onCreated(category)} />
}
