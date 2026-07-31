import { useNavigate } from 'react-router-dom'
import { track } from '../lib/analytics'
import { useEntitlement } from '../store/useEntitlement'

type PricingPlan = {
  id: string
  label: string
  price: string
  best?: boolean
}

const PLANS: PricingPlan[] = [
  { id: '1m', label: '1 month', price: '$3' },
  { id: '6m', label: '6 months', price: '$6', best: true },
  { id: '12m', label: '12 months', price: '$12' },
]

/** " until 12 Aug 2026" or "" when no date. */
function formatUntil(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return ` until ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

export function PricingPage() {
  const plan = useEntitlement((s) => s.plan)
  const accessUntil = useEntitlement((s) => s.accessUntil)
  const hasActivePlan = useEntitlement((s) => s.hasActivePlan())
  const navigate = useNavigate()

  const buy = (p: PricingPlan) => {
    if (hasActivePlan) return
    track('buy_access_clicked', { plan_id: p.id, price: p.price, from: 'pricing' })
    navigate(`/checkout?plan=${p.id}`)
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <div className="max-w-2xl">
        <h1 className="text-5xl">Simple, one-time access</h1>
        <p className="mt-4 text-lg text-muted">
          Unlock every lesson, scaling pattern and case study. No auto-renewals —
          buy a window of access and learn at your pace.
        </p>
      </div>

      {hasActivePlan && (
        <div className="mt-8 rounded-2xl border border-accent-500/40 bg-accent-500/10 px-5 py-4">
          <p className="font-display font-bold text-text">You’re on Pro 🎉</p>
          <p className="mt-1 text-sm text-muted">
            Your access is active{formatUntil(accessUntil)}. You can purchase a new plan
            once it expires.
          </p>
        </div>
      )}

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={`card relative flex flex-col p-7 ${
              p.best ? 'border-accent-500/60' : ''
            } ${hasActivePlan ? 'opacity-60' : ''}`}
          >
            {p.best && (
              <span className="mb-3 font-mono text-xs font-semibold uppercase tracking-widest text-accent-500">
                Best value
              </span>
            )}
            <h2 className={`${p.best ? 'text-4xl' : 'text-3xl'}`}>{p.label}</h2>
            <p className="mt-3 font-display text-3xl font-extrabold text-text">
              {p.price}
            </p>
            <button
              onClick={() => buy(p)}
              disabled={hasActivePlan}
              className="btn-cream mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {hasActivePlan ? 'Plan active' : 'Buy access'}
            </button>
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm text-faint">
        Payments are processed securely by Polar.
      </p>

      {/* Coupon + referral, ChaiCode-style */}
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <div className="card p-7">
          <h3 className="text-xl">Have a coupon?</h3>
          <CodeInput
            placeholder="ENTER CODE"
            onApply={(code) => track('coupon_applied', { code })}
          />
        </div>
        <div className="card p-7">
          <h3 className="text-xl">Have an invite code?</h3>
          <p className="mt-2 text-sm text-faint">
            A friend invited you? Enter their code to get{' '}
            <span className="text-text">7 days free</span> — they get 7 too.
          </p>
          <CodeInput placeholder="FRIEND'S CODE" onApply={() => {}} />
        </div>
      </div>

      <p className="mt-8 text-sm text-faint">
        Current plan:{' '}
        <span className="font-display font-bold text-text">
          {plan === 'pro' ? 'Pro — full access' : 'Free tier'}
        </span>
      </p>
    </div>
  )
}

function CodeInput({
  placeholder,
  onApply,
}: {
  placeholder: string
  onApply: (code: string) => void
}) {
  return (
    <form
      className="mt-4 flex gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        const input = e.currentTarget.elements.namedItem('code') as HTMLInputElement
        if (input.value.trim()) onApply(input.value.trim())
      }}
    >
      <input
        name="code"
        placeholder={placeholder}
        className="flex-1 rounded-xl border border-border bg-bg px-4 py-3 font-mono text-sm tracking-widest text-text placeholder:text-faint focus:border-border-strong focus:outline-none"
      />
      <button type="submit" className="btn-ghost">
        Apply
      </button>
    </form>
  )
}
