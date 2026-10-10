import { Link } from 'react-router-dom'
import { FileQuestion, RefreshCw } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Logo } from '../components/Logo.jsx'
// Shown for any URL that is not a TrackMyKita page. It is outside the signed-in layout on purpose: it shows no account data, and it works for visitors who are signed out.
// Refresh reloads the current URL. If the address is genuinely wrong, the page honestly stays a 404.
export default function NotFound() {
  const { loggedIn } = useApp()
  return (<main className="notfound"><Link to={loggedIn ? '/dashboard' : '/login'} className="auth-brand" aria-label="TrackMyKita home"><Logo size={32} /></Link>
    <div className="notfound-body"><span className="empty-icon notfound-icon" aria-hidden="true"><FileQuestion size={56} strokeWidth={1.5} /></span>
      <p className="label">Error 404</p><h1>Page not found</h1>
      <p className="muted">We couldn't find this page. Try refreshing or {loggedIn ? 'return to your dashboard' : 'go to sign in'}.</p>
      <div className="form-actions notfound-actions"><button type="button" className="btn" onClick={() => window.location.reload()}><RefreshCw size={16} aria-hidden="true" />Refresh</button>
        <Link className="btn btn-primary" to={loggedIn ? '/dashboard' : '/login'}>{loggedIn ? 'Back to dashboard' : 'Go to sign in'}</Link></div></div></main>)
}
