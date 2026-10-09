// Turns Supabase/network errors into plain messages. Technical details are only logged during development.
import { logError } from './log.js'
export function friendlyError(e, fallback = "We couldn't save this. Please try again.") {
  logError(e)
  if (!e) return fallback
  if (e.wrongPassword) return 'Current password is incorrect.'
  if (e.userMessage) return e.userMessage
  if (/mime type|not supported/i.test(e.message || '')) return 'Use a JPG, PNG or WebP image.'
  if (/exceeded the maximum allowed size|too large|payload/i.test(e.message || '')) return 'That photo is too large. Choose a smaller one.'
  if (e.code === 'PGRST204' || /avatar_path|bucket not found/i.test(e.message || '')) return 'Profile pictures are unavailable right now. Please try again later.'
  if (e instanceof TypeError || /failed to fetch|network/i.test(e.message || '')) return 'Check your connection and try again.'
  if (/invalid login credentials/i.test(e.message || '')) return 'Incorrect email or password.'
  if (/email not confirmed/i.test(e.message || '')) return 'Confirm your email first. Check your inbox for the link.'
  if (/password should be at least|weak/i.test(e.message || '')) return 'Use at least 8 characters.'
  if (/different from the old/i.test(e.message || '')) return 'Choose a password you have not used before.'
  if (e.status === 429 || /rate limit/i.test(e.message || '')) return 'Too many attempts. Wait a moment and try again.'
  switch (e.code) {
    case '23505': return 'That already exists.'
    case '23503': return 'This item is still in use, or no longer exists.'
    case '23502': return 'Some required details are missing. Check your entries.'
    case '23514': return 'Some values are not allowed. Check your entries.'
    case '42501': case 'PGRST301': return "You don't have permission to perform this action."
    default: return fallback
  }
}
