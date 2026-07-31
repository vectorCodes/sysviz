import type { Lesson } from '../types'

// ── Client–Server Model ───────────────────────────────────────────────────────

const clientServer: Lesson = {
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
      { id: '2', caption: 'The server can\'t answer alone — it queries the database.', travel: 's-db', token: 'request', codeLine: 2, state: { step: 'querying db' } },
      { id: '3', caption: 'The database finds the row and returns it.', travel: 'db-s', token: 'response', codeLine: 3, state: { step: 'row fetched' } },
      { id: '4', caption: 'The server renders a response from the data.', codeLine: 4, state: { step: 'rendering' } },
      { id: '5', caption: 'The response travels back and the browser paints it.', travel: 's-c', token: 'response', codeLine: 5, state: { step: 'done', 'round-trip': '~40 ms' } },
    ],
  },
}

const clientServerStateless: Lesson = {
  slug: 'client-server-stateless',
  title: 'Stateless vs Stateful Servers',
  summary: 'Why servers shouldn\'t remember clients — and how sessions still work.',
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
      { id: '1', caption: 'User logs in. Load balancer routes to Server 1 which stores the session in its own memory.', travel: 'b-lb', token: 'request', codeLine: 2, patches: [{ nodeId: 's1', badge: 'session ✓', highlight: true }] },
      { id: '2', caption: 'Requests keep going to Server 1 — fine so far.', travel: 'lb-s1', token: 'hit', codeLine: 2, patches: [{ nodeId: 's1', badge: 'session ✓', highlight: true }] },
      { id: '3', caption: 'Server 1 crashes. All in-memory sessions are gone.', patches: [{ nodeId: 's1', badge: '✗ crashed', highlight: true }], state: { 'sessions lost': 1, 'servers up': 1 } },
      { id: '4', caption: 'Next request hits Server 2 — no session there. User is logged out unexpectedly.', travel: 'lb-s2', token: 'miss', codeLine: 2, patches: [{ nodeId: 's2', badge: 'no session ✗', highlight: true }] },
      { id: '5', caption: 'Fix: move sessions to Redis. Servers become stateless — they hold nothing.', patches: [{ nodeId: 'redis', badge: 'sessions ✓', highlight: true }], state: { mode: 'stateless', 'servers up': 2 } },
      { id: '6', caption: 'Server 2 (now recovered) reads the session from Redis — any server can serve any user.', travel: 's2-redis', token: 'hit', codeLine: 5, patches: [{ nodeId: 's2', badge: 'session ✓', highlight: true }], state: { 'sessions lost': 0 } },
    ],
  },
}

const clientServerConnections: Lesson = {
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
      { id: '3', caption: 'Query goes straight to the database on an existing connection.', travel: 'pool-db', token: 'request', codeLine: 8, state: { 'conn overhead': '~0 ms', queries: 1 } },
      { id: '4', caption: 'Result returns through the same connection.', travel: 'db-pool', token: 'response', codeLine: 8 },
      { id: '5', caption: 'Connection is returned to the pool, ready for the next query.', travel: 'pool-a', token: 'response', codeLine: 9, patches: [{ nodeId: 'pool', badge: '10 ready', highlight: true }] },
      { id: '6', caption: '1,000 queries/sec served by 10 persistent connections. Pool size is the knob.', state: { queries: 1000, 'conn overhead': '~0 ms', 'pool size': 10 } },
    ],
  },
}

// ── Latency vs Throughput ─────────────────────────────────────────────────────

const latencyThroughput: Lesson = {
  slug: 'latency-vs-throughput',
  title: 'Latency vs Throughput',
  summary: 'Two different questions: how fast is one request, and how many per second?',
  group: 'fundamentals',
  topic: 'Latency vs Throughput',
  tier: 'free',
  minutes: 5,
  concept: 'Concept',
  tags: [
    { label: 'Latency', value: 'ms / μs' },
    { label: 'Throughput', value: 'req/s' },
    { label: 'Trade-off', value: 'Speed vs Volume' },
  ],
  notes: [
    'Latency = time for a single request to complete (lower is better).',
    'Throughput = requests completed per second (higher is better).',
    'They are independent: a slow pipe can still be wide. Adding workers raises throughput without changing per-request latency.',
  ],
  scene: {
    code: [
      '# latency: one request, end to end',
      'start = now()',
      'handle(request)             # ~50 ms',
      'latency = now() - start',
      '',
      '# throughput: how many finish per second',
      'throughput = completed / seconds',
    ],
    initialState: { latency: '50 ms', 'in flight': 0, throughput: '0 rps' },
    nodes: [
      { id: 'client', kind: 'client', label: 'Clients', x: 16, y: 50 },
      { id: 'w1', kind: 'server', label: 'Worker 1', x: 78, y: 26, badge: 'idle' },
      { id: 'w2', kind: 'server', label: 'Worker 2', x: 78, y: 50, badge: 'idle' },
      { id: 'w3', kind: 'server', label: 'Worker 3', x: 78, y: 74, badge: 'idle' },
    ],
    edges: [
      { id: 'c-w1', from: 'client', to: 'w1', curve: -0.3 },
      { id: 'c-w2', from: 'client', to: 'w2' },
      { id: 'c-w3', from: 'client', to: 'w3', curve: 0.3 },
    ],
    steps: [
      { id: '1', caption: 'One request takes ~50 ms to handle. That\'s latency.', travel: 'c-w1', token: 'request', codeLine: 3, patches: [{ nodeId: 'w1', badge: 'busy', highlight: true }] },
      { id: '2', caption: 'Latency is fixed per request — it doesn\'t change if we do more at once.', codeLine: 4, state: { 'in flight': 1 } },
      { id: '3', caption: 'With 3 workers, three requests run in parallel…', travel: 'c-w2', token: 'request', codeLine: 7, patches: [{ nodeId: 'w2', badge: 'busy', highlight: true }], state: { 'in flight': 2 } },
      { id: '4', caption: '…so throughput triples even though each still takes 50 ms.', travel: 'c-w3', token: 'request', codeLine: 7, patches: [{ nodeId: 'w3', badge: 'busy', highlight: true }], state: { 'in flight': 3, throughput: '60 rps' } },
      { id: '5', caption: 'Latency = speed of one. Throughput = volume of many.', state: { throughput: '60 rps', latency: '50 ms' } },
    ],
  },
}

const latencyPercentiles: Lesson = {
  slug: 'latency-percentiles',
  title: 'P50 / P95 / P99 Tail Latency',
  summary: 'Averages lie. Percentile latency reveals the worst-case users actually experience.',
  group: 'fundamentals',
  topic: 'Latency vs Throughput',
  tier: 'free',
  minutes: 7,
  concept: 'Concept',
  tags: [
    { label: 'Metric', value: 'P50 / P95 / P99' },
    { label: 'Tail latency', value: 'Defines SLA' },
    { label: 'Pitfall', value: 'Averages mislead' },
  ],
  notes: [
    'P50 = median: half your users are faster, half slower.',
    'P99 = the slowest 1 in 100 requests — this is what your worst-case user experiences.',
    'SLAs are written on P99, not averages, because averages hide tail pain.',
  ],
  scene: {
    code: [
      '# p50: 50th percentile (median)',
      'p50 = sorted(latencies)[len * 0.50]   # fast path',
      '',
      '# p95 / p99: tail latency',
      'p95 = sorted(latencies)[len * 0.95]   # DB miss',
      'p99 = sorted(latencies)[len * 0.99]   # cold query',
      '',
      '# average hides the tail!',
      'avg = sum(latencies) / len            # misleading',
    ],
    initialState: { p50: '—', p95: '—', p99: '—', avg: '—' },
    nodes: [
      { id: 'users', kind: 'client', label: '100 Users', x: 12, y: 50 },
      { id: 'server', kind: 'server', label: 'API Server', x: 48, y: 50 },
      { id: 'cache', kind: 'cache', label: 'Cache', x: 82, y: 25, badge: 'fast path' },
      { id: 'db', kind: 'database', label: 'Database', x: 82, y: 75, badge: 'slow path' },
    ],
    edges: [
      { id: 'u-s', from: 'users', to: 'server' },
      { id: 's-cache', from: 'server', to: 'cache', curve: -0.3 },
      { id: 's-db', from: 'server', to: 'db', curve: 0.3 },
      { id: 'cache-s', from: 'cache', to: 'server', curve: 0.3 },
      { id: 'db-s', from: 'db', to: 'server', curve: -0.3 },
    ],
    steps: [
      { id: '1', caption: '100 users send requests at the same time.', travel: 'u-s', token: 'request', codeLine: 1 },
      { id: '2', caption: '90 requests hit the cache — respond in 5 ms. This sets P50 at 5 ms.', travel: 's-cache', token: 'hit', codeLine: 2, patches: [{ nodeId: 'cache', badge: 'HIT 5ms', highlight: true }], state: { p50: '5 ms' } },
      { id: '3', caption: 'Cache results return fast.', travel: 'cache-s', token: 'hit', codeLine: 2 },
      { id: '4', caption: '9 requests miss the cache — DB takes 200 ms. P95 = 200 ms.', travel: 's-db', token: 'miss', codeLine: 5, patches: [{ nodeId: 'db', badge: 'MISS 200ms', highlight: true }], state: { p95: '200 ms' } },
      { id: '5', caption: 'DB results return — much slower than cache.', travel: 'db-s', token: 'miss', codeLine: 5 },
      { id: '6', caption: '1 request hits a cold query — takes 2 seconds. P99 = 2 s.', patches: [{ nodeId: 'db', badge: 'cold 2000ms', highlight: true }], state: { p99: '2000 ms' } },
      { id: '7', caption: 'Average is ~25 ms — sounds fast. But 1% of users wait 2 full seconds. Always watch P99.', state: { p50: '5 ms', p95: '200 ms', p99: '2000 ms', avg: '~25 ms (misleading)' } },
    ],
  },
}

// ── Horizontal vs Vertical Scaling ────────────────────────────────────────────

const scaling: Lesson = {
  slug: 'horizontal-vs-vertical-scaling',
  title: 'Vertical vs Horizontal Scaling',
  summary: 'Grow by adding bigger machines, or by adding more of them.',
  group: 'fundamentals',
  topic: 'Scaling Strategies',
  tier: 'free',
  minutes: 6,
  concept: 'Concept',
  tags: [
    { label: 'Scalability', value: 'Horizontal' },
    { label: 'Fault tolerance', value: 'High' },
    { label: 'Trade-off', value: 'Cost vs Ceiling' },
  ],
  notes: [
    'Vertical: one machine, more CPU/RAM. Simple, but there\'s a hard ceiling and a single point of failure.',
    'Horizontal: many machines behind a load balancer. Near-limitless, fault-tolerant — but needs statelessness.',
    'Most large systems scale horizontally for exactly these reasons.',
  ],
  scene: {
    code: [
      '# vertical: make the one server bigger',
      'server.cpu   = 32 cores',
      'server.ram   = 256 GB   # ceiling!',
      '',
      '# horizontal: add more servers',
      'pool.add(server)',
      'loadBalancer.route(request, pool)',
    ],
    initialState: { mode: 'vertical', servers: 1, 'server load': '100%' },
    nodes: [
      { id: 'client', kind: 'client', label: 'Traffic', x: 12, y: 50 },
      { id: 'lb', kind: 'loadBalancer', label: 'Load Balancer', x: 42, y: 50 },
      { id: 's1', kind: 'server', label: 'Server 1', x: 80, y: 24, badge: '100%' },
      { id: 's2', kind: 'server', label: 'Server 2', x: 80, y: 50, badge: 'off' },
      { id: 's3', kind: 'server', label: 'Server 3', x: 80, y: 76, badge: 'off' },
    ],
    edges: [
      { id: 'c-lb', from: 'client', to: 'lb' },
      { id: 'lb-s1', from: 'lb', to: 's1', curve: -0.35 },
      { id: 'lb-s2', from: 'lb', to: 's2' },
      { id: 'lb-s3', from: 'lb', to: 's3', curve: 0.35 },
    ],
    steps: [
      { id: '1', caption: 'Traffic pours into a single server — it\'s maxed at 100%.', travel: 'c-lb', token: 'request', codeLine: 2, patches: [{ nodeId: 's1', badge: '100%', highlight: true }] },
      { id: '2', caption: 'Vertical scaling adds CPU/RAM — but every machine has a ceiling, and it\'s still one point of failure.', codeLine: 3 },
      { id: '3', caption: 'Instead, scale horizontally: bring a second server online.', travel: 'lb-s2', token: 'request', codeLine: 6, patches: [{ nodeId: 's2', badge: '50%', highlight: true }], state: { mode: 'horizontal', servers: 2, 'server load': '50%' } },
      { id: '4', caption: 'And a third. The load balancer spreads traffic across all of them.', travel: 'lb-s3', token: 'request', codeLine: 7, patches: [{ nodeId: 's1', badge: '33%' }, { nodeId: 's3', badge: '33%', highlight: true }], state: { servers: 3, 'server load': '33%' } },
      { id: '5', caption: 'Load per machine drops and any one can fail without downtime.', patches: [{ nodeId: 's1', badge: '33%' }, { nodeId: 's2', badge: '33%' }, { nodeId: 's3', badge: '33%' }] },
    ],
  },
}

const autoScaling: Lesson = {
  slug: 'auto-scaling',
  title: 'Auto-Scaling',
  summary: 'Automatically add servers on spikes, remove them when traffic drops.',
  group: 'fundamentals',
  topic: 'Scaling Strategies',
  tier: 'free',
  minutes: 7,
  concept: 'Concept',
  tags: [
    { label: 'Trigger', value: 'CPU / RPS threshold' },
    { label: 'Cost', value: 'Pay-per-use' },
    { label: 'Pattern', value: 'Elastic scaling' },
  ],
  notes: [
    'Auto-scaling watches a metric (CPU, RPS, queue depth) and adds/removes servers automatically.',
    'Scale-out happens fast; scale-in is slow (drain existing requests first).',
    'Stateless servers are required — a new server must be able to serve any request.',
  ],
  scene: {
    code: [
      'if avg_cpu > 70%:',
      '    group.launch_instance()   # scale out',
      '    wait_for_healthy()',
      '',
      'if avg_cpu < 30% and instances > 1:',
      '    group.terminate_oldest()  # scale in',
    ],
    initialState: { rps: 100, servers: 2, 'avg CPU': '40%' },
    nodes: [
      { id: 'traffic', kind: 'client', label: 'Traffic', x: 10, y: 50 },
      { id: 'scaler', kind: 'apiGateway', label: 'Auto Scaler', x: 38, y: 50 },
      { id: 's1', kind: 'server', label: 'Server 1', x: 75, y: 24, badge: '40% CPU' },
      { id: 's2', kind: 'server', label: 'Server 2', x: 75, y: 50, badge: '40% CPU' },
      { id: 's3', kind: 'server', label: 'Server 3', x: 75, y: 76, badge: 'standby' },
    ],
    edges: [
      { id: 't-sc', from: 'traffic', to: 'scaler' },
      { id: 'sc-s1', from: 'scaler', to: 's1', curve: -0.25 },
      { id: 'sc-s2', from: 'scaler', to: 's2' },
      { id: 'sc-s3', from: 'scaler', to: 's3', curve: 0.25 },
    ],
    steps: [
      { id: '1', caption: 'Normal load: 100 rps, 2 servers at 40% CPU each. Comfortable.', travel: 't-sc', token: 'request', state: { rps: 100, servers: 2, 'avg CPU': '40%' } },
      { id: '2', caption: 'Traffic spikes to 500 rps. Both servers hit 100% CPU — requests start queuing.', patches: [{ nodeId: 's1', badge: '100% ⚠', highlight: true }, { nodeId: 's2', badge: '100% ⚠', highlight: true }], state: { rps: 500, 'avg CPU': '100%' } },
      { id: '3', caption: 'Auto Scaler detects high CPU — launches Server 3.', travel: 'sc-s3', token: 'write', codeLine: 2, patches: [{ nodeId: 's3', badge: 'starting...', highlight: true }] },
      { id: '4', caption: 'Server 3 passes health checks and joins the pool. Load spreads to 3 servers.', codeLine: 3, patches: [{ nodeId: 's1', badge: '60% CPU' }, { nodeId: 's2', badge: '60% CPU' }, { nodeId: 's3', badge: '60% CPU', highlight: true }], state: { servers: 3, 'avg CPU': '60%' } },
      { id: '5', caption: 'Traffic drops back to 100 rps. Server 3 is mostly idle.', patches: [{ nodeId: 's3', badge: 'idle', highlight: true }], state: { rps: 100, 'avg CPU': '20%' } },
      { id: '6', caption: 'Scaler terminates Server 3 to save cost. Back to 2 healthy servers.', codeLine: 6, patches: [{ nodeId: 's3', badge: 'terminated' }], state: { servers: 2, 'avg CPU': '40%' } },
    ],
  },
}

export const fundamentals: Lesson[] = [
  clientServer, clientServerStateless, clientServerConnections,
  latencyThroughput, latencyPercentiles,
  scaling, autoScaling,
]
