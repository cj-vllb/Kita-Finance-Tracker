// Turns Supabase/network errors into plain messages. Technical details stay in the console.
export function friendlyError(e, fallback = "We couldn't save this. Please try again.") {
  console.error(e)
  if (!e) return fallback
  if (e.wrongPassword) return 'Current password is incorrect.'
  if (e.userMessage) return e.userMessage
  // Specific database refusals get specific messages, so a missing optional field is never reported as a vague "required details" problem.
  if (e.code === '23502' && /"description"/.test(e.message || '')) return 'Your database still requires a description. Apply the latest database update (supabase db push), then try again.'
  if (/categories_color_check|color_check/.test(e.message || '')) return 'This color needs the latest database update (supabase db push). Pick an older color or apply the update.'
  if (/bucket not found/i.test(e.message || '')) return 'Profile pictures are not set up yet. Ask the app owner to apply the latest database update.'
  if (/mime type|not supported/i.test(e.message || '')) return 'Use a JPG, PNG or WebP image.'
  if (/exceeded the maximum allowed size|too large|payload/i.test(e.message || '')) return 'That photo is too large. Choose a smaller one.'
  if (e.code === 'PGRST204' || /avatar_path/i.test(e.message || '')) return 'Profile pictures are not set up yet. Ask the app owner to apply the latest database update.'
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
