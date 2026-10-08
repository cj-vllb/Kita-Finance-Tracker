import { useEffect, useState } from 'react'
import { Logo } from './Logo.jsx'
// Shown while the real startup work happens: restoring the Supabase session and, for signed-in users,
// loading their first set of data. It is removed the moment that work finishes (no artificial delay).
export default function BootScreen() {
  const [slow, setSlow] = useState(false)
  useEffect(() => { const t = setTimeout(() => setSlow(true), 8000); return () => clearTimeout(t) }, [])
  return (<main className="boot" role="status" aria-live="polite">
    <Logo size={72} stacked animated />
    <div className="boot-bar" aria-hidden="true"><span /></div>
    <p className="boot-note muted small">{slow ? 'Still connecting. Check your connection.' : <span className="sr-only">Loading TrackMyKita</span>}</p></main>)
}
