import type { Lesson } from '../types'

const clientServer: Lesson = {
  slug: 'client-server',
  title: 'Client–Server Model',
  summary: 'The request/response loop every web system is built on.',
  group: 'fundamentals',
  tier: 'free',
  minutes: 5,
  concept: 'Concept',
  tags: [
    { label: 'Pattern', value: 'Request–Response' },
    { label: 'Coupling', value: 'Synchronous' },
    { label: 'Scalability', value: 'Vertical → Horizontal' },
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

const latencyThroughput: Lesson = {
  slug: 'latency-vs-throughput',
  title: 'Latency vs Throughput',
  summary: 'Two different questions: how fast is one request, and how many per second?',
  group: 'fundamentals',
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

const scaling: Lesson = {
  slug: 'horizontal-vs-vertical-scaling',
  title: 'Horizontal vs Vertical Scaling',
  summary: 'Grow by adding bigger machines, or by adding more of them.',
  group: 'fundamentals',
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

export const fundamentals: Lesson[] = [clientServer, latencyThroughput, scaling]
