/**
 * Landing-page track catalogue (the "products"). System Design is LIVE and
 * fully built; the rest are the roadmap — the same domains weighed during
 * planning, shown as "SOON" to signal this is a platform, not one course.
 */
export type TrackStatus = 'live' | 'soon'

export type TrackCard = {
  title: string
  subtitle: string
  description: string
  chips: string[]
  meta: string
  status: TrackStatus
  badge: string
  to?: string
}

export const TRACKS: TrackCard[] = [
  {
    title: 'System Design Visual',
    subtitle: 'Distributed systems, animated',
    description:
      'Watch requests flow through load balancers, caches, shards and queues — then design full systems in animated case studies, always with the why.',
    chips: ['Load Balancer', 'Caching', 'Sharding', 'Rate Limiter', 'Message Queue', 'CAP', '+more'],
    meta: '5 groups · 30+ topics',
    status: 'live',
    badge: 'LIVE',
    to: '/tracks',
  },
  {
    title: 'Databases Visual',
    subtitle: 'Indexes, queries & transactions',
    description:
      'See why a query is fast or slow — B-tree indexes, query plans, MVCC transactions and joins, illustrated step by step.',
    chips: ['B-Tree Index', 'Query Plans', 'Transactions', 'MVCC', 'Joins'],
    meta: 'Coming soon',
    status: 'soon',
    badge: 'SOON',
  },
  {
    title: 'Concurrency & Async',
    subtitle: 'Threads, locks & the event loop',
    description:
      'The most confusing topic in programming, made visual — threads, locks, deadlocks, race conditions and async/await as execution timelines.',
    chips: ['Event Loop', 'Threads', 'Locks', 'Deadlocks', 'Async/Await'],
    meta: 'Coming soon',
    status: 'soon',
    badge: 'SOON',
  },
  {
    title: 'How the Internet Works',
    subtitle: 'From a URL to pixels',
    description:
      'A single fetch() down to bits on the wire and back — DNS, TCP, TLS, HTTP and the browser render pipeline. The network stops being a black box.',
    chips: ['DNS', 'TCP', 'TLS', 'HTTP', 'Render'],
    meta: 'Coming soon',
    status: 'soon',
    badge: 'SOON',
  },
]
