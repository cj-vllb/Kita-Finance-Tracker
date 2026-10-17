import { Navigate, useParams } from 'react-router-dom'
// Budgets are now created and edited in a modal on the Budgets page. The old addresses still work: they open that page and the modal.
export default function BudgetForm() {
  const { id } = useParams()
  return <Navigate to={id ? `/budgets?edit=${encodeURIComponent(id)}` : '/budgets?new=1'} replace />
}
