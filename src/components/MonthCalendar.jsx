import { useMemo } from 'react'
import { monthCalendar, cellAmount, WEEKDAYS } from '../utils/calendar.js'
import { money, getCurrency, formatDateLong } from '../utils/format.js'
import { currencyPrefix } from '../utils/currency.js'
// One-month calendar of real activity: for every day, what came in (green, "+") and what went out (red, "−"). The +/− signs and the full amounts in each
// cell's label mean colour is never the only cue. Days outside the month are empty, days with nothing show only their number.
export default function MonthCalendar({ transactions, month, today }) {
  const cal = useMemo(() => monthCalendar(transactions, month), [transactions, month]), prefix = currencyPrefix(getCurrency())
  return (<div className="mcal" role="table" aria-label={`Daily income and expenses, ${month}`} style={{ '--weeks': cal.weeks.length }}>
    <div className="mcal-head" role="row">{WEEKDAYS.map((d) => <div key={d} role="columnheader" className="mcal-wd">{d}</div>)}</div>
    <div className="mcal-body" role="rowgroup">{cal.weeks.map((w, i) => (<div className="mcal-week" role="row" key={i}>{w.map((c, j) => {
      if (!c) return <div key={j} className="mcal-cell is-empty" role="cell" aria-hidden="true" />
      const label = `${formatDateLong(c.date)}: ${c.income || c.expenses ? [c.income && `income ${money(c.income)}`, c.expenses && `expenses ${money(c.expenses)}`].filter(Boolean).join(', ') : 'no activity'}`
      return (<div key={j} role="cell" className={'mcal-cell' + (c.date === today ? ' is-today' : '') + (c.income || c.expenses ? ' has-data' : '')} aria-label={label} title={label}>
        <span className="mcal-day">{c.day}</span>
        {c.income > 0 && <span className="mcal-in" aria-hidden="true"><span className="mcal-full">+{cellAmount(c.income, prefix)}</span><span className="mcal-short">+{cellAmount(c.income, prefix, { short: true })}</span></span>}
        {c.expenses > 0 && <span className="mcal-out" aria-hidden="true"><span className="mcal-full">−{cellAmount(c.expenses, prefix)}</span><span className="mcal-short">−{cellAmount(c.expenses, prefix, { short: true })}</span></span>}
      </div>)
    })}</div>))}</div>
  </div>)
}
