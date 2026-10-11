import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ArrowRight, ChevronDown, ListChecks, Tags, PiggyBank, BarChart3, Download, Smartphone, SlidersHorizontal } from 'lucide-react'
import { Logo } from '../components/Logo.jsx'
import { useApp } from '../context/AppContext.jsx'
import { DashboardPreview, TransactionsPreview, BudgetsPreview, ReportsPreview, FlowPreview, MiniTx, SAMPLE_TX } from './previews.jsx'
import './landing.css'

// Content stays visible unless JS adds .lp-js; reveal is skipped entirely for reduced motion.
function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const root = ref.current; if (!root) return
    const els = [...root.querySelectorAll('[data-reveal]')]
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    root.classList.add('lp-js')
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target) } }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    els.forEach((el) => io.observe(el))
    const fallback = setTimeout(() => els.forEach((el) => el.classList.add('is-in')), 4000)
    return () => { io.disconnect(); clearTimeout(fallback); root.classList.remove('lp-js') }
  }, [])
  return ref
}
// kind: rise (small lift, text), zoom (larger lift and slight scale, product visuals), fade (opacity only, long lists)
const R = ({ as: T = 'div', kind = 'rise', delay = 0, className = '', children, ...p }) => <T data-reveal={kind} className={className} style={{ '--d': delay + 'ms' }} {...p}>{children}</T>

const FAQ = [
  ['What is TrackMyKita?', 'A personal finance tracker. You record your income and expenses, sort them into categories, set monthly budgets and read simple reports about where your money goes.'],
  ['Does it connect to my bank?', 'No. TrackMyKita does not connect to bank accounts. You enter your own transactions, so you decide what is recorded.'],
  ['What can I keep track of?', 'Transactions, categories, monthly budgets and reports, summarised on a dashboard that shows your current balance, income, expenses and net change.'],
  ['Can I use it on my phone?', 'Yes. It runs in your browser and is designed to work on phones, tablets and computers. There is also a light and a dark theme.'],
  ['Can I take my data with me?', 'You can export your transactions to a CSV file from Settings whenever you like.'],
  ['Where can I read about privacy?', 'The Privacy Policy and Terms of Service are linked at the bottom of this page.'],
]
const FEATURES = [
  { id: 'transactions', tint: 'lilac', icon: ListChecks, title: 'Every transaction in one place', text: 'Log income and expenses in seconds, give each a clear title and category, and find it again later in a tidy, dated list.', cta: 'Start tracking', Visual: TransactionsPreview },
  { id: 'budgets', tint: 'peach', icon: PiggyBank, title: 'Budgets that show where you stand', text: 'Set a monthly amount per category and watch the bar fill as you spend. You see what is left, and when a budget is going over.', cta: 'Plan a budget', Visual: BudgetsPreview, flip: true },
  { id: 'reports', tint: 'mint', icon: BarChart3, title: 'Reports that make patterns clear', text: 'Compare income and spending month by month to see whether you are staying below what you earn.', cta: 'See your reports', Visual: ReportsPreview },
]
const BENEFITS = [
  { icon: Tags, t: 'Categories your way', d: 'Create categories with your own names and colours, even while adding a transaction.' },
  { icon: SlidersHorizontal, t: 'Settings you control', d: 'Choose your currency and a light or dark theme.' },
  { icon: Download, t: 'Export when you need', d: 'Download your transactions as a CSV file from Settings.' },
  { icon: Smartphone, t: 'Made for phones too', d: 'Compact lists and a bottom tab bar keep it easy to use on a small screen.' },
]

export default function LandingPage() {
  const { loggedIn } = useApp()
  const ref = useReveal()
  const [faq, setFaq] = useState(0), [scrolled, setScrolled] = useState(false)
  useEffect(() => { const on = () => setScrolled(window.scrollY > 8); on(); window.addEventListener('scroll', on, { passive: true }); return () => window.removeEventListener('scroll', on) }, [])
  useEffect(() => { document.title = 'TrackMyKita: your money, clear and organised' }, [])
  const primary = loggedIn ? { to: '/dashboard', label: 'Go to Dashboard' } : { to: '/signup', label: 'Get Started' }
  return (
    <div className="landing-page" data-theme="dark" ref={ref}>
      <div className="lp-ambient" aria-hidden="true"><div className="lp-glow" /></div>
      <a className="lp-skip" href="#main">Skip to content</a>
      <header className={'lp-header' + (scrolled ? ' scrolled' : '')}><div className="lp-header-in">
        <Link to="/" className="lp-brand" aria-label="TrackMyKita home"><Logo size={28} /></Link>
        <div className="lp-actions">
          {!loggedIn && <Link className="lp-login" to="/login">Log In</Link>}
          <Link className="btn btn-primary lp-cta" to={primary.to}>{primary.label}<ArrowUpRight size={15} aria-hidden="true" /></Link></div></div>
      </header>

      <main id="main">
        <section className="lp-hero">
          <R as="h1" delay={60}>Take control of<br />your money</R>
          <R as="p" delay={120} className="lp-sub">Record every transaction, organise it by category, set monthly budgets and see where your money goes, all in one calm place.</R>
          <R delay={180} className="lp-hero-actions"><Link className="btn btn-primary btn-lg lp-cta" to={primary.to}>{loggedIn ? 'Go to Dashboard' : 'Get Started Free'}<ArrowUpRight size={16} aria-hidden="true" /></Link>{!loggedIn && <Link className="btn btn-lg" to="/login">Log In</Link>}</R>
          <R kind="zoom" delay={240} className="lp-hero-visual"><div className="lp-drift"><DashboardPreview /><div className="lp-float-a"><MiniTx t={SAMPLE_TX[1]} /></div><div className="lp-float-b"><MiniTx t={SAMPLE_TX[4]} /></div></div></R>
        </section>

        <section id="everyday" className="lp-band">
          <div className="lp-head"><R as="h2">Designed for your everyday life</R><R as="p" kind="fade" delay={80} className="lp-sub">Simple tools that help you spend thoughtfully and stay in control, without the clutter.</R></div>
          <div className="lp-benefits">
            <div className="lp-b-col">{BENEFITS.slice(0, 2).map(({ icon: I, t, d }, i) => <R key={t} delay={i * 80} className="lp-card"><I size={22} aria-hidden="true" /><h3>{t}</h3><p>{d}</p></R>)}</div>
            <R kind="zoom" delay={80} className="lp-b-visual"><FlowPreview /></R>
            <div className="lp-b-col">{BENEFITS.slice(2).map(({ icon: I, t, d }, i) => <R key={t} delay={i * 80 + 80} className="lp-card"><I size={22} aria-hidden="true" /><h3>{t}</h3><p>{d}</p></R>)}</div>
          </div>
        </section>

        <section id="features" className="lp-features">
          <div className="lp-head"><R as="h2">Powerful features for your finances</R><R as="p" kind="fade" delay={80} className="lp-sub">Everything you need to understand your income and spending, built into one tidy app.</R></div>
          {FEATURES.map(({ id, tint, icon: I, title, text, cta, Visual, flip }) => (
            <R key={id} as="article" kind="zoom" className={`lp-feature ${tint}${flip ? ' flip' : ''}`}>
              <div className="lp-f-text"><I size={24} aria-hidden="true" /><h3>{title}</h3><p>{text}</p><Link className="lp-outline" to={loggedIn ? '/dashboard' : '/signup'}>{loggedIn ? 'Open TrackMyKita' : cta}<ArrowUpRight size={15} aria-hidden="true" /></Link></div>
              <div className="lp-f-visual"><Visual /></div></R>))}
        </section>

        <section id="faq" className="lp-faq">
          <div className="lp-head"><R as="h2">Your questions answered</R><R as="p" kind="fade" delay={80} className="lp-sub">Quick answers about using TrackMyKita.</R></div>
          <R kind="fade" className="lp-faq-list">{FAQ.map(([q, a], i) => (
            <div key={q} className={'lp-qa' + (faq === i ? ' open' : '')}>
              <h3><button aria-expanded={faq === i} aria-controls={`qa-${i}`} id={`qb-${i}`} onClick={() => setFaq(faq === i ? -1 : i)}>{q}<ChevronDown size={18} aria-hidden="true" /></button></h3>
              <div id={`qa-${i}`} role="region" aria-labelledby={`qb-${i}`} className="lp-qa-body"><div><p>{a}</p></div></div></div>))}</R>
        </section>

        <section className="lp-final">
          <div className="lp-final-in">
            <R className="lp-final-text"><h2>Start building a clearer view of your money</h2><p>Create an account, add your first transaction and see your balance take shape.</p>
              <div className="lp-hero-actions"><Link className="btn lp-cta-light btn-lg" to={primary.to}>{loggedIn ? 'Go to Dashboard' : 'Get Started Free'}<ArrowRight size={16} aria-hidden="true" /></Link>{!loggedIn && <Link className="lp-ghost btn-lg" to="/login">Log In</Link>}</div></R>
            <R kind="zoom" delay={100} className="lp-final-visual"><DashboardPreview /></R>
          </div>
        </section>
      </main>

      <footer className="lp-footer"><div className="lp-footer-in">
        <div className="lp-foot-top"><Logo size={30} /><p>A simple personal finance tracker for your transactions, categories, budgets and reports.</p></div>
        <nav className="lp-foot-links" aria-label="Footer">
          <div><h4>Product</h4><a href="#features">Features</a><a href="#faq">FAQ</a></div>
          <div><h4>Account</h4>{loggedIn ? <Link to="/dashboard">Dashboard</Link> : <><Link to="/login">Log In</Link><Link to="/signup">Sign Up</Link></>}</div>
          <div><h4>Legal</h4><Link to="/privacy">Privacy Policy</Link><Link to="/terms">Terms of Service</Link></div></nav>
        <p className="lp-copy small">© {new Date().getFullYear()} TrackMyKita</p>
      </div></footer>
    </div>)
}
