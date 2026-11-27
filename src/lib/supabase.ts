import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && anonKey)

// The anon key is public by design: every table is protected by Row Level
// Security, and all financial writes go through checked database functions.
export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'missing-anon-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

export function logoUrl(path: string | null | undefined) {
  if (!path) return null
  if (path.startsWith('data:')) return path // guest-mode logo, kept in the tab
  return supabase.storage.from('logos').getPublicUrl(path).data.publicUrl
}
