import { Link, Navigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { Logo } from '../components/Logo.jsx'
import { CheckBadge } from '../components/MailCheck.jsx'
import { confirmLink } from '../services/authService.js'
// Landing page for the confirmation link in the sign-up email. By the time this renders, the app has finished restoring
// the session (App waits for it), so a confirmed user is already signed in. This page never writes anything: it only reports.
const Shell = ({ children }) => <main className="auth status-screen"><div className="auth-brand"><Logo size={36} /></div>{children}</main>
export default function EmailConfirmed() {
  const { loggedIn } = useApp()
  if (confirmLink.error) return (<Shell><div className="status-copy"><h1>Link expired</h1><p className="muted">This confirmation link is invalid or has expired. Try signing in, or create your account again.</p></div>
    <Link className="btn btn-primary" style={{ justifyContent: 'center' }} to="/login">Go to sign in</Link></Shell>)
  if (loggedIn) return (<Shell><CheckBadge /><div className="status-copy"><h1>Email confirmed</h1><p className="muted">Your TrackMyKita account is now verified.</p></div>
    <Link className="btn btn-primary status-cta" style={{ justifyContent: 'center' }} to="/dashboard" replace>Continue to dashboard</Link></Shell>)
  // Link opened in a browser that could not start a session (e.g. a different device): the email is still confirmed.
  if (confirmLink.hasTokens) return (<Shell><CheckBadge /><div className="status-copy"><h1>Email confirmed</h1><p className="muted">Your TrackMyKita account is now verified. Sign in to continue.</p></div>
    <Link className="btn btn-primary status-cta" style={{ justifyContent: 'center' }} to="/login">Sign in</Link></Shell>)
  return <Navigate to="/login" replace /> // opened without a link: nothing to confirm, never loops
}
