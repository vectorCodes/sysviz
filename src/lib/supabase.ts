import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True once real Supabase keys are provided; otherwise the app runs on mocks. */
export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * Shared Supabase client, or null when unconfigured. Every caller must handle
 * the null case so the app keeps working before the backend is wired up.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!)
  : null
