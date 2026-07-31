import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="border-t border-border bg-bg">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-faint sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display font-bold text-muted">
          SysViz — see system design, don&apos;t just read it.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link to="/tracks" className="hover:text-text">
            Learn
          </Link>
          <Link to="/pricing" className="hover:text-text">
            Pricing
          </Link>
          <Link to="/account" className="hover:text-text">
            Account
          </Link>
        </div>
      </div>
    </footer>
  )
}
