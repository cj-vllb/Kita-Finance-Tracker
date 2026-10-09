// Applied to Vercel Web Analytics and Speed Insights events before they leave the browser.
// Only the page route is kept: query strings and fragments are removed and record IDs in the path are replaced.
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
export function sanitizeAnalyticsEvent(event) {
  try {
    const u = new URL(event.url)
    u.search = ''; u.hash = ''; u.pathname = u.pathname.replace(UUID, 'id')
    return { ...event, url: u.toString() }
  } catch { return null } // if the address cannot be cleaned, send nothing
}
