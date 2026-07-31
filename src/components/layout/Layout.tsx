import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { NavBar } from './NavBar'
import { Footer } from './Footer'
import { trackPageview } from '../../lib/analytics'

/** App shell: nav + routed page + footer, with a pageview sent per navigation. */
export function Layout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
    trackPageview(pathname)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
