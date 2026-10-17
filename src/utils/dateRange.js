// Date helpers for filters, headings and reports. Everything works on the stored 'YYYY-MM-DD' text (and 'YYYY-MM' / 'YYYY'),
// never on local-time Date objects, so a transaction can never move to another day because of the viewer's timezone.
// Weeks run Monday to Sunday.
const pad = (n, w = 2) => String(n).padStart(w, '0')
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/

export const parseDay = (iso) => {
  const m = ISO_DAY.exec(String(iso ?? '').slice(0, 10)); if (!m) return null
  const y = +m[1], mo = +m[2], d = +m[3]
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null
  return { y, m: mo, d }
}
export const isDay = (iso) => !!parseDay(iso) && String(iso).length === 10
export const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate()
const toIso = (y, m, d) => `${pad(y, 4)}-${pad(m)}-${pad(d)}`
const utc = ({ y, m, d }) => Date.UTC(y, m - 1, d)
const fromUtc = (ms) => { const x = new Date(ms); return toIso(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()) }

export const addDays = (iso, n) => fromUtc(utc(parseDay(iso)) + n * 86400000)
export const weekdayIndex = (iso) => new Date(utc(parseDay(iso))).getUTCDay() // 0 = Sunday
export const weekdayName = (iso) => WEEKDAYS[weekdayIndex(iso)]
export const startOfWeek = (iso) => addDays(iso, -((weekdayIndex(iso) + 6) % 7)) // Monday
export const endOfWeek = (iso) => addDays(startOfWeek(iso), 6) // Sunday

// "Monday, October 12, 2026" from the stored date text.
export const formatDateHeading = (iso) => { const p = parseDay(iso); return p ? `${weekdayName(iso)}, ${MONTHS[p.m - 1]} ${p.d}, ${p.y}` : '' }
// Short heading used on narrow screens' own line: "Mon, Oct 12, 2026" is NOT used; the full text wraps instead (see CSS), so it is never abbreviated wrongly.
export const formatDayLong = (iso) => { const p = parseDay(iso); return p ? `${MONTHS[p.m - 1]} ${p.d}, ${p.y}` : '' }
const shortDay = (iso) => { const p = parseDay(iso); return `${MONTHS[p.m - 1].slice(0, 3)} ${p.d}` }
export const weekLabel = (iso) => {
  const a = startOfWeek(iso), b = endOfWeek(iso), pa = parseDay(a), pb = parseDay(b)
  return pa.y === pb.y ? `${shortDay(a)} to ${shortDay(b)}, ${pb.y}` : `${shortDay(a)}, ${pa.y} to ${shortDay(b)}, ${pb.y}`
}
export const monthTitle = (ym) => { const [y, m] = ym.split('-').map(Number); return `${MONTHS[m - 1]} ${y}` }
export const shiftMonthStr = (ym, delta) => { const [y, m] = ym.split('-').map(Number), t = y * 12 + (m - 1) + delta; return `${pad(Math.floor(t / 12), 4)}-${pad((t % 12) + 1)}` }
export const monthStart = (ym) => `${ym}-01`
export const monthEnd = (ym) => { const [y, m] = ym.split('-').map(Number); return toIso(y, m, daysInMonth(y, m)) }

// ---- Periods ---------------------------------------------------------------------------------------------------------------------
// { kind: 'all' } | { kind: 'day', day } | { kind: 'week', day } (any date inside the week) | { kind: 'month', month } | { kind: 'year', year }
export const KINDS = ['all', 'day', 'week', 'month', 'year']
export const periodFor = (kind, today) => {
  const t = today
  switch (kind) {
    case 'day': return { kind, day: t }
    case 'week': return { kind, day: t }
    case 'month': return { kind, month: t.slice(0, 7) }
    case 'year': return { kind, year: t.slice(0, 4) }
    default: return { kind: 'all' }
  }
}
export function periodRange(p) {
  switch (p?.kind) {
    case 'day': return isDay(p.day) ? { from: p.day, to: p.day } : null
    case 'week': return isDay(p.day) ? { from: startOfWeek(p.day), to: endOfWeek(p.day) } : null
    case 'month': return /^\d{4}-\d{2}$/.test(p.month) ? { from: monthStart(p.month), to: monthEnd(p.month) } : null
    case 'year': return /^\d{4}$/.test(p.year) ? { from: `${p.year}-01-01`, to: `${p.year}-12-31` } : null
    default: return null // all
  }
}
export const inPeriod = (date, p) => { const r = periodRange(p); if (!r) return p?.kind === 'all' || !p; const d = String(date).slice(0, 10); return d >= r.from && d <= r.to }
export const periodLabel = (p, allLabel = 'All dates') => {
  switch (p?.kind) {
    case 'day': return formatDateHeading(p.day)
    case 'week': return `Week of ${weekLabel(p.day)}`
    case 'month': return monthTitle(p.month)
    case 'year': return p.year
    default: return allLabel
  }
}
// The period right before this one, of the same length. Used for "compared with last month". Null for All time.
export function previousPeriod(p) {
  switch (p?.kind) {
    case 'day': return { kind: 'day', day: addDays(p.day, -1) }
    case 'week': return { kind: 'week', day: addDays(p.day, -7) }
    case 'month': return { kind: 'month', month: shiftMonthStr(p.month, -1) }
    case 'year': return { kind: 'year', year: pad(+p.year - 1, 4) }
    default: return null
  }
}
// Move one step (arrows beside the picker).
export function stepPeriod(p, dir) {
  switch (p?.kind) {
    case 'day': return { kind: 'day', day: addDays(p.day, dir) }
    case 'week': return { kind: 'week', day: addDays(p.day, 7 * dir) }
    case 'month': return { kind: 'month', month: shiftMonthStr(p.month, dir) }
    case 'year': return { kind: 'year', year: pad(+p.year + dir, 4) }
    default: return p
  }
}
export const sameDay = (a, b) => String(a).slice(0, 10) === String(b).slice(0, 10)

export const comparePeriodLabel = (p) => { const q = previousPeriod(p); return q ? periodLabel(q) : '' }
export const previousWord = (p) => ({ day: 'the previous day', week: 'the previous week', month: 'last month', year: 'last year' }[p?.kind] || '')

// The user's own 'today' (local calendar date) as YYYY-MM-DD. The only place a local-time Date is read; everything else works on date text.
export const localToday = (d = new Date()) => toIso(d.getFullYear(), d.getMonth() + 1, d.getDate())
