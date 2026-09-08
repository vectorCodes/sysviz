import type { Lesson } from '../types'

/** Topic: Client–Server Model (group: fundamentals). */

// ── 1. Request–response ──────────────────────────────────────────────────────

const requestResponse: Lesson = {
  slug: 'client-server',
  title: 'Basic Request–Response',
  summary: 'The request/response loop every web system is built on.',
  group: 'fundamentals',
  topic: 'Client–Server Model',
  tier: 'free',
  minutes: 5,
  concept: 'Concept',
  tags: [
    { label: 'Pattern', value: 'Request–Response' },
    { label: 'Coupling', value: 'Synchronous' },
    { label: 'Latency', value: '~40 ms typical' },
  ],
  notes: [
    'A client asks; a server answers. Nothing happens until a request is made.',
    'The server often needs a database to fulfil the request.',
    'The response retraces the path back to the client.',
  ],
  scene: {
    code: [
      'client:  GET /profile/42',
      'server:  row = db.query(id=42)',
      'db:      return row',
      'server:  return render(row)',
      'client:  paint(response)',
    ],
    initialState: { step: 'idle', 'round-trip': '0 ms' },
    nodes: [
      { id: 'client', kind: 'client', label: 'Browser', x: 14, y: 50 },
      { id: 'server', kind: 'server', label: 'Web Server', x: 50, y: 50 },
      { id: 'db', kind: 'database', label: 'Database', x: 86, y: 50 },
    ],
    edges: [
      { id: 'c-s', from: 'client', to: 'server' },
      { id: 's-db', from: 'server', to: 'db' },
      { id: 'db-s', from: 'db', to: 'server', curve: 0.5 },
      { id: 's-c', from: 'server', to: 'client', curve: 0.5 },
    ],
    steps: [
      { id: '1', caption: 'The browser sends an HTTP request for /profile/42.', travel: 'c-s', token: 'request', codeLine: 1, state: { step: 'request sent' } },
      { id: '2', caption: "The server can't answer alone — it queries the database.", travel: 's-db', token: 'request', codeLine: 2, state: { step: 'querying db' } },
      { id: '3', caption: 'The database finds the row and returns it.', travel: 'db-s', token: 'response', codeLine: 3, state: { step: 'row fetched' } },
      { id: '4', caption: 'The server renders a response from the data.', codeLine: 4, state: { step: 'rendering' } },
      { id: '5', caption: 'The response travels back and the browser paints it.', travel: 's-c', token: 'response', codeLine: 5, state: { step: 'done', 'round-trip': '~40 ms' } },
    ],
  },
  deepDive: {
    readingMinutes: 8,
    intro: [
      'Everything in this course is an elaboration of one loop: **a client sends a request, a server sends a response**. Load balancers, caches, queues and replicas all exist because that loop, repeated billions of times, runs into physics and economics.',
      'Understanding where the milliseconds actually go in a single request is what lets you say *"the bottleneck is here"* instead of *"let\'s add a cache"*.',
    ],
    sections: [
      {
        id: 'anatomy',
        heading: 'Where the 40 milliseconds go',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A first request to an HTTPS endpoint is not one round trip — it is several, and most of them happen before a single byte of your application code runs.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'DNS lookup', value: '0–20 ms', note: 'cached after the first' },
              { label: 'TCP handshake (SYN, SYN-ACK, ACK)', value: '1 RTT' },
              { label: 'TLS 1.3 handshake', value: '1 RTT', note: '0 on resumption' },
              { label: 'Request → first byte of response', value: '1 RTT + server time' },
              { label: 'Server: routing, auth, business logic', value: '1–5 ms' },
              { label: 'Server: database query', value: '1–20 ms' },
              { label: 'Response transfer', value: 'size ÷ bandwidth' },
            ],
            result: 'On a 20 ms RTT link, a cold HTTPS request costs ~60 ms before your handler runs.',
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Round trips dominate, not bandwidth',
            body: [
              'Bandwidth has grown enormously; the speed of light has not. For small responses the number of **round trips** decides your latency, which is why connection reuse, HTTP/2 multiplexing and TLS session resumption matter more than payload compression for most APIs.',
            ],
          },
        ],
      },
      {
        id: 'sync',
        heading: 'Synchronous coupling and its consequences',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Request–response is **synchronous**: the client is blocked, holding a connection and often a thread, until the server answers. That coupling is the source of most cascading failures in distributed systems.',
              'If the database slows from 5 ms to 500 ms, every in-flight request holds its resources 100× longer. Concurrency is throughput × latency (Little\'s Law), so the number of simultaneously-open requests explodes and you run out of threads, connections or memory — even though request *rate* never changed.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Request rate', value: '500 /s' },
              { label: 'Normal latency', value: '20 ms' },
              { label: 'Concurrent requests (normal)', value: '10', note: '500 × 0.02' },
              { label: 'Degraded latency', value: '2,000 ms' },
              { label: 'Concurrent requests (degraded)', value: '1,000', note: '500 × 2' },
              { label: 'Server thread pool', value: '200' },
            ],
            result: 'A 100× latency increase exhausts the pool and turns a slow dependency into a total outage.',
          },
          {
            kind: 'list',
            items: [
              '**Timeouts** cap how long a request may hold resources. A missing timeout is an unbounded resource leak.',
              '**Circuit breakers** stop sending requests to a dependency that is already failing, so you fail fast instead of piling up.',
              '**Bulkheads** give each dependency its own connection pool, so one slow service cannot consume every thread.',
              '**Asynchronous work** (queues) removes the coupling entirely for anything the user does not need to wait for.',
            ],
          },
        ],
      },
      {
        id: 'protocols',
        heading: 'What "the request" actually rides on',
        blocks: [
          {
            kind: 'table',
            columns: ['Protocol', 'Connections', 'Head-of-line blocking', 'Best for'],
            rows: [
              ['HTTP/1.1', 'One request at a time per connection; browsers open ~6', 'Yes, per connection', 'Simple APIs, universal support'],
              ['HTTP/2', 'Many streams multiplexed on one TCP connection', 'At the TCP layer only', 'Many small assets, gRPC'],
              ['HTTP/3 (QUIC)', 'Multiplexed over UDP with per-stream delivery', 'None', 'Lossy or mobile networks'],
              ['WebSocket', 'One long-lived bidirectional connection', 'n/a', 'Realtime push, chat, collaboration'],
              ['gRPC', 'HTTP/2 streams, binary protobuf', 'At the TCP layer', 'Internal service-to-service calls'],
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Name the layer you are optimising',
            body: [
              '"Make it faster" is vague. "The request spends 25 ms in TLS setup, so I would enable session resumption and keep-alive" is a specific, checkable claim — and it shows you know a request is not a single atomic hop.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Long-running work (video encoding, report generation) — the client should not hold a connection for minutes; return a job id instead.',
      'Fan-out notifications to many consumers — publish an event rather than making N synchronous calls.',
      'Anything where the caller does not need the result: analytics writes, audit logs, emails. Queue them.',
      'Chatty sequences of dependent calls across a network — batch them, or the round trips dominate everything else.',
    ],
    failureModes: [
      {
        name: 'Thread pool exhaustion',
        symptom: 'Server stops accepting new requests while CPU sits near idle.',
        cause: 'A slow downstream dependency makes every request hold its thread far longer than normal.',
        fix: 'Aggressive timeouts, per-dependency bulkheads, and a circuit breaker to fail fast.',
      },
      {
        name: 'Retry storm',
        symptom: 'A brief blip becomes a sustained outage; load keeps climbing after the trigger is gone.',
        cause: 'Clients retry immediately and in lockstep, multiplying traffic against an already-struggling server.',
        fix: 'Exponential backoff with jitter, a retry budget, and idempotency keys so retries are safe.',
      },
      {
        name: 'Missing timeout',
        symptom: 'Connections accumulate for hours; the process eventually OOMs.',
        cause: 'A default-infinite client timeout on an HTTP or database call.',
        fix: 'Set explicit connect and read timeouts on every client; make them shorter than the caller\'s timeout.',
      },
      {
        name: 'Chatty N+1 calls',
        symptom: 'p99 latency scales with the number of items on the page.',
        cause: 'One request per item across the network instead of a batched call.',
        fix: 'Batch endpoints, dataloader-style coalescing, or a single query with a join.',
      },
    ],
    interview: [
      {
        q: 'Walk me through everything that happens when a user loads a page.',
        a: [
          'DNS resolution, then a TCP handshake, then a TLS handshake, then the HTTP request itself — that is already three round trips before the server does any work.',
          'On the server: routing, authentication, business logic, and usually one or more database or cache calls. Then the response travels back and the browser parses it, discovers subresources, and may repeat the whole process for each origin.',
          'The useful framing is that latency is dominated by round trips and by the slowest dependency, not by the server\'s CPU time — which tells you where to optimise.',
        ],
        followUps: ['Which of those steps would a CDN remove?'],
      },
      {
        q: 'Your service is slow because a downstream API is slow. How do you stop it taking you down?',
        a: [
          'Bound the damage first: a timeout so no request holds resources indefinitely, and a separate connection pool for that dependency so it cannot consume every thread.',
          'Then stop sending doomed traffic with a circuit breaker, and decide the degraded behaviour — serve a cached value, return a partial response, or fail that one feature while the rest of the page works.',
          'Retries need backoff and jitter, otherwise the fix becomes the amplifier.',
        ],
      },
      {
        q: 'When would you make an operation asynchronous instead?',
        a: [
          'When the user does not need the result to continue, or when the work takes longer than a reasonable request timeout — encoding, bulk imports, sending email.',
          'The pattern is to accept the request, enqueue the work, and return a job id with a way to poll or subscribe to completion. That converts a fragile synchronous dependency into a durable queue, at the cost of eventual consistency.',
        ],
      },
    ],
    references: [
      { label: 'MDN — Overview of HTTP', href: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview' },
      { label: 'High Performance Browser Networking — latency primer', href: 'https://hpbn.co/primer-on-latency-and-bandwidth/' },
    ],
  },
}

// ── 2. Stateless vs stateful ─────────────────────────────────────────────────

const stateless: Lesson = {
  slug: 'client-server-stateless',
  title: 'Stateless vs Stateful Servers',
  summary: "Why servers shouldn't remember clients — and how sessions still work.",
  group: 'fundamentals',
  topic: 'Client–Server Model',
  tier: 'free',
  minutes: 7,
  concept: 'Concept',
  tags: [
    { label: 'Pattern', value: 'Stateless design' },
    { label: 'Session store', value: 'Redis / DB' },
    { label: 'Benefit', value: 'Horizontal scalability' },
  ],
  notes: [
    'Stateful: server keeps session in memory. Fast, but ties the user to one server.',
    'If that server crashes, the session is lost — the user is logged out.',
    'Stateless: any server can handle any request because session lives in Redis, not in RAM.',
  ],
  scene: {
    code: [
      '# BAD — stateful: session in server memory',
      'session = {}   # lost on crash',
      '',
      '# GOOD — stateless: session in Redis',
      'session = redis.get(session_id)',
      'redis.set(session_id, data, ttl=3600)',
    ],
    initialState: { mode: 'stateful', 'sessions lost': 0, 'servers up': 2 },
    nodes: [
      { id: 'browser', kind: 'client', label: 'Browser', x: 10, y: 50 },
      { id: 'lb', kind: 'loadBalancer', label: 'Load Balancer', x: 38, y: 50 },
      { id: 's1', kind: 'server', label: 'Server 1', x: 65, y: 25, badge: 'session ✓' },
      { id: 's2', kind: 'server', label: 'Server 2', x: 65, y: 75, badge: 'idle' },
      { id: 'redis', kind: 'cache', label: 'Session Store', x: 88, y: 50, badge: 'Redis' },
    ],
    edges: [
      { id: 'b-lb', from: 'browser', to: 'lb' },
      { id: 'lb-s1', from: 'lb', to: 's1', curve: -0.3 },
      { id: 'lb-s2', from: 'lb', to: 's2', curve: 0.3 },
      { id: 's1-redis', from: 's1', to: 'redis', curve: -0.3 },
      { id: 's2-redis', from: 's2', to: 'redis', curve: 0.3 },
    ],
    steps: [
      { id: '1', caption: 'User logs in. The load balancer routes to Server 1, which stores the session in its own memory.', travel: 'b-lb', token: 'request', codeLine: 2, patches: [{ nodeId: 's1', badge: 'session ✓', highlight: true }] },
      { id: '2', caption: 'Requests keep going to Server 1 — fine so far.', travel: 'lb-s1', token: 'hit', codeLine: 2, patches: [{ nodeId: 's1', badge: 'session ✓', highlight: true }] },
      { id: '3', caption: 'Server 1 crashes. All in-memory sessions are gone.', patches: [{ nodeId: 's1', badge: '✗ crashed', highlight: true }], state: { 'sessions lost': 1, 'servers up': 1 } },
      { id: '4', caption: 'The next request hits Server 2 — no session there. The user is logged out unexpectedly.', travel: 'lb-s2', token: 'miss', codeLine: 2, patches: [{ nodeId: 's2', badge: 'no session ✗', highlight: true }] },
      { id: '5', caption: 'Fix: move sessions to Redis. Servers become stateless — they hold nothing.', patches: [{ nodeId: 'redis', badge: 'sessions ✓', highlight: true }], state: { mode: 'stateless', 'servers up': 2 } },
      { id: '6', caption: 'Server 2 reads the session from Redis — any server can now serve any user.', travel: 's2-redis', token: 'hit', codeLine: 5, patches: [{ nodeId: 's2', badge: 'session ✓', highlight: true }], state: { 'sessions lost': 0 } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      '"Stateless" does not mean the system has no state — it means **the server process holds no state that a request depends on**. State still exists; it moved to a database, a cache, or the client\'s own token.',
      'This single property is what makes horizontal scaling, rolling deploys, autoscaling and instance replacement possible. Almost every "we cannot scale this service" story ends at some piece of state that was left in a process.',
    ],
    sections: [
      {
        id: 'why',
        heading: 'What statelessness actually buys you',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Any instance can serve any request**, so a load balancer can distribute freely instead of pinning users to servers.',
              '**Instances become disposable.** Autoscaling can add and remove them, spot instances become viable, and a crash costs one request rather than a thousand sessions.',
              '**Deploys become boring.** Rolling restarts do not log anyone out, so you can ship at any time.',
              '**Scaling is arithmetic.** Twice the traffic means twice the instances — no rebalancing, no migration of in-memory data.',
            ],
          },
          {
            kind: 'prose',
            body: [
              'The counterpart cost is a network hop for state that used to be a memory read. Fetching a session from Redis costs ~0.5 ms versus effectively zero, which is a trade almost everyone makes happily — and which a small local cache can largely erase.',
            ],
          },
        ],
      },
      {
        id: 'sticky',
        heading: 'Sticky sessions: the tempting shortcut',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Session affinity ("sticky sessions") makes the load balancer route a given user to the same instance every time, so in-memory state keeps working. It is genuinely the fastest path to shipping — and it recreates every problem statelessness solves.',
            ],
          },
          {
            kind: 'table',
            columns: ['Concern', 'Sticky sessions', 'Externalised state'],
            rows: [
              ['Instance dies', 'Those users lose their session', 'No user-visible effect'],
              ['Deploys', 'Rolling restart logs users out', 'Invisible'],
              ['Load distribution', 'Uneven — long-lived users pile up on old nodes', 'Even'],
              ['Autoscaling down', 'Cannot remove a node with active sessions', 'Remove any node freely'],
              ['Latency to read state', '~0 ms (local memory)', '~0.5 ms (network)'],
            ],
            caption: 'Stickiness is a legitimate optimisation on top of stateless design, and a liability as a substitute for it.',
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Stickiness makes load imbalance permanent',
            body: [
              'Because affinity is decided once per user, an instance that happens to receive heavy users keeps them. Adding capacity does not relieve it, since existing users never move — a specific, common way sticky deployments end up with one hot node and several idle ones.',
            ],
          },
        ],
      },
      {
        id: 'where',
        heading: 'Where to put the session',
        blocks: [
          {
            kind: 'table',
            columns: ['Approach', 'Read cost', 'Revocation', 'Size limit', 'Notes'],
            rows: [
              ['Redis session store', '~0.5 ms', 'Immediate — delete the key', 'Large', 'The default; needs Redis to be highly available'],
              ['Database session table', '~2–10 ms', 'Immediate', 'Large', 'Simple, but adds load to the primary'],
              ['Signed cookie (JWT)', '0 ms — no lookup', 'Hard until expiry', '~4 KB', 'Truly stateless, but revocation is the catch'],
              ['Signed cookie + deny list', '~0.5 ms on check', 'Immediate', '~4 KB', 'The usual compromise'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'JWTs are attractive because they remove the lookup entirely: the token carries the claims and a signature proves they were issued by you. The problem is the mirror image of the benefit — **you cannot un-issue a token**. Logging out, banning a user, or downgrading a plan does not take effect until the token expires.',
              'The practical resolutions are short-lived access tokens (5–15 minutes) with refresh tokens that *are* checked server-side, or a deny list of revoked token ids — which reintroduces the lookup you were avoiding, but only for a small set.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'session.py — externalised session with a local micro-cache',
            lines: [
              'LOCAL_TTL = 2   # seconds — bounded staleness, kills most Redis reads',
              '',
              'def load_session(session_id):',
              '    hit = local_cache.get(session_id)      # in-process, ~0 ms',
              '    if hit is not None:',
              '        return hit',
              '',
              '    raw = redis.get(f"sess:{session_id}")  # shared, ~0.5 ms',
              '    if raw is None:',
              '        return None                        # expired or revoked',
              '',
              '    session = json.loads(raw)',
              '    local_cache.set(session_id, session, ttl=LOCAL_TTL)',
              '    redis.expire(f"sess:{session_id}", 3600)   # sliding expiry',
              '    return session',
            ],
          },
        ],
      },
      {
        id: 'hidden',
        heading: 'The state you forgot you had',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Most services that call themselves stateless still hold state somewhere. These are the usual offenders, and each one quietly breaks a scaling assumption.',
            ],
          },
          {
            kind: 'list',
            items: [
              '**In-process caches** — not a correctness problem for a cache, but different instances will answer differently, which surfaces as flaky behaviour on refresh.',
              '**Uploaded files on local disk** — the next request goes to another instance and the file is not there. Use object storage.',
              '**In-memory rate limiters** — each instance counts separately, so your "100 requests per minute" limit is really 100 × instance count.',
              '**Scheduled jobs in the app process** — every instance runs the job, so the email goes out N times. Use a leader election or a dedicated scheduler.',
              '**WebSocket connections** — inherently stateful. The connection lives on one node, so broadcasting needs a pub/sub backplane.',
              '**Long-running in-memory work queues** — a deploy silently drops whatever was in flight.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'The test question to ask yourself',
            body: [
              '"If I killed any one instance right now, mid-request, what would a user notice?" If the answer is anything other than "one failed request they can retry", you have found the state.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'WebSocket and streaming servers are unavoidably stateful per connection — design for it with a pub/sub backplane rather than pretending otherwise.',
      'In-memory computation caches on a single-tenant or embedded deployment, where the operational simplicity outweighs elasticity.',
      'Latency-critical paths where a 0.5 ms state lookup genuinely matters — but externalise anyway and add a local micro-cache instead of keeping authoritative state in the process.',
    ],
    failureModes: [
      {
        name: 'Random logouts',
        symptom: 'Users are logged out intermittently, more often right after a deploy.',
        cause: 'Sessions held in instance memory; a restart or a route to a different instance loses them.',
        fix: 'Move sessions to Redis or a signed token; verify by rolling-restarting under load.',
      },
      {
        name: 'Rate limits that do not limit',
        symptom: 'Clients sustain far more than the configured rate.',
        cause: 'Per-instance in-memory counters multiply the limit by the instance count.',
        fix: 'Centralise counters in Redis, or divide the budget by instance count as a stopgap.',
      },
      {
        name: 'Duplicate scheduled jobs',
        symptom: 'Users receive the same email once per running instance.',
        cause: 'An in-process scheduler running on every replica.',
        fix: 'A distributed lock or leader election, or move jobs to a dedicated scheduler service.',
      },
      {
        name: 'Session store as a single point of failure',
        symptom: 'Redis blips and every user is logged out at once.',
        cause: 'All authentication depends on one unreplicated store.',
        fix: 'Replicate with failover, keep a short-lived signed token so brief outages are survivable, and fail closed only on the paths that need it.',
      },
    ],
    interview: [
      {
        q: 'What does it mean for a service to be stateless, and why do we want it?',
        a: [
          'It means no request depends on state held inside the server process — the state lives in a database, cache, or a token the client presents. The process becomes interchangeable.',
          'That is what makes horizontal scaling work: any instance can serve any request, so the load balancer can distribute freely, autoscaling can add and remove capacity, and a crash costs one request rather than every session on that node.',
        ],
        followUps: ['What state is still in your system in that design?'],
      },
      {
        q: 'Sessions in Redis or a JWT?',
        a: [
          'It depends on how fast you need revocation. A JWT removes the lookup entirely, which is excellent for read-heavy APIs, but you cannot invalidate one before it expires — logout, bans and permission changes all lag.',
          'Redis sessions cost a ~0.5 ms lookup and give you immediate revocation and easy inspection. The common middle ground is short-lived JWTs plus server-checked refresh tokens, which bounds the revocation window to minutes while keeping most requests lookup-free.',
        ],
      },
      {
        q: 'Are sticky sessions acceptable?',
        a: [
          'As an optimisation on top of externalised state, yes — affinity improves local cache hit rates and connection reuse without any correctness dependency.',
          'As a substitute for externalising state, no. It means an instance failure logs users out, deploys are disruptive, load becomes permanently uneven because users never move, and you cannot scale down a node that still has active sessions.',
        ],
      },
    ],
    references: [
      { label: 'The Twelve-Factor App — Processes', href: 'https://12factor.net/processes' },
      { label: 'OWASP — Session management cheat sheet', href: 'https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html' },
    ],
  },
}

// ── 3. Connection pooling ────────────────────────────────────────────────────

const connectionPooling: Lesson = {
  slug: 'client-server-connections',
  title: 'Connection Pooling',
  summary: 'TCP handshakes are expensive — reuse connections for near-zero overhead.',
  group: 'fundamentals',
  topic: 'Client–Server Model',
  tier: 'free',
  minutes: 6,
  concept: 'Concept',
  tags: [
    { label: 'Pattern', value: 'Connection pool' },
    { label: 'Overhead', value: 'Near-zero vs ~3ms' },
    { label: 'Used for', value: 'DB / HTTP / Redis' },
  ],
  notes: [
    'Opening a TCP connection costs ~1–3 ms (3-way handshake + TLS). At 1000 rps, that adds up.',
    'A connection pool keeps N connections pre-opened and ready to reuse.',
    'Every major driver (Postgres, MySQL, Redis) pools by default for this reason.',
  ],
  scene: {
    code: [
      '# Without pool: new connection per query',
      'conn = tcp_connect(db_host)    # ~3 ms',
      'result = conn.query(sql)',
      'conn.close()',
      '',
      '# With pool: reuse pre-opened connections',
      'conn = pool.acquire()          # ~0 ms',
      'result = conn.query(sql)',
      'pool.release(conn)',
    ],
    initialState: { 'conn overhead': 'high (~3ms)', queries: 0, 'pool size': 10 },
    nodes: [
      { id: 'app', kind: 'client', label: 'App', x: 12, y: 50 },
      { id: 'pool', kind: 'queue', label: 'Conn Pool', x: 48, y: 50, badge: '10 ready' },
      { id: 'db', kind: 'database', label: 'Database', x: 84, y: 50 },
    ],
    edges: [
      { id: 'a-pool', from: 'app', to: 'pool' },
      { id: 'pool-db', from: 'pool', to: 'db' },
      { id: 'db-pool', from: 'db', to: 'pool', curve: 0.4 },
      { id: 'pool-a', from: 'pool', to: 'app', curve: 0.4 },
    ],
    steps: [
      { id: '1', caption: 'Without a pool: every query does a 3-way TCP handshake before touching the DB.', codeLine: 2, state: { 'conn overhead': 'high (~3ms)', queries: 0 } },
      { id: '2', caption: 'With a pool: the app borrows a pre-opened connection. No handshake needed.', travel: 'a-pool', token: 'request', codeLine: 7, patches: [{ nodeId: 'pool', badge: '9 ready', highlight: true }] },
      { id: '3', caption: 'The query goes straight to the database on an existing connection.', travel: 'pool-db', token: 'request', codeLine: 8, state: { 'conn overhead': '~0 ms', queries: 1 } },
      { id: '4', caption: 'The result returns through the same connection.', travel: 'db-pool', token: 'response', codeLine: 8 },
      { id: '5', caption: 'The connection is returned to the pool, ready for the next query.', travel: 'pool-a', token: 'response', codeLine: 9, patches: [{ nodeId: 'pool', badge: '10 ready', highlight: true }] },
      { id: '6', caption: '1,000 queries/sec served by 10 persistent connections. Pool size is the knob.', state: { queries: 1000, 'conn overhead': '~0 ms', 'pool size': 10 } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'A connection pool is a **bounded queue of pre-established connections**. Its obvious job is to skip the handshake; its more important job is to **cap concurrency against a dependency** — which is what stops a slow database from taking down the whole service.',
      'Pool sizing is one of the most reliably counter-intuitive topics in system design: the right number is almost always far smaller than people expect.',
    ],
    sections: [
      {
        id: 'cost',
        heading: 'What a connection costs',
        blocks: [
          {
            kind: 'math',
            rows: [
              { label: 'TCP handshake (1 RTT, same DC)', value: '~0.5 ms' },
              { label: 'TLS 1.3 handshake (1 RTT)', value: '~0.5 ms' },
              { label: 'Postgres auth + session setup', value: '~1–2 ms' },
              { label: 'Postgres backend process memory', value: '~5–10 MB', note: 'per connection' },
              { label: 'Total per new connection', value: '~2–3 ms + memory' },
              { label: 'At 1,000 queries/s unpooled', value: '2–3 s of CPU per second', note: 'impossible' },
            ],
            result: 'Unpooled connections do not merely add latency — they consume more time than exists.',
          },
          {
            kind: 'prose',
            body: [
              'The memory line matters as much as the latency one. Postgres forks a backend **process** per connection, so 500 connections is gigabytes of RAM and a scheduler full of mostly-idle processes. This is why a Postgres primary that is perfectly happy at 100 connections falls apart at 1,000, even though the query load is identical.',
            ],
          },
        ],
      },
      {
        id: 'sizing',
        heading: 'Sizing the pool: smaller than you think',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The instinct is "more connections, more throughput". It is wrong, because a database can only truly execute as many queries as it has cores and spindles. Extra connections do not add capacity — they add **queueing inside the database**, where you cannot see or control it.',
              'The widely-cited HikariCP formula is a good starting point, and the reasoning behind it matters more than the number.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Formula', value: 'cores × 2 + disks' },
              { label: 'Database cores', value: '8' },
              { label: 'Effective spindles (SSD)', value: '1' },
              { label: 'Suggested pool size', value: '17', note: 'per application instance set' },
              { label: 'Throughput at pool = 17', value: '~8,000 q/s' },
              { label: 'Throughput at pool = 200', value: '~8,000 q/s', note: 'same, with far worse p99' },
            ],
            result: 'Beyond the knee, more connections buy latency variance, not throughput.',
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'A small pool is a queue you can see',
            body: [
              'With a small pool, excess load waits in *your* application, where you can measure wait time, time it out, and shed it. With a huge pool, the same load waits inside the database, where it competes for CPU and locks and slows down every query including the ones already running.',
            ],
          },
          {
            kind: 'prose',
            body: [
              'Remember to multiply. Pool size is **per instance**: 20 instances × a pool of 20 is 400 connections at the database, which is very likely past what it should accept. This arithmetic is the single most common production mistake with pools, and it is why a **connection proxy** — PgBouncer, RDS Proxy, ProxySQL — exists: it multiplexes thousands of client connections onto a small number of real server connections.',
            ],
          },
        ],
      },
      {
        id: 'behaviour',
        heading: 'The knobs that decide failure behaviour',
        blocks: [
          {
            kind: 'table',
            columns: ['Setting', 'What it controls', 'Getting it wrong'],
            rows: [
              ['Max size', 'Concurrency ceiling against the dependency', 'Too large: database queueing and memory pressure'],
              ['Min idle', 'Connections kept warm', 'Too low: handshake latency on traffic spikes'],
              ['Acquire timeout', 'How long a request waits for a free connection', 'Unset: requests queue forever and threads pile up'],
              ['Max lifetime', 'Recycles connections periodically', 'Unset: stale connections survive failovers and DNS changes'],
              ['Idle timeout', 'Reaps unused connections', 'Too aggressive: constant reconnect churn'],
              ['Validation query', 'Detects dead connections before use', 'Missing: intermittent errors after a network blip'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'The acquire timeout is the one that changes your failure mode. Without it, a saturated pool means every incoming request blocks indefinitely and your thread pool fills — the database problem becomes an application outage. With a 250 ms acquire timeout, excess requests fail fast with a clear error, the service stays responsive, and your dashboards show pool saturation instead of a mysterious hang.',
            ],
          },
          {
            kind: 'code',
            language: 'yaml',
            caption: 'A pool configured to fail fast and recycle safely',
            lines: [
              'pool:',
              '  max_size: 20            # cores*2 + disks, per instance',
              '  min_idle: 5             # warm connections for spikes',
              '  acquire_timeout: 250ms  # fail fast instead of queueing forever',
              '  max_lifetime: 30m       # survive failovers and DNS changes',
              '  idle_timeout: 10m',
              '  validate_on_borrow: true',
              '',
              '# Total connections at the DB = max_size x instance_count',
              '#   20 x 20 instances = 400  -> put PgBouncer in front',
            ],
          },
        ],
      },
      {
        id: 'transactions',
        heading: 'Pooling proxies and transaction mode',
        blocks: [
          {
            kind: 'prose',
            body: [
              'When instance count makes direct pooling untenable, a proxy sits between the app and the database. PgBouncer\'s **transaction pooling** mode is the usual choice: a server connection is assigned to a client only for the duration of a transaction, so hundreds of idle clients share a handful of real connections.',
              'The catch is that anything that spans transactions breaks. Session-level state — `SET` variables, prepared statements, advisory locks, `LISTEN`/`NOTIFY`, temporary tables — may land on a different backend next time. Knowing this restriction is a strong senior signal.',
            ],
          },
          {
            kind: 'table',
            columns: ['Mode', 'Connection held for', 'Multiplexing', 'Breaks'],
            rows: [
              ['Session', 'The whole client session', 'Minimal', 'Nothing'],
              ['Transaction', 'One transaction', 'Very high', 'Session state, prepared statements, advisory locks'],
              ['Statement', 'One statement', 'Highest', 'Multi-statement transactions entirely'],
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Serverless functions with per-invocation lifetimes — a pool inside a function that dies each request is useless; use a proxy (RDS Proxy, PgBouncer) or an HTTP data API.',
      'Very large pools as a fix for a slow database — you are moving the queue somewhere you cannot observe it.',
      'Transaction-mode pooling for workloads that rely on session state, prepared statements or advisory locks.',
      'Sharing one pool across wildly different workloads — a batch job will starve interactive requests; give it its own bulkhead.',
    ],
    failureModes: [
      {
        name: 'Pool exhaustion cascade',
        symptom: 'All requests hang; the service stops responding even to health checks.',
        cause: 'A slow query holds connections; with no acquire timeout, every thread blocks waiting for one.',
        fix: 'Set an acquire timeout, add statement timeouts, and alarm on pool wait time and utilisation.',
      },
      {
        name: 'Connection leak',
        symptom: 'Pool utilisation ratchets upward over hours and never returns to baseline.',
        cause: 'A code path that acquires a connection and does not release it on an error branch.',
        fix: 'Always release in a `finally`/context manager; enable leak detection thresholds in the pool.',
      },
      {
        name: 'Database out of connections',
        symptom: '"Too many clients already" errors after scaling out the application.',
        cause: 'Pool size multiplied by instance count exceeded the server limit.',
        fix: 'Reduce per-instance size and put a connection proxy in front; treat total connections as a global budget.',
      },
      {
        name: 'Stale connections after failover',
        symptom: 'Errors persist for minutes after a database failover even though it completed.',
        cause: 'Pooled connections still point at the old primary and are never recycled.',
        fix: 'Set a max lifetime, validate on borrow, and handle failover errors by discarding the connection.',
      },
    ],
    interview: [
      {
        q: 'How would you size a database connection pool?',
        a: [
          'I would start from the database\'s actual parallelism rather than the request rate — something like cores × 2 plus effective spindles, which for an 8-core SSD instance is around 17.',
          'Then I would multiply by instance count, because that is the number the database sees. Twenty instances with a pool of twenty is four hundred connections, which is usually too many for Postgres, so I would either shrink the pool or introduce PgBouncer.',
          'Finally I would validate empirically: raise the pool until throughput stops improving. Past that knee you are only adding latency variance.',
        ],
        followUps: ['Why does a larger pool not increase throughput?'],
      },
      {
        q: 'Why does a bigger pool often make things worse?',
        a: [
          'Because the database can only execute as many queries concurrently as it has cores and I/O capacity. Extra connections do not add execution capacity — they add queueing inside the database, plus per-connection memory and scheduler overhead.',
          'The queueing is also invisible to you and affects every query, including ones already running, whereas a small pool keeps the queue in the application where you can measure it, time it out, and shed load.',
        ],
      },
      {
        q: 'Your service hangs whenever the database is slow. What is missing?',
        a: [
          'An acquire timeout on the pool, almost certainly. Without one, a saturated pool means every request blocks indefinitely and the thread pool fills, so a degraded dependency becomes a full outage.',
          'I would add a short acquire timeout so excess requests fail fast, a statement timeout so no single query can hold a connection indefinitely, and a circuit breaker so we stop hammering a database that is already struggling.',
        ],
      },
      {
        q: 'Why do serverless functions need a connection proxy?',
        a: [
          'Because pooling assumes a long-lived process. Each concurrent function instance opens its own connections and cannot share them, so a thousand concurrent invocations means a thousand connection attempts against a database sized for far fewer.',
          'A proxy like RDS Proxy or PgBouncer holds the real connections and multiplexes the short-lived clients onto them, which restores the benefit the function lifecycle removed.',
        ],
      },
    ],
    references: [
      { label: 'HikariCP — About Pool Sizing', href: 'https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing' },
      { label: 'PgBouncer — pooling modes', href: 'https://www.pgbouncer.org/features.html' },
    ],
  },
}

// ── 4. Realtime delivery ─────────────────────────────────────────────────────

const realtime: Lesson = {
  slug: 'client-server-realtime',
  title: 'Polling, SSE & WebSockets',
  summary: 'Four ways to push server data to a client, and what each one costs.',
  group: 'fundamentals',
  topic: 'Client–Server Model',
  tier: 'pro',
  minutes: 8,
  concept: 'Concept',
  tags: [
    { label: 'Direction', value: 'Server → client' },
    { label: 'Cost driver', value: 'Idle connections' },
    { label: 'Choice', value: 'Latency vs simplicity' },
  ],
  notes: [
    'Request–response cannot push: the server has no way to speak first.',
    'Short polling wastes requests; long polling holds them; SSE and WebSockets keep one open connection.',
    'SSE is one-way and rides plain HTTP; WebSockets are bidirectional but need their own infrastructure.',
  ],
  scene: {
    code: [
      '# 1. short polling',
      'setInterval(() => fetch("/messages"), 3000)',
      '',
      '# 2. long polling — server holds the request',
      'while not new_data: sleep(0.1)',
      '',
      '# 3. SSE — one long-lived HTTP response',
      'Content-Type: text/event-stream',
      '',
      '# 4. WebSocket — full duplex after upgrade',
      'Upgrade: websocket',
    ],
    initialState: { mode: 'short polling', 'wasted requests': 0, 'delivery lag': '~3000 ms', 'open conns': 0 },
    nodes: [
      { id: 'client', kind: 'client', label: 'Browser', x: 16, y: 50 },
      { id: 'server', kind: 'server', label: 'App Server', x: 56, y: 50, badge: 'idle' },
      { id: 'bus', kind: 'queue', label: 'Event source', x: 88, y: 50, badge: 'no events' },
    ],
    edges: [
      { id: 'c-s', from: 'client', to: 'server' },
      { id: 's-c', from: 'server', to: 'client', curve: 0.45 },
      { id: 'bus-s', from: 'bus', to: 'server', curve: -0.3 },
    ],
    steps: [
      { id: '1', caption: 'Short polling: the browser asks "anything new?" every 3 seconds.', travel: 'c-s', token: 'request', codeLine: 2, patches: [{ nodeId: 'server', badge: 'nothing yet', highlight: true }], state: { mode: 'short polling', 'wasted requests': 1 } },
      { id: '2', caption: 'Almost every poll returns empty. 1,200 requests a day per user to deliver a handful of messages.', travel: 's-c', token: 'miss', codeLine: 2, state: { 'wasted requests': 1199, 'delivery lag': 'up to 3000 ms' } },
      { id: '3', caption: 'Long polling: the server holds the request open instead of answering "nothing".', travel: 'c-s', token: 'request', codeLine: 5, patches: [{ nodeId: 'server', badge: 'holding...', highlight: true }], state: { mode: 'long polling', 'open conns': 1 } },
      { id: '4', caption: 'An event arrives; the held request finally responds. Lag drops to near zero.', travel: 'bus-s', token: 'write', patches: [{ nodeId: 'bus', badge: 'event!', highlight: true }], state: { 'delivery lag': '~10 ms' } },
      { id: '5', caption: 'The client immediately re-opens the request — one connection per user, held permanently.', travel: 's-c', token: 'response', codeLine: 5, patches: [{ nodeId: 'server', badge: '1 held conn' }], state: { 'wasted requests': 0 } },
      { id: '6', caption: 'SSE: one HTTP response that never ends. The server writes events into it as they happen.', travel: 's-c', token: 'hit', codeLine: 8, patches: [{ nodeId: 'server', badge: 'streaming', highlight: true }], state: { mode: 'SSE', 'open conns': 1, 'delivery lag': '~5 ms' } },
      { id: '7', caption: 'WebSocket: after an HTTP upgrade, both sides send freely — the client can push too.', travel: 'c-s', token: 'write', codeLine: 11, patches: [{ nodeId: 'server', badge: 'full duplex', highlight: true }], state: { mode: 'WebSocket', 'delivery lag': '~2 ms' } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'HTTP is client-initiated by design: a server has no way to speak first. Every "realtime" feature on the web is therefore a workaround for that one limitation, and the four common workarounds differ enormously in cost, complexity and failure behaviour.',
      'The design decision is rarely "which is most realtime". It is **how much staleness the feature tolerates**, multiplied by **how many concurrent users you must hold open connections for**.',
    ],
    sections: [
      {
        id: 'four',
        heading: 'The four options, compared',
        blocks: [
          {
            kind: 'table',
            columns: ['Technique', 'Latency', 'Direction', 'Connections held', 'Infrastructure cost'],
            rows: [
              ['Short polling', 'Half the interval, on average', 'Pull only', 'None', 'Trivial — any HTTP stack'],
              ['Long polling', 'Near zero', 'Pull, server-triggered', 'One per user', 'Needs async servers; proxy timeouts bite'],
              ['SSE', 'Near zero', 'Server → client only', 'One per user', 'Plain HTTP; auto-reconnect built in'],
              ['WebSocket', 'Lowest', 'Bidirectional', 'One per user', 'Own protocol, sticky routing, pub/sub backplane'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'Short polling is dismissed too quickly. It is stateless, cacheable, survives any proxy, needs no special server, and costs nothing when idle users are not connected. For a notification badge that may be thirty seconds stale, it is genuinely the right answer — and it scales horizontally with no extra machinery at all.',
              'Its cost shows up when you shorten the interval. Latency and request volume are inversely coupled: halving the delay doubles the traffic, and almost all of that traffic returns nothing.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Concurrent users', value: '100,000' },
              { label: 'Poll interval', value: '3 s' },
              { label: 'Request rate', value: '33,000 /s', note: 'to deliver almost nothing' },
              { label: 'Actual events per second', value: '~200' },
              { label: 'Useful fraction', value: '0.6%' },
              { label: 'Same users on SSE', value: '100,000 open connections', note: '~200 pushes/s' },
            ],
            result: 'Polling trades connection count for request volume. Pick the one you can afford.',
          },
        ],
      },
      {
        id: 'connections',
        heading: 'The real constraint: holding connections open',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Long polling, SSE and WebSockets all convert your workload from *requests per second* to *concurrent open connections*, and that changes which resources run out.',
              'A connection is cheap in CPU and expensive in memory and file descriptors. Modern event-driven servers hold tens of thousands per node comfortably, but only if nothing in the path is thread-per-connection — a synchronous server with a 200-thread pool will fall over at 200 idle users.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Memory per idle connection', value: '~10–40 KB', note: 'buffers + bookkeeping' },
              { label: '50,000 connections', value: '~0.5–2 GB' },
              { label: 'File descriptors needed', value: '50,000+', note: 'raise ulimit' },
              { label: 'Ephemeral ports per client IP', value: '~28,000', note: 'matters for proxies' },
              { label: 'Realistic per-node capacity', value: '10k–100k', note: 'event-driven servers' },
            ],
            result: 'Plan node count from concurrent connections, not from request rate.',
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Persistent connections make your servers stateful',
            body: [
              'A user\'s connection lives on exactly one node. To notify them, the event must reach *that* node — so you need a **pub/sub backplane** (Redis, NATS, Kafka) that every node subscribes to, and a way to map user → node or simply broadcast.',
              'This is why "just add WebSockets" is never just adding WebSockets: it reintroduces the statefulness you removed everywhere else, plus sticky routing and connection-draining concerns on every deploy.',
            ],
          },
        ],
      },
      {
        id: 'sse',
        heading: 'Why SSE is underrated',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Server-Sent Events is a long-lived HTTP response with `Content-Type: text/event-stream` that the server keeps writing into. It is ordinary HTTP, so it passes through proxies, works with your existing auth, compresses, and is trivially debuggable with `curl`.',
              'The browser API also handles reconnection for you, including replay: the client sends `Last-Event-ID` on reconnect, so a server that assigns ids can resume exactly where the stream broke — a feature people frequently hand-roll badly on top of WebSockets.',
            ],
          },
          {
            kind: 'code',
            language: 'javascript',
            caption: 'sse.js — server stream and client consumer',
            lines: [
              '// server (Node/Express)',
              'app.get("/events", (req, res) => {',
              '  res.set({',
              '    "Content-Type": "text/event-stream",',
              '    "Cache-Control": "no-cache",',
              '    "Connection": "keep-alive",',
              '    "X-Accel-Buffering": "no",   // stop nginx buffering the stream',
              '  })',
              '  const send = (e) => res.write(`id: ${e.id}\\ndata: ${JSON.stringify(e)}\\n\\n`)',
              '  const keepAlive = setInterval(() => res.write(": ping\\n\\n"), 15000)',
              '  bus.subscribe(req.user.id, send)',
              '  req.on("close", () => { clearInterval(keepAlive); bus.unsubscribe(send) })',
              '})',
              '',
              '// client — reconnects automatically, resumes via Last-Event-ID',
              'const es = new EventSource("/events")',
              'es.onmessage = (e) => render(JSON.parse(e.data))',
            ],
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Send heartbeats or intermediaries will kill the stream',
            body: [
              'Load balancers and proxies close connections that look idle, typically after 30–60 seconds. A periodic comment line (`: ping`) keeps the stream alive and also lets the client detect a dead connection quickly. The same applies to WebSocket ping/pong frames.',
            ],
          },
        ],
      },
      {
        id: 'choosing',
        heading: 'Choosing, in order',
        blocks: [
          {
            kind: 'list',
            ordered: true,
            items: [
              '**Does the client need to send high-frequency messages too?** Chat typing indicators, multiplayer cursors, collaborative editing → WebSocket. Otherwise, do not pay for bidirectionality.',
              '**Is one-way push enough?** Notifications, live dashboards, progress bars, streaming LLM tokens → SSE. Simpler, cheaper, and reconnection is free.',
              '**Can the feature tolerate seconds of staleness?** Badge counts, "new posts available" → short polling with a sensible interval. Nothing to operate.',
              '**Is the update rare but the wait unpredictable?** Job completion, payment confirmation → long polling, or polling with backoff that widens the interval as the wait grows.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Reach for the simplest thing that meets the latency budget',
            body: [
              'Proposing WebSockets for a notification bell signals you are optimising the wrong axis. Saying "polling every 30 seconds costs 3,000 requests/sec at our scale, which is cheap, and the feature tolerates it — I would only move to SSE when we add live comment threads" signals you cost things out.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'WebSockets for one-way updates — you take on sticky routing, a backplane and reconnection logic for a capability you never use.',
      'Long polling behind proxies you do not control; intermediate timeouts will close held requests and produce confusing errors.',
      'Persistent connections on thread-per-request servers — a few hundred idle users will exhaust the thread pool.',
      'Short polling at intervals under a second — at that point you are paying more than a stream would cost.',
    ],
    failureModes: [
      {
        name: 'Reconnect storm',
        symptom: 'A deploy or blip drops all connections and the service is knocked over as they return.',
        cause: 'Every client reconnects instantly and simultaneously.',
        fix: 'Randomised exponential backoff on the client, connection draining on deploy, and admission rate limiting.',
      },
      {
        name: 'Silent stream death',
        symptom: 'The UI stops updating with no error; a refresh fixes it.',
        cause: 'A proxy closed an idle connection and the client never noticed.',
        fix: 'Server heartbeats plus a client-side watchdog that reconnects when no data arrives within an expected window.',
      },
      {
        name: 'Message lost during reconnect',
        symptom: 'Users miss updates that occurred while they were briefly disconnected.',
        cause: 'The stream is fire-and-forget with no resume point.',
        fix: 'Assign event ids and support resume (`Last-Event-ID` for SSE, a cursor for WebSockets); fall back to a fetch on reconnect.',
      },
      {
        name: 'Events delivered to the wrong node',
        symptom: 'Some users receive notifications and others do not, seemingly at random.',
        cause: 'The publishing node holds no connection for the target user and there is no backplane.',
        fix: 'Publish to Redis/NATS and have every node forward to its own connected users.',
      },
    ],
    interview: [
      {
        q: 'Design the notification delivery for a social app. Polling or WebSockets?',
        a: [
          'I would ask about the latency requirement first. A notification badge that can be ten seconds stale is a polling problem, and polling costs nothing to operate — no sticky routing, no backplane, no connection draining.',
          'If the product needs sub-second delivery, I would use SSE rather than WebSockets, because delivery is one-way. That gives near-zero latency, automatic reconnection with resume, and it rides plain HTTP through our existing infrastructure.',
          'I would only introduce WebSockets when the client also needs to send frequently — chat with typing indicators, or collaborative editing.',
        ],
        followUps: ['How do you deliver an event to a user connected to a different node?'],
      },
      {
        q: 'What changes operationally when you move from polling to persistent connections?',
        a: [
          'Your capacity model changes from requests per second to concurrent connections, so you size nodes by memory and file descriptors rather than CPU.',
          'The servers become stateful: a user is attached to one node, so publishing requires a pub/sub backplane, and deploys need connection draining and client backoff or every restart becomes a thundering herd.',
          'You also inherit heartbeat and reconnect-with-resume logic, because intermediaries will close idle connections and clients must not silently miss events.',
        ],
      },
      {
        q: 'SSE or WebSocket for streaming LLM tokens?',
        a: [
          'SSE. The data flows one way, the transport is plain HTTP so auth, proxies and CDNs work unchanged, and the browser handles reconnection.',
          'WebSockets would add a bidirectional channel that the feature does not use, plus its own routing and reconnection concerns. I would switch only if the client needed to interrupt or stream input on the same channel at high frequency.',
        ],
      },
    ],
    references: [
      { label: 'MDN — Server-Sent Events', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events' },
      { label: 'RFC 6455 — The WebSocket Protocol', href: 'https://datatracker.ietf.org/doc/html/rfc6455' },
    ],
  },
}

// ── 5. Idempotency & retries ─────────────────────────────────────────────────

const idempotency: Lesson = {
  slug: 'client-server-idempotency',
  title: 'Retries & Idempotency',
  summary: 'The response was lost, not the request — and the retry charges the card twice.',
  group: 'fundamentals',
  topic: 'Client–Server Model',
  tier: 'pro',
  minutes: 7,
  concept: 'Concept',
  tags: [
    { label: 'Problem', value: 'Ambiguous failure' },
    { label: 'Tool', value: 'Idempotency key' },
    { label: 'Guarantee', value: 'Effectively once' },
  ],
  notes: [
    'A timeout does not tell you whether the server processed the request — only that you did not hear back.',
    'Retrying a non-idempotent operation duplicates its side effect: a second charge, a second order.',
    'An idempotency key lets the server recognise the retry and replay the original response.',
  ],
  scene: {
    code: [
      'POST /payments',
      'Idempotency-Key: 9f2c-41ab',
      '',
      'prior = store.get(key)',
      'if prior: return prior.response   # replay',
      '',
      'charge = gateway.charge(amount)',
      'store.put(key, charge, ttl=24h)',
      'return charge',
    ],
    initialState: { attempts: 0, charges: 0, 'client sees': '—', key: '9f2c-41ab' },
    nodes: [
      { id: 'client', kind: 'client', label: 'Client', x: 14, y: 50 },
      { id: 'api', kind: 'server', label: 'Payments API', x: 48, y: 50, badge: 'ready' },
      { id: 'store', kind: 'cache', label: 'Key store', x: 80, y: 22, badge: 'empty' },
      { id: 'db', kind: 'database', label: 'Ledger', x: 84, y: 76, badge: '0 charges' },
    ],
    edges: [
      { id: 'c-api', from: 'client', to: 'api' },
      { id: 'api-store', from: 'api', to: 'store', curve: -0.3 },
      { id: 'api-db', from: 'api', to: 'db', curve: 0.3 },
      { id: 'api-c', from: 'api', to: 'client', curve: 0.5 },
    ],
    steps: [
      { id: '1', caption: 'The client sends a payment with a unique idempotency key it generated.', travel: 'c-api', token: 'request', codeLine: 2, patches: [{ nodeId: 'api', badge: 'processing', highlight: true }], state: { attempts: 1 } },
      { id: '2', caption: 'No prior record for this key, so the API proceeds and writes the charge.', travel: 'api-db', token: 'write', codeLine: 7, patches: [{ nodeId: 'db', badge: '1 charge', highlight: true }], state: { charges: 1 } },
      { id: '3', caption: 'It stores the key with the response before replying.', travel: 'api-store', token: 'write', codeLine: 8, patches: [{ nodeId: 'store', badge: 'key → 201', highlight: true }] },
      { id: '4', caption: 'The response is lost in the network. The client sees only a timeout.', travel: 'api-c', token: 'miss', patches: [{ nodeId: 'api', badge: '✗ response lost', highlight: true }], state: { 'client sees': 'timeout ⚠' } },
      { id: '5', caption: 'The client retries — same request, same key. Without one, this is a second charge.', travel: 'c-api', token: 'request', codeLine: 2, state: { attempts: 2 } },
      { id: '6', caption: 'The API finds the key and replays the stored response instead of charging again.', travel: 'api-store', token: 'hit', codeLine: 5, patches: [{ nodeId: 'store', badge: 'HIT · replay', highlight: true }] },
      { id: '7', caption: 'One charge, two attempts. The ledger never moved on the retry.', travel: 'api-c', token: 'response', codeLine: 5, patches: [{ nodeId: 'db', badge: '1 charge' }], state: { charges: 1, 'client sees': '201 Created ✓' } },
    ],
  },
  deepDive: {
    readingMinutes: 8,
    intro: [
      'Every distributed system eventually hits the same wall: **a timeout is ambiguous**. The request may never have arrived, may have been processed and the response lost, or may still be running. The client cannot tell the difference, and it must decide whether to retry.',
      'Idempotency is what makes that decision safe. An idempotent operation can be applied any number of times with the same result as applying it once — so "retry until you get an answer" stops being dangerous.',
    ],
    sections: [
      {
        id: 'ambiguity',
        heading: 'The two-generals problem, in production',
        blocks: [
          {
            kind: 'prose',
            body: [
              'When a client times out, exactly one of three things is true, and no amount of client-side logic can distinguish them: the request was lost in transit, the request succeeded but the response was lost, or the request is still being processed and will succeed later.',
              'This is why "exactly-once delivery" does not exist over an unreliable network. What you can build is **at-least-once delivery plus idempotent processing**, which produces an effectively-once outcome — and that phrasing is worth using precisely, because it shows you know where the guarantee actually comes from.',
            ],
          },
          {
            kind: 'table',
            columns: ['Method', 'Idempotent by definition?', 'Why'],
            rows: [
              ['GET', 'Yes', 'Reads have no side effect'],
              ['PUT', 'Yes', 'Sets a resource to a specified state; repeating sets the same state'],
              ['DELETE', 'Yes', 'The second delete finds nothing to delete; the end state matches'],
              ['POST', 'No', 'Creates a new resource each time — the standard duplicate-charge shape'],
              ['PATCH', 'Depends', '`set balance = 100` is idempotent; `balance = balance - 10` is not'],
            ],
            caption: 'Relative mutations are the trap: an increment applied twice is simply wrong.',
          },
        ],
      },
      {
        id: 'keys',
        heading: 'Idempotency keys, done properly',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The mechanism is simple: the **client** generates a unique key per logical operation and sends it with every attempt. The server records the key alongside the outcome, and on seeing a key it has already completed, it replays the stored response instead of doing the work again.',
              'The details are where implementations go wrong. The key must be recorded **atomically with the side effect**, not after it, or a crash in between leaves you with a charge and no record of it. In a relational database that means writing the key row inside the same transaction as the ledger row.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'idempotency.py — key and side effect in one transaction',
            lines: [
              'def create_payment(key, user_id, amount):',
              '    with db.transaction():',
              '        prior = db.query(',
              '            "SELECT response, status, request_hash FROM idempotency_keys "',
              '            "WHERE key = %s FOR UPDATE", key)',
              '',
              '        if prior and prior.status == "completed":',
              '            if prior.request_hash != hash_request(user_id, amount):',
              '                raise Conflict("key reused with different parameters")',
              '            return prior.response              # replay',
              '',
              '        if prior and prior.status == "in_progress":',
              '            raise Conflict("request already in flight")   # 409, client retries later',
              '',
              '        db.execute("INSERT INTO idempotency_keys (key, status, request_hash) "',
              '                   "VALUES (%s, \'in_progress\', %s)", key, hash_request(user_id, amount))',
              '',
              '        charge = ledger.debit(user_id, amount)  # same transaction',
              '        response = {"id": charge.id, "status": "succeeded"}',
              '',
              '        db.execute("UPDATE idempotency_keys SET status = \'completed\', "',
              '                   "response = %s WHERE key = %s", response, key)',
              '        return response',
            ],
          },
          {
            kind: 'list',
            items: [
              '**The client generates the key**, not the server — a server-generated key cannot survive the very failure it exists for.',
              '**Hash the request body** and compare it. The same key with different parameters is a client bug, and returning the old response silently would hide it. Return `409`.',
              '**Handle the in-flight case.** Two concurrent attempts with the same key must not both proceed; row locking or a unique constraint decides a winner.',
              '**Give keys a TTL** — 24 hours is the common choice. They are a retry-window mechanism, not an audit log.',
              '**Store the response, not just a flag**, so the retry gets the same body and status the original would have returned.',
            ],
          },
        ],
      },
      {
        id: 'retries',
        heading: 'Retrying without amplifying the outage',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Idempotency makes retries *safe*; it does not make them *free*. A retry policy that fires immediately and uniformly turns a brief degradation into a sustained overload, because every client retries at the same moment — the retry storm.',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Exponential backoff with full jitter.** `sleep = random(0, min(cap, base * 2^attempt))`. The randomness is the important half; without it, backoff just synchronises the herd at longer intervals.',
              '**A retry budget.** Cap retries at a small fraction of total requests (a few percent) so a broad failure cannot multiply your traffic.',
              '**Retry only what is retryable.** A `500` or a timeout, yes. A `400` or `422` will fail identically forever — retrying it is pure waste.',
              '**Respect `Retry-After`** on `429` and `503`; the server is telling you exactly what it can absorb.',
              '**Do not retry at every layer.** Three layers each retrying three times is twenty-seven requests. Choose one layer to own retries.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Normal request rate', value: '10,000 /s' },
              { label: 'Failure rate during incident', value: '50%' },
              { label: 'Retries per failure (3 layers × 3)', value: '27' },
              { label: 'Effective load', value: '~145,000 /s', note: '14× normal' },
              { label: 'With one layer, 3 retries, budget 10%', value: '~11,000 /s' },
            ],
            result: 'Nested retries are how a partial failure becomes a total one.',
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Say "at-least-once plus idempotent processing"',
            body: [
              'When asked for exactly-once semantics, the strong answer names the impossibility and then the workaround: you cannot guarantee exactly-once delivery over an unreliable network, so you deliver at least once and make the operation idempotent, which is observably equivalent.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Do not retry non-idempotent operations that have no key — you are choosing duplicate side effects over a visible error.',
      'Skip idempotency keys for pure reads; they add storage and a lock for no benefit.',
      'Do not retry client errors (4xx other than 429) — the outcome will not change.',
      'Avoid retries in more than one layer of the stack; pick the layer closest to the caller that can act on the result.',
    ],
    failureModes: [
      {
        name: 'Double charge',
        symptom: 'Customers report being billed twice; both charges look legitimate.',
        cause: 'A lost response on a non-idempotent POST, followed by a client or gateway retry.',
        fix: 'Client-generated idempotency keys recorded atomically with the ledger write.',
      },
      {
        name: 'Key recorded after the side effect',
        symptom: 'Rare duplicates that only occur during crashes or deploys.',
        cause: 'The charge committed but the process died before writing the key row.',
        fix: 'Write the key and the effect in one transaction, or reserve the key before doing the work.',
      },
      {
        name: 'Retry storm',
        symptom: 'Load keeps climbing after the initial failure and does not recover when the trigger clears.',
        cause: 'Immediate, unjittered retries in multiple layers.',
        fix: 'Full-jitter exponential backoff, a retry budget, retries at one layer only, and a circuit breaker.',
      },
      {
        name: 'Key reuse with different parameters',
        symptom: 'A client receives a stale response for a genuinely new request.',
        cause: 'The client reused a key (often a request id fixed per session) across different operations.',
        fix: 'Store a hash of the request and return 409 on mismatch rather than replaying.',
      },
    ],
    interview: [
      {
        q: 'A payment request times out. Should the client retry?',
        a: [
          'Only if the operation is idempotent, because the timeout does not tell us whether the charge happened — the request may have been lost, or processed with the response lost.',
          'The fix is an idempotency key generated by the client and sent with every attempt. The server records it atomically with the ledger write, and on a repeat it replays the stored response rather than charging again. Then retrying is safe and correct.',
        ],
        followUps: ['Where exactly do you store the key, and in what transaction?'],
      },
      {
        q: 'Is exactly-once delivery possible?',
        a: [
          'Not over an unreliable network — the classic two-generals result. You cannot distinguish a lost request from a lost response, so any protocol must choose between possibly-zero and possibly-many deliveries.',
          'What is achievable is at-least-once delivery combined with idempotent processing, which produces an effectively-once outcome. The guarantee comes from the receiver deduplicating, not from the transport.',
        ],
      },
      {
        q: 'How do you keep retries from making an outage worse?',
        a: [
          'Exponential backoff with full jitter, so clients spread out instead of retrying in lockstep. Then a retry budget so retries stay a small fraction of total traffic even when everything is failing.',
          'I would also retry at only one layer — nested retries multiply — and only for retryable errors, honouring `Retry-After` when the server sends it. A circuit breaker stops traffic entirely once failures dominate, which lets the dependency recover.',
        ],
      },
    ],
    references: [
      { label: 'Stripe — Idempotent requests', href: 'https://docs.stripe.com/api/idempotent_requests' },
      { label: 'AWS Builders’ Library — Timeouts, retries and backoff with jitter', href: 'https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/' },
    ],
  },
}

export const clientServerModel: Lesson[] = [
  requestResponse,
  stateless,
  connectionPooling,
  realtime,
  idempotency,
]
