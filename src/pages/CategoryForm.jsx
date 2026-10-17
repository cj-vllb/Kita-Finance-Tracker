import { Navigate, useParams, useSearchParams } from 'react-router-dom'
// Categories are now created and edited in a modal on the Categories page. These old addresses (bookmarks, search results) still work: they
// open that page, and the page opens the creation modal.
export default function CategoryForm() {
  const { id } = useParams(), [sp] = useSearchParams()
  return <Navigate to={id ? '/categories' : `/categories?new=${sp.get('type') === 'income' ? 'income' : 'expense'}`} replace />
}
