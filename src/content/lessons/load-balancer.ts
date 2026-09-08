import type { Lesson } from '../types'

/** Topic: Load Balancer (group: building-blocks). */

const loadBalancer: Lesson = {
  slug: 'load-balancer',
  title: 'Round-Robin Load Balancing',
  summary: 'Spread traffic across servers — and route around the ones that die.',
  group: 'building-blocks',
  topic: 'Load Balancer',
  tier: 'free',
  minutes: 7,
  concept: 'Concept',
  tags: [
    { label: 'Availability', value: 'High' },
    { label: 'Pattern', value: 'Round-robin' },
    { label: 'Scalability', value: 'Horizontal' },
  ],
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
      { id: '5', caption: 'The balancer removes B from the pool. It\'s no longer a target.', codeLine: 8, patches: [{ nodeId: 's2', badge: 'removed' }] },
      { id: '6', caption: 'The request that would\'ve gone to B is rerouted to C — no error reaches the client.', travel: 'lb-s3', token: 'request', codeLine: 6, patches: [{ nodeId: 's3', badge: '2 req', highlight: true }], state: { requests: 3 } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'A load balancer does two jobs that are usually described as one. It **distributes** requests across a pool, and it **removes** members that stop working. The second job is the one that keeps you online; the first is the one everybody talks about.',
      'Round-robin is the default because it is stateless, fair, and needs no coordination — every proxy can compute the next target independently. Its weakness is that it treats a request as a unit of work when requests are not equal.',
    ],
    sections: [
      {
        id: 'algorithms',
        heading: 'The algorithms and what each assumes',
        blocks: [
          {
            kind: 'table',
            columns: ['Algorithm', 'Assumes', 'Breaks when', 'State needed'],
            rows: [
              ['Round-robin', 'Requests cost about the same', 'Request cost varies wildly', 'A counter'],
              ['Weighted round-robin', 'Servers differ in known, fixed capacity', 'Capacity changes at runtime', 'Static weights'],
              ['Least connections', 'Open connections proxy for load', 'Long-lived connections (WebSockets)', 'Per-server counters'],
              ['Least response time', 'Recent latency predicts current load', 'Noisy latency, cold starts look fast', 'Latency EWMA'],
              ['Power of two choices', 'Sampling two beats sampling all', 'Almost never — excellent default', 'Two counters per decision'],
              ['IP / consistent hash', 'The same client should reach the same server', 'Uneven client distribution', 'Hash ring'],
              ['Random', 'Nothing', 'Small pools (variance is high)', 'None'],
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Power of two random choices',
            body: [
              'Pick two servers at random and send the request to the less loaded of the two. It needs no global view, yet it reduces maximum load dramatically compared with pure random — the classic result is that maximum load drops from O(log n) to O(log log n).',
              'It also avoids the herd problem of "always pick the least loaded", where every proxy simultaneously identifies the same idle server and buries it. This is what most modern proxies (Envoy, NGINX with `random two`) default to for good reason.',
            ],
          },
        ],
      },
      {
        id: 'health',
        heading: 'Health checking is the harder half',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Distribution is easy; deciding whether a server should receive traffic is not. Health checks trade off **detection speed** against **false positives**, and both directions have real costs: too slow and users hit dead servers; too aggressive and a brief GC pause ejects a healthy node — during peak load, when you need it most.',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Active checks** poll each backend on an interval. Simple and predictable, but detection lags by up to `interval × unhealthy_threshold`, and every backend pays the check traffic.',
              '**Passive checks (outlier detection)** watch real request outcomes and eject a backend after N consecutive failures. Detection is immediate and free, but it needs real traffic to notice anything.',
              '**Use both.** Passive for fast ejection, active for deciding when a recovered node may return.',
              '**Distinguish liveness from readiness.** Liveness answers "should this process be restarted"; readiness answers "should it receive traffic right now". Conflating them causes restart loops during transient dependency failures.',
              '**Deep vs shallow checks.** A check that queries the database fails *every* backend when the database is down — turning a degraded dependency into a total outage. Prefer a shallow check plus circuit breaking on the dependency.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Check interval', value: '5 s' },
              { label: 'Unhealthy threshold', value: '3 failures' },
              { label: 'Worst-case detection time', value: '15 s' },
              { label: 'Requests to a dead server at 1k QPS / 3 servers', value: '~5,000', note: 'before ejection' },
              { label: 'With passive ejection after 5 errors', value: '~5 requests' },
            ],
            result: 'Passive detection turns thousands of failed requests into a handful.',
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Never let health checks eject the whole pool',
            body: [
              'If a shared dependency fails, every backend fails its check simultaneously and the balancer has nothing left to route to. Good proxies implement a **panic threshold** (Envoy defaults to 50%): if too few hosts are healthy, ignore health status entirely and spread traffic across all of them. Degraded service beats no service.',
            ],
          },
        ],
      },
      {
        id: 'draining',
        heading: 'Removing a server without dropping requests',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Most user-visible errors during deploys come from *planned* removals done badly, not from crashes. The correct sequence has the instance fail its readiness check **before** it stops accepting work, so the balancer stops sending new requests while in-flight ones finish.',
            ],
          },
          {
            kind: 'code',
            language: 'text',
            caption: 'Graceful shutdown, in order',
            lines: [
              '1. Receive SIGTERM',
              '2. Mark readiness endpoint unhealthy      <- LB stops sending NEW requests',
              '3. Wait 2 x health check interval        <- let the LB actually notice',
              '4. Stop accepting new connections',
              '5. Finish in-flight requests (drain timeout, e.g. 30 s)',
              '6. Close database/cache connections',
              '7. Exit 0',
              '',
              '# Skipping step 3 is the usual cause of 502s during deploys:',
              '# the process is gone before the balancer knows it is leaving.',
            ],
          },
        ],
      },
      {
        id: 'topology',
        heading: 'Where the balancer sits',
        blocks: [
          {
            kind: 'table',
            columns: ['Placement', 'Examples', 'Strength', 'Weakness'],
            rows: [
              ['DNS', 'Route 53, GeoDNS', 'Global, no infrastructure in the path', 'Caching ignores TTLs; failover is slow'],
              ['Network (L4)', 'AWS NLB, IPVS, Maglev', 'Millions of connections, very low latency', 'No visibility into HTTP'],
              ['Application (L7)', 'ALB, NGINX, Envoy, HAProxy', 'Path routing, retries, header-based rules', 'More CPU per request'],
              ['Client-side', 'gRPC round-robin, service mesh sidecar', 'No extra hop; per-client view of load', 'Every client must implement it'],
              ['Anycast', 'Cloudflare, Google Front End', 'Nearest PoP wins automatically', 'Requires network-level control'],
            ],
            caption: 'Production systems stack these: anycast DNS to a regional L4 balancer to an L7 proxy to sidecars.',
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'The load balancer must not be the single point of failure',
            body: [
              'A common gap in interview answers: adding a balancer to make servers redundant while the balancer itself is one box. Real deployments run redundant balancers behind a floating IP, an anycast address, or multiple DNS A records — say so before being asked.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Round-robin when request cost varies by orders of magnitude — a server that draws several heavy requests in a row falls behind while its peers idle.',
      'Least connections for WebSocket or streaming workloads: connection count reflects age, not current work.',
      'Deep health checks that exercise shared dependencies; they convert one dependency failure into a full-pool ejection.',
      'A single load balancer instance — redundancy at the balancer is as important as redundancy behind it.',
    ],
    failureModes: [
      {
        name: 'Whole pool ejected',
        symptom: 'Every backend is marked unhealthy at once and all traffic fails.',
        cause: 'Health checks probe a shared dependency that went down.',
        fix: 'Shallow health checks, plus a panic threshold that ignores health status when too few hosts remain.',
      },
      {
        name: '502s during every deploy',
        symptom: 'A burst of gateway errors each time instances are replaced.',
        cause: 'Processes exit before the balancer observes them as unready; in-flight requests are cut.',
        fix: 'Fail readiness first, wait two check intervals, then drain and exit.',
      },
      {
        name: 'Uneven load despite round-robin',
        symptom: 'One backend at 90% CPU while others sit at 30%.',
        cause: 'Request cost varies, or long-lived connections pin heavy clients to one server.',
        fix: 'Switch to least-connections or power-of-two-choices; add connection max-lifetime to force redistribution.',
      },
      {
        name: 'Flapping backends',
        symptom: 'Servers repeatedly ejected and restored; latency oscillates.',
        cause: 'Health check timeout close to normal p99 latency, so load itself causes failures.',
        fix: 'Widen the timeout, require more consecutive failures, and use exponential ejection backoff.',
      },
    ],
    interview: [
      {
        q: 'Which load balancing algorithm would you choose, and why?',
        a: [
          'For uniform, short requests, round-robin is fine and costs nothing — no shared state, every proxy decides independently.',
          'When request cost varies, I would use least-connections or, better, power-of-two-choices: sample two backends at random and pick the less loaded one. It gets most of the benefit of a global view without the coordination, and it avoids the herd effect where every proxy piles onto the same idle server.',
          'I would avoid least-connections for WebSockets, since connection count there measures how long a client has been attached rather than how much work the server is doing.',
        ],
        followUps: ['How would the choice change for gRPC with long-lived HTTP/2 connections?'],
      },
      {
        q: 'How does the balancer know a server is unhealthy, and what could go wrong?',
        a: [
          'Actively by polling a health endpoint, and passively by observing real request failures and ejecting after N consecutive errors. Passive is much faster because it needs no waiting for the next probe.',
          'The dangerous failure is a deep health check that touches a shared dependency: when that dependency fails, every backend reports unhealthy simultaneously and the balancer has nothing to route to. A panic threshold — route to everything when too few hosts are healthy — is what prevents a degradation from becoming an outage.',
        ],
      },
      {
        q: 'How do you deploy without dropping requests?',
        a: [
          'Make the instance fail its readiness check first, then wait at least two health check intervals so the balancer actually observes it and stops sending new requests. Only then stop accepting connections and drain the in-flight ones with a bounded timeout.',
          'Skipping the wait is the usual cause of 502s during deploys — the process is gone before the balancer knows it is leaving.',
        ],
      },
    ],
    references: [
      { label: 'Google — Maglev: A Fast and Reliable Software Network Load Balancer', href: 'https://research.google/pubs/pub44824/' },
      { label: 'Envoy — Outlier detection and panic threshold', href: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier' },
    ],
  },
}

const lbLeastConnections: Lesson = {
  slug: 'load-balancer-least-connections',
  title: 'Least Connections Algorithm',
  summary: 'Route to the server with the fewest active connections — not just the next in line.',
  group: 'building-blocks',
  topic: 'Load Balancer',
  tier: 'free',
  minutes: 6,
  concept: 'Concept',
  tags: [
    { label: 'Algorithm', value: 'Least connections' },
    { label: 'Best for', value: 'Long-lived connections' },
    { label: 'vs', value: 'Round-robin' },
  ],
  notes: [
    'Round-robin ignores server load — it just takes turns. With mixed request durations, this causes imbalance.',
    'Least Connections tracks active connections per server and always picks the least-loaded one.',
    'Ideal for WebSockets, file uploads, or any workload where requests have variable duration.',
  ],
  scene: {
    code: [
      '# round-robin: blind rotation (ignores load)',
      'server = pool[next % len(pool)]',
      '',
      '# least connections: pick the lightest server',
      'server = min(pool, key=lambda s: s.active_conns)',
    ],
    initialState: { algorithm: 'round-robin', 'next request': '→ Server B' },
    nodes: [
      { id: 'client', kind: 'client', label: 'Clients', x: 12, y: 50 },
      { id: 'lb', kind: 'loadBalancer', label: 'Load Balancer', x: 42, y: 50 },
      { id: 'sa', kind: 'server', label: 'Server A', x: 80, y: 20, badge: '0 conns' },
      { id: 'sb', kind: 'server', label: 'Server B', x: 80, y: 50, badge: '8 conns' },
      { id: 'sc', kind: 'server', label: 'Server C', x: 80, y: 80, badge: '2 conns' },
    ],
    edges: [
      { id: 'c-lb', from: 'client', to: 'lb' },
      { id: 'lb-sa', from: 'lb', to: 'sa', curve: -0.35 },
      { id: 'lb-sb', from: 'lb', to: 'sb' },
      { id: 'lb-sc', from: 'lb', to: 'sc', curve: 0.35 },
    ],
    steps: [
      { id: '1', caption: 'Server B has 8 slow-running connections (large file uploads). A and C are nearly free.', patches: [{ nodeId: 'sb', badge: '8 conns ⚠', highlight: true }], codeLine: 2, state: { algorithm: 'round-robin' } },
      { id: '2', caption: 'Round-robin sends next request to Server B — it\'s just B\'s turn.', travel: 'lb-sb', token: 'request', codeLine: 2, patches: [{ nodeId: 'sb', badge: '9 conns ⚠', highlight: true }], state: { 'next request': '→ Server B (overloaded!)' } },
      { id: '3', caption: 'Bad — B is saturated. Request queues behind 8 others. Latency spikes.', state: { algorithm: 'round-robin', 'next request': 'overloaded' } },
      { id: '4', caption: 'Switch to Least Connections: LB tracks active conn count per server.', codeLine: 5, state: { algorithm: 'least-connections', 'next request': '→ Server A (0 conns)' } },
      { id: '5', caption: 'New request arrives — LB picks Server A (0 connections). Fastest choice.', travel: 'lb-sa', token: 'request', codeLine: 5, patches: [{ nodeId: 'sa', badge: '1 conn', highlight: true }] },
      { id: '6', caption: 'As B\'s uploads finish, its count drops and it naturally gets new traffic again. Self-balancing.', patches: [{ nodeId: 'sb', badge: '3 conns' }, { nodeId: 'sa', badge: '3 conns' }, { nodeId: 'sc', badge: '3 conns' }] },
    ],
  },
  deepDive: {
    readingMinutes: 8,
    intro: [
      'Least connections replaces round-robin\'s assumption — that every request costs the same — with a measurement: **send the next request to whichever backend currently has the fewest open connections**. When request cost is variable, that single change removes most of the imbalance.',
      'It is also the algorithm most often applied where it does not belong, because "connections" stops being a proxy for "work" the moment connections become long-lived.',
    ],
    sections: [
      {
        id: 'why',
        heading: 'What round-robin actually gets wrong',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Round-robin distributes **request count** evenly, which is only the same as distributing **work** evenly if requests are uniform. Real endpoints are not: a cached profile fetch takes 5 ms, an unbounded search query takes 3 seconds, and a report export takes 30.',
              'With a mixed workload, round-robin will eventually deal several expensive requests in a row to the same backend. That backend queues, its latency climbs, and round-robin keeps sending it exactly its share regardless — because the counter does not know or care.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Requests: 95% cheap', value: '10 ms' },
              { label: 'Requests: 5% expensive', value: '2,000 ms' },
              { label: 'Mean cost', value: '109 ms' },
              { label: 'Backends', value: '4' },
              { label: 'Chance one backend holds 3+ expensive requests concurrently', value: 'high at 500 QPS' },
              { label: 'Effect under round-robin', value: 'p99 tracks the unluckiest backend' },
            ],
            result: 'Variance in request cost becomes variance in user latency — unless routing reacts to it.',
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Least connections is feedback; round-robin is open-loop',
            body: [
              'The important distinction is not the counting method. Round-robin makes the same decision regardless of what happened to previous requests; least connections observes the consequence of past decisions and adjusts. That feedback is what makes it self-correcting when a backend slows down for any reason — a slow disk, a noisy neighbour, a GC pause.',
            ],
          },
        ],
      },
      {
        id: 'mechanics',
        heading: 'How it is implemented',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The balancer keeps a counter per backend: increment on dispatch, decrement on completion. Selection is the minimum, with ties broken randomly or by round-robin. Weighted variants divide the count by the backend\'s capacity weight, so a machine with twice the cores is chosen until it holds twice the connections.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'least_conn.py — weighted least connections with P2C fallback',
            lines: [
              'def pick_least_connections(backends):',
              '    healthy = [b for b in backends if b.healthy]',
              '    return min(healthy, key=lambda b: b.active / b.weight)',
              '',
              'def pick_p2c(backends):',
              '    """Power of two choices: near-optimal without scanning the pool,',
              '    and immune to the herd effect of always choosing the global min."""',
              '    healthy = [b for b in backends if b.healthy]',
              '    a, b = random.sample(healthy, 2)',
              '    return a if a.active / a.weight <= b.active / b.weight else b',
              '',
              '# dispatch',
              'backend = pick_p2c(pool)',
              'backend.active += 1',
              'try:',
              '    return backend.send(request)',
              'finally:',
              '    backend.active -= 1      # must always run, or the counter leaks',
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'A leaked counter poisons a backend permanently',
            body: [
              'If the decrement is skipped on an error path, timeout, or client disconnect, the balancer believes that backend is busier than it is — forever. It will receive progressively less traffic until it receives none. Always decrement in a `finally`, and consider periodically reconciling counters against reality.',
            ],
          },
        ],
      },
      {
        id: 'distributed',
        heading: 'The distributed problem: many balancers, one pool',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Least connections is exact only when a single balancer sees every request. In production you run several balancer instances, each with its own local counters — so each has a **partial view**, and all of them may simultaneously conclude that the same backend is least loaded.',
              'That is the herd effect, and it makes naive "always pick the global minimum" worse than random at high concurrency. Power-of-two-choices fixes it: because each decision samples a random pair, two balancers rarely converge on the same target, yet the load still evens out.',
            ],
          },
          {
            kind: 'table',
            columns: ['Strategy', 'Coordination', 'Max load vs ideal', 'Herd risk'],
            rows: [
              ['Random', 'None', 'Poor for small pools', 'None'],
              ['Round-robin', 'A local counter', 'Good for uniform cost', 'None'],
              ['Global least-connections', 'Shared state or single balancer', 'Best in theory', 'High with multiple balancers'],
              ['Least-connections, local view', 'None', 'Good', 'Moderate'],
              ['Power of two choices', 'None', 'Near-optimal', 'Very low'],
              ['Least request with EWMA latency', 'None', 'Excellent for variable cost', 'Low'],
            ],
          },
        ],
      },
      {
        id: 'limits',
        heading: 'Where connection count stops meaning load',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Long-lived connections.** With WebSockets or SSE, connection count measures how long a client has been attached, not what it is doing. A backend with 500 idle sockets looks busier than one serving 50 active streams.',
              '**HTTP/2 and gRPC multiplexing.** Many concurrent streams share one TCP connection, so connection count can be 1 while the backend handles hundreds of requests. Count **outstanding requests** instead — Envoy calls this `LEAST_REQUEST`.',
              '**Keep-alive pools.** A connection held open between requests is idle but counted, which is why proxies count active requests rather than sockets.',
              '**Asymmetric backends.** A count of 10 means something different on a 4-core and a 32-core machine. Use weights, ideally derived from measured capacity rather than instance type.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Name the metric, not just the algorithm',
            body: [
              '"Least connections" is ambiguous in a modern stack. Saying "least *outstanding requests*, because our services speak gRPC over multiplexed HTTP/2 connections and socket count would be meaningless" demonstrates you have deployed this rather than read about it.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'WebSocket, SSE or other long-lived connection workloads — count active work, or route by consistent hash instead.',
      'HTTP/2 and gRPC without switching to outstanding-request counting; socket counts are nearly constant.',
      'Where session affinity is required — least connections deliberately ignores which backend a client used before.',
      'Very small pools with uniform requests, where round-robin is simpler and performs identically.',
    ],
    failureModes: [
      {
        name: 'Counter leak',
        symptom: 'One backend gradually stops receiving traffic despite being healthy.',
        cause: 'The active-connection counter was not decremented on an error or disconnect path.',
        fix: 'Decrement in a `finally`; reconcile counters periodically; alert on per-backend traffic skew.',
      },
      {
        name: 'Herd onto the newest instance',
        symptom: 'A freshly started backend is immediately overwhelmed and fails its health check.',
        cause: 'It has zero connections, so every balancer picks it simultaneously.',
        fix: 'Slow start / warm-up ramping, and power-of-two-choices instead of global minimum.',
      },
      {
        name: 'Meaningless counts under multiplexing',
        symptom: 'Load is uneven even though connection counts are equal.',
        cause: 'gRPC or HTTP/2 multiplexes many requests over one connection.',
        fix: 'Switch the metric to outstanding requests, and set a connection max-age to force periodic rebalancing.',
      },
      {
        name: 'Slow backend attracts traffic',
        symptom: 'A backend returning fast errors receives more traffic than healthy ones.',
        cause: 'Failing fast keeps its connection count low, so it looks least loaded.',
        fix: 'Combine with outlier detection on error rate, or use latency-aware selection.',
      },
    ],
    interview: [
      {
        q: 'When would you pick least connections over round-robin?',
        a: [
          'When request cost varies significantly. Round-robin equalises request counts, which only equalises load if requests are uniform; with a mix of 10 ms and 2 s requests, one backend inevitably accumulates several expensive ones and its latency degrades while peers idle.',
          'Least connections is closed-loop: it observes the consequence of previous routing decisions, so it self-corrects for any cause of slowness, not just expensive requests — a slow disk or a GC pause too.',
        ],
        followUps: ['Does that still work when you run five balancer instances?'],
      },
      {
        q: 'You run several load balancers. Does least connections still work?',
        a: [
          'Only approximately, because each balancer sees its own traffic and has a partial view. The failure mode is a herd: several balancers independently identify the same least-loaded backend and all send to it at once, which is especially bad when a new instance joins with zero connections.',
          'Power-of-two-choices solves it without any shared state — sample two backends at random and take the less loaded. It gets close to optimal balance and makes simultaneous convergence unlikely, which is why most modern proxies default to it.',
        ],
      },
      {
        q: 'Why is least connections a bad fit for WebSockets?',
        a: [
          'Because a connection is held for the entire session, so the count measures attachment duration rather than current work. A backend with 500 idle sockets looks busier than one pushing thousands of messages a second over 50.',
          'For that workload I would balance on something closer to actual load — active streams or CPU — or route by consistent hash so reconnects land predictably, and rely on a pub/sub backplane rather than on even connection distribution.',
        ],
      },
    ],
    references: [
      { label: 'Mitzenmacher — The Power of Two Choices in Randomized Load Balancing', href: 'https://www.eecs.harvard.edu/~michaelm/postscripts/handbook2001.pdf' },
      { label: 'Envoy — Load balancing policies', href: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers' },
    ],
  },
}

// ── 3. L4 vs L7 ──────────────────────────────────────────────────────────────

const layers: Lesson = {
  slug: 'load-balancer-l4-l7',
  title: 'L4 vs L7 Load Balancing',
  summary: 'Forward packets blindly, or read the request and route on what it says.',
  group: 'building-blocks',
  topic: 'Load Balancer',
  tier: 'pro',
  minutes: 7,
  concept: 'Concept',
  tags: [
    { label: 'L4', value: 'TCP/UDP · fast' },
    { label: 'L7', value: 'HTTP · smart' },
    { label: 'Trade-off', value: 'Throughput vs control' },
  ],
  notes: [
    'L4 balances connections: it sees IPs and ports, never the request body.',
    'L7 terminates the connection and reads the HTTP request, so it can route by path, header or cookie.',
    'L7 costs CPU and adds latency, and it is the only place retries, rewrites and canaries can happen.',
  ],
  scene: {
    code: [
      '# L4 — decide once per connection',
      'backend = hash(src_ip, src_port) % N',
      'forward_packets(backend)',
      '',
      '# L7 — decide per request',
      'if path.startswith("/api/"):  -> api_pool',
      'elif header["x-canary"]:      -> canary_pool',
      'else:                         -> web_pool',
    ],
    initialState: { layer: 'L4', 'decision unit': 'connection', 'sees payload': 'no', latency: '+0.1 ms' },
    nodes: [
      { id: 'client', kind: 'client', label: 'Client', x: 10, y: 50 },
      { id: 'l4', kind: 'loadBalancer', label: 'L4 (NLB)', x: 36, y: 50, badge: 'IP:port only' },
      { id: 'l7', kind: 'apiGateway', label: 'L7 (Envoy)', x: 62, y: 50, badge: 'reads HTTP' },
      { id: 'api', kind: 'server', label: 'API pool', x: 88, y: 22 },
      { id: 'web', kind: 'server', label: 'Web pool', x: 88, y: 52 },
      { id: 'canary', kind: 'server', label: 'Canary', x: 88, y: 82, badge: 'v2' },
    ],
    edges: [
      { id: 'c-l4', from: 'client', to: 'l4' },
      { id: 'l4-l7', from: 'l4', to: 'l7' },
      { id: 'l7-api', from: 'l7', to: 'api', curve: -0.3 },
      { id: 'l7-web', from: 'l7', to: 'web' },
      { id: 'l7-canary', from: 'l7', to: 'canary', curve: 0.3 },
    ],
    steps: [
      { id: '1', caption: 'A TCP connection arrives. The L4 balancer sees only source IP and port.', travel: 'c-l4', token: 'request', codeLine: 2, patches: [{ nodeId: 'l4', badge: 'hash(ip:port)', highlight: true }], state: { layer: 'L4', 'sees payload': 'no' } },
      { id: '2', caption: 'It hashes them to a backend and forwards packets — one decision for the whole connection.', travel: 'l4-l7', token: 'request', codeLine: 3, state: { 'decision unit': 'connection', latency: '+0.1 ms' } },
      { id: '3', caption: 'The L7 proxy terminates TLS and parses the HTTP request. Now the content is visible.', patches: [{ nodeId: 'l7', badge: 'GET /api/orders', highlight: true }], state: { layer: 'L7', 'sees payload': 'yes', latency: '+1 ms' } },
      { id: '4', caption: 'Path starts with /api/ — route to the API pool.', travel: 'l7-api', token: 'request', codeLine: 6, patches: [{ nodeId: 'api', badge: 'handled', highlight: true }], state: { 'decision unit': 'request' } },
      { id: '5', caption: 'The next request on the same connection is for /home — it can go somewhere else entirely.', travel: 'l7-web', token: 'request', codeLine: 8, patches: [{ nodeId: 'web', badge: 'handled', highlight: true }] },
      { id: '6', caption: 'A request carrying x-canary goes to the v2 pool — 1% traffic split, no DNS change.', travel: 'l7-canary', token: 'hit', codeLine: 7, patches: [{ nodeId: 'canary', badge: 'v2 · 1%', highlight: true }] },
      { id: '7', caption: 'A backend 503s, so the L7 proxy retries on another — invisible to the client. L4 could not do this.', travel: 'l7-api', token: 'hit', patches: [{ nodeId: 'api', badge: 'retried ✓', highlight: true }], state: { 'sees payload': 'yes' } },
    ],
  },
  deepDive: {
    readingMinutes: 8,
    intro: [
      'The distinction is simple to state and consequential in practice: an **L4 balancer routes connections** using the transport header, and an **L7 balancer routes requests** by reading the application protocol. Everything else — retries, canaries, path routing, TLS termination — follows from whether the balancer can see inside.',
      'Most production stacks use both, in that order, because they solve different problems and their costs are very different.',
    ],
    sections: [
      {
        id: 'compare',
        heading: 'What each layer can and cannot do',
        blocks: [
          {
            kind: 'table',
            columns: ['Capability', 'L4', 'L7'],
            rows: [
              ['Route by path, header, cookie', 'No', 'Yes'],
              ['TLS termination', 'No (passthrough)', 'Yes'],
              ['Retry a failed request elsewhere', 'No — the connection is already bound', 'Yes'],
              ['Per-request load balancing', 'No — one decision per connection', 'Yes'],
              ['Canary / weighted traffic split', 'Only by pool', 'Yes, by any request attribute'],
              ['Rate limiting per user', 'No — cannot identify users', 'Yes'],
              ['Non-HTTP protocols', 'Anything TCP/UDP', 'Only protocols it understands'],
              ['Added latency', '~0.1 ms', '~0.5–2 ms'],
              ['Throughput per node', 'Millions of connections', 'Tens of thousands of requests/s'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'The performance difference comes from how much work each does per byte. An L4 balancer often uses **direct server return** or simple NAT — it rewrites headers and forwards packets, never assembling the payload, and in kernel-bypass implementations it does this at line rate.',
              'An L7 proxy must terminate TCP, complete a TLS handshake, buffer and parse HTTP, apply rules, then open or reuse a connection to the backend and do it all again. That is two connections per request instead of a forwarded flow.',
            ],
          },
        ],
      },
      {
        id: 'connection-binding',
        heading: 'The consequence that matters most',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Because L4 decides once per connection, **everything sent over that connection goes to the same backend**. With HTTP keep-alive, a browser may reuse one connection for hundreds of requests over several minutes; with HTTP/2 or gRPC, a single long-lived connection may carry the client\'s entire session.',
              'This is why gRPC behind an L4 balancer produces famously uneven load: ten clients, ten connections, and no rebalancing regardless of how much work each one sends. The standard remedies are an L7 proxy that balances per request, a client-side balancer, or forcing periodic reconnection with a connection max-age.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'gRPC clients', value: '10' },
              { label: 'Backends', value: '5' },
              { label: 'Connections per client', value: '1', note: 'multiplexed' },
              { label: 'L4 distribution', value: '2 connections per backend' },
              { label: 'If 2 clients send 90% of traffic', value: '1 backend does ~45%' },
              { label: 'L7 distribution', value: 'per request — even' },
            ],
            result: 'Under multiplexing, L4 balances connections while load follows requests.',
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Retries are impossible at L4',
            body: [
              'If a backend fails mid-request, an L4 balancer cannot resend it — it never had the request, only packets belonging to a connection that is now broken. The client sees a reset and must retry itself. An L7 proxy holds the request and can transparently retry on another backend, which is why user-visible error rates usually fall when one is introduced.',
            ],
          },
        ],
      },
      {
        id: 'tls',
        heading: 'TLS: terminate, passthrough, or re-encrypt',
        blocks: [
          {
            kind: 'table',
            columns: ['Mode', 'Who holds the certificate', 'Balancer sees plaintext', 'Use when'],
            rows: [
              ['Termination at L7', 'The balancer', 'Yes', 'You need routing, WAF, or per-request rules'],
              ['Passthrough at L4', 'The backend', 'No', 'End-to-end encryption is mandatory; SNI routing only'],
              ['Re-encryption', 'Both', 'Yes, then re-encrypts', 'Regulated environments; zero-trust networks'],
              ['mTLS at the mesh', 'Sidecars', 'Sidecar only', 'Service-to-service inside a cluster'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'Terminating at the edge is the common choice because it centralises certificate management and enables everything L7 is for. Passthrough preserves end-to-end encryption but limits the balancer to routing on **SNI** — the hostname sent in the clear during the handshake — which is still enough for multi-tenant routing without decryption.',
            ],
          },
        ],
      },
      {
        id: 'stacking',
        heading: 'How real deployments layer them',
        blocks: [
          {
            kind: 'code',
            language: 'text',
            caption: 'A typical production path',
            lines: [
              'Anycast DNS        -> nearest region',
              '  L4 (NLB / Maglev) -> spreads connections across L7 proxies, absorbs volumetric attacks',
              '    L7 (Envoy/ALB)  -> TLS termination, path routing, retries, rate limits, canaries',
              '      Service mesh sidecar -> mTLS, per-request balancing, circuit breaking',
              '        Application',
              '',
              '# Each layer solves what the one above cannot:',
              '#   L4 gives raw scale and a stable entry point.',
              '#   L7 gives request-level control.',
              '#   The mesh gives per-service policy without a central chokepoint.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Justify each hop you add',
            body: [
              'Every layer costs latency and is another thing that can fail. A strong answer names why a hop exists — "the L4 tier gives us a stable anycast entry point and absorbs SYN floods; the L7 tier is where retries and canaries live" — rather than drawing boxes because diagrams usually have them.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'L7 for non-HTTP protocols it cannot parse — you gain nothing and add a hop.',
      'L7 where the added 1–2 ms and CPU cost is unjustified, such as internal bulk data transfer.',
      'L4 alone in front of gRPC or HTTP/2 services; connection-level balancing will not distribute request load.',
      'TLS passthrough when you need WAF inspection, header-based routing, or per-user rate limiting — none are possible without decryption.',
    ],
    failureModes: [
      {
        name: 'Uneven load with multiplexed protocols',
        symptom: 'gRPC backends show wildly different CPU despite equal connection counts.',
        cause: 'L4 balances connections; HTTP/2 carries all requests over few connections.',
        fix: 'Introduce an L7 proxy, use client-side balancing, or set a connection max-age to force redistribution.',
      },
      {
        name: 'Client-visible errors on backend failure',
        symptom: 'Users see resets when an instance dies, even though others are healthy.',
        cause: 'L4 cannot retry a request it never parsed.',
        fix: 'Terminate at L7 and enable retries for idempotent methods with a budget.',
      },
      {
        name: 'Lost client IP',
        symptom: 'All requests appear to come from the balancer; rate limits and geo rules break.',
        cause: 'Proxying rewrites the source address.',
        fix: 'Trust `X-Forwarded-For` from your own proxies only, or enable PROXY protocol at L4.',
      },
      {
        name: 'Retry storm from the proxy',
        symptom: 'A struggling backend receives more traffic after L7 retries are enabled.',
        cause: 'Automatic retries with no budget multiply load during partial failure.',
        fix: 'Cap retries as a percentage of traffic, retry only idempotent requests, and pair with outlier ejection.',
      },
    ],
    interview: [
      {
        q: 'What is the difference between L4 and L7 load balancing?',
        a: [
          'L4 routes connections using transport information — source and destination IP and port — and forwards packets without seeing the payload. L7 terminates the connection, parses the application protocol, and routes each request individually.',
          'The practical consequences follow from that: only L7 can route by path or header, retry a failed request on another backend, split traffic for a canary, or rate limit per user. L4 in exchange is dramatically cheaper and handles far more connections.',
        ],
        followUps: ['Which would you put in front of a gRPC service?'],
      },
      {
        q: 'Why does gRPC behind an L4 balancer distribute badly?',
        a: [
          'Because gRPC multiplexes many requests over a single long-lived HTTP/2 connection, and L4 makes one routing decision per connection. Ten clients produce ten connections that are spread evenly, but the request load behind them is not.',
          'Fixes are an L7 proxy that balances per request, client-side load balancing where the client knows all endpoints, or forcing periodic reconnection with a max connection age so assignments get reshuffled.',
        ],
      },
      {
        q: 'Would you terminate TLS at the load balancer?',
        a: [
          'Usually yes at the L7 tier, because it centralises certificate management and is what makes header routing, WAF inspection and per-user rate limiting possible at all.',
          'If end-to-end encryption is a requirement, I would use passthrough at L4 and route on SNI, accepting that the balancer becomes much dumber, or re-encrypt after terminating so the segment to the backend is still protected.',
        ],
      },
    ],
    references: [
      { label: 'Envoy — Architecture overview: load balancing', href: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/overview' },
      { label: 'Cloudflare — What is layer 4 vs layer 7 load balancing?', href: 'https://www.cloudflare.com/learning/performance/types-of-load-balancing-algorithms/' },
    ],
  },
}

// ── 4. Health checks & draining ──────────────────────────────────────────────

const health: Lesson = {
  slug: 'load-balancer-health',
  title: 'Health Checks, Ejection & Draining',
  summary: 'Deciding which servers get traffic — and how to remove one without dropping a request.',
  group: 'building-blocks',
  topic: 'Load Balancer',
  tier: 'pro',
  minutes: 8,
  concept: 'Resilience',
  tags: [
    { label: 'Liveness', value: 'Should it restart?' },
    { label: 'Readiness', value: 'Should it get traffic?' },
    { label: 'Guard', value: 'Panic threshold' },
  ],
  notes: [
    'A deep health check that touches a shared dependency ejects every server at once when that dependency fails.',
    'Passive detection from real traffic is far faster than waiting for the next probe.',
    'Most deploy-time 502s come from exiting before the balancer noticed you were leaving.',
  ],
  scene: {
    code: [
      '# shallow: am I able to serve?',
      'GET /healthz  -> 200 (no dependencies)',
      '',
      '# passive ejection from real traffic',
      'if consecutive_5xx(host) >= 5: eject(30s)',
      '',
      '# panic threshold: never eject everyone',
      'if healthy < 0.5 * total: route_to_all()',
    ],
    initialState: { healthy: 3, ejected: 0, mode: 'normal', 'failed requests': 0 },
    nodes: [
      { id: 'lb', kind: 'loadBalancer', label: 'Load balancer', x: 18, y: 50, badge: '3 healthy' },
      { id: 's1', kind: 'server', label: 'Server A', x: 55, y: 18, badge: 'healthy' },
      { id: 's2', kind: 'server', label: 'Server B', x: 55, y: 50, badge: 'healthy' },
      { id: 's3', kind: 'server', label: 'Server C', x: 55, y: 82, badge: 'healthy' },
      { id: 'db', kind: 'database', label: 'Shared DB', x: 88, y: 50, badge: 'up' },
    ],
    edges: [
      { id: 'lb-s1', from: 'lb', to: 's1', curve: -0.25 },
      { id: 'lb-s2', from: 'lb', to: 's2' },
      { id: 'lb-s3', from: 'lb', to: 's3', curve: 0.25 },
      { id: 's1-db', from: 's1', to: 'db', curve: -0.2 },
      { id: 's2-db', from: 's2', to: 'db' },
    ],
    steps: [
      { id: '1', caption: 'Three healthy servers. Active probes every 5 seconds confirm each can serve.', travel: 'lb-s2', token: 'hit', codeLine: 2, patches: [{ nodeId: 's2', badge: '200 ✓', highlight: true }], state: { healthy: 3 } },
      { id: '2', caption: 'Server B crashes. The next three probes fail — detection takes up to 15 seconds.', travel: 'lb-s2', token: 'miss', patches: [{ nodeId: 's2', badge: '✗ 3 fails', highlight: true }], state: { 'failed requests': 5000 } },
      { id: '3', caption: 'Meanwhile real traffic kept hitting it. Passive ejection would have caught it in five requests.', codeLine: 5, patches: [{ nodeId: 's2', badge: 'ejected', highlight: true }], state: { healthy: 2, ejected: 1, 'failed requests': 5 } },
      { id: '4', caption: 'Now the shared database goes down — and the health check queries it.', travel: 's1-db', token: 'miss', patches: [{ nodeId: 'db', badge: '✗ down', highlight: true }] },
      { id: '5', caption: 'Every server fails its check simultaneously. The balancer has nothing left to route to.', patches: [{ nodeId: 's1', badge: '✗ unhealthy', highlight: true }, { nodeId: 's3', badge: '✗ unhealthy' }], state: { healthy: 0, mode: 'total outage' } },
      { id: '6', caption: 'The panic threshold saves it: below 50% healthy, ignore health status and route to everyone.', codeLine: 8, patches: [{ nodeId: 'lb', badge: 'PANIC · route all', highlight: true }], state: { mode: 'panic — degraded', healthy: 3 } },
      { id: '7', caption: 'A shallow check would never have failed here. Depth belongs in circuit breakers, not health checks.', patches: [{ nodeId: 's1', badge: 'shallow ✓' }, { nodeId: 's3', badge: 'shallow ✓', highlight: true }], state: { mode: 'normal', healthy: 3, ejected: 0 } },
    ],
  },
  deepDive: {
    readingMinutes: 8,
    intro: [
      'Distributing requests is the easy half of load balancing. The hard half is **deciding which servers should receive them**, and that decision has two failure directions: routing to a server that cannot serve, or refusing to route to servers that can.',
      'The second failure is the one that causes major outages, because it converts a degraded dependency into a total loss of capacity — and it is caused by well-intentioned health checks that test too much.',
    ],
    sections: [
      {
        id: 'liveness',
        heading: 'Liveness, readiness and startup are three questions',
        blocks: [
          {
            kind: 'table',
            columns: ['Check', 'Question', 'Failure action', 'Should it test dependencies?'],
            rows: [
              ['Liveness', 'Is this process wedged?', 'Restart the container', 'Never'],
              ['Readiness', 'Can it serve traffic right now?', 'Remove from the pool', 'Only its own, never shared'],
              ['Startup', 'Has initialisation finished?', 'Keep waiting; do not restart', 'Its own warm-up only'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'Conflating liveness with readiness is a common and expensive bug. If a liveness check queries the database, then a database blip restarts every application container — throwing away warm caches and connection pools at exactly the moment the system is struggling, and often causing a restart loop that outlives the original problem.',
              'Missing a startup probe has a similar shape: a slow-starting application gets killed by the liveness check before it ever becomes ready, so it never starts at all.',
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'A health check that tests a shared dependency ejects the entire fleet',
            body: [
              'If every server checks the same database, they all fail together. The balancer then has zero healthy backends and returns errors for everything — including endpoints that never touch that database. The dependency was degraded; your service is now completely down.',
              'Dependency health belongs in **circuit breakers per dependency**, which fail one feature. Health checks answer only "is this process itself able to serve?"',
            ],
          },
        ],
      },
      {
        id: 'detection',
        heading: 'Active probes are slow; real traffic is fast',
        blocks: [
          {
            kind: 'prose',
            body: [
              'An active check discovers a failure after `interval × threshold` in the worst case. Real traffic discovers it on the very next request. Combining both gives fast detection and safe recovery.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Probe interval', value: '5 s' },
              { label: 'Unhealthy threshold', value: '3' },
              { label: 'Worst-case active detection', value: '15 s' },
              { label: 'Traffic at 3,000 rps across 3 servers', value: '1,000 rps to the dead one' },
              { label: 'Requests failed before active ejection', value: '~15,000' },
              { label: 'With passive ejection after 5 errors', value: '~5' },
            ],
            result: 'Passive outlier detection turns thousands of failures into a handful.',
          },
          {
            kind: 'list',
            items: [
              '**Passive (outlier) detection** ejects a host after N consecutive failures or a high error rate — no probe traffic, immediate reaction.',
              '**Active checks decide re-entry.** A passively ejected host should not return until an active probe confirms it recovered, otherwise you oscillate.',
              '**Exponential ejection backoff.** A host ejected repeatedly should stay out longer each time, so a persistently broken instance stops flapping back in.',
              '**Cap simultaneous ejections.** Never eject more than a set fraction of the fleet at once, no matter what the signals say.',
              '**Slow start on return.** A recovered or newly started host should receive gradually increasing traffic while caches and pools warm, or it will fail immediately under a full share.',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Fast failures look healthiest to a naive balancer',
            body: [
              'A backend returning instant 500s has low latency and few open connections, so latency- and connection-based algorithms will send it **more** traffic than healthy peers. Error-rate-based outlier detection is what closes that hole — balancing on load alone actively favours a broken host.',
            ],
          },
        ],
      },
      {
        id: 'panic',
        heading: 'The panic threshold: refusing to believe the checks',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Health checking has a pathological case: when everything reports unhealthy, the correct action is to **ignore health status entirely** and spread traffic across all hosts. Envoy calls this the panic threshold and defaults it to 50%.',
              'The reasoning is that mass simultaneous failure is far more likely to mean the checks are wrong — a shared dependency, a bad config push, a network problem at the balancer — than that every server genuinely died. Serving degraded traffic to possibly-unhealthy hosts beats serving nothing to nobody.',
            ],
          },
          {
            kind: 'code',
            language: 'yaml',
            caption: 'Health checking configured to fail safely',
            lines: [
              'health_checks:',
              '  - http_health_check: { path: "/healthz" }   # shallow, no dependencies',
              '    interval: 5s',
              '    timeout: 2s              # must exceed normal p99 comfortably',
              '    unhealthy_threshold: 3',
              '    healthy_threshold: 2',
              '',
              'outlier_detection:           # passive — reacts to real traffic',
              '  consecutive_5xx: 5',
              '  base_ejection_time: 30s',
              '  max_ejection_percent: 50   # never eject more than half',
              '',
              'common_lb_config:',
              '  healthy_panic_threshold: { value: 50 }   # below this, route to all',
              '  slow_start: { slow_start_window: 60s }   # ramp returning hosts',
            ],
          },
        ],
      },
      {
        id: 'draining',
        heading: 'Removing a server without dropping requests',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Most user-visible errors during deploys come from **planned** removals done in the wrong order, not from crashes. The instance must stop being sent new work *before* it stops accepting work, and the balancer needs time to notice.',
            ],
          },
          {
            kind: 'list',
            ordered: true,
            items: [
              '**Receive SIGTERM.** Do not begin shutting down yet.',
              '**Fail the readiness endpoint** so the balancer starts removing this host from rotation.',
              '**Wait at least two health-check intervals.** This is the step teams skip, and it is the direct cause of 502s — the process is gone before the balancer knows it is leaving.',
              '**Stop accepting new connections**, but keep serving in-flight ones.',
              '**Drain with a bounded timeout** (typically 30 seconds), then force-close anything remaining.',
              '**Close downstream connections** and exit cleanly.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Health check interval', value: '5 s' },
              { label: 'Safe wait before closing', value: '10 s', note: '2 intervals' },
              { label: 'In-flight drain window', value: '30 s' },
              { label: 'Kubernetes terminationGracePeriod', value: '≥ 45 s', note: 'must exceed the above' },
              { label: 'Errors if the wait is skipped', value: 'every in-flight request on that host' },
            ],
            result: 'The grace period must be longer than wait plus drain, or the platform kills you mid-drain.',
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'The order is the answer',
            body: [
              'Asked how to deploy without errors, "fail readiness first, wait two health-check intervals so the balancer actually removes us, then drain in-flight requests with a bounded timeout" is precise and immediately recognisable as having been done before.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Deep health checks that touch shared dependencies — they turn a degradation into a full outage.',
      'Liveness probes that test anything external; they cause restart loops during dependency incidents.',
      'Aggressive thresholds where the check timeout is near normal p99 — load itself will then cause ejections.',
      'Passive ejection without a cap; a bad deploy can otherwise eject the entire fleet.',
    ],
    failureModes: [
      {
        name: 'Whole fleet ejected',
        symptom: 'All backends unhealthy simultaneously; total outage while servers are fine.',
        cause: 'Health checks querying a shared dependency that failed.',
        fix: 'Shallow readiness checks, dependency handling via circuit breakers, and a panic threshold.',
      },
      {
        name: '502s on every deploy',
        symptom: 'A burst of gateway errors each rollout.',
        cause: 'Process exits before the balancer observes it as unready.',
        fix: 'Fail readiness, wait two intervals, then drain with a bounded timeout inside the grace period.',
      },
      {
        name: 'Restart loop during a dependency outage',
        symptom: 'Containers restart continuously; recovery takes far longer than the original fault.',
        cause: 'Liveness probe checking the database.',
        fix: 'Liveness tests only the process; readiness handles traffic eligibility.',
      },
      {
        name: 'Traffic favours a broken host',
        symptom: 'The instance returning errors receives more requests than healthy ones.',
        cause: 'Latency or least-connections balancing rewarding fast failures.',
        fix: 'Outlier detection on error rate, not just on load signals.',
      },
    ],
    interview: [
      {
        q: 'What should a health check actually test?',
        a: [
          'Only whether this process itself can serve — no shared dependencies. If every server checks the same database, they all fail together and the balancer has nothing to route to, so a degraded dependency becomes a complete outage.',
          'Dependency health belongs in circuit breakers, which degrade one feature rather than removing all capacity.',
          'I would also separate liveness from readiness: liveness decides whether to restart the process and must never test anything external, while readiness decides whether it should receive traffic right now.',
        ],
        followUps: ['What happens when every backend fails its check anyway?'],
      },
      {
        q: 'How do you detect a dead backend quickly?',
        a: [
          'Active probes alone are slow — with a five second interval and three failures required, detection takes fifteen seconds, and at a thousand requests per second to that host that is fifteen thousand failed requests.',
          'Passive outlier detection reacts to real traffic instead, ejecting after a handful of consecutive errors, which cuts that to single digits.',
          'I would use both: passive for fast ejection, active to decide when a host may return, with exponential backoff on repeat ejections and slow start so a returning host is not immediately overwhelmed.',
        ],
      },
      {
        q: 'How do you deploy without dropping requests?',
        a: [
          'Order matters more than anything else. On SIGTERM, fail the readiness endpoint first so the balancer begins removing the host, then wait at least two health-check intervals so it actually notices — that wait is the step people skip and it is the direct cause of deploy-time 502s.',
          'Only then stop accepting new connections and drain in-flight requests with a bounded timeout, typically thirty seconds.',
          'The platform\'s grace period must exceed the wait plus the drain, or it will kill the process mid-drain and produce exactly the errors the procedure was meant to avoid.',
        ],
      },
    ],
    references: [
      { label: 'Envoy — Outlier detection and panic threshold', href: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier' },
      { label: 'Kubernetes — Liveness, readiness and startup probes', href: 'https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/' },
    ],
  },
}

export const loadBalancerTopic: Lesson[] = [
  loadBalancer,
  lbLeastConnections,
  layers,
  health,
]
