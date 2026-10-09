import { Link } from 'react-router-dom'
import { Logo } from './Logo.jsx'
// Public layout for the Privacy Policy and Terms: reachable when signed out (e.g. from the sign-up form) and when signed in.
export const Ext = ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}<span className="sr-only"> (opens in a new tab)</span></a>
export default function LegalLayout({ title, updated, children }) {
  return (<div className="legal-shell">
    <header className="legal-head"><Link to="/" className="legal-brand" aria-label="TrackMyKita home"><Logo size={26} /></Link></header>
    <main className="legal"><h1>{title}</h1><p className="muted">Last updated: {updated}</p>{children}
      <nav className="legal-foot" aria-label="Legal and navigation"><Link to="/privacy">Privacy Policy</Link><Link to="/terms">Terms of Service</Link><Link to="/">Back to TrackMyKita</Link></nav></main></div>)
}
