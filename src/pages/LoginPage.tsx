import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../store/useAuth'
import { isSupabaseConfigured } from '../lib/supabase'

export function LoginPage() {
  const user = useAuth((s) => s.user)
  const signInWithGoogle = useAuth((s) => s.signInWithGoogle)
  const location = useLocation()
  const [status, setStatus] = useState<'idle' | 'redirecting' | 'error'>('idle')
  const [error, setError] = useState('')

  // Return to the page they were trying to reach, else Account.
  const from = (location.state as { from?: string } | null)?.from ?? '/account'
  if (user) return <Navigate to={from} replace />

  const google = async () => {
    setStatus('redirecting')
    const { error } = await signInWithGoogle()
    if (error) {
      setError(error)
      setStatus('error')
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-20">
      <div className="card p-8">
        <h1 className="text-3xl">Sign in</h1>
        <p className="mt-2 text-sm text-muted">
          Continue with your Google account to save your access.
        </p>

        {!isSupabaseConfigured && (
          <p className="mt-4 rounded-lg border border-border bg-surface-2 px-4 py-3 text-sm text-faint">
            Auth isn’t configured yet. Add your Supabase keys (see{' '}
            <code className="font-mono text-muted">.env</code>) to enable sign-in.
          </p>
        )}

        <button
          onClick={google}
          disabled={!isSupabaseConfigured || status === 'redirecting'}
          className="btn-cream mt-6 w-full gap-3 disabled:opacity-50"
        >
          <GoogleIcon />
          {status === 'redirecting' ? 'Redirecting…' : 'Continue with Google'}
        </button>

        {status === 'error' && <p className="mt-3 text-sm text-signal-miss">{error}</p>}

        <p className="mt-6 text-center text-xs text-faint">
          By continuing you agree to our terms.{' '}
          <Link to="/" className="text-accent-400 hover:underline">
            Back home
          </Link>
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3C29.3 35 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.3 5.3C40.9 36 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  )
}
