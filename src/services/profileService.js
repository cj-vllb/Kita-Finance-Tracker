import { supabase, unwrap, currentUserId } from '../lib/supabaseClient.js'
// RLS only returns the signed-in user's own row.
export const getProfile = () => supabase.from('profiles').select('*').maybeSingle().then(unwrap)
export const updateProfile = async ({ fullName, currency }) => {
  const patch = {}; if (fullName !== undefined) patch.full_name = fullName; if (currency !== undefined) patch.currency = currency
  return supabase.from('profiles').update(patch).eq('id', await currentUserId()).select().single().then(unwrap)
}
