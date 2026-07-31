import { Link, NavLink } from 'react-router-dom'
import { useEntitlement } from '../../store/useEntitlement'
import { useAuth } from '../../store/useAuth'
import { isSupabaseConfigured } from '../../lib/supabase'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'

const links = [
  { to: '/tracks', label: 'Learn' },
  { to: '/pricing', label: 'Pricing' },
]

export function NavBar() {
  const plan = useEntitlement((s) => s.plan)
  const user = useAuth((s) => s.user)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-500 font-display text-lg font-extrabold text-white">
            S
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight">
            SysViz
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-surface-2 text-text' : 'text-muted hover:text-text'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
          <span className="mx-1">
            <ThemeToggle />
          </span>
          <AuthArea signedIn={Boolean(user)} plan={plan} />
        </div>
      </nav>
    </header>
  )
}

function AuthArea({ signedIn, plan }: { signedIn: boolean; plan: 'free' | 'pro' }) {
  // Signed in → avatar dropdown (with Log out).
  if (signedIn) return <UserMenu />

  // Supabase configured but signed out → Sign in.
  if (isSupabaseConfigured) {
    return (
      <Link to="/login" className="btn-cream ml-1 px-4 py-2 text-sm">
        Sign in
      </Link>
    )
  }

  // Mock mode (no backend) → keep the old plan chip / CTA.
  return plan === 'pro' ? (
    <span className="chip ml-1 border-accent-500/50 text-accent-400">Pro</span>
  ) : (
    <Link to="/pricing" className="btn-cream ml-1 px-4 py-2 text-sm">
      Get access
    </Link>
  )
}
