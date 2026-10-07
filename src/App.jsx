import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell.jsx'
import { ErrorState, LoadingState } from './components/ui.jsx'
import { useApp } from './context/AppContext.jsx'
import { Login, Signup, ForgotPassword, ResetPassword } from './pages/Auth.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Transactions from './pages/Transactions.jsx'
import TransactionForm from './pages/TransactionForm.jsx'
import TransactionDetail from './pages/TransactionDetail.jsx'
import Budgets from './pages/Budgets.jsx'
import BudgetForm from './pages/BudgetForm.jsx'
import Categories from './pages/Categories.jsx'
import CategoryForm from './pages/CategoryForm.jsx'
import Reports from './pages/Reports.jsx'
import Profile from './pages/Profile.jsx'
import Settings from './pages/Settings.jsx'
function Toast() { const { toast } = useApp(); return toast ? <div className="toast" role="status">{toast}</div> : null }
const Boot = () => <main className="auth"><LoadingState rows={3} label="Loading..." /></main>
export default function App() {
  const { authLoading } = useApp()
  if (authLoading) return <Boot />
  return (<><Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/login" element={<Login />} /><Route path="/signup" element={<Signup />} /><Route path="/forgot-password" element={<ForgotPassword />} /><Route path="/reset-password" element={<ResetPassword />} />
    <Route element={<AppShell />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/transactions" element={<Transactions />} /><Route path="/transactions/new" element={<TransactionForm />} /><Route path="/transactions/:id" element={<TransactionDetail />} /><Route path="/transactions/:id/edit" element={<TransactionForm />} />
      <Route path="/budgets" element={<Budgets />} /><Route path="/budgets/new" element={<BudgetForm />} /><Route path="/budgets/:id/edit" element={<BudgetForm />} />
      <Route path="/categories" element={<Categories />} /><Route path="/categories/new" element={<CategoryForm />} /><Route path="/categories/:id/edit" element={<CategoryForm />} />
      <Route path="/reports" element={<Reports />} /><Route path="/profile" element={<Profile />} /><Route path="/settings" element={<Settings />} />
      <Route path="*" element={<ErrorState title="Page not found" text="That page does not exist." />} />
    </Route></Routes><Toast /></>)
}
