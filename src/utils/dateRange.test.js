import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import * as d from './dateRange.js'

const runInTimezone = (code, tz) => execFileSync(process.execPath, ['--input-type=module', '-e', code], { env: { ...process.env, TZ: tz }, encoding: 'utf8' }).trim()

test('weekday and full heading come from the stored text (no timezone shift)', () => {
  assert.equal(d.formatDateHeading('2026-10-12'), 'Monday, October 12, 2026')
  assert.equal(d.formatDateHeading('2026-10-16'), 'Friday, October 16, 2026')
  assert.equal(d.formatDateHeading('2026-01-01'), 'Thursday, January 1, 2026')
  assert.equal(d.formatDateHeading('2024-02-29'), 'Thursday, February 29, 2024')
  assert.equal(d.formatDateHeading('2026-12-31T23:59:59Z'), 'Thursday, December 31, 2026')
  assert.equal(d.formatDateHeading('2026-02-30'), '')
  assert.equal(d.formatDateHeading('garbage'), '')
})
test('headings are identical in every timezone', () => {
  const code = `import * as d from ${JSON.stringify(new URL('./dateRange.js', import.meta.url).href)}; console.log(d.formatDateHeading('2026-03-01') + '|' + d.weekLabel('2026-03-01') + '|' + d.periodRange({kind:'week',day:'2026-03-01'}).from)`
  const out = ['UTC', 'Pacific/Kiritimati', 'Pacific/Pago_Pago', 'Asia/Manila', 'America/Los_Angeles'].map((tz) => runInTimezone(code, tz))
  assert.equal(new Set(out).size, 1, out.join('\n'))
  assert.equal(out[0], 'Sunday, March 1, 2026|Feb 23 to Mar 1, 2026|2026-02-23')
})

test('weeks run Monday to Sunday, across months and years', () => {
  assert.equal(d.startOfWeek('2026-10-12'), '2026-10-12') // a Monday
  assert.equal(d.endOfWeek('2026-10-12'), '2026-10-18')
  assert.equal(d.startOfWeek('2026-10-18'), '2026-10-12') // Sunday belongs to the week that began Monday
  assert.equal(d.startOfWeek('2026-10-16'), '2026-10-12')
  assert.deepEqual(d.periodRange({ kind: 'week', day: '2026-01-01' }), { from: '2025-12-29', to: '2026-01-04' })
  assert.deepEqual(d.periodRange({ kind: 'week', day: '2026-03-01' }), { from: '2026-02-23', to: '2026-03-01' })
  assert.equal(d.weekLabel('2026-10-16'), 'Oct 12 to Oct 18, 2026')
  assert.equal(d.weekLabel('2026-01-01'), 'Dec 29, 2025 to Jan 4, 2026')
})
test('month and year ranges, including leap years', () => {
  assert.deepEqual(d.periodRange({ kind: 'month', month: '2026-02' }), { from: '2026-02-01', to: '2026-02-28' })
  assert.deepEqual(d.periodRange({ kind: 'month', month: '2028-02' }), { from: '2028-02-01', to: '2028-02-29' })
  assert.deepEqual(d.periodRange({ kind: 'month', month: '2026-12' }), { from: '2026-12-01', to: '2026-12-31' })
  assert.deepEqual(d.periodRange({ kind: 'year', year: '2026' }), { from: '2026-01-01', to: '2026-12-31' })
  assert.equal(d.periodRange({ kind: 'all' }), null)
  assert.equal(d.periodRange({ kind: 'day', day: 'nope' }), null)
})
test('inPeriod is inclusive at both ends and only ever uses the date text', () => {
  const week = { kind: 'week', day: '2026-10-14' }
  assert.equal(d.inPeriod('2026-10-12', week), true)
  assert.equal(d.inPeriod('2026-10-18', week), true)
  assert.equal(d.inPeriod('2026-10-11', week), false)
  assert.equal(d.inPeriod('2026-10-19', week), false)
  assert.equal(d.inPeriod('2026-10-31', { kind: 'month', month: '2026-10' }), true)
  assert.equal(d.inPeriod('2026-11-01', { kind: 'month', month: '2026-10' }), false)
  assert.equal(d.inPeriod('2026-10-05', { kind: 'day', day: '2026-10-05' }), true)
  assert.equal(d.inPeriod('2026-10-05T23:00:00Z', { kind: 'day', day: '2026-10-05' }), true)
  assert.equal(d.inPeriod('1999-01-01', { kind: 'all' }), true)
})
test('previous period and stepping', () => {
  assert.deepEqual(d.previousPeriod({ kind: 'month', month: '2026-01' }), { kind: 'month', month: '2025-12' })
  assert.deepEqual(d.previousPeriod({ kind: 'week', day: '2026-10-14' }), { kind: 'week', day: '2026-10-07' })
  assert.deepEqual(d.previousPeriod({ kind: 'day', day: '2026-03-01' }), { kind: 'day', day: '2026-02-28' })
  assert.deepEqual(d.previousPeriod({ kind: 'year', year: '2026' }), { kind: 'year', year: '2025' })
  assert.equal(d.previousPeriod({ kind: 'all' }), null)
  assert.deepEqual(d.stepPeriod({ kind: 'month', month: '2026-12' }, 1), { kind: 'month', month: '2027-01' })
  assert.deepEqual(d.stepPeriod({ kind: 'day', day: '2026-12-31' }, 1), { kind: 'day', day: '2027-01-01' })
})
test('labels', () => {
  assert.equal(d.periodLabel({ kind: 'all' }), 'All dates')
  assert.equal(d.periodLabel({ kind: 'all' }, 'All time'), 'All time')
  assert.equal(d.periodLabel({ kind: 'month', month: '2026-10' }), 'October 2026')
  assert.equal(d.periodLabel({ kind: 'day', day: '2026-10-12' }), 'Monday, October 12, 2026')
  assert.equal(d.periodLabel({ kind: 'week', day: '2026-10-14' }), 'Week of Oct 12 to Oct 18, 2026')
  assert.equal(d.periodFor('month', '2026-10-16').month, '2026-10')
})
