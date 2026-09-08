import type { Lesson } from '../types'

/** Topic: Rate Limiter (group: building-blocks). */

const rateLimiter: Lesson = {
  slug: 'rate-limiter',
  title: 'Token Bucket Algorithm',
  summary: 'Allow bursts up to a limit, then reject — refilling tokens over time.',
  group: 'building-blocks',
  topic: 'Rate Limiter',
  tier: 'free',
  minutes: 6,
  concept: 'Concept',
  tags: [
    { label: 'Pattern', value: 'Token bucket' },
    { label: 'Latency added', value: '< 1ms' },
    { label: 'Protection', value: 'Burst + sustained' },
  ],
  notes: [
    'A bucket holds up to N tokens; each request spends one.',
    'When the bucket is empty, extra requests are rejected with 429.',
    'Tokens refill at a fixed rate, so steady traffic always gets through.',
  ],
  scene: {
    code: [
      'bucket = 3          # capacity',
      'refill = 1 / sec',
      'on request:',
      '    if bucket > 0:',
      '        bucket -= 1; allow()',
      '    else:',
      '        reject(429)',
    ],
    initialState: { tokens: 3, allowed: 0, rejected: 0 },
    nodes: [
      { id: 'client', kind: 'client', label: 'Client', x: 14, y: 50 },
      { id: 'rl', kind: 'rateLimiter', label: 'Rate Limiter', x: 50, y: 50, badge: '3 tokens' },
      { id: 'svc', kind: 'server', label: 'Service', x: 86, y: 50 },
    ],
    edges: [
      { id: 'c-rl', from: 'client', to: 'rl' },
      { id: 'rl-svc', from: 'rl', to: 'svc' },
      { id: 'rl-c', from: 'rl', to: 'client', curve: 0.5 },
    ],
    steps: [
      { id: '1', caption: 'A request arrives with 3 tokens in the bucket.', travel: 'c-rl', token: 'request', codeLine: 4 },
      { id: '2', caption: 'A token is spent and the request is allowed through.', travel: 'rl-svc', token: 'request', codeLine: 5, patches: [{ nodeId: 'rl', badge: '2 tokens', highlight: true }], state: { tokens: 2, allowed: 1 } },
      { id: '3', caption: 'A rapid burst spends the remaining tokens…', travel: 'rl-svc', token: 'request', codeLine: 5, patches: [{ nodeId: 'rl', badge: '0 tokens', highlight: true }], state: { tokens: 0, allowed: 3 } },
      { id: '4', caption: 'Bucket empty — the next request is rejected with 429.', travel: 'rl-c', token: 'miss', codeLine: 7, patches: [{ nodeId: 'rl', badge: '429 ✗', highlight: true }], state: { rejected: 1 } },
      { id: '5', caption: 'Tokens refill over time, so steady traffic is always let through.', codeLine: 2, patches: [{ nodeId: 'rl', badge: '1 token', highlight: true }], state: { tokens: 1 } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'Rate limiting is how a service says "no" **before** it is in trouble. Without it, capacity is allocated first-come-first-served, which means one misbehaving client — a runaway retry loop, a scraper, a bug — can consume everything and degrade every other user.',
      'The token bucket is the dominant algorithm because it expresses the two things a real policy needs: a **sustained rate** and a **tolerance for bursts**. Most alternatives get one of those wrong.',
    ],
    sections: [
      {
        id: 'algorithms',
        heading: 'The four algorithms, and why bursts matter',
        blocks: [
          {
            kind: 'table',
            columns: ['Algorithm', 'Burst behaviour', 'Memory per key', 'Boundary problem'],
            rows: [
              ['Fixed window', 'Allows 2× at the boundary', 'One counter', 'Yes — the classic flaw'],
              ['Sliding window log', 'Exact', 'One timestamp per request', 'No'],
              ['Sliding window counter', 'Approximate, very close', 'Two counters', 'Effectively no'],
              ['Token bucket', 'Bursts up to bucket size', 'Tokens + timestamp', 'No'],
              ['Leaky bucket', 'None — perfectly smooth output', 'Queue', 'No'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'The fixed-window flaw is worth being able to describe precisely: with a limit of 100 per minute, a client can send 100 requests at 11:59:59 and another 100 at 12:00:00 — **200 requests in one second**, entirely within the rules. Any limiter using naive fixed windows has this hole.',
              'Token bucket avoids it because refill is continuous rather than stepped. Tokens accrue at a fixed rate and the bucket has a maximum; a client that has been idle accumulates up to that maximum and may spend it at once, then is throttled to the refill rate. That "save up and spend" behaviour is usually exactly what you want — it matches how real clients behave, with idle periods punctuated by page loads that fire several requests together.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'token_bucket.py — lazy refill, no background timer needed',
            lines: [
              'class TokenBucket:',
              '    def __init__(self, rate, capacity):',
              '        self.rate = rate            # tokens per second (sustained)',
              '        self.capacity = capacity    # max burst',
              '        self.tokens = capacity',
              '        self.updated = time.monotonic()',
              '',
              '    def allow(self, cost=1):',
              '        now = time.monotonic()',
              '        # Refill lazily: no timer, just arithmetic on elapsed time.',
              '        self.tokens = min(self.capacity,',
              '                          self.tokens + (now - self.updated) * self.rate)',
              '        self.updated = now',
              '',
              '        if self.tokens >= cost:',
              '            self.tokens -= cost',
              '            return True, 0',
              '        retry_after = (cost - self.tokens) / self.rate',
              '        return False, retry_after      # tell the client when to come back',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Weight requests by cost',
            body: [
              'Not all requests are equal. A search that scans a million rows should not cost the same token as a cached profile fetch. Charging a variable number of tokens — `cost=10` for expensive endpoints — turns a request limiter into a **capacity** limiter, which is what you actually care about protecting.',
            ],
          },
        ],
      },
      {
        id: 'dimension',
        heading: 'What to limit on',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The key you count against determines what the limiter actually protects, and picking the wrong one is more common than picking the wrong algorithm.',
            ],
          },
          {
            kind: 'table',
            columns: ['Key', 'Protects against', 'Fails when'],
            rows: [
              ['API key / user id', 'One tenant consuming everything', 'Unauthenticated traffic'],
              ['IP address', 'Anonymous abuse', 'NAT and mobile carriers share IPs; IPv6 makes rotation trivial'],
              ['IP + endpoint', 'Targeted abuse of expensive routes', 'Distributed attacks'],
              ['Session / device id', 'Per-user fairness pre-login', 'Trivially reset by the client'],
              ['Global (per service)', 'Total overload', 'Says nothing about fairness'],
            ],
            caption: 'Production systems layer several: a global ceiling, a per-tenant quota, and a per-endpoint cost limit.',
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'IP-based limits punish shared networks',
            body: [
              'A university, an office VPN or a mobile carrier NAT can put thousands of legitimate users behind one address. An IP limit tuned for individuals will block all of them, and the failure looks exactly like an outage to the affected users while every dashboard stays green.',
            ],
          },
        ],
      },
      {
        id: 'response',
        heading: 'Responding well when you throttle',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A rate limiter that returns a bare `429` teaches clients nothing, so they retry immediately and make things worse. The response is part of the design.',
            ],
          },
          {
            kind: 'code',
            language: 'http',
            caption: 'A throttled response a client can actually act on',
            lines: [
              'HTTP/1.1 429 Too Many Requests',
              'Retry-After: 3',
              'RateLimit-Limit: 100',
              'RateLimit-Remaining: 0',
              'RateLimit-Reset: 3',
              '',
              '{ "error": "rate_limited",',
              '  "message": "100 requests/min exceeded for this API key",',
              '  "docs": "https://api.example.com/docs/rate-limits" }',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Always send `Retry-After`.** It is the difference between a client backing off and a client hammering.',
              '**Expose the limit and remaining count on every response**, not just on rejections, so well-behaved clients can self-pace.',
              '**Reject cheaply.** The rejection path must not do a database lookup, or a flood of throttled requests still consumes real capacity.',
              '**Distinguish throttling from failure.** `429` is "slow down"; `503` is "we are broken". Clients treat them differently and should.',
              '**Consider queueing instead of rejecting** for internal callers — brief delay beats an error when the caller is one of yours.',
            ],
          },
        ],
      },
      {
        id: 'placement',
        heading: 'Where the limiter runs',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Rate limiting as far out as possible is usually right, because the whole point is to spend as little as possible on requests you will refuse. A limit enforced in application code has already paid for TLS, parsing, routing and often authentication.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Rejected at the CDN edge', value: '~0 origin cost' },
              { label: 'Rejected at the gateway', value: '~0.5 ms + one hop' },
              { label: 'Rejected in application middleware', value: '~2 ms + TLS + parse' },
              { label: 'Rejected after authentication lookup', value: '~10 ms + a DB query' },
              { label: 'Attack at 100k rps rejected in-app', value: '~200 s CPU per second', note: 'you are down' },
            ],
            result: 'The cost of saying no must be orders of magnitude below the cost of saying yes.',
          },
        ],
      },
    ],
    whenNotToUse: [
      'Do not rate limit internal, trusted, latency-critical calls where backpressure or a concurrency limit is a better fit.',
      'Avoid IP-based limits as the only defence for user-facing apps — shared networks make false positives certain.',
      'Do not apply one global limit to endpoints with wildly different costs; weight by cost instead.',
      'Do not enforce limits deep in application code for abuse traffic; the request has already cost you almost everything by then.',
    ],
    failureModes: [
      {
        name: 'Fixed-window boundary burst',
        symptom: 'Clients briefly achieve double the configured rate.',
        cause: 'Counters reset on a wall-clock boundary, so two windows can be fully consumed back to back.',
        fix: 'Token bucket or sliding window counter — both remove the reset edge.',
      },
      {
        name: 'Shared-IP false positives',
        symptom: 'A whole office or campus is blocked simultaneously.',
        cause: 'Per-IP limits applied to NATed users.',
        fix: 'Prefer authenticated identity; raise or exempt limits for known shared ranges; combine signals.',
      },
      {
        name: 'Expensive rejection',
        symptom: 'The service degrades even though it is rejecting most traffic.',
        cause: 'The 429 path performs authentication or database work.',
        fix: 'Move enforcement to the edge and make the reject path allocation-free.',
      },
      {
        name: 'Retry loop against the limit',
        symptom: 'Throttled clients generate more traffic than unthrottled ones.',
        cause: 'No `Retry-After`, so clients retry immediately in lockstep.',
        fix: 'Send `Retry-After`, require jittered backoff, and escalate to longer blocks for repeat offenders.',
      },
    ],
    interview: [
      {
        q: 'Which rate limiting algorithm would you choose?',
        a: [
          'Token bucket, in most cases. It expresses a sustained rate and a burst allowance separately, which matches how clients actually behave — idle, then several requests at once when a page loads.',
          'I would avoid fixed windows because of the boundary problem: with 100 per minute, a client can send 100 at the end of one window and 100 at the start of the next, so 200 in a second is permitted.',
          'If I needed perfectly smooth downstream load rather than fairness, I would use a leaky bucket, since it shapes output to a constant rate.',
        ],
        followUps: ['How do you make that work across 50 instances?'],
      },
      {
        q: 'What do you count against — IP or user?',
        a: [
          'Authenticated identity wherever it exists: API key, user id or tenant, because that is what maps to a business quota and cannot be trivially rotated.',
          'IP is the fallback for unauthenticated traffic, but I would treat it carefully — NAT and carrier networks put many legitimate users behind one address, so IP limits tuned for an individual will block an entire office.',
          'In practice I would layer them: a global ceiling to protect the service, a per-tenant quota for fairness, and per-endpoint cost weighting so expensive routes drain the budget faster.',
        ],
      },
      {
        q: 'Where should the limiter live?',
        a: [
          'As far towards the edge as the required identity allows. The purpose is to spend as little as possible on requests we will refuse, and by the time a request reaches application middleware we have already paid for TLS, parsing and routing.',
          'So the gateway or CDN is the usual home. If a limit needs information only the service has, I would still enforce a coarse limit at the edge and a precise one inside.',
        ],
      },
    ],
    references: [
      { label: 'Stripe — Scaling your API with rate limiters', href: 'https://stripe.com/blog/rate-limiters' },
      { label: 'IETF — RateLimit header fields for HTTP', href: 'https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/' },
    ],
  },
}

const rlSlidingWindow: Lesson = {
  slug: 'rate-limiter-sliding-window',
  title: 'Sliding Window Counter',
  summary: 'More precise than token bucket — counts exact requests in the last N seconds.',
  group: 'building-blocks',
  topic: 'Rate Limiter',
  tier: 'free',
  minutes: 6,
  concept: 'Concept',
  tags: [
    { label: 'Algorithm', value: 'Sliding window' },
    { label: 'Precision', value: 'Exact count' },
    { label: 'Problem solved', value: 'Fixed window burst' },
  ],
  notes: [
    'Fixed window flaw: 100 req/min limit but a burst at 0:59 and 1:01 lets through 200 in 2 seconds.',
    'Sliding window counts the exact number of requests in the last 60 seconds, not the current minute.',
    'Slightly more memory (stores per-second buckets) but much more accurate protection.',
  ],
  scene: {
    code: [
      '# FIXED window flaw:',
      'window = current_minute   # resets at :00',
      'if count[window] < 100: allow()',
      '',
      '# SLIDING window fix:',
      'now = time()',
      'count = requests_in_range(now - 60s, now)',
      'if count < 100: allow()',
    ],
    initialState: { algorithm: 'fixed window', 'requests in window': 0, limit: 100 },
    nodes: [
      { id: 'client', kind: 'client', label: 'Client', x: 12, y: 50 },
      { id: 'rl', kind: 'rateLimiter', label: 'Rate Limiter', x: 50, y: 50, badge: '0 / 100' },
      { id: 'svc', kind: 'server', label: 'Service', x: 86, y: 50 },
    ],
    edges: [
      { id: 'c-rl', from: 'client', to: 'rl' },
      { id: 'rl-svc', from: 'rl', to: 'svc' },
      { id: 'rl-c', from: 'rl', to: 'client', curve: 0.5 },
    ],
    steps: [
      { id: '1', caption: 'Fixed window flaw: 50 requests arrive at 0:59 — still in minute 0. All pass.', travel: 'c-rl', token: 'request', codeLine: 3, patches: [{ nodeId: 'rl', badge: '50 / 100', highlight: true }], state: { algorithm: 'fixed window', 'requests in window': 50 } },
      { id: '2', caption: '50 more arrive at 1:01 — new minute, counter reset to 0. All pass too!', travel: 'rl-svc', token: 'request', codeLine: 3, patches: [{ nodeId: 'rl', badge: '50 / 100 ⚠', highlight: true }], state: { 'requests in window': 100 } },
      { id: '3', caption: '100 requests got through in just 2 seconds — twice the intended rate. Fixed windows can be gamed.', patches: [{ nodeId: 'rl', badge: '100 in 2s ⚠', highlight: true }] },
      { id: '4', caption: 'Sliding window: count requests in the last 60 seconds, not the current minute.', codeLine: 7, state: { algorithm: 'sliding window', 'requests in window': 50 }, patches: [{ nodeId: 'rl', badge: '50 / 100', highlight: true }] },
      { id: '5', caption: 'At 1:01, the 50 requests from 0:59 are still inside the 60s window. Count = 100. Reject!', travel: 'rl-c', token: 'miss', codeLine: 8, patches: [{ nodeId: 'rl', badge: '429 ✗ 100/100', highlight: true }], state: { 'requests in window': 100 } },
      { id: '6', caption: 'As old requests age out of the window, new ones are allowed. Precise, smooth protection.', patches: [{ nodeId: 'rl', badge: '60 / 100', highlight: true }], state: { 'requests in window': 60 } },
    ],
  },
  deepDive: {
    readingMinutes: 8,
    intro: [
      'The sliding window counter exists to fix the fixed window\'s boundary hole **without** paying the memory cost of storing every request timestamp. It is the algorithm most large API providers actually run, because it is accurate to within a percent or so while using two integers per key.',
      'It is also the cleanest illustration of a recurring systems trade: an approximation that is cheap, bounded and explainable beats an exact answer that costs a hundred times more memory.',
    ],
    sections: [
      {
        id: 'exact',
        heading: 'Why not just store the timestamps?',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The exact algorithm — a **sliding window log** — keeps a timestamp per request, discards those older than the window, and counts what remains. It is perfectly accurate and trivially correct.',
              'It is also proportional to traffic in memory, which makes it unusable at scale: the cost of tracking a client grows with how much that client sends, so exactly the clients you most want to limit are the most expensive to track.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Limit', value: '1,000 req/min' },
              { label: 'Bytes per stored timestamp', value: '~16', note: 'plus set overhead' },
              { label: 'Memory per fully-active key', value: '~16 KB' },
              { label: 'Active keys', value: '1 M' },
              { label: 'Sliding window log total', value: '~16 GB' },
              { label: 'Sliding window counter total', value: '~50 MB', note: 'two counters per key' },
            ],
            result: 'Approximation buys a 300× memory reduction for roughly 1% error.',
          },
        ],
      },
      {
        id: 'how',
        heading: 'The weighted-count trick',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Keep two counters: the current fixed window and the previous one. Then estimate the sliding count by weighting the previous window by however much of it still falls inside the sliding period.',
              'If you are 30 seconds into the current minute, the last 60 seconds consist of all of the current window so far plus 50% of the previous one. The estimate is `current + previous × (1 − elapsed_fraction)` — and it removes the boundary burst, because the previous window\'s traffic keeps counting as it decays out rather than vanishing at the reset.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'sliding_window.py — two counters, atomic in Redis',
            lines: [
              'LUA = """',
              'local now      = tonumber(ARGV[1])',
              'local window   = tonumber(ARGV[2])   -- seconds',
              'local limit    = tonumber(ARGV[3])',
              '',
              'local cur_key  = KEYS[1]             -- rl:{id}:<current window index>',
              'local prev_key = KEYS[2]             -- rl:{id}:<previous window index>',
              '',
              'local elapsed  = (now % window) / window',
              'local prev     = tonumber(redis.call("GET", prev_key) or "0")',
              'local cur      = tonumber(redis.call("GET", cur_key) or "0")',
              '',
              'local estimate = prev * (1 - elapsed) + cur',
              'if estimate >= limit then',
              '  return {0, math.ceil((1 - elapsed) * window)}   -- denied, retry_after',
              'end',
              '',
              'redis.call("INCR", cur_key)',
              'redis.call("EXPIRE", cur_key, window * 2)',
              'return {1, 0}',
              '"""',
              '',
              '# One round trip, atomic: no read-modify-write race between instances.',
              'allowed, retry_after = redis.eval(LUA, 2, cur_key, prev_key, now, 60, 1000)',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'The error is bounded and one-directional in a knowable way',
            body: [
              'The approximation assumes the previous window\'s requests were spread evenly. If they were actually clustered at its start, the estimate over-counts and you throttle slightly early; if clustered at its end, it under-counts. Cloudflare measured this at well under 1% of requests misclassified in production — a rounding error against the memory saved.',
            ],
          },
        ],
      },
      {
        id: 'distributed',
        heading: 'Making it correct across many instances',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A limiter is only meaningful if all instances count against the same budget. Independent per-instance counters multiply the limit by the instance count — a "100 per minute" policy on 20 servers is really 2,000 per minute, and it changes silently whenever you autoscale.',
              'Centralising in Redis fixes correctness but puts a network call on the request path and creates a dependency. The three viable shapes, in increasing sophistication:',
            ],
          },
          {
            kind: 'table',
            columns: ['Approach', 'Accuracy', 'Latency cost', 'Behaviour if the store is down'],
            rows: [
              ['Per-instance counters', 'Wrong by instance count', 'Zero', 'Unaffected'],
              ['Central Redis, checked per request', 'Exact', '~0.5 ms per request', 'Must fail open or closed — decide'],
              ['Local budget + periodic sync', 'Approximate, bounded', 'Near zero', 'Degrades to local limits'],
              ['Local + async global correction', 'Very close', 'Near zero', 'Graceful'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'The third row is what large systems converge on. Each instance is granted a share of the global budget, enforces it locally with no network call, and reconciles with the shared store every few hundred milliseconds. You lose exactness at the boundary and gain independence from the store on the hot path.',
            ],
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Decide fail-open versus fail-closed in advance',
            body: [
              'If Redis is unavailable, does traffic flow unlimited or stop entirely? For protecting against accidental overload, fail open — a rate limiter should not be able to cause the outage it exists to prevent. For quota enforcement with billing or abuse implications, fail closed. Either answer is defensible; not having decided is not.',
            ],
          },
        ],
      },
      {
        id: 'choosing',
        heading: 'Picking between the algorithms in practice',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Token bucket** when clients legitimately burst and you want to allow it — user-facing APIs, SDK traffic.',
              '**Sliding window counter** when you want a simple "N per period" contract that is easy to document and cheap to run — public API quotas.',
              '**Sliding window log** when the limit is small and exactness matters — login attempts, password resets, OTP sends.',
              '**Leaky bucket** when the goal is protecting a downstream system that needs smooth input rather than fairness between clients.',
              '**Concurrency limits** rather than rate limits when the resource is long-lived work: three simultaneous exports per user is a better constraint than thirty per hour.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Explain the memory trade, not just the mechanism',
            body: [
              'Anyone can describe two counters. The stronger answer is why: an exact log costs memory proportional to traffic, so the heaviest clients cost the most to track, whereas the counter approach is O(1) per key with sub-1% error — and then noting that Cloudflare and others run exactly this in production.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Security-critical counters where an approximation is unacceptable — login attempts and OTP sends should use an exact log.',
      'Very low limits (say, 5 per hour), where a 1% error is a meaningful fraction of the budget.',
      'When clients need burst tolerance as an explicit product feature — token bucket expresses that far better.',
      'Where a network call per request is unacceptable and no local-budget scheme is in place.',
    ],
    failureModes: [
      {
        name: 'Limit multiplied by instance count',
        symptom: 'Clients sustain far more than the documented rate, and it changes when the fleet scales.',
        cause: 'Per-instance in-memory counters with no shared state.',
        fix: 'Centralise in Redis, or grant each instance a share of the global budget and reconcile periodically.',
      },
      {
        name: 'Race between read and increment',
        symptom: 'Concurrent requests slip past the limit under load.',
        cause: 'Non-atomic get-then-set against the shared store.',
        fix: 'Do the check and increment in one atomic operation — a Lua script or INCR with a conditional.',
      },
      {
        name: 'Rate limiter causes the outage',
        symptom: 'All traffic is rejected because the counter store is unavailable.',
        cause: 'Fail-closed behaviour on a limiter meant only to prevent accidental overload.',
        fix: 'Fail open for protective limits, with a conservative local fallback; reserve fail-closed for quota and abuse enforcement.',
      },
      {
        name: 'Hot key on the limiter store',
        symptom: 'One Redis shard saturates while others idle.',
        cause: 'A global limit, or one very large tenant, concentrated on a single key.',
        fix: 'Shard the counter across N sub-keys and sum, or enforce that limit locally with periodic reconciliation.',
      },
    ],
    interview: [
      {
        q: 'How does a sliding window counter avoid the fixed-window boundary problem?',
        a: [
          'It keeps the current and previous window counts and weights the previous one by how much of it still falls inside the sliding period. Thirty seconds into a minute, the estimate is the current count plus half the previous count.',
          'Because the previous window decays out gradually instead of resetting to zero, there is no instant at which a client\'s budget doubles — which is exactly the hole a fixed window has.',
        ],
        followUps: ['How accurate is that approximation, and when would it not be good enough?'],
      },
      {
        q: 'How do you rate limit across 50 application instances?',
        a: [
          'Counters must be shared, otherwise the effective limit is the configured limit times the instance count and it changes whenever we autoscale — which is a silent correctness bug.',
          'The simple version is a central Redis with an atomic check-and-increment in a Lua script, so there is no read-modify-write race. That costs about half a millisecond per request and makes Redis a dependency.',
          'At higher volume I would give each instance a share of the global budget to enforce locally and reconcile asynchronously every few hundred milliseconds. That removes the hot-path call and degrades gracefully when the store is unavailable.',
        ],
      },
      {
        q: 'The rate limiter\'s Redis goes down. What happens?',
        a: [
          'That has to be a deliberate decision, not an accident. For limits that exist to prevent accidental overload I would fail open, because a rate limiter should never be able to cause the outage it was installed to prevent — with a conservative local fallback so we are not entirely unprotected.',
          'For quota enforcement tied to billing or abuse prevention I would fail closed, since allowing unlimited use has a direct cost.',
          'Either way I would alert on it immediately, since the system is running without its intended protection.',
        ],
      },
    ],
    references: [
      { label: 'Cloudflare — How we built rate limiting capable of scaling to millions of domains', href: 'https://blog.cloudflare.com/counting-things-a-lot-of-different-things/' },
      { label: 'Redis — Rate limiting patterns', href: 'https://redis.io/docs/latest/develop/use/patterns/' },
    ],
  },
}

// ── 3. Distributed rate limiting ─────────────────────────────────────────────

const distributed: Lesson = {
  slug: 'rate-limiter-distributed',
  title: 'Distributed Rate Limiting',
  summary: 'Fifty instances, one budget — without a Redis round trip on every request.',
  group: 'building-blocks',
  topic: 'Rate Limiter',
  tier: 'pro',
  minutes: 8,
  concept: 'Concept',
  tags: [
    { label: 'Bug', value: 'Limit × instance count' },
    { label: 'Exact', value: 'Atomic Redis script' },
    { label: 'Fast', value: 'Local budget + sync' },
  ],
  notes: [
    'Per-instance counters silently multiply the limit by the fleet size — and it changes when you autoscale.',
    'A central store gives exactness at the cost of a network hop and a hard dependency.',
    'Local budgets with periodic reconciliation give near-exactness with no hot-path call.',
  ],
  scene: {
    code: [
      '# WRONG: each instance counts alone',
      'local_count[user] += 1        # limit x N',
      '',
      '# EXACT: one atomic script, shared store',
      'allowed = redis.eval(LUA, key, limit)',
      '',
      '# FAST: claim a slice, reconcile later',
      'if local_budget > 0: local_budget -= 1',
      'else: local_budget = claim(from_redis)',
    ],
    initialState: { instances: 3, 'configured limit': '100/min', 'actual limit': '300/min', mode: 'per-instance' },
    nodes: [
      { id: 'client', kind: 'client', label: 'One client', x: 10, y: 50 },
      { id: 'lb', kind: 'loadBalancer', label: 'Load balancer', x: 32, y: 50 },
      { id: 'a1', kind: 'server', label: 'Instance 1', x: 60, y: 18, badge: '0/100' },
      { id: 'a2', kind: 'server', label: 'Instance 2', x: 60, y: 50, badge: '0/100' },
      { id: 'a3', kind: 'server', label: 'Instance 3', x: 60, y: 82, badge: '0/100' },
      { id: 'redis', kind: 'cache', label: 'Shared counters', x: 90, y: 50, badge: 'unused' },
    ],
    edges: [
      { id: 'c-lb', from: 'client', to: 'lb' },
      { id: 'lb-a1', from: 'lb', to: 'a1', curve: -0.3 },
      { id: 'lb-a2', from: 'lb', to: 'a2' },
      { id: 'lb-a3', from: 'lb', to: 'a3', curve: 0.3 },
      { id: 'a2-r', from: 'a2', to: 'redis' },
      { id: 'a1-r', from: 'a1', to: 'redis', curve: -0.25 },
    ],
    steps: [
      { id: '1', caption: 'The policy says 100 requests per minute per client. Each instance keeps its own counter.', codeLine: 2, patches: [{ nodeId: 'a1', badge: '0/100' }], state: { mode: 'per-instance' } },
      { id: '2', caption: 'The load balancer spreads the client across all three, so each sees only a third of its traffic.', travel: 'lb-a2', token: 'request', patches: [{ nodeId: 'a2', badge: '100/100', highlight: true }] },
      { id: '3', caption: 'All three fill up independently. The client actually gets 300 per minute.', patches: [{ nodeId: 'a1', badge: '100/100' }, { nodeId: 'a3', badge: '100/100', highlight: true }], state: { 'actual limit': '300/min' } },
      { id: '4', caption: 'Autoscale to ten instances and the limit silently becomes 1,000 — nobody changed any config.', patches: [{ nodeId: 'a2', badge: 'x10 instances', highlight: true }], state: { instances: 10, 'actual limit': '1000/min' } },
      { id: '5', caption: 'Exact fix: one shared counter, incremented by an atomic script so there is no read-modify-write race.', travel: 'a2-r', token: 'request', codeLine: 5, patches: [{ nodeId: 'redis', badge: 'user:42 → 100', highlight: true }], state: { mode: 'central', 'actual limit': '100/min' } },
      { id: '6', caption: 'Correct, but every request now pays ~0.5 ms and depends on Redis being up.', travel: 'a2-r', token: 'miss', patches: [{ nodeId: 'redis', badge: '+0.5 ms/req ⚠', highlight: true }] },
      { id: '7', caption: 'Fast fix: each instance claims a slice of the budget, spends it locally, and reconciles in the background.', codeLine: 8, patches: [{ nodeId: 'a1', badge: 'budget 33', highlight: true }, { nodeId: 'a2', badge: 'budget 33' }, { nodeId: 'a3', badge: 'budget 34' }], state: { mode: 'local + sync', 'actual limit': '~100/min' } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'A rate limit is a statement about the **whole system**, but it is enforced by individual processes. Reconciling those two facts is the entire problem, and getting it wrong produces a bug that is invisible in code review: the limit is simply not the number you configured.',
      'Worse, the error scales with your fleet. A policy that was roughly right at three instances becomes ten times too permissive after an autoscaling event that nobody associated with rate limiting.',
    ],
    sections: [
      {
        id: 'naive',
        heading: 'Why per-instance counters are a correctness bug',
        blocks: [
          {
            kind: 'prose',
            body: [
              'In-memory counters are appealing: no dependency, no latency, trivial code. They are also wrong whenever more than one instance serves the same client, because each instance sees only a fraction of that client\'s traffic and each independently permits the full quota.',
              'The effective limit becomes `configured × instances`, and because instance count varies with load, **the limit varies with load** — it is loosest exactly when the system is busiest and most needs protection.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Configured limit', value: '100 /min' },
              { label: 'Instances at low traffic', value: '3' },
              { label: 'Effective limit', value: '300 /min' },
              { label: 'Instances at peak', value: '20' },
              { label: 'Effective limit at peak', value: '2,000 /min', note: '20× intended' },
              { label: 'Naive workaround: limit ÷ instances', value: 'Breaks when instances die' },
            ],
            result: 'The protection weakens precisely when you need it most.',
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Dividing the limit by instance count is not a fix',
            body: [
              'Setting each instance to `limit / N` looks reasonable and fails badly: traffic is not perfectly balanced, so a client whose requests land unevenly is throttled far below the real limit, and if an instance dies the remaining ones enforce a total below the policy. It also requires every instance to know N, which changes constantly.',
            ],
          },
        ],
      },
      {
        id: 'central',
        heading: 'Centralised counters: exact, at a price',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The straightforward correct answer is one shared store — Redis, usually — holding the counter. The essential detail is **atomicity**: a `GET` followed by an `INCR` from two instances can both read the same value and both allow, so the check and the increment must happen as one operation.',
              'A Lua script gives you that: Redis executes it atomically, so the decision and the state change cannot interleave. It is also one round trip rather than two, which halves the latency cost.',
            ],
          },
          {
            kind: 'code',
            language: 'lua',
            caption: 'token_bucket.lua — atomic check, refill and consume in one round trip',
            lines: [
              '-- KEYS[1] = bucket key   ARGV = now, rate, capacity, cost',
              'local now      = tonumber(ARGV[1])',
              'local rate     = tonumber(ARGV[2])   -- tokens per second',
              'local capacity = tonumber(ARGV[3])',
              'local cost     = tonumber(ARGV[4])',
              '',
              'local state   = redis.call("HMGET", KEYS[1], "tokens", "ts")',
              'local tokens  = tonumber(state[1]) or capacity',
              'local last    = tonumber(state[2]) or now',
              '',
              '-- Lazy refill: pure arithmetic, no background timer.',
              'tokens = math.min(capacity, tokens + (now - last) * rate)',
              '',
              'if tokens < cost then',
              '  local retry = (cost - tokens) / rate',
              '  return {0, tostring(retry)}                    -- denied',
              'end',
              '',
              'redis.call("HMSET", KEYS[1], "tokens", tokens - cost, "ts", now)',
              'redis.call("EXPIRE", KEYS[1], math.ceil(capacity / rate) * 2)',
              'return {1, "0"}                                   -- allowed',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Cost:** roughly 0.5 ms added to every request, and the store becomes a dependency of every endpoint you limit.',
              '**Hot keys:** a global limit is one key, so one Redis shard takes all the traffic. Shard the counter across N sub-keys and sum, or handle global limits locally.',
              '**Failure policy:** decide fail-open or fail-closed per limit, in advance. Protective limits should fail open; billing quotas should fail closed.',
              '**Key expiry matters:** set a TTL or the keyspace grows without bound as clients come and go.',
            ],
          },
        ],
      },
      {
        id: 'local',
        heading: 'Local budgets: near-exact without the hop',
        blocks: [
          {
            kind: 'prose',
            body: [
              'At high request rates, a network call per request to decide whether to *do* a network call is poor economics. The standard optimisation is for each instance to **claim a slice of the global budget**, spend it locally with no coordination, and reconcile with the shared store periodically.',
              'The accuracy loss is bounded by how much each instance may hold un-reconciled. Sync every 200 ms and the worst-case overshoot is roughly one sync interval of traffic — a rounding error against a per-minute limit, and dramatically cheaper.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Global limit', value: '10,000 /min' },
              { label: 'Instances', value: '20' },
              { label: 'Slice per instance', value: '500' },
              { label: 'Sync interval', value: '200 ms' },
              { label: 'Redis calls per second (central)', value: '~50,000' },
              { label: 'Redis calls per second (local + sync)', value: '~100' },
              { label: 'Worst-case overshoot', value: '< 1%' },
            ],
            result: 'Three orders of magnitude fewer store operations for under one percent of error.',
          },
          {
            kind: 'prose',
            body: [
              'The refinement that makes this work in practice is **demand-based allocation**: instances report their consumption rate, and the next allocation is proportional to it. An instance receiving heavy traffic from one client gets a larger share than an idle one, so the fleet converges on the right split without central routing.',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'This is the same shape as connection pooling and write-back caching',
            body: [
              'Claim a batch, work locally, reconcile asynchronously. It appears wherever coordination is correct but too expensive per operation — id allocation ranges, write-back caches, local budgets. Recognising the pattern lets you apply it deliberately rather than rediscovering it.',
            ],
          },
        ],
      },
      {
        id: 'placement',
        heading: 'Layering limits across the stack',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Real systems do not pick one approach — they layer several, each enforcing a different concern at the cheapest place it can be enforced.',
            ],
          },
          {
            kind: 'table',
            columns: ['Layer', 'Enforces', 'Mechanism', 'Accuracy needed'],
            rows: [
              ['CDN / edge', 'Volumetric abuse, per-IP floods', 'Edge-local counters', 'Approximate is fine'],
              ['Gateway', 'Per-user and per-tenant quotas', 'Local budget + Redis sync', 'Close to exact'],
              ['Service', 'Per-endpoint cost limits', 'In-process concurrency limits', 'Approximate'],
              ['Database / dependency', 'Total concurrency', 'Connection pool size', 'Exact by construction'],
            ],
            caption: 'Each layer catches what the one above cannot see, at a cost proportional to how far in the request has travelled.',
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Lead with the multiplication bug',
            body: [
              'Most candidates describe an algorithm. Opening with "the first problem is that in-memory counters multiply the limit by instance count, so the policy silently loosens when we autoscale" identifies the actual production failure — and then the algorithm discussion has a purpose.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Centralised per-request checks on extremely high-throughput paths — the store call can cost more than the work it guards.',
      'Local budgets for security-critical limits like login attempts, where the sync-interval overshoot is unacceptable.',
      'A single shared key for a global limit; it creates a hot shard that becomes its own bottleneck.',
      'Fail-closed behaviour on protective limits — the limiter then causes the outage it exists to prevent.',
    ],
    failureModes: [
      {
        name: 'Silent limit multiplication',
        symptom: 'Clients sustain many times the documented rate; the multiple tracks fleet size.',
        cause: 'In-memory per-instance counters.',
        fix: 'Shared counters, or local budgets allocated from a shared total.',
      },
      {
        name: 'Read-modify-write race',
        symptom: 'Bursts of concurrent requests exceed the limit even with a shared store.',
        cause: 'Separate GET and INCR calls interleaving between instances.',
        fix: 'A Lua script or single atomic command that checks and increments together.',
      },
      {
        name: 'Limiter store outage takes down the API',
        symptom: 'Every request fails when Redis is unavailable.',
        cause: 'Fail-closed default on a protective limit.',
        fix: 'Fail open with a conservative local fallback; reserve fail-closed for quota and billing enforcement.',
      },
      {
        name: 'Hot counter key',
        symptom: 'One Redis shard saturates while the rest are idle.',
        cause: 'A global or very-large-tenant limit concentrated on a single key.',
        fix: 'Shard the counter across sub-keys and aggregate, or enforce that limit with local budgets.',
      },
    ],
    interview: [
      {
        q: 'You run 50 instances behind a load balancer. How do you enforce 100 requests per minute per user?',
        a: [
          'Not with in-memory counters — each instance would see a fraction of the user\'s traffic and permit the full quota, so the effective limit becomes five thousand a minute, and it changes whenever we autoscale.',
          'The exact approach is a shared counter in Redis, updated by an atomic Lua script so the check and increment cannot interleave between instances. That costs about half a millisecond per request and makes Redis a dependency.',
          'At high volume I would move to local budgets: each instance claims a slice of the global limit, spends it without any network call, and reconciles every couple of hundred milliseconds. That cuts store traffic by orders of magnitude for well under one percent of overshoot.',
        ],
        followUps: ['How do you allocate the slices when traffic is uneven across instances?'],
      },
      {
        q: 'Why is a Lua script better than GET then INCR?',
        a: [
          'Because the two-call version has a race: two instances can both read the same count, both conclude there is room, and both allow — so under concurrency the limit leaks.',
          'Redis executes a script atomically, so the read, the decision and the write happen as one indivisible operation. It also halves the round trips, which matters when you are paying this cost on every request.',
        ],
      },
      {
        q: 'What happens when the rate limiter\'s store is unavailable?',
        a: [
          'That must be a deliberate, per-limit decision. For limits protecting against accidental overload I would fail open, with a conservative in-process fallback, because a rate limiter should never be able to cause the outage it exists to prevent.',
          'For quota enforcement tied to billing or abuse prevention, failing open has direct cost, so I would fail closed and accept the availability hit.',
          'Either way it needs to alert immediately, since the system is then running without its intended protection.',
        ],
      },
    ],
    references: [
      { label: 'Cloudflare — How we built rate limiting at scale', href: 'https://blog.cloudflare.com/counting-things-a-lot-of-different-things/' },
      { label: 'Redis — Lua scripting and atomicity', href: 'https://redis.io/docs/latest/develop/interact/programmability/eval-intro/' },
    ],
  },
}

// ── 4. Leaky bucket & traffic shaping ────────────────────────────────────────

const leakyBucket: Lesson = {
  slug: 'rate-limiter-leaky-bucket',
  title: 'Leaky Bucket & Traffic Shaping',
  summary: 'Smooth a spiky input into a constant output — protect what cannot absorb bursts.',
  group: 'building-blocks',
  topic: 'Rate Limiter',
  tier: 'pro',
  minutes: 7,
  concept: 'Concept',
  tags: [
    { label: 'Output', value: 'Perfectly constant' },
    { label: 'Cost', value: 'Queueing delay' },
    { label: 'Protects', value: 'Fragile downstreams' },
  ],
  notes: [
    'Token bucket allows bursts; leaky bucket forbids them — the output rate never varies.',
    'Excess requests queue rather than being rejected, so latency absorbs what throughput cannot.',
    'Use it when the thing downstream is what you are protecting, not when fairness between clients is the goal.',
  ],
  scene: {
    code: [
      '# leaky bucket: queue in, constant out',
      'if len(queue) >= capacity:',
      '    return 429            # bucket overflows',
      'queue.append(request)',
      '',
      'every 1/rate seconds:     # the leak',
      '    send(queue.popleft())',
    ],
    initialState: { 'input rate': '0/s', 'output rate': '50/s', queued: 0, 'downstream': 'idle' },
    nodes: [
      { id: 'clients', kind: 'client', label: 'Clients', x: 10, y: 50 },
      { id: 'bucket', kind: 'queue', label: 'Leaky bucket', x: 44, y: 50, badge: 'empty · cap 500' },
      { id: 'legacy', kind: 'server', label: 'Legacy SOAP API', x: 82, y: 32, badge: '50/s max' },
      { id: 'db', kind: 'database', label: 'Their database', x: 92, y: 76 },
    ],
    edges: [
      { id: 'c-b', from: 'clients', to: 'bucket' },
      { id: 'b-l', from: 'bucket', to: 'legacy' },
      { id: 'l-db', from: 'legacy', to: 'db', curve: 0.25 },
      { id: 'b-c', from: 'bucket', to: 'clients', curve: 0.5 },
    ],
    steps: [
      { id: '1', caption: 'A partner API tolerates exactly 50 requests/sec. Above that they rate limit us for an hour.', patches: [{ nodeId: 'legacy', badge: '50/s max', highlight: true }], state: { 'output rate': '50/s' } },
      { id: '2', caption: 'Our traffic is bursty: 400/sec for ten seconds, then nothing.', travel: 'c-b', token: 'request', patches: [{ nodeId: 'bucket', badge: '350 queued', highlight: true }], state: { 'input rate': '400/s', queued: 350 } },
      { id: '3', caption: 'A token bucket would let that burst straight through and get us blocked.', patches: [{ nodeId: 'legacy', badge: '✗ blocked 1h', highlight: true }], state: { downstream: 'blocked' } },
      { id: '4', caption: 'The leaky bucket queues instead. Output stays at exactly 50/sec regardless of input.', travel: 'b-l', token: 'request', codeLine: 7, patches: [{ nodeId: 'legacy', badge: '50/s ✓', highlight: true }], state: { 'output rate': '50/s', downstream: 'healthy' } },
      { id: '5', caption: 'The 350 queued requests drain over seven seconds. Latency absorbed the burst.', patches: [{ nodeId: 'bucket', badge: '120 queued' }], state: { queued: 120 } },
      { id: '6', caption: 'If the burst outlasts the bucket, it overflows and we reject — bounded, not unbounded.', travel: 'b-c', token: 'miss', codeLine: 3, patches: [{ nodeId: 'bucket', badge: '500/500 · shedding', highlight: true }], state: { queued: 500 } },
      { id: '7', caption: 'Constant downstream pressure, bounded queue, predictable behaviour under any input.', patches: [{ nodeId: 'bucket', badge: 'empty' }, { nodeId: 'legacy', badge: '50/s ✓' }], state: { queued: 0, 'input rate': '0/s', downstream: 'healthy' } },
    ],
  },
  deepDive: {
    readingMinutes: 8,
    intro: [
      'Token bucket and leaky bucket are often presented as interchangeable. They are opposites. Token bucket **permits bursts** — that is its defining feature. Leaky bucket **eliminates them**, producing a perfectly constant output rate no matter how spiky the input.',
      'The choice follows from what you are protecting. Limiting a client for fairness? Token bucket, because real clients legitimately burst. Protecting a downstream that falls over above a fixed rate? Leaky bucket, because a burst is exactly what you must not pass on.',
    ],
    sections: [
      {
        id: 'contrast',
        heading: 'The two buckets, side by side',
        blocks: [
          {
            kind: 'table',
            columns: ['', 'Token bucket', 'Leaky bucket'],
            rows: [
              ['Metaphor', 'Tokens accumulate; spend to send', 'Requests pour in; drip out at a fixed rate'],
              ['Burst behaviour', 'Allowed, up to bucket size', 'Impossible — output is constant'],
              ['Excess requests', 'Rejected immediately', 'Queued until the buffer is full'],
              ['Latency added', 'None', 'Queueing delay, proportional to depth'],
              ['Output shape', 'As spiky as the input', 'Perfectly smooth'],
              ['Protects', 'The service from a client', 'A downstream from everyone'],
              ['Idle behaviour', 'Accrues credit for later', 'Accrues nothing'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'The consequence people miss: leaky bucket converts a **throughput** problem into a **latency** problem. Nothing is rejected until the queue is full, but everything waits. That is exactly the right trade when the alternative is having a fragile downstream refuse you for an hour — and exactly the wrong one on an interactive path where the user is watching.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Leak rate', value: '50 /s' },
              { label: 'Burst', value: '400 /s for 10 s' },
              { label: 'Requests arriving', value: '4,000' },
              { label: 'Drained during the burst', value: '500' },
              { label: 'Queued at the end', value: '3,500' },
              { label: 'Time to fully drain', value: '70 s' },
              { label: 'Wait for the last request', value: '~70 s' },
            ],
            result: 'Smoothing is only free if the burst is small relative to the drain rate.',
          },
        ],
      },
      {
        id: 'sizing',
        heading: 'Sizing the bucket',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The bucket depth is a **latency budget expressed as a queue length**. Depth divided by leak rate is the worst-case wait, so choose the depth from the delay you can tolerate rather than from a round number.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Leak rate', value: '50 /s' },
              { label: 'Acceptable worst-case delay', value: '10 s' },
              { label: 'Bucket depth', value: '500' },
              { label: 'Depth 5,000 instead', value: '100 s wait', note: 'past every client timeout' },
              { label: 'Useful work at depth 5,000', value: 'near zero' },
            ],
            result: 'A queue deeper than the client timeout is a machine for discarding completed work.',
          },
          {
            kind: 'list',
            items: [
              '**Bound by time, not just length.** Drop items that have waited longer than the caller\'s timeout *before* processing them — finishing work nobody is waiting for is worse than not starting it.',
              '**Reject at the tail when full.** Overflow should be a fast, cheap `429` with `Retry-After`, not a block on the producer that propagates the stall upstream.',
              '**Consider dropping the head instead.** For time-sensitive data (telemetry, live positions), the oldest item is the least valuable; head-drop keeps the queue fresh.',
              '**Make the queue durable if the work matters.** An in-memory bucket loses everything on restart. If those requests are important, the "bucket" should be a real queue.',
            ],
          },
        ],
      },
      {
        id: 'uses',
        heading: 'Where shaping is the right tool',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Third-party APIs with hard limits.** Payment processors, mapping APIs, email providers — exceeding their limit often means being blocked for a fixed penalty period, so passing a burst through is far worse than delaying it.',
              '**Legacy systems.** A mainframe or SOAP service with a fixed connection budget cannot autoscale; shaping is how you make modern spiky traffic survivable for it.',
              '**Protecting a database from a batch job.** Import and backfill work should trickle rather than flood, leaving capacity for interactive traffic.',
              '**Outbound email and notifications.** Providers throttle or blacklist senders whose volume spikes; smoothing protects deliverability.',
              '**Network traffic shaping.** The original use — this is how routers implement committed rates and why the algorithm is named after a bucket at all.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'shaper.py — bounded queue, constant drain, deadline-aware',
            lines: [
              'class LeakyBucket:',
              '    def __init__(self, rate, capacity):',
              '        self.rate = rate                 # requests per second out',
              '        self.capacity = capacity',
              '        self.queue = deque()',
              '',
              '    def submit(self, request):',
              '        if len(self.queue) >= self.capacity:',
              '            raise Overflow(retry_after=len(self.queue) / self.rate)',
              '        self.queue.append((request, time.monotonic()))',
              '',
              '    def drain_forever(self):',
              '        interval = 1 / self.rate',
              '        while True:',
              '            if self.queue:',
              '                request, queued_at = self.queue.popleft()',
              '                # Never spend capacity on work the caller abandoned.',
              '                if time.monotonic() - queued_at > request.deadline:',
              '                    metrics.incr("shaper.expired")',
              '                    continue',
              '                send(request)',
              '            time.sleep(interval)',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Hybrid: token bucket at the edge, leaky bucket at the exit',
            body: [
              'The two compose naturally. Limit each client with a token bucket so bursty-but-reasonable clients are not punished, then shape your **aggregate** outbound traffic with a leaky bucket so the third-party API sees a constant rate regardless of how your clients behave. Fairness at the front, protection at the back.',
            ],
          },
        ],
      },
      {
        id: 'distributed',
        heading: 'Shaping across a fleet',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A per-instance leaky bucket has the same multiplication bug as any per-instance limiter: twenty instances each leaking at 50/s means 1,000/s reaching a downstream that tolerates 50.',
              'Because shaping is about **aggregate output**, the natural implementation is a shared queue with a fixed number of workers rather than distributed counters. Worker concurrency becomes the leak rate, and it is exact by construction — there is no arithmetic to get wrong.',
            ],
          },
          {
            kind: 'table',
            columns: ['Approach', 'Exactness', 'Notes'],
            rows: [
              ['Per-instance buckets', 'Wrong by instance count', 'Only acceptable if you divide and never scale'],
              ['Shared queue + N workers', 'Exact', 'Concurrency is the limit; simplest correct option'],
              ['Distributed token lease', 'Close', 'Instances lease send-permits from a shared store'],
              ['Single shaper service', 'Exact', 'A bottleneck and a single point of failure'],
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Name what you are protecting',
            body: [
              'The clean articulation: "token bucket protects *me* from *you*, and allows bursts because real clients burst. Leaky bucket protects *something downstream* from *all of us*, so it must not pass bursts on at all." Choosing by that question rather than by algorithm familiarity is the signal.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Interactive, user-facing paths — the queueing delay is exactly the latency users notice.',
      'When clients legitimately burst and should be allowed to; token bucket expresses that far better.',
      'With a deep queue and no time bound; you will complete work whose callers timed out long ago.',
      'Per-instance in a scaled fleet — aggregate output is what matters, so use a shared queue with bounded workers.',
    ],
    failureModes: [
      {
        name: 'Unbounded queueing',
        symptom: 'Memory grows and every response arrives after the client gave up.',
        cause: 'A bucket with no capacity limit, or one far deeper than the client timeout.',
        fix: 'Cap depth from the acceptable delay, and drop items whose deadline has passed before processing.',
      },
      {
        name: 'Aggregate rate multiplied',
        symptom: 'The third-party API blocks you despite each instance being configured correctly.',
        cause: 'Per-instance shapers summing across the fleet.',
        fix: 'A shared queue with a fixed worker count, or leased send-permits from a central store.',
      },
      {
        name: 'Lost work on restart',
        symptom: 'Requests vanish during a deploy.',
        cause: 'The bucket is an in-memory queue.',
        fix: 'Use a durable queue when the work matters; drain gracefully on shutdown.',
      },
      {
        name: 'Shaping applied to interactive traffic',
        symptom: 'p99 latency degrades badly while throughput looks fine.',
        cause: 'A leaky bucket on a user-facing path converting burst into delay.',
        fix: 'Shape only asynchronous or outbound traffic; use token bucket with rejection for interactive requests.',
      },
    ],
    interview: [
      {
        q: 'When would you use a leaky bucket instead of a token bucket?',
        a: [
          'When the thing I am protecting cannot absorb bursts at all. A payment provider or legacy API that blocks us for an hour above fifty requests per second needs a constant output rate, and a token bucket would deliberately let an accumulated burst through — which is the one thing that must not happen.',
          'For limiting clients I would use token bucket instead, because real clients burst legitimately when a page loads and punishing that is bad product behaviour.',
          'The framing I use is: token bucket protects me from you, leaky bucket protects something downstream from all of us.',
        ],
        followUps: ['How deep would you make the bucket?'],
      },
      {
        q: 'What is the cost of smoothing traffic?',
        a: [
          'Latency. Nothing is rejected until the buffer fills, but everything waits — so a throughput problem becomes a queueing delay, and with a 50 per second drain a 4,000 request burst takes over a minute to clear.',
          'That means the bucket depth is really a latency budget: depth divided by leak rate is the worst-case wait, so I would size it from the delay I can tolerate and drop anything that has waited past its caller\'s deadline rather than spending capacity on abandoned work.',
        ],
      },
      {
        q: 'How do you shape traffic across twenty instances?',
        a: [
          'Not with per-instance buckets — twenty shapers each leaking at fifty per second is a thousand per second hitting a downstream that tolerates fifty.',
          'Since shaping is about aggregate output, the simplest correct implementation is a shared queue with a fixed number of workers: worker concurrency *is* the rate, exact by construction with no arithmetic to get wrong.',
          'If a shared queue is not practical, instances can lease send-permits from a central store, which is approximate but bounded.',
        ],
      },
    ],
    references: [
      { label: 'Wikipedia — Leaky bucket algorithm', href: 'https://en.wikipedia.org/wiki/Leaky_bucket' },
      { label: 'Google SRE Book — Handling Overload', href: 'https://sre.google/sre-book/handling-overload/' },
    ],
  },
}

// ── 5. Quotas, fairness & priority ───────────────────────────────────────────

const quotas: Lesson = {
  slug: 'rate-limiter-quotas',
  title: 'Quotas, Fairness & Priority Shedding',
  summary: 'A global limit says nothing about who gets served — fairness needs its own design.',
  group: 'building-blocks',
  topic: 'Rate Limiter',
  tier: 'pro',
  minutes: 8,
  concept: 'Concept',
  tags: [
    { label: 'Problem', value: 'Noisy neighbour' },
    { label: 'Tool', value: 'Fair queueing' },
    { label: 'Shed', value: 'By value, not at random' },
  ],
  notes: [
    'One global limit lets a single heavy tenant consume the whole budget before anyone else arrives.',
    'Per-tenant quotas give isolation; work-conserving fairness lets idle capacity still be used.',
    'When you must shed, shed the lowest-value traffic — never uniformly at random.',
  ],
  scene: {
    code: [
      '# global only: first come, first served',
      'if global_count > 10_000: return 429',
      '',
      '# fair share: reserve, then borrow',
      'share = capacity / active_tenants',
      'if tenant.used < share: allow()',
      'elif spare_capacity(): allow()   # work-conserving',
      'else: shed(lowest_priority_first)',
    ],
    initialState: { mode: 'global only', 'tenant A': '9,400/s', 'tenant B': '300/s', 'B rejected': '82%' },
    nodes: [
      { id: 'a', kind: 'client', label: 'Tenant A (batch)', x: 10, y: 24 },
      { id: 'b', kind: 'client', label: 'Tenant B (small)', x: 10, y: 76 },
      { id: 'gate', kind: 'rateLimiter', label: 'Limiter', x: 44, y: 50, badge: 'global 10k/s' },
      { id: 'svc', kind: 'server', label: 'Service', x: 78, y: 50, badge: '10k/s capacity' },
      { id: 'db', kind: 'database', label: 'Shared DB', x: 95, y: 50 },
    ],
    edges: [
      { id: 'a-g', from: 'a', to: 'gate', curve: -0.25 },
      { id: 'b-g', from: 'b', to: 'gate', curve: 0.25 },
      { id: 'g-svc', from: 'gate', to: 'svc' },
      { id: 'svc-db', from: 'svc', to: 'db' },
      { id: 'g-b', from: 'gate', to: 'b', curve: 0.5 },
    ],
    steps: [
      { id: '1', caption: 'One global limit of 10,000/sec, first come first served. It looks fair.', codeLine: 2, patches: [{ nodeId: 'gate', badge: 'global 10k/s', highlight: true }], state: { mode: 'global only' } },
      { id: '2', caption: 'Tenant A starts a batch job and fills 9,400 of those slots on its own.', travel: 'a-g', token: 'request', patches: [{ nodeId: 'gate', badge: '9,400 used by A', highlight: true }], state: { 'tenant A': '9,400/s' } },
      { id: '3', caption: 'Tenant B sends its usual 300/sec and is rejected 82% of the time. It did nothing wrong.', travel: 'g-b', token: 'miss', patches: [{ nodeId: 'b', badge: '82% rejected ✗', highlight: true }], state: { 'B rejected': '82%' } },
      { id: '4', caption: 'Fix: reserve a fair share per active tenant — capacity divided by who is actually using it.', codeLine: 5, patches: [{ nodeId: 'gate', badge: 'fair share 5k each', highlight: true }], state: { mode: 'fair share' } },
      { id: '5', caption: 'B now always gets its share. A is capped at its own, and its batch simply takes longer.', travel: 'b-g', token: 'hit', codeLine: 6, patches: [{ nodeId: 'b', badge: '300/s ✓', highlight: true }], state: { 'B rejected': '0%', 'tenant B': '300/s' } },
      { id: '6', caption: 'But B only uses 300 of its 5,000. Strict shares waste capacity, so let A borrow the idle slack.', travel: 'a-g', token: 'hit', codeLine: 7, patches: [{ nodeId: 'a', badge: '9,700/s ✓', highlight: true }], state: { 'tenant A': '9,700/s', mode: 'work-conserving' } },
      { id: '7', caption: 'When B ramps up, borrowed capacity is reclaimed first — and A sheds its lowest-priority work.', travel: 'g-b', token: 'hit', codeLine: 8, patches: [{ nodeId: 'gate', badge: 'reclaim + shed', highlight: true }, { nodeId: 'a', badge: 'batch shed first' }], state: { 'tenant A': '5,000/s', 'tenant B': '5,000/s', 'B rejected': '0%' } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'A rate limiter protects the *service*. It says nothing about **who** gets served. A single global limit is first-come-first-served, which in a multi-tenant system means the loudest client wins and everyone else experiences an outage they did not cause.',
      'Fairness is a separate design problem from capacity, and it needs its own mechanism: quotas for isolation, work-conserving sharing so idle capacity is not wasted, and priority so that when something must be dropped, it is the least valuable thing.',
    ],
    sections: [
      {
        id: 'noisy',
        heading: 'The noisy neighbour problem',
        blocks: [
          {
            kind: 'prose',
            body: [
              'With one shared budget, capacity goes to whoever asks fastest. A tenant running a backfill can saturate the limit in milliseconds, and every other tenant sees rejections despite sending completely normal traffic.',
              'What makes this insidious is that the affected tenants have no way to fix it. They did not change anything, their usage is within their expectations, and from their side it simply looks like your service is broken.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Global limit', value: '10,000 /s' },
              { label: 'Tenants', value: '200' },
              { label: 'Tenant A burst', value: '9,400 /s' },
              { label: 'Remaining for 199 tenants', value: '600 /s' },
              { label: 'Fair share if evenly split', value: '50 /s each' },
              { label: 'Rejection rate for a 300/s tenant', value: '~82%' },
            ],
            result: 'One tenant at 94% of capacity is an outage for everyone else.',
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Per-tenant limits alone are not enough either',
            body: [
              'Give 200 tenants 5,000/s each and the sum is a million — far past capacity. Per-tenant limits provide **isolation**, not **admission control**. You need both: a global ceiling that protects the service, and per-tenant shares that decide who gets the ceiling.',
            ],
          },
        ],
      },
      {
        id: 'fairness',
        heading: 'Fair queueing, and why "work-conserving" matters',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The naive fix is a static per-tenant quota: divide capacity by tenant count and enforce it. It gives perfect isolation and wastes enormous capacity, because most tenants are idle most of the time. With 200 tenants and 5 active, 97% of the budget is reserved for nobody.',
              'A **work-conserving** scheme fixes this: guarantee each tenant its share when it wants it, but let others use the slack when it does not. Nobody is ever starved, and no capacity is idle while requests are being rejected.',
            ],
          },
          {
            kind: 'table',
            columns: ['Scheme', 'Isolation', 'Utilisation', 'Complexity'],
            rows: [
              ['Global only', 'None', 'Full', 'Trivial'],
              ['Static per-tenant quota', 'Strong', 'Poor — idle shares wasted', 'Low'],
              ['Fair share over *active* tenants', 'Strong', 'Good', 'Moderate — must track activity'],
              ['Weighted fair queueing', 'Strong, tiered', 'Good', 'Moderate'],
              ['Quota + borrowable burst pool', 'Strong', 'Very good', 'Moderate'],
              ['Max-min fairness', 'Optimal', 'Optimal', 'High'],
            ],
          },
          {
            kind: 'prose',
            body: [
              '**Max-min fairness** is the principle underneath most of these: satisfy the smallest demands fully, then split what remains equally among the rest, repeating until capacity is exhausted. A tenant asking for less than its share always gets everything it asked for; the surplus goes to the heavy users. It is the fairest allocation that wastes nothing.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'fair_share.py — guaranteed share, borrowable surplus',
            lines: [
              'def admit(tenant, request, capacity):',
              '    active = tenants_seen_recently()            # not all tenants — active ones',
              '    share  = capacity * tenant.weight / sum(t.weight for t in active)',
              '',
              '    if tenant.rate_now < share:',
              '        return ALLOW                            # inside its guarantee',
              '',
              '    # Beyond its share: only if the fleet has genuine slack,',
              '    # and only for work worth doing.',
              '    if global_rate_now < capacity * 0.85:',
              '        if request.priority >= Priority.NORMAL:',
              '            return ALLOW                        # borrowing',
              '        return SHED',
              '',
              '    return SHED                                 # reclaim for guaranteed shares',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Compute the share over active tenants, not all tenants',
            body: [
              'Dividing by total tenant count gives everyone a uselessly small share. Dividing by the number **currently sending traffic** — measured over a recent window — makes the guarantee meaningful: five active tenants each get a fifth, and a sixth arriving shrinks everyone smoothly.',
            ],
          },
        ],
      },
      {
        id: 'priority',
        heading: 'When you must shed, shed by value',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Rejecting uniformly at random is the worst possible policy, because requests are not equally valuable. A checkout is worth vastly more than a recommendation refresh, and a first attempt is worth more than a third retry.',
              'Priority must be assigned **before** the incident — during an outage nobody has time to classify endpoints. The usual scheme is a small number of well-understood tiers.',
            ],
          },
          {
            kind: 'table',
            columns: ['Tier', 'Examples', 'Shed at'],
            rows: [
              ['Critical', 'Payments, auth, health checks', 'Never — reserve capacity'],
              ['High', 'Core reads, checkout flow', '95% utilisation'],
              ['Normal', 'Browsing, search', '85% utilisation'],
              ['Low', 'Recommendations, prefetch, analytics', '70% utilisation'],
              ['Bulk', 'Batch imports, backfills, exports', 'First to go'],
            ],
          },
          {
            kind: 'list',
            items: [
              '**Reserve capacity for critical work.** A fixed slice that lower tiers may never touch means a flood of bulk traffic cannot starve payments.',
              '**Deprioritise retries.** A retried request has already consumed capacity once; treating it as lower value damps amplification exactly when it matters.',
              '**Let clients declare intent** with a priority header — then verify it. Everything becomes critical if clients are trusted unconditionally.',
              '**Degrade features, not requests.** Serving a page without recommendations is better than serving it slowly or not at all.',
            ],
          },
        ],
      },
      {
        id: 'tiers',
        heading: 'Quotas as a product surface',
        blocks: [
          {
            kind: 'prose',
            body: [
              'In a commercial API the quota is not just a protection mechanism — it is part of the pricing model, which means it must be **explainable, predictable and observable** to the customer. Limits that are technically sound but surprising generate support load and churn.',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Expose usage on every response** (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`) so clients can self-pace rather than discovering the ceiling by hitting it.',
              '**Give a dashboard and alerts before the limit**, not a rejection at it. Customers should never learn about a quota from a production incident.',
              '**Allow short bursts above the sustained rate.** Real integrations are spiky; a hard cap that rejects a legitimate batch is a support ticket.',
              '**Separate concurrency from rate.** "Three simultaneous exports" is often the constraint that actually protects you, and it is easier for customers to reason about than requests per hour.',
              '**Make overage behaviour explicit** — throttle, queue, or bill — and never change it silently.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Separate the two questions',
            body: [
              '"How much total traffic can we take?" is capacity. "Who gets it when there is not enough?" is fairness. Most candidates answer only the first. Saying that a global limit is first-come-first-served and therefore lets one tenant produce an outage for everyone else is the observation that distinguishes the answer.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Single-tenant systems, where there is no one to be fair between — a global limit is sufficient.',
      'Static per-tenant quotas where usage is very uneven; they waste most of your capacity on idle reservations.',
      'Fine-grained priority tiers nobody maintains — three or four meaningful tiers beat ten aspirational ones.',
      'Fair queueing on paths where the added per-request bookkeeping costs more than the contention it resolves.',
    ],
    failureModes: [
      {
        name: 'Noisy neighbour outage',
        symptom: 'Many tenants see high rejection rates while one is sending enormous volume.',
        cause: 'A single global limit allocated first-come-first-served.',
        fix: 'Per-tenant guaranteed shares computed over active tenants, with a borrowable surplus pool.',
      },
      {
        name: 'Reserved capacity wasted',
        symptom: 'Requests are rejected while overall utilisation sits at 30%.',
        cause: 'Static quotas reserving capacity for tenants that are idle.',
        fix: 'Work-conserving allocation — guarantee shares, but let others borrow unused capacity.',
      },
      {
        name: 'Critical traffic shed with everything else',
        symptom: 'Payments fail during an overload caused by batch traffic.',
        cause: 'Uniform shedding with no priority classification or reserved capacity.',
        fix: 'Priority tiers assigned in advance, plus a reserved slice that low tiers can never consume.',
      },
      {
        name: 'Quota surprises customers',
        symptom: 'Support tickets whenever a client hits its limit.',
        cause: 'Limits invisible until rejection, with no headroom for legitimate bursts.',
        fix: 'Usage headers on every response, dashboards and pre-limit alerts, and a burst allowance.',
      },
    ],
    interview: [
      {
        q: 'One tenant is consuming your entire rate limit. How do you fix it?',
        a: [
          'The underlying problem is that a global limit is first-come-first-served, so capacity goes to whoever asks fastest — the other tenants experience an outage they did nothing to cause and cannot fix.',
          'I would add per-tenant guaranteed shares, computed over tenants that are actually active rather than all of them, so five active tenants each get a fifth rather than everyone getting a uselessly small slice.',
          'To avoid wasting capacity I would make it work-conserving: a tenant may exceed its share while there is genuine slack, but that borrowed capacity is reclaimed first when a guaranteed tenant needs it.',
        ],
        followUps: ['What do you drop first when you must reclaim?'],
      },
      {
        q: 'How do you decide what to shed under overload?',
        a: [
          'By value, decided in advance. Uniform random shedding discards checkouts to preserve analytics, which is the wrong trade in every business.',
          'I would classify traffic into a few tiers — critical, normal, bulk — and shed from the bottom as utilisation rises, with a reserved slice that lower tiers can never touch so payments and auth survive a flood of batch work.',
          'I would also deprioritise retries, since a retried request has already consumed capacity once and treating it as lower value damps the amplification exactly when it is most dangerous.',
        ],
      },
      {
        q: 'Why not just give every tenant a fixed quota?',
        a: [
          'Because it wastes most of your capacity. With two hundred tenants of whom five are active, ninety-seven percent of the budget is reserved for nobody while active tenants are being rejected.',
          'It also does not protect the service — two hundred quotas of five thousand each sums to a million, far beyond capacity. Per-tenant limits give isolation, not admission control, so you need a global ceiling as well.',
          'The workable design is a guaranteed share computed over active tenants plus a borrowable surplus, which is essentially max-min fairness: small demands satisfied fully, the remainder split among the heavy users.',
        ],
      },
    ],
    references: [
      { label: 'Google SRE Book — Handling Overload and graceful degradation', href: 'https://sre.google/sre-book/handling-overload/' },
      { label: 'Wikipedia — Max-min fairness', href: 'https://en.wikipedia.org/wiki/Max-min_fairness' },
    ],
  },
}

// ── 6. Adaptive limits & abuse ───────────────────────────────────────────────

const adaptive: Lesson = {
  slug: 'rate-limiter-adaptive',
  title: 'Adaptive Limits & Abuse Defence',
  summary: 'A static limit is a guess that ages badly — let measured latency set the ceiling.',
  group: 'building-blocks',
  topic: 'Rate Limiter',
  tier: 'pro',
  minutes: 8,
  concept: 'Resilience',
  tags: [
    { label: 'Signal', value: 'Latency vs minimum' },
    { label: 'Algorithm', value: 'AIMD / gradient' },
    { label: 'Abuse', value: 'Escalating penalties' },
  ],
  notes: [
    'Real capacity changes with deploys, instance types and dependency health — a fixed number cannot track it.',
    'Adaptive limits watch latency against its unloaded minimum and shrink concurrency as the ratio grows.',
    'Abuse defence is a different problem: escalate penalties and raise the cost of retrying, do not just say no.',
  ],
  scene: {
    code: [
      '# gradient limit (Netflix-style)',
      'gradient = min_rtt / current_rtt   # 1.0 = healthy',
      'new_limit = limit * gradient + queue_size',
      'limit = clamp(new_limit, 10, 2000)',
      '',
      '# AIMD fallback',
      'on success: limit += 1        # additive up',
      'on overload: limit *= 0.9     # multiplicative down',
    ],
    initialState: { limit: 200, 'min rtt': '20 ms', 'rtt now': '20 ms', gradient: '1.00', state: 'healthy' },
    nodes: [
      { id: 'clients', kind: 'client', label: 'Traffic', x: 10, y: 50 },
      { id: 'limiter', kind: 'rateLimiter', label: 'Adaptive limiter', x: 40, y: 50, badge: 'limit 200' },
      { id: 'svc', kind: 'server', label: 'Service', x: 70, y: 50, badge: '20 ms' },
      { id: 'dep', kind: 'database', label: 'Database', x: 94, y: 50, badge: 'healthy' },
    ],
    edges: [
      { id: 'c-l', from: 'clients', to: 'limiter' },
      { id: 'l-s', from: 'limiter', to: 'svc' },
      { id: 's-d', from: 'svc', to: 'dep' },
      { id: 'l-c', from: 'limiter', to: 'clients', curve: 0.5 },
    ],
    steps: [
      { id: '1', caption: 'Healthy: latency sits at its unloaded minimum of 20 ms, so the gradient is 1.0.', travel: 'l-s', token: 'request', codeLine: 2, patches: [{ nodeId: 'svc', badge: '20 ms ✓', highlight: true }], state: { gradient: '1.00', limit: 200, state: 'healthy' } },
      { id: '2', caption: 'The limiter probes upward while latency stays flat — capacity is discovered, not configured.', codeLine: 3, patches: [{ nodeId: 'limiter', badge: 'limit 260', highlight: true }], state: { limit: 260 } },
      { id: '3', caption: 'The database slows. Latency climbs to 80 ms with no change in traffic.', travel: 's-d', token: 'miss', patches: [{ nodeId: 'dep', badge: 'slow ⚠', highlight: true }, { nodeId: 'svc', badge: '80 ms' }], state: { 'rtt now': '80 ms', gradient: '0.25' } },
      { id: '4', caption: 'Gradient drops to 0.25, so the limiter cuts concurrency hard — before queues build.', codeLine: 3, patches: [{ nodeId: 'limiter', badge: 'limit 70', highlight: true }], state: { limit: 70, state: 'backing off' } },
      { id: '5', caption: 'Excess requests are rejected immediately with Retry-After rather than queueing.', travel: 'l-c', token: 'miss', patches: [{ nodeId: 'limiter', badge: 'shedding 60%', highlight: true }] },
      { id: '6', caption: 'Because in-flight work is bounded, the database gets room to recover instead of drowning.', travel: 's-d', token: 'hit', patches: [{ nodeId: 'dep', badge: 'recovering', highlight: true }], state: { 'rtt now': '35 ms', gradient: '0.57' } },
      { id: '7', caption: 'Latency returns to 20 ms and the limit climbs back — no human touched a config file.', codeLine: 8, patches: [{ nodeId: 'limiter', badge: 'limit 240', highlight: true }, { nodeId: 'svc', badge: '20 ms ✓' }], state: { limit: 240, gradient: '1.00', state: 'healthy', 'rtt now': '20 ms' } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'Every static limit is a guess made at one moment about a system that keeps changing. Instance types change, dependencies degrade, a deploy makes a query twice as expensive — and the number in your config file goes on asserting a capacity that no longer exists.',
      'Adaptive limiting replaces the guess with a measurement, using the same insight as TCP congestion control: **you cannot know capacity directly, but you can detect when you have exceeded it**, because latency rises. Then you back off.',
    ],
    sections: [
      {
        id: 'static',
        heading: 'Why the configured number is always wrong',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A concurrency limit set to 200 is a claim that the service can process 200 requests at once at acceptable latency. That claim depends on the instance size, the code path, the cache hit rate and the health of every dependency — all of which move independently of your configuration.',
            ],
          },
          {
            kind: 'table',
            columns: ['Change', 'Effect on real capacity', 'Static limit does'],
            rows: [
              ['Deploy adds a database call', 'Falls ~40%', 'Nothing — overload'],
              ['Cache hit rate drops', 'Falls sharply', 'Nothing — overload'],
              ['Dependency degrades', 'Falls', 'Nothing — pile-up'],
              ['Larger instance type', 'Rises', 'Nothing — rejects unnecessarily'],
              ['Traffic mix shifts to cheap reads', 'Rises', 'Nothing — under-utilised'],
            ],
            caption: 'A fixed limit is wrong in both directions, and nobody notices until an incident.',
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Latency is the observable proxy for capacity',
            body: [
              'You cannot measure "how many requests can this service handle" directly. But queueing theory guarantees that as utilisation approaches capacity, latency rises hyperbolically — so the **ratio of current latency to unloaded latency** is a reliable, universal signal that you are past the knee.',
            ],
          },
        ],
      },
      {
        id: 'algorithms',
        heading: 'How adaptation works',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Two families dominate, and both borrow directly from congestion control.',
              '**AIMD** — additive increase, multiplicative decrease — probes upward by one on success and cuts by a multiplier on overload. It is simple, provably converges to a fair share among competing clients, and is deliberately slow to grow and fast to retreat.',
              '**Gradient limits** are more direct: track the minimum observed latency as the "unloaded" baseline, compute `gradient = min_rtt / current_rtt`, and scale the limit by it. A gradient of 1.0 means no queueing; 0.25 means requests are spending four times as long as they should, so cut concurrency to a quarter.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'gradient_limit.py — the limit follows measured latency',
            lines: [
              'class GradientLimit:',
              '    def __init__(self, initial=100, min_limit=10, max_limit=2000):',
              '        self.limit = initial',
              '        self.min_rtt = float("inf")',
              '        self.bounds = (min_limit, max_limit)',
              '',
              '    def observe(self, rtt, inflight, dropped):',
              '        # Long-window minimum = latency with no queueing.',
              '        self.min_rtt = min(self.min_rtt, rtt)',
              '',
              '        if dropped:',
              '            self.limit *= 0.9                     # hard back-off on rejection',
              '            return self._clamp()',
              '',
              '        gradient = max(0.5, min(1.0, self.min_rtt / rtt))',
              '        # Headroom lets the limit grow only when we are near the ceiling.',
              '        headroom = math.sqrt(self.limit)',
              '        target = self.limit * gradient + headroom',
              '',
              '        # Smooth, so one slow request cannot collapse the limit.',
              '        self.limit = self.limit * 0.8 + target * 0.2',
              '        return self._clamp()',
              '',
              '    def _clamp(self):',
              '        lo, hi = self.bounds',
              '        self.limit = max(lo, min(hi, self.limit))',
              '        return int(self.limit)',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Re-measure the minimum periodically.** If `min_rtt` is captured once and never reset, a genuine permanent improvement (a new index) never registers, and the limiter stays conservative forever.',
              '**Clamp both ends.** An unbounded limit can grow past what memory allows; an unbounded shrink can collapse to zero on one bad sample.',
              '**Smooth aggressively.** A single slow request must not halve your capacity — exponential smoothing prevents oscillation.',
              '**Back off hard on rejections.** A rejection is unambiguous evidence of overload and deserves a multiplicative cut, not a gentle nudge.',
            ],
          },
        ],
      },
      {
        id: 'abuse',
        heading: 'Abuse is a different problem from overload',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Adaptive limits protect you from *load*. They do nothing about an adversary, because an attacker is not trying to be served — they are trying to consume your resources, guess a password, or scrape your data. Rejecting them politely with a `Retry-After` is advice they will ignore.',
              'The distinguishing goal is that against abuse you want to **raise the cost of continuing**, not merely decline the current request.',
            ],
          },
          {
            kind: 'table',
            columns: ['Signal', 'What it catches', 'Response'],
            rows: [
              ['High 404 or 401 ratio', 'Enumeration, credential stuffing', 'Escalating block on the identity and IP'],
              ['Perfectly regular timing', 'Automation', 'Challenge (CAPTCHA, proof of work)'],
              ['One IP, many accounts', 'Account farming', 'Device fingerprinting, verification'],
              ['Many IPs, one account', 'Distributed credential stuffing', 'Limit per account, not per IP'],
              ['Sudden endpoint-mix change', 'Scraping', 'Per-endpoint cost limits, tarpitting'],
              ['Cost-heavy queries only', 'Resource exhaustion', 'Weighted token cost per query'],
            ],
          },
          {
            kind: 'list',
            items: [
              '**Escalate penalties.** First offence a short block, then longer, then a long one. A fixed one-minute block is trivially waited out; exponential escalation is not.',
              '**Limit the right dimension.** Credential stuffing distributes across IPs, so per-IP limits miss it entirely — limit failed logins per *account*, and per device fingerprint.',
              '**Make retrying expensive.** A proof-of-work challenge or CAPTCHA costs an attacker far more than it costs a real user, which changes the economics rather than just the outcome.',
              '**Tarpit rather than reject** where appropriate. Slow responses waste the attacker\'s connections; instant rejections let them iterate faster.',
              '**Fail closed on security limits.** Unlike protective limits, a login limiter whose store is unavailable should stop allowing attempts, not wave them through.',
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Rate limiting a login endpoint per IP is nearly useless',
            body: [
              'Credential stuffing runs from thousands of residential proxies, so each IP makes only a handful of attempts — under any reasonable per-IP threshold. The limit that works is per *account*: five failed attempts against one account is suspicious no matter how many addresses they came from.',
            ],
          },
        ],
      },
      {
        id: 'together',
        heading: 'Composing the layers',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The mature setup layers three mechanisms with different purposes, and confusing them is what produces either a fragile service or an easily-abused one.',
            ],
          },
          {
            kind: 'table',
            columns: ['Layer', 'Protects against', 'Behaviour when its store fails'],
            rows: [
              ['Quota limits', 'Contract violation, unfair use', 'Fail closed (billing implications)'],
              ['Adaptive concurrency', 'Overload, degraded dependencies', 'Fail open with a conservative local limit'],
              ['Abuse detection', 'Adversaries', 'Fail closed'],
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Name the congestion-control lineage',
            body: [
              'Saying "this is TCP congestion control applied to application concurrency — you cannot measure capacity, but you can detect exceeding it via latency, so you probe up slowly and cut hard" places the idea in a lineage the interviewer recognises and shows you understand *why* it works rather than which library implements it.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Contractual quotas — customers need predictable, explainable limits, not ones that move with system health.',
      'Very low-traffic services, where there are too few samples for a latency signal to be meaningful.',
      'As abuse defence; adaptive limits assume clients want to be served and back off when asked.',
      'Where latency is naturally bimodal (cache hit versus miss) without separating the modes — the baseline becomes meaningless.',
    ],
    failureModes: [
      {
        name: 'Limit collapses to the floor',
        symptom: 'Throughput drops to almost nothing and never recovers.',
        cause: 'A latency spike drove the gradient down with no smoothing or minimum bound.',
        fix: 'Clamp the minimum, smooth updates exponentially, and re-measure the baseline periodically.',
      },
      {
        name: 'Stale minimum latency',
        symptom: 'The limiter stays conservative long after performance improved.',
        cause: '`min_rtt` captured once and never reset, so genuine improvements never register.',
        fix: 'Track the minimum over a rolling window and reset it on deploys.',
      },
      {
        name: 'Per-IP limits miss credential stuffing',
        symptom: 'Accounts are compromised despite login rate limiting.',
        cause: 'The attack is distributed across thousands of IPs, each under the threshold.',
        fix: 'Limit failed attempts per account and per device fingerprint; escalate blocks.',
      },
      {
        name: 'Adaptive limiter masks a real regression',
        symptom: 'Capacity quietly halves after a deploy and nobody notices.',
        cause: 'The limiter absorbed the change instead of surfacing it.',
        fix: 'Alert on the limit itself as a metric — a sustained drop is a performance regression signal.',
      },
    ],
    interview: [
      {
        q: 'Why would you use an adaptive concurrency limit instead of a fixed one?',
        a: [
          'Because real capacity is not constant. A deploy that adds a database call, a cache hit rate drop, or a degraded dependency all change how much the service can actually handle, and a number in a config file cannot track any of it — so it is simultaneously too high during incidents and too low the rest of the time.',
          'An adaptive limiter measures instead: it treats the minimum observed latency as the unloaded baseline and shrinks concurrency as current latency rises above it, which is the same principle as TCP congestion control.',
          'I would still clamp it at both ends and smooth the updates, so one slow request cannot collapse capacity.',
        ],
        followUps: ['What signal tells you that you have exceeded capacity?'],
      },
      {
        q: 'How would you defend a login endpoint against credential stuffing?',
        a: [
          'Not with per-IP rate limits — the attack runs from thousands of residential proxies, so each address makes only a few attempts and stays under any sensible threshold.',
          'The effective dimension is per account: a handful of failed attempts against one account is suspicious regardless of origin. I would combine that with device fingerprinting and escalating penalties, so repeat offenders face exponentially longer blocks rather than a fixed cooldown they can simply wait out.',
          'I would also raise the cost of retrying with a challenge after a few failures, which is expensive for an attacker and cheap for a real user, and fail closed if the limiter store is unavailable since this is a security control rather than a protective one.',
        ],
      },
      {
        q: 'How is abuse defence different from overload protection?',
        a: [
          'Overload protection assumes clients want to be served and will back off when told to — so a 429 with Retry-After is a useful signal and adaptive limits work well.',
          'An adversary ignores all of that, and their goal is to consume resources or guess credentials rather than to get a successful response. So the objective shifts from declining the current request to raising the cost of making the next one: escalating blocks, challenges, tarpitting, and limiting on the dimension the attack actually shares.',
          'They also differ on failure: a protective limiter should fail open so it cannot cause an outage, while a security limiter should fail closed.',
        ],
      },
    ],
    references: [
      { label: 'Netflix — Performance under load: adaptive concurrency limits', href: 'https://netflixtechblog.medium.com/performance-under-load-3e6fa9a60581' },
      { label: 'OWASP — Credential stuffing prevention cheat sheet', href: 'https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html' },
    ],
  },
}

export const rateLimiterTopic: Lesson[] = [
  rateLimiter,
  rlSlidingWindow,
  distributed,
  leakyBucket,
  quotas,
  adaptive,
]
