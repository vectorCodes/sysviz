import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/useAuth'
import { useEntitlement } from '../../store/useEntitlement'

/** Avatar button in the header with a dropdown (account, upgrade, log out). */
export function UserMenu() {
  const user = useAuth((s) => s.user)
  const signOut = useAuth((s) => s.signOut)
  const plan = useEntitlement((s) => s.plan)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null

  const meta = user.user_metadata ?? {}
  const avatarUrl = (meta.avatar_url ?? meta.picture) as string | undefined
  const name = (meta.full_name ?? meta.name ?? user.email ?? 'You') as string
  const initial = (name || 'U').trim().charAt(0).toUpperCase()

  const logout = async () => {
    setOpen(false)
    await signOut()
    navigate('/')
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-border bg-surface-2 transition-transform hover:-translate-y-0.5"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="font-display text-sm font-bold text-text">{initial}</span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="card absolute right-0 mt-2 w-60 overflow-hidden p-0 shadow-lg"
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="font-display text-sm font-bold">{initial}</span>
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text">{name}</p>
              <p className="truncate text-xs text-faint">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-faint">Plan</span>
            <span className={`chip ${plan === 'pro' ? 'border-accent-500/50 text-accent-400' : ''}`}>
              {plan === 'pro' ? 'Pro' : 'Free'}
            </span>
          </div>

          <div className="border-t border-border py-1">
            <MenuLink to="/account" onClick={() => setOpen(false)}>
              Account &amp; billing
            </MenuLink>
            <MenuLink to="/tracks" onClick={() => setOpen(false)}>
              My lessons
            </MenuLink>
            {plan === 'free' && (
              <MenuLink to="/pricing" onClick={() => setOpen(false)} accent>
                Upgrade to Pro
              </MenuLink>
            )}
          </div>

          <div className="border-t border-border py-1">
            <button
              onClick={logout}
              role="menuitem"
              className="w-full px-4 py-2.5 text-left text-sm text-signal-miss transition-colors hover:bg-surface-2"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuLink({
  to,
  onClick,
  accent,
  children,
}: {
  to: string
  onClick: () => void
  accent?: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      role="menuitem"
      className={`block px-4 py-2.5 text-sm transition-colors hover:bg-surface-2 ${
        accent ? 'font-medium text-accent-400' : 'text-text'
      }`}
    >
      {children}
    </Link>
  )
}
