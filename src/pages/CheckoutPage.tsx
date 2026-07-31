import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useEntitlement } from '../store/useEntitlement'
import { useAuth } from '../store/useAuth'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { track } from '../lib/analytics'

const PLAN_LABELS: Record<string, { label: string; price: string }> = {
  '1m': { label: '1 month', price: '$3' },
  '6m': { label: '6 months', price: '$6' },
  '12m': { label: '12 months', price: '$12' },
}

/** Optional static Polar checkout link — opens the real hosted UI without a backend. */
const POLAR_LINK = import.meta.env.VITE_POLAR_CHECKOUT_LINK as string | undefined

export function CheckoutPage() {
  const [params] = useSearchParams()
  const planId = params.get('plan') ?? '6m'
  const plan = PLAN_LABELS[planId] ?? PLAN_LABELS['6m']

  const setPlan = useEntitlement((s) => s.setPlan)
  const hasActivePlan = useEntitlement((s) => s.hasActivePlan())
  const user = useAuth((s) => s.user)
  const navigate = useNavigate()

  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  // Full flow: backend creates a Polar checkout; the webhook grants access.
  const payWithPolar = async () => {
    if (!supabase || !user) return
    setProcessing(true)
    setError('')
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planId },
      })
      if (error || !data?.url) throw new Error(error?.message ?? 'Could not start checkout')
      track('buy_access_clicked', { plan_id: planId, provider: 'polar', from: 'checkout' })
      window.location.href = data.url // redirect to Polar hosted checkout
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed')
      setProcessing(false)
    }
  }

  // Demo: redirect straight to a Polar checkout link to see the real hosted UI.
  const payWithLink = () => {
    setProcessing(true)
    window.location.href = POLAR_LINK!
  }

  // Mock: no keys — simulate a successful purchase locally.
  const payMock = () => {
    setProcessing(true)
    setTimeout(() => {
      setPlan('pro')
      track('checkout_succeeded', { plan_id: planId, mock: true })
      navigate('/account')
    }, 800)
  }

  const onPay = isSupabaseConfigured && user ? payWithPolar : POLAR_LINK ? payWithLink : payMock

  // Full flow requires a signed-in user.
  if (isSupabaseConfigured && !user) {
    return (
      <div className="mx-auto max-w-md px-5 py-20">
        <div className="card p-8 text-center">
          <h1 className="text-3xl">Sign in to continue</h1>
          <p className="mt-2 text-sm text-muted">Create an account to purchase and keep your access.</p>
          <Link to="/login" className="btn-cream mt-6 w-full">
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  // Already have an active plan → can't buy again until it expires.
  if (hasActivePlan) {
    return (
      <div className="mx-auto max-w-md px-5 py-20">
        <div className="card p-8 text-center">
          <span className="chip mx-auto border-accent-500/50 text-accent-400">Pro active</span>
          <h1 className="mt-4 text-3xl">You already have Pro</h1>
          <p className="mt-2 text-sm text-muted">
            Your access is active. You can buy a new plan once the current one expires.
          </p>
          <Link to="/tracks" className="btn-cream mt-6 w-full">
            Go to lessons
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-5 py-20">
      <Link to="/pricing" className="text-sm text-faint hover:text-text">
        ← Back to pricing
      </Link>
      <div className="card mt-4 p-8">
        <h1 className="text-3xl">Checkout</h1>
        <div className="mt-6 flex items-center justify-between border-y border-border py-4">
          <div>
            <p className="font-display text-lg font-bold">{plan.label} access</p>
            <p className="text-sm text-faint">One-time · full Pro unlock</p>
          </div>
          <p className="font-display text-2xl font-extrabold">{plan.price}</p>
        </div>

        <button onClick={onPay} disabled={processing} className="btn-cream mt-6 w-full disabled:opacity-60">
          {processing ? 'Redirecting…' : `Continue to payment · ${plan.price}`}
        </button>

        {error && <p className="mt-3 text-center text-sm text-signal-miss">{error}</p>}

        <p className="mt-4 text-center text-xs text-faint">
          {(isSupabaseConfigured && user) || POLAR_LINK
            ? 'Secure checkout by Polar. You’ll be redirected to complete payment.'
            : 'Demo checkout — no real charge. Add Polar keys to go live.'}
        </p>
      </div>
    </div>
  )
}
