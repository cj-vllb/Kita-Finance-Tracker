import { createClient } from '@supabase/supabase-js'
// Public client credentials only, read from .env.local. Never put a service-role key here.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const isConfigured = Boolean(url && key)
export const supabase = isConfigured ? createClient(url, key) : null
export const unwrap = ({ data, error }) => { if (error) throw error; return data }
// PostgREST returns at most 1000 rows per request, so page through larger tables.
export async function fetchAll(build) {
  let rows = [], from = 0
  for (;;) {
    const page = unwrap(await build().range(from, from + 999))
    rows = rows.concat(page); if (page.length < 1000) return rows; from += 1000
  }
}
export const currentUserId = async () => { const { data } = await supabase.auth.getSession(); return data.session?.user.id }
