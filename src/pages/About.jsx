import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronDown, ExternalLink } from 'lucide-react'
import { Logo } from '../components/Logo.jsx'
import { PageHeader } from '../components/ui.jsx'
import { APP_VERSION } from '../version.js'
import { CHANGELOG } from '../data/changelog.js'
export const PORTFOLIO_URL = 'http://www.workwithcj.digital'
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
        <p>TrackMyKita is a personal finance tracker. Record income and expenses, set monthly budgets, organise categories and see where your money goes, all in one private account.</p>
        <dl className="dl about-meta"><dt>Version</dt><dd>{APP_VERSION}</dd><dt>Copyright</dt><dd>© 2026 CJ</dd></dl></section>
      <section className="section" aria-labelledby="a-log"><h2 id="a-log">Update log</h2>
        {CHANGELOG.slice(0, VISIBLE).map((r) => <Release key={r.version} r={r} />)}
        {CHANGELOG.length > VISIBLE && <>
          <button type="button" className="btn-link older-toggle" aria-expanded={showOld} aria-controls="older-updates" onClick={() => setShowOld((v) => !v)}><ChevronDown size={16} aria-hidden="true" className={showOld ? 'flip' : ''} />{showOld ? 'Hide previous updates' : 'View previous updates'}</button>
          {showOld && <div id="older-updates">{CHANGELOG.slice(VISIBLE).map((r) => <Release key={r.version} r={r} />)}</div>}</>}
      </section>
      <section className="section" aria-labelledby="a-by"><h2 id="a-by">Creator</h2>
        <p><strong>Created by CJ</strong></p><p className="muted">TrackMyKita was designed and developed by CJ.</p>
        <p style={{ marginTop: 12 }}><a className="ext-link" href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">www.workwithcj.digital<ExternalLink size={14} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a></p></section>
    </div></>)
}
