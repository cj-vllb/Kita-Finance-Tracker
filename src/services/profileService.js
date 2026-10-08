import { supabase, unwrap, currentUserId } from '../lib/supabaseClient.js'
const BUCKET = 'avatars'
// RLS only returns the signed-in user's own row.
export const getProfile = () => supabase.from('profiles').select('*').maybeSingle().then(unwrap)
export const updateProfile = async ({ fullName, currency, avatarPath }) => {
  const patch = {}; if (fullName !== undefined) patch.full_name = fullName; if (currency !== undefined) patch.currency = currency; if (avatarPath !== undefined) patch.avatar_path = avatarPath
  return supabase.from('profiles').update(patch).eq('id', await currentUserId()).select().single().then(unwrap)
}
// Photos live in a PRIVATE bucket at <user id>/<file>. Storage policies only allow a user into their own folder,
// and the browser reads photos through short-lived signed URLs (there is no public URL).
export const AVATAR_URL_TTL = 3600
export async function getAvatarUrl(path) {
  if (!path) return null
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, AVATAR_URL_TTL)
  if (error) throw error
  return data.signedUrl
}
// Uploads a new file (unique name, so the previous one stays valid until the profile points at the new one).
export async function uploadAvatar(blob) {
  const uid = await currentUserId(), path = `${uid}/avatar-${Date.now()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false })
  if (error) throw error
  return path
}
export const removeAvatarFile = async (path) => { if (!path) return; const { error } = await supabase.storage.from(BUCKET).remove([path]); if (error) throw error }
