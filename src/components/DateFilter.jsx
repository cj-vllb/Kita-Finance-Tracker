import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MONTHS, periodFor, stepPeriod, periodLabel, isDay } from '../utils/dateRange.js'
// Period picker shared by Transactions and Reports. `period` is { kind: 'all' | 'day' | 'week' | 'month' | 'year', ... } (see utils/dateRange.js).
// Day and week use the browser's own calendar (<input type="date">), which every phone and desktop browser provides; month and year use selects
// whose year list always covers the earliest data, so every date in history is reachable. The chosen period is always spelled out underneath.
export default function DateFilter({ period, onChange, today, kinds, firstYear, allLabel = 'All dates', idPrefix = 'df' }) {
  const thisYear = +today.slice(0, 4), start = Math.min(firstYear || thisYear, thisYear), years = useMemo(() => { const out = []; for (let y = thisYear + 1; y >= start - 0; y--) out.push(y); return out }, [thisYear, start])
  const kindLabels = { all: allLabel, day: 'Day', week: 'Week', month: 'Month', year: 'Year' }
  const kind = period.kind
  const pickKind = (k) => onChange(k === kind ? period : periodFor(k, today))
  const ym = kind === 'month' ? period.month : '', [yy, mm] = ym ? ym.split('-') : [period.year || today.slice(0, 4), '01']
  const setMonth = (y, m) => onChange({ kind: 'month', month: `${y}-${m}` })
  const yearOptions = [...new Set([...years, +(period.year || yy)])].sort((a, b) => b - a)
  return (<div className="datefilter">
    <div className="df-row">
      <label className="fsel df-kind"><span className="flabel">Period</span>
        <select className="input" aria-label="Period type" id={idPrefix + '-kind'} value={kind} onChange={(e) => pickKind(e.target.value)}>{kinds.map((k) => <option key={k} value={k}>{kindLabels[k]}</option>)}</select></label>
      {kind !== 'all' && (<div className="df-pick">
        <button type="button" className="icon-btn df-step" aria-label={`Previous ${kind}`} onClick={() => onChange(stepPeriod(period, -1))}><ChevronLeft size={18} aria-hidden="true" /></button>
        {(kind === 'day' || kind === 'week') && <input className="input df-date" type="date" aria-label={kind === 'day' ? 'Choose a day' : 'Choose any day in the week'} value={period.day} onChange={(e) => isDay(e.target.value) && onChange({ kind, day: e.target.value })} />}
        {kind === 'month' && (<>
          <select className="input df-month" aria-label="Month" value={mm} onChange={(e) => setMonth(yy, e.target.value)}>{MONTHS.map((n, i) => <option key={n} value={String(i + 1).padStart(2, '0')}>{n}</option>)}</select>
          <select className="input df-year" aria-label="Year" value={yy} onChange={(e) => setMonth(e.target.value, mm)}>{yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}</select></>)}
        {kind === 'year' && <select className="input df-year" aria-label="Year" value={period.year} onChange={(e) => onChange({ kind: 'year', year: e.target.value })}>{yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}</select>}
        <button type="button" className="icon-btn df-step" aria-label={`Next ${kind}`} onClick={() => onChange(stepPeriod(period, 1))}><ChevronRight size={18} aria-hidden="true" /></button></div>)}
    </div>
    <p className="df-current muted small" aria-live="polite">Showing: <strong>{periodLabel(period, allLabel)}</strong></p>
  </div>)
}
