import posthog from 'posthog-js'

/**
 * Thin, typed wrapper around PostHog so event names live in one place and the
 * app never touches the SDK directly. Safe to call before/without init — the
 * SDK no-ops when not configured.
 */

let initialized = false

export function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key || initialized) return
  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: false, // we send pageviews manually on route change
    person_profiles: 'identified_only',
  })
  initialized = true
}

/** Event catalogue — the free→paid funnel + engagement. */
export type AnalyticsEvent =
  | 'signup'
  | 'lesson_started'
  | 'lesson_completed'
  | 'step_played'
  | 'paywall_viewed'
  | 'buy_access_clicked'
  | 'checkout_succeeded'
  | 'coupon_applied'

export function track(event: AnalyticsEvent, props?: Record<string, unknown>) {
  posthog.capture(event, props)
}

export function trackPageview(path: string) {
  posthog.capture('$pageview', { $current_url: path })
}

/** Tie events to a user once authenticated (Supabase user id in Phase 5). */
export function identify(userId: string, traits?: Record<string, unknown>) {
  posthog.identify(userId, traits)
}

export function resetIdentity() {
  posthog.reset()
}
