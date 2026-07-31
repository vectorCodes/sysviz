import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useEntitlement, type Plan } from '../store/useEntitlement'
import { useAuth } from '../store/useAuth'
import { isSupabaseConfigured } from '../lib/supabase'
import { track } from '../lib/analytics'

export function AccountPage() {
  const plan = useEntitlement((s) => s.plan)
  const setPlan = useEntitlement((s) => s.setPlan)
  const refresh = useEntitlement((s) => s.refresh)
  const user = useAuth((s) => s.user)
  const signOut = useAuth((s) => s.signOut)
  const [params] = useSearchParams()

  // Returning from Polar checkout — poll for the webhook-granted entitlement.
  useEffect(() => {
    if (!params.get('checkout') || !user) return
    track('checkout_succeeded', { provider: 'polar' })
    let tries = 0
    const id = setInterval(async () => {
      tries += 1
      await refresh(user.id)
      if (useEntitlement.getState().plan === 'pro' || tries >= 5) clearInterval(id)
    }, 1500)
    return () => clearInterval(id)
  }, [params, user, refresh])

  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="text-5xl">Account &amp; billing</h1>
      <p className="mt-2 text-faint">{user?.email ?? (isSupabaseConfigured ? 'Not signed in' : 'demo@sysviz.dev')}</p>

      {/* Auth row */}
      {isSupabaseConfigured && (
        <div className="card mt-6 flex items-center justify-between p-6">
          <p className="text-sm text-muted">
            {user ? `Signed in as ${user.email}` : 'Sign in to sync your access across devices.'}
          </p>
          {user ? (
            <button onClick={signOut} className="btn-ghost">
              Sign out
            </button>
          ) : (
            <Link to="/login" className="btn-cream">
              Sign in
            </Link>
          )}
        </div>
      )}

      {/* Current plan */}
      <div className="card mt-6 flex items-center justify-between p-7">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-faint">Current plan</p>
          <p className="mt-1 font-display text-3xl font-extrabold">
            {plan === 'pro' ? 'Pro' : 'Free'}
          </p>
        </div>
        <span className="chip">{plan === 'pro' ? 'Full access' : 'Free tier'}</span>
      </div>

      {plan === 'free' && (
        <Link to="/pricing" className="btn-cream mt-4">
          Upgrade to Pro
        </Link>
      )}

      {/* Dev-only entitlement toggle — only in mock mode. */}
      {!isSupabaseConfigured && (
        <div className="card mt-6 p-7">
          <h3 className="text-xl">Preview mode (dev)</h3>
          <p className="mt-2 text-sm text-faint">
            Toggle a plan to preview how gated content behaves. In production this is
            driven by your Supabase entitlement after a Polar payment.
          </p>
          <div className="mt-4 flex gap-3">
            {(['free', 'pro'] as Plan[]).map((p) => (
              <button
                key={p}
                onClick={() => setPlan(p)}
                className={plan === p ? 'btn-cream' : 'btn-ghost'}
              >
                {p === 'pro' ? 'Pro' : 'Free'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
