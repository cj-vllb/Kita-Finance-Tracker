import { useEffect, useId, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, Search, X } from 'lucide-react'
import { PageHeader } from '../components/ui.jsx'
import { HELP, HELP_ITEMS, helpText, SUPPORT_EMAIL } from '../data/help.js'

// Help Center: static, client-side help. Search runs against the text in data/help.js; nothing is fetched and no user data is read.
// Each entry is an accordion row (a heading containing a button). A link such as /help#password opens and scrolls to that entry.
const byId = Object.fromEntries(HELP_ITEMS.map((it) => [it.id, it]))

function Entry({ it, open, onToggle }) {
  const uid = useId(), panel = `${uid}-panel`
  return (<li className={'help-item' + (open ? ' open' : '')} id={'h-' + it.id}>
    <h3><button type="button" id={'hb-' + it.id} className="help-q" aria-expanded={open} aria-controls={panel} onClick={onToggle}><span>{it.q}</span><ChevronDown size={18} aria-hidden="true" /></button></h3>
    <div id={panel} role="region" aria-labelledby={'hb-' + it.id} className="help-a"><div className="help-a-in"><div className="help-a-body">
      {it.p?.map((t) => <p key={t}>{t}</p>)}
      {it.steps && <ol>{it.steps.map((t) => <li key={t}>{t}</li>)}</ol>}
      {it.mail && <p><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>}
      {(it.links || it.see) && <p className="help-related small">
        {it.links?.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
        {it.see?.filter((id) => byId[id]).map((id) => <Link key={id} to={`/help#${id}`} className="help-see">{byId[id].q}</Link>)}</p>}
    </div></div></div></li>)
}

export default function Help() {
  const [q, setQ] = useState(''), [open, setOpen] = useState({}), loc = useLocation(), query = q.trim().toLowerCase()
  const groups = useMemo(() => {
    const terms = query.split(/\s+/).filter(Boolean)
    if (!terms.length) return HELP
    return HELP.map((g) => ({ ...g, items: g.items.filter((it) => { const hay = helpText({ ...it, groupTitle: g.title }); return terms.every((t) => hay.includes(t)) }) })).filter((g) => g.items.length)
  }, [query])
  const count = groups.reduce((n, g) => n + g.items.length, 0)
  // Deep links (/help#entry-id, used by the sidebar search and the "related" links): clear any search, open the entry, scroll and focus it.
  useEffect(() => {
    const id = decodeURIComponent(loc.hash.slice(1))
    if (!byId[id]) return
    setQ(''); setOpen((o) => ({ ...o, [id]: true }))
    const t = setTimeout(() => {
      const row = document.getElementById('h-' + id)
      row?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      document.getElementById('hb-' + id)?.focus({ preventScroll: true })
    }, 60)
    return () => clearTimeout(t)
  }, [loc.key, loc.hash])
  // While searching, matches start expanded; a row the person has toggled keeps their choice.
  const isOpen = (id) => open[id] ?? !!query
  const toggle = (id) => setOpen((o) => ({ ...o, [id]: !isOpen(id) }))
  return (<>
    <PageHeader title="Help Center" subtitle="Answers about using TrackMyKita, from adding your first transaction to managing your account." />
    <div className="help">
      <div className="search help-search"><Search size={16} aria-hidden="true" />
        <input className="input" type="search" placeholder="Search help topics" aria-label="Search help topics" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" spellCheck={false} />
        {q && <button type="button" className="help-clear" aria-label="Clear search" onClick={() => setQ('')}><X size={16} aria-hidden="true" /></button>}</div>
      {!query && <nav className="help-topics" aria-label="Help topics">{HELP.map((g) => <a key={g.id} href={`#topic-${g.id}`}>{g.title}</a>)}</nav>}
      <p className="sr-only" role="status" aria-live="polite">{query ? (count ? `${count} help topic${count === 1 ? '' : 's'} found.` : 'No help topics found.') : ''}</p>
      {count === 0 ? <div className="empty help-empty"><h2>No help topics found</h2><p className="muted">Nothing matches \u201c{q.trim()}\u201d. Try a different word, such as budget, category or password.</p>
        <button type="button" className="btn" onClick={() => setQ('')}>Clear search</button></div>
        : groups.map((g) => (<section key={g.id} id={`topic-${g.id}`} className="help-group" aria-labelledby={`hg-${g.id}`}>
          <h2 id={`hg-${g.id}`}>{g.title}</h2>
          <ul className="help-list">{g.items.map((it) => <Entry key={it.id} it={it} open={isOpen(it.id)} onToggle={() => toggle(it.id)} />)}</ul></section>))}
      <section className="card help-contact" aria-labelledby="help-contact"><h2 id="help-contact">Still need help?</h2>
        <p className="muted">If you cannot find an answer here, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Your version number and update log are on the <Link to="/settings/about">About page</Link>.</p></section>
    </div>
  </>)
}
