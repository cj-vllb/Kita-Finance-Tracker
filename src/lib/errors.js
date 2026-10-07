// Turns Supabase/network errors into plain messages. Technical details stay in the console.
export function friendlyError(e, fallback = "We couldn't save this. Please try again.") {
  console.error(e)
  if (!e) return fallback
  if (e.wrongPassword) return 'Current password is incorrect.'
  if (e instanceof TypeError || /failed to fetch|network/i.test(e.message || '')) return 'Check your connection and try again.'
  if (/invalid login credentials/i.test(e.message || '')) return 'Incorrect email or password.'
  if (/email not confirmed/i.test(e.message || '')) return 'Confirm your email first. Check your inbox for the link.'
  if (/password should be at least|weak/i.test(e.message || '')) return 'Use at least 8 characters.'
  if (/different from the old/i.test(e.message || '')) return 'Choose a password you have not used before.'
  if (e.status === 429 || /rate limit/i.test(e.message || '')) return 'Too many attempts. Wait a moment and try again.'
  switch (e.code) {
    case '23505': return 'That already exists.'
    case '23503': return 'This item is still in use, or no longer exists.'
    case '23514': return 'Some values are not allowed. Check your entries.'
    case '42501': case 'PGRST301': return "You don't have permission to perform this action."
    default: return fallback
  }
}
