import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CHANGELOG } from './changelog.js'
const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'))
const lock = JSON.parse(readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf8'))
const semver = (v) => { const p = v.split('.').map(Number); while (p.length < 3) p.push(0); return p } // '1.3' means 1.3.0
test('the newest entry is the current package version, once', () => {
  assert.equal(CHANGELOG[0].version, '1.3.4'); assert.equal(pkg.version, '1.3.4'); assert.equal(lock.version, '1.3.4'); assert.equal(lock.packages[''].version, '1.3.4')
  assert.equal(CHANGELOG.filter((r) => r.version === '1.3.4').length, 1)
  assert.equal(new Set(CHANGELOG.map((r) => r.version)).size, CHANGELOG.length)
})
test('versions are newest first and each has 2 to 5 short bullets', () => {
  for (let i = 1; i < CHANGELOG.length; i++) { const a = semver(CHANGELOG[i - 1].version), b = semver(CHANGELOG[i].version); assert.ok(a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] > b[2]))), CHANGELOG[i].version) }
  const r = CHANGELOG[0]; assert.ok(r.items.length >= 2 && r.items.length <= 5); for (const x of r.items) assert.ok(x.length < 110, x)
})
test('historical entries keep their original dates', () => {
  const d = Object.fromEntries(CHANGELOG.map((r) => [r.version, r.date]))
  assert.equal(d['1.3.3'], 'October 16,2026'); assert.equal(d['1.3.2'], 'October 15, 2026')
})
test('the 1.3.4 date is never a placeholder: either the real date or null (and null shows no date)', () => {
  const date = CHANGELOG[0].date
  assert.ok(date === null || /^[A-Z][a-z]+ \d{1,2}, 20\d\d$/.test(date), String(date))
  assert.equal(/tbd|todo|xx|placeholder|yyyy/i.test(String(date)), false)
})
