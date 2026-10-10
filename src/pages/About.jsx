import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronDown, ExternalLink } from 'lucide-react'
import { Logo } from '../components/Logo.jsx'
import { PageHeader } from '../components/ui.jsx'
import { CONTACT_EMAIL } from '../data/site.js'
import { APP_VERSION } from '../version.js'
import { CHANGELOG } from '../data/changelog.js'
export const PORTFOLIO_URL = 'https://www.workwithcj.digital'
const VISIBLE = 2 // only the two newest versions show by default
const Release = ({ r }) => <article className="release" aria-label={`Version ${r.version}`}><h3>{r.version}{r.version === APP_VERSION && <span className="tag">Current</span>}<span className="release-date">{r.date}</span></h3><p className="muted small">{r.title}</p>
  <ul>{r.items.map((x) => <li key={x}>{x}</li>)}</ul></article>
export default function About() {
  const [showOld, setShowOld] = useState(false)
  return (<>
    <Link to="/settings" className="back-link"><ChevronLeft size={16} aria-hidden="true" />Settings</Link>
    <PageHeader title="About" />
    <div className="about">
      <section className="about-hero" aria-label="TrackMyKita"><Logo size={40} />
        <p>TrackMyKita is a personal finance tracker. Record income and expenses, set monthly budgets, organise categories and see where your money goes, all in one personal account.</p>
        <p className="muted small">TrackMyKita is a tracking and organizing tool. It does not provide financial, investment, tax or legal advice.</p>
        <dl className="dl about-meta"><dt>Version</dt><dd>{APP_VERSION}</dd><dt>Copyright</dt><dd>© 2026 CJ</dd></dl></section>
      <section className="section" aria-labelledby="a-log"><h2 id="a-log">Update log</h2>
        {CHANGELOG.slice(0, VISIBLE).map((r) => <Release key={r.version} r={r} />)}
        {CHANGELOG.length > VISIBLE && <>
          <button type="button" className="btn-link older-toggle" aria-expanded={showOld} aria-controls="older-updates" onClick={() => setShowOld((v) => !v)}><ChevronDown size={16} aria-hidden="true" className={showOld ? 'flip' : ''} />{showOld ? 'Hide previous updates' : 'View previous updates'}</button>
          {showOld && <div id="older-updates">{CHANGELOG.slice(VISIBLE).map((r) => <Release key={r.version} r={r} />)}</div>}</>}
      </section>
      <section className="section" aria-labelledby="a-by"><h2 id="a-by">Creator</h2>
        <p><strong>Created by Christian Jan Villalba</strong></p><p className="muted">TrackMyKita was designed and developed by Christian Jan Villalba.</p>
        <p style={{ marginTop: 12 }}><a className="ext-link" href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">www.workwithcj.digital<ExternalLink size={14} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a></p>
        <p style={{ marginTop: 4 }}>Contact: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p></section>
      <section className="section" aria-labelledby="a-legal"><h2 id="a-legal">Legal</h2>
        <p className="legal-links"><Link to="/privacy">Privacy Policy</Link><Link to="/terms">Terms of Service</Link></p></section>
    </div></>)
}
