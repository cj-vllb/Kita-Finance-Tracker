import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell.jsx'
import BootScreen from './components/BootScreen.jsx'
import { ErrorState } from './components/ui.jsx'
import { useApp } from './context/AppContext.jsx'
import EmailConfirmed from './pages/EmailConfirmed.jsx'
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
import About from './pages/About.jsx'
function Toast() { const { toast } = useApp(); return <div className="toast-region" role="status" aria-live="polite">{toast && <div className="toast">{toast}</div>}</div> }
export default function App() {
  const { ready } = useApp()
  if (!ready) return <BootScreen /> // session restoration + first data load: no login/dashboard flashing
  return (<><Routes>
    <Route path="/" element={<Navigate to="/dashboard" replace />} />
    <Route path="/login" element={<Login />} /><Route path="/signup" element={<Signup />} /><Route path="/forgot-password" element={<ForgotPassword />} /><Route path="/reset-password" element={<ResetPassword />} /><Route path="/email-confirmed" element={<EmailConfirmed />} />
    <Route element={<AppShell />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/transactions" element={<Transactions />} /><Route path="/transactions/new" element={<TransactionForm />} /><Route path="/transactions/:id" element={<TransactionDetail />} /><Route path="/transactions/:id/edit" element={<TransactionForm />} />
      <Route path="/budgets" element={<Budgets />} /><Route path="/budgets/new" element={<BudgetForm />} /><Route path="/budgets/:id/edit" element={<BudgetForm />} />
      <Route path="/categories" element={<Categories />} /><Route path="/categories/new" element={<CategoryForm />} /><Route path="/categories/:id/edit" element={<CategoryForm />} />
      <Route path="/reports" element={<Reports />} /><Route path="/profile" element={<Profile />} /><Route path="/settings" element={<Settings />} /><Route path="/settings/about" element={<About />} />
      <Route path="*" element={<ErrorState title="Page not found" text="That page does not exist." />} />
    </Route></Routes><Toast /></>)
}
