import type { Lesson } from '../types'

const loadBalancer: Lesson = {
  slug: 'load-balancer',
  title: 'Load Balancer',
  summary: 'Spread traffic across servers — and route around the ones that die.',
  group: 'building-blocks',
  tier: 'free',
  minutes: 7,
  concept: 'Concept',
  complexity: { time: 'O(1)', space: 'O(n)' },
  notes: [
    'Round-robin sends each request to the next server in turn.',
    'Health checks continuously ping servers; unhealthy ones are pulled from the pool.',
    'When a server dies mid-traffic, the balancer reroutes instantly — clients never notice.',
  ],
  scene: {
    code: [
      'pool = [A, B, C]            # healthy servers',
      'next = 0',
      'on request:',
      '    s = pool[next]',
      '    next = (next + 1) % len(pool)',
      '    forward(request, s)',
      'on healthcheck_fail(s):',
      '    pool.remove(s)          # stop routing to it',
    ],
    initialState: { algorithm: 'round-robin', healthy: 3, requests: 0 },
    nodes: [
      { id: 'client', kind: 'client', label: 'Clients', x: 12, y: 50 },
      { id: 'lb', kind: 'loadBalancer', label: 'Load Balancer', x: 42, y: 50 },
      { id: 's1', kind: 'server', label: 'Server A', x: 82, y: 22, badge: 'healthy' },
      { id: 's2', kind: 'server', label: 'Server B', x: 82, y: 50, badge: 'healthy' },
      { id: 's3', kind: 'server', label: 'Server C', x: 82, y: 78, badge: 'healthy' },
    ],
    edges: [
      { id: 'c-lb', from: 'client', to: 'lb' },
      { id: 'lb-s1', from: 'lb', to: 's1', curve: -0.35 },
      { id: 'lb-s2', from: 'lb', to: 's2' },
      { id: 'lb-s3', from: 'lb', to: 's3', curve: 0.35 },
    ],
    steps: [
      { id: '1', caption: 'A request hits the load balancer — the single public address.', travel: 'c-lb', token: 'request', codeLine: 3, state: { requests: 1 } },
      { id: '2', caption: 'Round-robin forwards it to Server A.', travel: 'lb-s1', token: 'request', codeLine: 4, patches: [{ nodeId: 's1', badge: '1 req', highlight: true }] },
      { id: '3', caption: 'The next request goes to Server B, then C — evenly spread.', travel: 'lb-s2', token: 'request', codeLine: 4, patches: [{ nodeId: 's2', badge: '1 req', highlight: true }], state: { requests: 2 } },
      { id: '4', caption: 'A health check to Server B fails — it has crashed.', travel: 'lb-s2', token: 'miss', codeLine: 7, patches: [{ nodeId: 's2', badge: '✗ down', highlight: true }], state: { healthy: 2 } },
      { id: '5', caption: 'The balancer removes B from the pool. It’s no longer a target.', codeLine: 8, patches: [{ nodeId: 's2', badge: 'removed' }] },
      { id: '6', caption: 'The request that would’ve gone to B is rerouted to C — no error reaches the client.', travel: 'lb-s3', token: 'request', codeLine: 6, patches: [{ nodeId: 's3', badge: '2 req', highlight: true }], state: { requests: 3 } },
    ],
  },
}

const caching: Lesson = {
  slug: 'caching',
  title: 'Caching (Cache-Aside)',
  summary: 'Serve hot data from memory; fall back to the database only on a miss.',
  group: 'building-blocks',
  tier: 'free',
  minutes: 7,
  concept: 'Concept',
  complexity: { time: 'O(1)', space: 'O(k)' },
  notes: [
    'Cache-aside: the app checks the cache first. On a miss it reads the DB, then stores the result.',
    'The next read for the same key is a hit — served from memory in microseconds.',
    'A TTL expires stale entries so the cache doesn’t serve outdated data forever.',
  ],
  scene: {
    code: [
      'value = cache.get(key)',
      'if value is None:          # MISS',
      '    value = db.query(key)',
      '    cache.set(key, value, ttl=60)',
      'return value               # HIT next time',
    ],
    initialState: { 'cache size': 0, hits: 0, misses: 0, 'hit rate': '0%' },
    nodes: [
      { id: 'client', kind: 'client', label: 'App', x: 12, y: 50 },
      { id: 'cache', kind: 'cache', label: 'Cache', x: 46, y: 26, badge: 'empty' },
      { id: 'db', kind: 'database', label: 'Database', x: 82, y: 68 },
    ],
    edges: [
      { id: 'c-cache', from: 'client', to: 'cache' },
      { id: 'cache-c', from: 'cache', to: 'client', curve: 0.4 },
      { id: 'c-db', from: 'client', to: 'db' },
      { id: 'db-cache', from: 'db', to: 'cache', curve: -0.4 },
    ],
    steps: [
      { id: '1', caption: 'The app looks up the key in the cache first.', travel: 'c-cache', token: 'request', codeLine: 1 },
      { id: '2', caption: 'Cache miss — the key isn’t there yet.', travel: 'cache-c', token: 'miss', codeLine: 2, patches: [{ nodeId: 'cache', badge: 'MISS', highlight: true }], state: { misses: 1 } },
      { id: '3', caption: 'So the app falls back to the database.', travel: 'c-db', token: 'request', codeLine: 3 },
      { id: '4', caption: 'The DB returns the value, and the app populates the cache with a TTL.', travel: 'db-cache', token: 'write', codeLine: 4, patches: [{ nodeId: 'cache', badge: '1 key', highlight: true }], state: { 'cache size': 1 } },
      { id: '5', caption: 'The same request again — this time it’s a cache HIT.', travel: 'c-cache', token: 'hit', codeLine: 1, patches: [{ nodeId: 'cache', badge: 'HIT', highlight: true }], state: { hits: 1 } },
      { id: '6', caption: 'Served from memory — no database touch. Hit rate climbs as traffic repeats.', travel: 'cache-c', token: 'hit', codeLine: 5, state: { 'hit rate': '50%' } },
    ],
  },
}

const apiGateway: Lesson = {
  slug: 'api-gateway',
  title: 'API Gateway',
  summary: 'One front door that authenticates, throttles and routes to microservices.',
  group: 'building-blocks',
  tier: 'free',
  minutes: 6,
  concept: 'Concept',
  complexity: { time: 'O(1)', space: 'O(1)' },
  notes: [
    'Clients talk to one endpoint instead of many services.',
    'The gateway handles cross-cutting concerns: auth, rate limiting, logging.',
    'It then routes each request to the right internal service.',
  ],
  scene: {
    code: [
      'on request:',
      '    if not auth.valid(token): return 401',
      '    if rate.exceeded(user):  return 429',
      '    svc = route(request.path)',
      '    return svc.handle(request)',
    ],
    initialState: { authenticated: 'no', route: '—' },
    nodes: [
      { id: 'client', kind: 'client', label: 'Client', x: 10, y: 50 },
      { id: 'gw', kind: 'apiGateway', label: 'API Gateway', x: 40, y: 50 },
      { id: 'users', kind: 'server', label: 'Users Svc', x: 82, y: 22 },
      { id: 'orders', kind: 'server', label: 'Orders Svc', x: 82, y: 50 },
      { id: 'pay', kind: 'server', label: 'Payments', x: 82, y: 78 },
    ],
    edges: [
      { id: 'c-gw', from: 'client', to: 'gw' },
      { id: 'gw-users', from: 'gw', to: 'users', curve: -0.35 },
      { id: 'gw-orders', from: 'gw', to: 'orders' },
      { id: 'gw-pay', from: 'gw', to: 'pay', curve: 0.35 },
    ],
    steps: [
      { id: '1', caption: 'The client sends every request to the single gateway endpoint.', travel: 'c-gw', token: 'request', codeLine: 1 },
      { id: '2', caption: 'The gateway validates the auth token first.', codeLine: 2, patches: [{ nodeId: 'gw', badge: 'auth ✓', highlight: true }], state: { authenticated: 'yes' } },
      { id: '3', caption: 'Then checks the caller hasn’t exceeded their rate limit.', codeLine: 3, patches: [{ nodeId: 'gw', badge: 'rate ok', highlight: true }] },
      { id: '4', caption: 'A GET /orders is routed to the Orders service.', travel: 'gw-orders', token: 'request', codeLine: 4, patches: [{ nodeId: 'orders', badge: 'handling', highlight: true }], state: { route: '/orders' } },
      { id: '5', caption: 'Different paths fan out to Users or Payments — the client never knows the internal map.', travel: 'gw-users', token: 'request', codeLine: 5, patches: [{ nodeId: 'users', badge: 'handling', highlight: true }] },
    ],
  },
}

const messageQueue: Lesson = {
  slug: 'message-queue',
  title: 'Message Queue',
  summary: 'Decouple producers from consumers so spikes don’t topple the system.',
  group: 'building-blocks',
  tier: 'free',
  minutes: 7,
  concept: 'Concept',
  complexity: { time: 'O(1)', space: 'O(n)' },
  notes: [
    'Producers append messages; consumers process them at their own pace.',
    'A traffic spike fills the queue instead of overwhelming the worker.',
    'The backlog drains once load subsides — work is never lost.',
  ],
  scene: {
    code: [
      'producer:  queue.push(job)',
      'consumer:  while true:',
      '    job = queue.pop()      # blocks if empty',
      '    process(job)',
      '    ack(job)',
    ],
    initialState: { depth: 0, processed: 0, 'consumer rate': '1/s' },
    nodes: [
      { id: 'prod', kind: 'server', label: 'Producer', x: 12, y: 50 },
      { id: 'queue', kind: 'queue', label: 'Queue', x: 48, y: 50, badge: '0 jobs' },
      { id: 'cons', kind: 'server', label: 'Consumer', x: 86, y: 50 },
    ],
    edges: [
      { id: 'p-q', from: 'prod', to: 'queue' },
      { id: 'q-c', from: 'queue', to: 'cons' },
    ],
    steps: [
      { id: '1', caption: 'The producer pushes a job onto the queue.', travel: 'p-q', token: 'write', codeLine: 1, patches: [{ nodeId: 'queue', badge: '1 job', highlight: true }], state: { depth: 1 } },
      { id: '2', caption: 'A traffic spike — many jobs arrive at once. The queue absorbs them.', travel: 'p-q', token: 'write', codeLine: 1, patches: [{ nodeId: 'queue', badge: '5 jobs', highlight: true }], state: { depth: 5 } },
      { id: '3', caption: 'The consumer pulls one job and processes it at its own steady rate.', travel: 'q-c', token: 'request', codeLine: 3, patches: [{ nodeId: 'queue', badge: '4 jobs' }], state: { depth: 4, processed: 1 } },
      { id: '4', caption: 'It acks the job; the queue depth drops. The worker is never overwhelmed.', codeLine: 5, patches: [{ nodeId: 'cons', badge: 'ack ✓', highlight: true }], state: { processed: 2 } },
      { id: '5', caption: 'As the spike passes, the backlog drains to empty — no work lost.', travel: 'q-c', token: 'request', codeLine: 3, patches: [{ nodeId: 'queue', badge: '0 jobs', highlight: true }], state: { depth: 0, processed: 5 } },
    ],
  },
}

const rateLimiter: Lesson = {
  slug: 'rate-limiter',
  title: 'Rate Limiter (Token Bucket)',
  summary: 'Allow bursts up to a limit, then reject — refilling tokens over time.',
  group: 'building-blocks',
  tier: 'free',
  minutes: 6,
  concept: 'Concept',
  complexity: { time: 'O(1)', space: 'O(1)' },
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
}

const replication: Lesson = {
  slug: 'database-replication',
  title: 'Database Replication',
  summary: 'One leader takes writes; read replicas scale out reads.',
  group: 'building-blocks',
  tier: 'free',
  minutes: 7,
  concept: 'Concept',
  complexity: { time: 'O(1)', space: 'O(n)' },
  notes: [
    'All writes go to a single leader to keep one source of truth.',
    'The leader streams changes to follower replicas.',
    'Reads are served from followers, multiplying read capacity.',
  ],
  scene: {
    code: [
      'write:  leader.apply(change)',
      '        for f in followers:',
      '            f.stream(change)     # async',
      'read:   pick(followers).query()',
    ],
    initialState: { leader: 'up', 'replicas in sync': 0, 'read capacity': '1x' },
    nodes: [
      { id: 'app', kind: 'client', label: 'App', x: 12, y: 50 },
      { id: 'leader', kind: 'database', label: 'Leader', x: 46, y: 50, badge: 'writes' },
      { id: 'f1', kind: 'database', label: 'Replica 1', x: 84, y: 26, badge: 'reads' },
      { id: 'f2', kind: 'database', label: 'Replica 2', x: 84, y: 74, badge: 'reads' },
    ],
    edges: [
      { id: 'app-leader', from: 'app', to: 'leader' },
      { id: 'leader-f1', from: 'leader', to: 'f1', curve: -0.3 },
      { id: 'leader-f2', from: 'leader', to: 'f2', curve: 0.3 },
      { id: 'f1-app', from: 'f1', to: 'app', curve: 0.5 },
    ],
    steps: [
      { id: '1', caption: 'A write is sent only to the leader — the single source of truth.', travel: 'app-leader', token: 'write', codeLine: 1, patches: [{ nodeId: 'leader', badge: 'applied', highlight: true }] },
      { id: '2', caption: 'The leader streams the change to Replica 1…', travel: 'leader-f1', token: 'write', codeLine: 3, patches: [{ nodeId: 'f1', badge: 'in sync', highlight: true }], state: { 'replicas in sync': 1 } },
      { id: '3', caption: '…and Replica 2. Followers now mirror the leader.', travel: 'leader-f2', token: 'write', codeLine: 3, patches: [{ nodeId: 'f2', badge: 'in sync', highlight: true }], state: { 'replicas in sync': 2, 'read capacity': '2x' } },
      { id: '4', caption: 'Reads are served from a replica, not the leader.', travel: 'f1-app', token: 'response', codeLine: 4, patches: [{ nodeId: 'f1', badge: 'read ✓', highlight: true }] },
      { id: '5', caption: 'Add more replicas to scale reads — the leader stays free for writes.', state: { 'read capacity': '3x+' } },
    ],
  },
}

export const buildingBlocks: Lesson[] = [
  loadBalancer,
  caching,
  apiGateway,
  messageQueue,
  rateLimiter,
  replication,
]
