import { useCallback, useEffect, useLayoutEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { MONTHS, parseDay, daysInMonth, weekdayIndex, shiftMonthStr, startOfWeek, endOfWeek, localToday, formatDayLong } from '../utils/dateRange.js'

// TrackMyKita's own calendar, used by the phone/tablet sheets and by the compact Reports filter. It is a small popover (never the browser's native
// date control) that works on the stored 'YYYY-MM-DD' text, like utils/dateRange.js, so no date can shift because of a time zone.
// Only one popover is open at a time; it closes on an outside tap, on Escape (without also closing the dialog it sits in) and when the page is resized.

let closeOpenPopover = null
// A panel drawn in a portal and positioned next to its trigger button, kept inside the screen (above the trigger when there is no room below).
export function Popover({ anchor, onClose, label, className = '', children }) {
  const ref = useRef(), [pos, setPos] = useState(null)
  useLayoutEffect(() => {
    if (!anchor.current || !ref.current) return
    const r = anchor.current.getBoundingClientRect(), m = ref.current.getBoundingClientRect(), pad = 8, vv = window.visualViewport, vh = vv ? vv.height : window.innerHeight
    const left = Math.min(Math.max(pad, r.left), Math.max(pad, window.innerWidth - m.width - pad))
    let top = r.bottom + 6; if (top + m.height > vh - pad) top = Math.max(pad, r.top - m.height - 6)
    setPos({ top, left })
  }, [anchor])
  useEffect(() => {
    if (closeOpenPopover && closeOpenPopover !== onClose) closeOpenPopover()
    closeOpenPopover = onClose
    const esc = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(true) } } // capture phase: the dialog behind stays open
    const away = (e) => { if (!ref.current?.contains(e.target) && !anchor.current?.contains(e.target)) onClose() }
    window.addEventListener('keydown', esc, true); document.addEventListener('pointerdown', away); window.addEventListener('resize', onClose)
    ref.current?.querySelector('[data-autofocus]')?.focus({ preventScroll: true })
    return () => { if (closeOpenPopover === onClose) closeOpenPopover = null; window.removeEventListener('keydown', esc, true); document.removeEventListener('pointerdown', away); window.removeEventListener('resize', onClose) }
  }, [onClose, anchor])
  return createPortal(<div ref={ref} role="dialog" aria-label={label} className={'pk-pop ' + className} style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: 'hidden' }}>{children}</div>, document.body)
}

const WD = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const pad2 = (n) => String(n).padStart(2, '0')
// Month grid. `value` is the selected day; `week` highlights the whole Monday-to-Sunday week of the selected day (Reports > Week).
export function CalendarPanel({ value, onPick, week = false, today = localToday() }) {
  const start = (parseDay(value) ? value : today).slice(0, 7), [ym, setYm] = useState(start)
  const [y, m] = ym.split('-').map(Number), lead = weekdayIndex(`${ym}-01`), n = daysInMonth(y, m)
  const cells = useMemo(() => [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => `${ym}-${pad2(i + 1)}`)], [ym, lead, n])
  const wk = week && parseDay(value) ? [startOfWeek(value), endOfWeek(value)] : null
  return (<div className="pk-cal">
    <div className="pk-head">
      <button type="button" className="icon-btn" aria-label="Previous month" onClick={() => setYm(shiftMonthStr(ym, -1))}><ChevronLeft size={18} aria-hidden="true" /></button>
      <div className="pk-title" aria-live="polite">{MONTHS[m - 1]} {y}</div>
      <button type="button" className="icon-btn" aria-label="Next month" onClick={() => setYm(shiftMonthStr(ym, 1))}><ChevronRight size={18} aria-hidden="true" /></button></div>
    <div className="pk-grid" role="grid" aria-label={`${MONTHS[m - 1]} ${y}`}>
      {WD.map((d) => <span key={d} className="pk-wd" role="columnheader">{d}</span>)}
      {cells.map((d, i) => d === null ? <span key={'e' + i} aria-hidden="true" /> : (
        <button key={d} type="button" role="gridcell" data-autofocus={d === value || (!parseDay(value) && d === today) ? '' : undefined}
          className={'pk-day' + (d === value ? ' sel' : '') + (d === today ? ' today' : '') + (wk && d >= wk[0] && d <= wk[1] ? ' in-week' : '')} aria-selected={d === value} aria-label={formatDayLong(d)} aria-current={d === today ? 'date' : undefined} onClick={() => onPick(d)}>{+d.slice(8)}</button>))}</div>
    <div className="pk-foot"><button type="button" className="btn-link" onClick={() => { setYm(today.slice(0, 7)); onPick(today) }}>Today</button></div>
  </div>)
}
// Month + year chooser: a year stepper over twelve month buttons.
export function MonthPanel({ value, onPick, today = localToday() }) {
  const [year, setYear] = useState(+(value || today).slice(0, 4)), sel = value ? value.split('-') : []
  return (<div className="pk-cal">
    <div className="pk-head"><button type="button" className="icon-btn" aria-label="Previous year" onClick={() => setYear(year - 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
      <div className="pk-title" aria-live="polite">{year}</div><button type="button" className="icon-btn" aria-label="Next year" onClick={() => setYear(year + 1)}><ChevronRight size={18} aria-hidden="true" /></button></div>
    <div className="pk-months">{MONTHS.map((name, i) => { const v = `${year}-${pad2(i + 1)}`; return <button key={name} type="button" data-autofocus={v === value ? '' : undefined} className={'pk-month' + (v === value ? ' sel' : '') + (v === today.slice(0, 7) ? ' today' : '')} aria-pressed={v === value} onClick={() => onPick(v)}>{name.slice(0, 3)}</button> })}</div>
    <span className="sr-only">{sel.length ? `Selected ${MONTHS[+sel[1] - 1]} ${sel[0]}` : ''}</span></div>)
}
// Year chooser: every year from one ahead of today back to the earliest year with data.
export function YearPanel({ value, onPick, firstYear, today = localToday() }) {
  const top = +today.slice(0, 4) + 1, low = Math.min(firstYear || top - 1, +today.slice(0, 4), +(value || top)), years = []
  for (let y = top; y >= low; y--) years.push(String(y))
  return <div className="pk-years" role="listbox" aria-label="Year">{years.map((y) => <button key={y} type="button" role="option" aria-selected={y === value} data-autofocus={y === value ? '' : undefined} className={'pk-year' + (y === value ? ' sel' : '')} onClick={() => onPick(y)}>{y}</button>)}</div>
}

// A date field that looks like a drop-down and opens the calendar. Used by the Add Transaction / Add Savings / Transfer Money sheets.
export function DateField({ value, onChange, id, 'aria-describedby': describedBy, 'aria-invalid': invalid, label = 'Date' }) {
  const [open, setOpen] = useState(false), btn = useRef(), uid = useId()
  const close = useCallback((refocus) => { setOpen(false); if (refocus === true) btn.current?.focus({ preventScroll: true }) }, [])
  const long = parseDay(value) ? formatDayLong(value) : '', text = parseDay(value) ? (value === localToday() ? 'Today' : long.replace(/^([A-Za-z]{3})[a-z]*/, '$1')) : 'Choose a date' // short on the button; the full date is in the aria-label
  return (<>
    <button ref={btn} id={id} type="button" className="input pk-field" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? uid : undefined} aria-label={`${label}: ${long || text}`} aria-describedby={describedBy} aria-invalid={invalid} onClick={() => setOpen((o) => !o)}>
      <CalendarDays size={16} aria-hidden="true" /><span className="pk-text">{text}</span><ChevronDown size={16} aria-hidden="true" className="pk-chev" /></button>
    {open && <Popover anchor={btn} onClose={close} label="Choose a date"><span id={uid} className="sr-only">Calendar</span><CalendarPanel value={value} onPick={(d) => { onChange(d); close(true) }} /></Popover>}</>)
}
