import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { identify, resetIdentity } from '../lib/analytics'

type AuthState = {
  ready: boolean
  session: Session | null
  user: User | null
  /** Start listening to auth changes. No-op when Supabase isn't configured. */
  init: () => void
  signInWithGoogle: () => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  ready: !isSupabaseConfigured, // nothing to wait for in mock mode
  session: null,
  user: null,

  init: () => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, user: data.session?.user ?? null, ready: true })
      if (data.session?.user) identify(data.session.user.id, { email: data.session.user.email })
    })
    supabase.auth.onAuthStateChange((event, session) => {
      set({ session, user: session?.user ?? null, ready: true })
      if (session?.user) {
        identify(session.user.id, { email: session.user.email })
        // Ensure profile + entitlement rows exist (trigger only fires on first signup;
        // if either row was deleted, re-provision it here on next sign-in).
        if (event === 'SIGNED_IN') {
          const u = session.user
          supabase!.from('profiles')
            .upsert({ id: u.id, email: u.email }, { onConflict: 'id', ignoreDuplicates: true })
            .then(() => {})
          supabase!.from('entitlements')
            .upsert({ user_id: u.id }, { onConflict: 'user_id', ignoreDuplicates: true })
            .then(() => {})
        }
      } else {
        resetIdentity()
      }
    })
  },

  signInWithGoogle: async () => {
    if (!supabase) return { error: 'Auth is not configured yet.' }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/account' },
    })
    // Success redirects the browser to Google; onAuthStateChange fires on return.
    return error ? { error: error.message } : {}
  },

  signOut: async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    resetIdentity()
  },
}))
