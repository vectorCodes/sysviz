import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type Plan = 'free' | 'pro'

type EntitlementState = {
  /** Current plan the UI gates on. */
  plan: Plan
  /** When the current Pro access expires (ISO), or null. */
  accessUntil: string | null
  /** Where `plan` came from — server truth vs local mock toggle. */
  source: 'mock' | 'supabase'
  /** Dev-only toggle (mock mode) to preview the paid experience. */
  setPlan: (plan: Plan) => void
  isPro: () => boolean
  /** Is there an active plan that blocks buying again? */
  hasActivePlan: () => boolean
  /** Pull the real entitlement for a user from Supabase (no-op in mock mode). */
  refresh: (userId: string | null) => Promise<void>
}

export const useEntitlement = create<EntitlementState>()(
  persist(
    (set, get) => ({
      plan: 'free',
      accessUntil: null,
      source: isSupabaseConfigured ? 'supabase' : 'mock',
      setPlan: (plan) => set({ plan, source: 'mock', accessUntil: null }),
      isPro: () => get().plan === 'pro',
      hasActivePlan: () => {
        const { plan, accessUntil } = get()
        if (plan !== 'pro') return false
        return !accessUntil || new Date(accessUntil) > new Date()
      },

      refresh: async (userId) => {
        if (!supabase || !userId) return
        const { data } = await supabase
          .from('entitlements')
          .select('plan, status, access_until')
          .eq('user_id', userId)
          .maybeSingle()

        const active =
          data?.status === 'active' &&
          (!data.access_until || new Date(data.access_until) > new Date())
        set({
          plan: active ? 'pro' : 'free',
          accessUntil: active ? (data?.access_until ?? null) : null,
          source: 'supabase',
        })
      },
    }),
    {
      name: 'sysviz-entitlement',
      partialize: (s) => (s.source === 'mock' ? { plan: s.plan, source: s.source } : { source: s.source }),
      merge: (persisted, current) =>
        isSupabaseConfigured
          ? { ...current, plan: 'free', accessUntil: null, source: 'supabase' }
          : { ...current, ...(persisted as object) },
    },
  ),
)
