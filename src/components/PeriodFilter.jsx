import { useCallback, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Popover, CalendarPanel, MonthPanel, YearPanel } from './Pickers.jsx'
import { periodFor, stepPeriod, periodLabel, formatDayLong, weekLabel, monthTitle } from '../utils/dateRange.js'

// Reports period filter for phones and tablets: ONE row. The period type (Day, Week, Month, Year, All Time) is a compact drop-down, and beside it the
// chosen date as a button ("October 2026") that opens the matching picker: a calendar for a day or a week, a month grid, or a year list. All Time shows
// no date button. It builds the very same `period` objects as the desktop <DateFilter>, so every Reports calculation is untouched.
const NAMES = { day: 'Day', week: 'Week', month: 'Month', year: 'Year', all: 'All Time' }
// Short text for the button; the full label is still read out by screen readers.
const shortLabel = (p) => p.kind === 'day' ? formatDayLong(p.day) : p.kind === 'week' ? weekLabel(p.day) : p.kind === 'month' ? monthTitle(p.month) : p.year
export default function PeriodFilter({ period, onChange, today, firstYear, kinds }) {
  const [open, setOpen] = useState(false), btn = useRef(), kind = period.kind
  const close = useCallback((refocus) => { setOpen(false); if (refocus === true) btn.current?.focus({ preventScroll: true }) }, [])
  const pick = (p) => { onChange(p); close(true) }
  const stepName = NAMES[kind].toLowerCase()
  return (<div className="pf" role="group" aria-label="Report period">
    <select className="input pf-kind" aria-label="Period type" value={kind} onChange={(e) => { setOpen(false); const k = e.target.value; if (k !== kind) onChange(periodFor(k, today)) }}>{kinds.map((k) => <option key={k} value={k}>{NAMES[k]}</option>)}</select>
    {kind !== 'all' && (<div className="pf-pick">
      <button type="button" className="icon-btn pf-step" aria-label={`Previous ${stepName}`} onClick={() => onChange(stepPeriod(period, -1))}><ChevronLeft size={18} aria-hidden="true" /></button>
      <button ref={btn} type="button" className="input pf-date" aria-haspopup="dialog" aria-expanded={open} aria-label={`${periodLabel(period)}. Change ${stepName}`} onClick={() => setOpen((o) => !o)}><span className="pf-text">{shortLabel(period)}</span><ChevronDown size={16} aria-hidden="true" className="pk-chev" /></button>
      <button type="button" className="icon-btn pf-step" aria-label={`Next ${stepName}`} onClick={() => onChange(stepPeriod(period, 1))}><ChevronRight size={18} aria-hidden="true" /></button></div>)}
    {open && kind !== 'all' && <Popover anchor={btn} onClose={close} label={`Choose a ${stepName}`}>
      {(kind === 'day' || kind === 'week') && <CalendarPanel value={period.day} week={kind === 'week'} today={today} onPick={(day) => pick({ kind, day })} />}
      {kind === 'month' && <MonthPanel value={period.month} today={today} onPick={(month) => pick({ kind, month })} />}
      {kind === 'year' && <YearPanel value={period.year} firstYear={firstYear} today={today} onPick={(year) => pick({ kind, year })} />}</Popover>}
  </div>)
}

// Period control for a half-width filter column (Transactions > Filters on phones and tablets). It is ONE fixed-size button showing the chosen period
// ("All dates", "November 2026", ...). Tapping it opens a popover with the period types as chips and the matching picker underneath, so choosing a
// period type or a date never adds, removes or moves anything in the filter sheet.
export function PeriodButton({ label = 'Period', period, onChange, today, firstYear, kinds, allLabel = 'All dates' }) {
  const [open, setOpen] = useState(false), btn = useRef(), kind = period.kind
  const close = useCallback((refocus) => { setOpen(false); if (refocus === true) btn.current?.focus({ preventScroll: true }) }, [])
  const text = kind === 'all' ? allLabel : shortLabel(period)
  return (<label className="fsel pf-btn"><span className="flabel">{label}</span>
    <button ref={btn} type="button" className="input pf-date" aria-haspopup="dialog" aria-expanded={open} aria-label={`${label}: ${kind === 'all' ? allLabel : periodLabel(period)}`} onClick={(e) => { e.preventDefault(); setOpen((o) => !o) }}>
      <span className="pf-text">{text}</span><ChevronDown size={16} aria-hidden="true" className="pk-chev" /></button>
    {open && <Popover anchor={btn} onClose={close} label="Choose a period">
      <div className="pf-chips" onClick={(e) => e.stopPropagation()} role="group" aria-label="Period type">{kinds.map((k) => <button key={k} type="button" className={'pf-chip' + (k === kind ? ' sel' : '')} aria-pressed={k === kind} data-autofocus={k === kind ? '' : undefined}
        onClick={() => { if (k === 'all') { onChange(periodFor('all', today)); close(true) } else if (k !== kind) onChange(periodFor(k, today)) }}>{k === 'all' ? allLabel : NAMES[k]}</button>)}</div>
      {(kind === 'day' || kind === 'week') && <CalendarPanel value={period.day} week={kind === 'week'} today={today} onPick={(day) => { onChange({ kind, day }); close(true) }} />}
      {kind === 'month' && <MonthPanel value={period.month} today={today} onPick={(month) => { onChange({ kind, month }); close(true) }} />}
      {kind === 'year' && <YearPanel value={period.year} firstYear={firstYear} today={today} onPick={(year) => { onChange({ kind, year }); close(true) }} />}</Popover>}
  </label>)
}
