import { Link } from 'react-router-dom'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { Logo } from '../components/Logo.jsx'
import { PageHeader } from '../components/ui.jsx'
import { APP_VERSION } from '../version.js'
import { CHANGELOG } from '../data/changelog.js'
export const PORTFOLIO_URL = 'http://www.workwithcj.digital'
export default function About() {
  return (<>
    <Link to="/settings" className="back-link"><ChevronLeft size={16} aria-hidden="true" />Settings</Link>
    <PageHeader title="About" />
    <div className="about">
      <section className="about-hero" aria-label="TrackMyKita"><Logo size={40} />
        <p>TrackMyKita is a personal finance tracker. Record income and expenses, set monthly budgets, organise categories and see where your money goes, all in one private account.</p>
        <dl className="dl about-meta"><dt>Version</dt><dd>{APP_VERSION}</dd><dt>Copyright</dt><dd>© 2026 CJ</dd></dl></section>
      <section className="section" aria-labelledby="a-log"><h2 id="a-log">Update log</h2>
        {CHANGELOG.map((r) => <article className="release" key={r.version} aria-label={`Version ${r.version}`}><h3>Version {r.version}{r.version === APP_VERSION && <span className="tag">Current</span>}</h3><p className="muted small">{r.title}</p>
          <ul>{r.items.map((x) => <li key={x}>{x}</li>)}</ul></article>)}</section>
      <section className="section" aria-labelledby="a-by"><h2 id="a-by">Creator</h2>
        <p><strong>Created by CJ</strong></p><p className="muted">TrackMyKita was designed and developed by CJ.</p>
        <p style={{ marginTop: 12 }}><a className="ext-link" href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">www.workwithcj.digital<ExternalLink size={14} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a></p></section>
    </div></>)
}
