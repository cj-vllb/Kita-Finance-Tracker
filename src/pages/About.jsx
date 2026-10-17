import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronDown, ExternalLink, Mail, Copy } from 'lucide-react'
import { Logo } from '../components/Logo.jsx'
import { CreatorMark } from '../components/CreatorCredit.jsx'
import { PageHeader } from '../components/ui.jsx'
import { CONTACT_EMAIL } from '../data/site.js'
import { APP_VERSION } from '../version.js'
import { CHANGELOG } from '../data/changelog.js'
import { feedbackMailto, feedbackWebLink } from '../utils/feedback.js'
import { useApp } from '../context/AppContext.jsx'
export const PORTFOLIO_URL = 'https://www.workwithcj.digital'
const VISIBLE = 2 // only the two newest versions show by default
const Release = ({ r }) => <article className="release" aria-label={`Version ${r.version}`}><h3>{r.version}{r.version === APP_VERSION && <span className="tag">Current</span>}{r.date && <span className="release-date">{r.date}</span>}</h3><p className="muted small">{r.title}</p>
  <ul>{r.items.map((x) => <li key={x}>{x}</li>)}</ul></article>
// A previous release: a compact row (version + date) that opens its own description. Each row keeps its own open state.
function OldRelease({ r }) {
  const [open, setOpen] = useState(false), id = useId()
  return (<article className="release old" aria-label={`Version ${r.version}`}>
    <h3><button type="button" className="old-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}><ChevronDown size={16} aria-hidden="true" className={open ? 'flip' : ''} /><span className="old-ver">{r.version}</span>{r.date && <span className="release-date">{r.date}</span>}</button></h3>
    <div id={id} role="region" aria-label={`Version ${r.version} update details`} className={'old-panel' + (open ? ' open' : '')}><div><p className="muted small">{r.title}</p><ul>{r.items.map((x) => <li key={x}>{x}</li>)}</ul></div></div></article>)
}
// Feedback goes straight to the site's existing contact address from the person's own email app. Nothing is sent to or stored by TrackMyKita.
function Feedback() {
  const { notify } = useApp(), [shown, setShown] = useState(false)
  const copy = async () => { try { await navigator.clipboard.writeText(CONTACT_EMAIL); notify('Email address copied.') } catch { setShown(true) } }
  return (<section className="card" aria-labelledby="a-fb"><h2 id="a-fb">Feedback</h2>
    <p className="muted">Ideas, problems or kind words? We would love to hear from you.</p>
    <div className="form-actions feedback-actions"><a className="btn btn-primary" href={feedbackMailto(CONTACT_EMAIL, APP_VERSION)}><Mail size={16} aria-hidden="true" />Send feedback</a>
      <button type="button" className="btn" onClick={copy}><Copy size={16} aria-hidden="true" />Copy email</button></div>
    <p className="muted small fb-fallback">No email app opens? Write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>{shown && ' (copy it from here)'} or <a href={feedbackWebLink(CONTACT_EMAIL, APP_VERSION)} target="_blank" rel="noopener noreferrer">compose it in Gmail<span className="sr-only"> (opens in a new tab)</span></a>.</p></section>)
}
export default function About() {
  const [showOld, setShowOld] = useState(false)
  return (<>
    <Link to="/settings" className="back-link"><ChevronLeft size={16} aria-hidden="true" />Settings</Link>
    <PageHeader title="About" />
    <div className="about about-grid">
      <div className="about-col">
      <section className="card about-hero" aria-label="TrackMyKita"><Logo size={40} />
        <p>TrackMyKita is a personal finance tracker. Record income and expenses, set monthly budgets, organise categories and see where your money goes, all in one personal account.</p>
        <p className="muted small">TrackMyKita is a tracking and organizing tool. It does not provide financial, investment, tax or legal advice.</p>
        <dl className="dl about-meta"><dt>Version</dt><dd>{APP_VERSION}</dd><dt>Copyright</dt><dd>© 2026 CJ</dd></dl></section>
      <section className="card" aria-labelledby="a-log"><h2 id="a-log">Update log</h2>
        {CHANGELOG.slice(0, VISIBLE).map((r) => <Release key={r.version} r={r} />)}
        {CHANGELOG.length > VISIBLE && <>
          <button type="button" className="btn-link older-toggle" aria-expanded={showOld} aria-controls="older-updates" onClick={() => setShowOld((v) => !v)}><ChevronDown size={16} aria-hidden="true" className={showOld ? 'flip' : ''} />{showOld ? 'Hide previous updates' : 'View previous updates'}</button>
          {showOld && <div id="older-updates">{CHANGELOG.slice(VISIBLE).map((r) => <OldRelease key={r.version} r={r} />)}</div>}</>}
      </section>
      </div>
      <div className="about-col">
      <section className="card" aria-labelledby="a-by"><h2 id="a-by">Creator</h2>
        <div className="about-creator"><CreatorMark size={44} /><div><p><strong>Created by Christian Jan Villalba</strong></p><p className="muted">TrackMyKita was designed and developed by Christian Jan Villalba.</p></div></div>
        <p style={{ marginTop: 12 }}><a className="ext-link" href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">www.workwithcj.digital<ExternalLink size={14} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a></p>
        <p style={{ marginTop: 4 }}>Contact: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p></section>
      <Feedback />
      <section className="card" aria-labelledby="a-legal"><h2 id="a-legal">Legal</h2>
        <p className="legal-links"><Link to="/privacy">Privacy Policy</Link><Link to="/terms">Terms of Service</Link></p></section>
      </div>
    </div></>)
}
