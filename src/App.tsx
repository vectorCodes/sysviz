import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { HomePage } from './pages/HomePage'
import { TracksPage } from './pages/TracksPage'
import { PricingPage } from './pages/PricingPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { AccountPage } from './pages/AccountPage'
import { LoginPage } from './pages/LoginPage'
import { LessonWorkspace } from './features/lesson/LessonWorkspace'
import { useAuth } from './store/useAuth'
import { useEntitlement } from './store/useEntitlement'
import { isSupabaseConfigured } from './lib/supabase'

export default function App() {
  // Keep the entitlement in sync with the signed-in user (Supabase mode).
  const userId = useAuth((s) => s.user?.id ?? null)
  const refresh = useEntitlement((s) => s.refresh)
  useEffect(() => {
    refresh(userId)
  }, [userId, refresh])

  return (
    <Routes>
      {/* Public — landing + login share the site shell. */}
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
      </Route>

      {/* Everything else requires a signed-in user. */}
      <Route element={<RequireAuth />}>
        <Route path="learn/:slug" element={<LessonWorkspace />} />
        <Route element={<Layout />}>
          <Route path="tracks" element={<TracksPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="account" element={<AccountPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

/** Gate for authenticated routes. Redirects to /login when signed out. */
function RequireAuth() {
  const ready = useAuth((s) => s.ready)
  const user = useAuth((s) => s.user)
  const location = useLocation()

  // No backend configured (dev/mock) → don't gate, keep the app usable.
  if (!isSupabaseConfigured) return <Outlet />

  // Wait for the session to resolve to avoid a redirect flash on reload.
  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-faint">Loading…</div>
    )
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return <Outlet />
}
