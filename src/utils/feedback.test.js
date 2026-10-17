import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { feedbackMailto, feedbackWebLink } from './feedback.js'
import { CONTACT_EMAIL } from '../data/site.js'
test('the feedback link uses the site contact address exactly, a subject and a friendly body', () => {
  assert.equal(CONTACT_EMAIL, 'kita-financetracker@gmail.com')
  const link = feedbackMailto(CONTACT_EMAIL, '1.3.4'), url = new URL(link)
  assert.equal(url.protocol, 'mailto:'); assert.equal(decodeURIComponent(url.pathname), CONTACT_EMAIL)
  assert.equal(url.searchParams.get('subject'), 'TrackMyKita Feedback')
  assert.match(url.searchParams.get('body'), /version 1\.3\.4/)
  assert.equal(link.includes(' '), false)
})
test('the web fallback targets the same address', () => {
  const u = new URL(feedbackWebLink(CONTACT_EMAIL, '1.3.4'))
  assert.equal(u.searchParams.get('to'), CONTACT_EMAIL); assert.equal(u.searchParams.get('su'), 'TrackMyKita Feedback')
})
test('the About page takes the address from the shared constant, not a typed-in copy', () => {
  const src = readFileSync(new URL('../pages/About.jsx', import.meta.url), 'utf8')
  assert.match(src, /import \{ CONTACT_EMAIL \} from '..\/data\/site\.js'/); assert.equal(/@gmail\.com/.test(src), false)
})
