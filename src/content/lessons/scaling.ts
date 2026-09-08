import type { Lesson } from '../types'

/** Topic: Scaling Strategies (group: fundamentals). */

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
  deepDive: {
    readingMinutes: 9,
    intro: [
      'There are exactly two ways to make a system handle more load: make the machine bigger (**vertical**, scale up) or add more machines (**horizontal**, scale out). Everything else — sharding, replication, queues — is machinery that makes the second option possible for workloads that resist it.',
      'The interesting engineering is not choosing between them in the abstract. It is knowing **which resource is actually the constraint**, because scaling the wrong axis costs money and changes nothing.',
    ],
    sections: [
      {
        id: 'compare',
        heading: 'The real trade-offs',
        blocks: [
          {
            kind: 'table',
            columns: ['Dimension', 'Vertical (scale up)', 'Horizontal (scale out)'],
            rows: [
              ['Ceiling', 'Hard — the largest instance available', 'Effectively unbounded'],
              ['Cost curve', 'Superlinear; the top tier is disproportionately expensive', 'Roughly linear'],
              ['Application changes', 'None — same process, more resources', 'Must be stateless and distribution-aware'],
              ['Failure domain', 'One machine; its loss is total', 'One of N; the loss is a fraction'],
              ['Downtime to scale', 'Usually a restart', 'None — add instances live'],
              ['Latency', 'Better — no network between components', 'Worse — coordination and network hops'],
              ['Operational complexity', 'Low', 'Load balancing, service discovery, distributed state'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'The cost curve is the part people underestimate. Instance pricing is roughly linear in the middle of the range and steep at the top: the largest instances often cost 1.5–2× per unit of CPU compared with mid-size ones, because you are paying for the engineering that makes a single very large machine exist.',
              'Against that, horizontal scaling carries a **coordination tax**. Two machines must agree on something — routing, session state, ordering — and that agreement costs latency and correctness risk that a single machine simply does not have.',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Vertical first is usually correct',
            body: [
              'A single modern server has hundreds of gigabytes of RAM and dozens of cores. Most systems that "need to scale out" would fit comfortably on one machine with an afternoon of query tuning. Scaling up buys time cheaply; scaling out spends engineering capital permanently.',
              'The senior instinct is to scale up until the cost curve or the failure domain becomes the objection — and to be able to say which one triggered the move.',
            ],
          },
        ],
      },
      {
        id: 'bottleneck',
        heading: 'Find the constraint before you scale anything',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Scaling is only useful if you add the resource that is actually exhausted. Adding CPUs to a system blocked on disk I/O changes nothing except the invoice. The USE method — for every resource check **U**tilisation, **S**aturation and **E**rrors — is the fastest way to find the real constraint.',
            ],
          },
          {
            kind: 'table',
            columns: ['Symptom', 'Likely constraint', 'What actually helps'],
            rows: [
              ['CPU pinned, queue growing', 'Compute', 'More cores, or more instances'],
              ['CPU idle, latency high', 'I/O or a downstream dependency', 'Faster storage, caching, or fixing the dependency'],
              ['Memory climbing, swap active', 'Memory', 'Bigger instance, or reduce working set'],
              ['Throughput flat as instances are added', 'A shared serial resource', 'Shard or remove the contention — more instances will not help'],
              ['Network saturated', 'Bandwidth', 'CDN, compression, smaller payloads'],
              ['Connection limits reached', 'Coordination', 'Pooling proxy, not more app servers'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'The fourth row is the important one. **Amdahl\'s Law** says the speedup from parallelism is capped by the serial fraction of the work: if 5% of a request is serialised on a shared lock or a single primary, you cannot exceed a 20× speedup no matter how many machines you add.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Serial fraction 1%', value: 'Max speedup 100×' },
              { label: 'Serial fraction 5%', value: 'Max speedup 20×' },
              { label: 'Serial fraction 10%', value: 'Max speedup 10×' },
              { label: 'Serial fraction 25%', value: 'Max speedup 4×' },
              { label: 'With 100 machines at 5% serial', value: '~16.8×', note: 'not 100×' },
            ],
            result: 'Beyond a point, removing the serial fraction is the only scaling left.',
          },
        ],
      },
      {
        id: 'stateful',
        heading: 'What makes horizontal scaling hard',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Stateless application servers scale out almost for free — that is why the industry pushed so hard to make them stateless. Everything that holds state resists.',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Databases.** Reads scale out via replicas easily; writes do not, because they need a single ordering authority. Scaling writes means sharding, and sharding means picking a key you will live with for years.',
              '**Caches.** Scale out by partitioning the keyspace, which requires consistent hashing so adding a node does not invalidate everything.',
              '**Anything with a lock or a counter.** A global rate limiter, a sequence generator, or an inventory decrement is a serialisation point by definition; the fix is usually to partition the thing being counted.',
              '**Long-lived connections.** WebSocket servers are stateful per connection and need a pub/sub backplane plus sticky routing.',
              '**Coordination itself.** Consensus (Raft, Paxos) gets *slower* as you add nodes, because more members must acknowledge each decision. Never scale a consensus group for throughput.',
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'The database is almost always the real ceiling',
            body: [
              'Application tiers scale trivially; the shared database underneath does not. When someone says "we scaled to 50 instances and it stopped helping", the constraint has moved to the primary — and the answer is caching, read replicas, or sharding, not more application servers.',
            ],
          },
        ],
      },
      {
        id: 'order',
        heading: 'The order to scale in',
        blocks: [
          {
            kind: 'list',
            ordered: true,
            items: [
              '**Profile and fix the obvious.** An N+1 query or a missing index frequently buys 10× for a day of work — cheaper than any hardware.',
              '**Cache.** Removing reads from the database is the highest-leverage change in most read-heavy systems.',
              '**Scale up.** Bigger instance, no code changes, immediate relief. Buys months.',
              '**Scale out the stateless tier.** Application servers behind a load balancer; nearly free once the app holds no state.',
              '**Add read replicas.** Offload read traffic; accept replication lag and route read-your-writes to the primary.',
              '**Shard, or move the workload off the primary.** The expensive, permanent step. Do it when write throughput or dataset size genuinely exceeds one machine.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Sequence the answer, do not jump to the end',
            body: [
              'Interviewers listening for "shard it" in the first thirty seconds hear someone reciting patterns. Walking the ladder — measure, cache, scale up, scale out, replicate, shard — and naming the trigger for each step demonstrates judgement, which is the thing being tested.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Do not scale out a system whose bottleneck is a shared serial resource — you will pay for machines that wait.',
      'Do not scale up past the point where a single machine failure is an unacceptable outage; at that point the objection is availability, not capacity.',
      'Do not distribute a workload that comfortably fits on one machine — the coordination tax is permanent and the complexity compounds.',
      'Do not scale a consensus cluster for throughput; adding members makes writes slower, not faster.',
    ],
    failureModes: [
      {
        name: 'Scaling the wrong resource',
        symptom: 'Latency is unchanged after doubling capacity.',
        cause: 'The constraint was I/O or a downstream dependency, not compute.',
        fix: 'Apply the USE method per resource before provisioning anything.',
      },
      {
        name: 'Database saturation behind a scaled app tier',
        symptom: 'Adding app servers makes latency worse rather than better.',
        cause: 'More instances mean more connections and more concurrent queries against an already-saturated primary.',
        fix: 'Cache, read replicas, connection pooling proxy; cap total connections as a global budget.',
      },
      {
        name: 'Single large instance as a single point of failure',
        symptom: 'A routine maintenance event takes the entire service down.',
        cause: 'Vertical scaling concentrated everything in one failure domain.',
        fix: 'Move to at least two smaller instances behind a load balancer, across availability zones.',
      },
      {
        name: 'Serial bottleneck rediscovered at scale',
        symptom: 'Throughput plateaus at a fixed number regardless of instance count.',
        cause: 'A global lock, sequence generator, or single-partition hot path.',
        fix: 'Partition the contended resource; batch or shard the counter; remove the coordination.',
      },
    ],
    interview: [
      {
        q: 'Would you scale up or scale out?',
        a: [
          'I would start by identifying the exhausted resource, because scaling the wrong one changes nothing. Assuming it is genuinely capacity, I would scale up first — it needs no application changes, no coordination, and buys real time cheaply.',
          'I would move to scaling out when either the cost curve turns steep at the top of the instance range, or when a single machine becomes an unacceptable failure domain. Those are the two triggers worth naming.',
          'Scaling out then requires the tier to be stateless, so I would check what state is hiding in the process before assuming it is easy.',
        ],
        followUps: ['What state would stop you scaling out today?'],
      },
      {
        q: 'You added 50 application servers and throughput stopped improving. What is happening?',
        a: [
          "Something in the path is serialised, so Amdahl's Law is capping the gain. The usual candidate is the shared database primary — every instance is issuing queries against one machine, and past a point more connections make it slower, not faster.",
          'I would confirm by looking at where time goes as concurrency rises: if database wait time dominates while app CPU is idle, the ceiling is downstream.',
          'The fixes are ordered by cost: cache to remove reads, add read replicas, then shard writes if the write rate genuinely exceeds one primary.',
        ],
      },
      {
        q: 'When is sharding justified?',
        a: [
          'When write throughput or dataset size exceeds what one primary can handle, and cheaper options are exhausted — caching, read replicas, query tuning, a bigger instance.',
          'Sharding is a permanent architectural commitment: cross-shard queries and transactions become hard, the shard key is very difficult to change later, and every future feature must respect it. So I would want the numbers to show a single primary genuinely cannot cope, not just that it is busy.',
        ],
      },
    ],
    references: [
      { label: 'Brendan Gregg — The USE Method', href: 'https://www.brendangregg.com/usemethod.html' },
      { label: "Wikipedia — Amdahl's Law", href: 'https://en.wikipedia.org/wiki/Amdahl%27s_law' },
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
  deepDive: {
    readingMinutes: 8,
    intro: [
      'Autoscaling is a **control loop**: measure a signal, compare it to a target, change the instance count, wait, repeat. Like every control loop it can oscillate, overshoot, or react too slowly to matter — and all three failure modes are common in production.',
      'The hard part is almost never the scaling policy. It is that autoscaling only works if the thing you are scaling can start fast enough and hold no state, and if everything downstream can absorb the extra capacity.',
    ],
    sections: [
      {
        id: 'signal',
        heading: 'Choosing the signal',
        blocks: [
          {
            kind: 'prose',
            body: [
              'CPU utilisation is the default because it is universally available, not because it is usually right. It is a good proxy only when the work is CPU-bound; for an I/O-bound service, CPU can sit at 20% while every request queues behind a slow dependency.',
            ],
          },
          {
            kind: 'table',
            columns: ['Signal', 'Good for', 'Fails when'],
            rows: [
              ['CPU utilisation', 'Compute-bound services', 'The bottleneck is I/O or a dependency'],
              ['Requests per instance', 'Uniform request cost', 'Request cost varies wildly'],
              ['Concurrency / in-flight requests', "Most web services — it is Little's Law made observable", 'Rarely; usually the best default'],
              ['Queue depth or age', 'Async workers, batch consumers', 'Nothing — for queues this is the correct signal'],
              ['p99 latency', 'User-facing SLO defence', 'Lagging: by the time it moves, users already suffered'],
              ['Scheduled / predictive', 'Known daily and weekly patterns', 'Unexpected events'],
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'For queue consumers, scale on age, not depth',
            body: [
              'Queue depth tells you how much work is waiting; **age of the oldest message** tells you whether you are falling behind. A deep queue that is draining fine needs no action; a shallow queue whose oldest item is ten minutes old is an incident.',
            ],
          },
        ],
      },
      {
        id: 'timing',
        heading: 'The timing problem',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Every autoscaler is late. The signal must breach a threshold for some period, then an instance must boot, initialise, warm its caches and pass health checks before it takes traffic. That total is your **reaction time**, and traffic does not wait for it.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Metric collection interval', value: '60 s' },
              { label: 'Breach duration required', value: '2 datapoints = 120 s' },
              { label: 'Instance boot + init', value: '90 s' },
              { label: 'Health check pass + LB registration', value: '30 s' },
              { label: 'Total reaction time', value: '~4 min' },
              { label: 'Flash-sale traffic ramp', value: '~30 s' },
            ],
            result: 'For spikes faster than your reaction time, autoscaling cannot help — only pre-provisioning can.',
          },
          {
            kind: 'list',
            items: [
              '**Scale out fast, scale in slow.** Adding an unnecessary instance costs pennies; removing a needed one costs an outage. Asymmetric thresholds and cooldowns are correct, not sloppy.',
              '**Keep a warm buffer.** Target 60–70% utilisation so there is headroom to absorb the ramp while new instances boot.',
              '**Shrink boot time.** Pre-baked images, lazy initialisation, and a pool of pre-warmed instances turn a four-minute reaction into a one-minute one.',
              '**Schedule the predictable.** If traffic triples every weekday at 09:00, scale at 08:45 on a schedule rather than discovering it reactively every morning.',
            ],
          },
        ],
      },
      {
        id: 'oscillation',
        heading: 'Flapping and how to stop it',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Flapping happens when the act of scaling changes the signal enough to trigger the opposite action. Scale out because CPU is 80%; the new instances drop it to 40%; the scale-in rule fires; CPU returns to 80%. The system oscillates, and every cycle costs connection churn and cold caches.',
            ],
          },
          {
            kind: 'list',
            ordered: true,
            items: [
              '**Use a gap between thresholds** (hysteresis): scale out above 70%, scale in below 40%, never at the same number.',
              '**Add cooldown periods**, longer for scale-in than scale-out, so the effect of the last action is visible before the next.',
              '**Require sustained breaches** — several consecutive datapoints, not a single spike.',
              '**Prefer target-tracking** over step rules: the scaler computes the instance count that would hit the target rather than nudging up and down.',
              '**Remove instances one at a time** with connection draining, so scale-in never causes a latency spike that triggers scale-out.',
            ],
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Autoscaling can amplify an incident',
            body: [
              'If latency rises because the *database* is saturated, an autoscaler that scales on latency adds application instances — which open more connections and issue more queries, making the database worse. Scaling on a signal you cannot fix by adding instances turns a degradation into a spiral.',
              'Guard with a maximum instance count, and make sure the thing downstream can absorb what you are about to add.',
            ],
          },
        ],
      },
      {
        id: 'requirements',
        heading: 'What the workload must satisfy',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Stateless.** An instance must be removable mid-life without a user noticing more than one failed request.',
              '**Fast to start.** If boot takes five minutes, autoscaling is really just slow manual provisioning.',
              '**Graceful shutdown.** Deregister from the load balancer, drain in-flight requests, then exit. Without draining, every scale-in produces errors.',
              '**Health checks that mean something.** A check that returns 200 before dependencies are ready sends traffic to an instance that will fail it.',
              '**Downstream headroom.** Databases, caches and third-party APIs must tolerate the connection and query count of your maximum instance count.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Max instances', value: '100' },
              { label: 'DB connections per instance', value: '20' },
              { label: 'Connections at full scale', value: '2,000' },
              { label: 'Database connection limit', value: '500' },
              { label: 'Outcome', value: 'Scaling out breaks the database', note: 'before it helps' },
            ],
            result: 'Autoscaling limits must be derived from downstream capacity, not from budget alone.',
          },
        ],
      },
    ],
    whenNotToUse: [
      'Spiky traffic faster than your reaction time — pre-provision or use scheduled scaling instead.',
      'Stateful services where instance loss costs sessions, in-flight work, or leadership.',
      'When the bottleneck is downstream: adding instances makes a saturated database worse.',
      'Workloads with long boot times or expensive cache warm-up, where a new instance is slow for minutes after it starts.',
    ],
    failureModes: [
      {
        name: 'Flapping',
        symptom: 'Instance count oscillates every few minutes; cache hit rates suffer.',
        cause: 'Scale-out and scale-in thresholds too close, with no cooldown.',
        fix: 'Hysteresis, longer scale-in cooldown, sustained-breach requirements, and target tracking.',
      },
      {
        name: 'Scaling into a downstream wall',
        symptom: 'Adding instances increases errors instead of capacity.',
        cause: 'Connection or query limits at the database exceeded by the larger fleet.',
        fix: 'Cap max instances from downstream capacity; add a pooling proxy; scale the dependency first.',
      },
      {
        name: 'Errors on every scale-in',
        symptom: 'A burst of 502s each time the fleet shrinks.',
        cause: 'Instances terminated without deregistering and draining in-flight requests.',
        fix: 'Lifecycle hooks: deregister, wait out the draining period, then shut down.',
      },
      {
        name: 'Too late to matter',
        symptom: 'The spike is over by the time capacity arrives.',
        cause: 'Reaction time longer than the traffic ramp.',
        fix: 'Pre-warmed pools, faster boots, scheduled scaling for known events, and load shedding as the immediate defence.',
      },
    ],
    interview: [
      {
        q: 'What metric would you autoscale on?',
        a: [
          'For a typical web service, concurrency or requests in flight, because it is the direct expression of Little\'s Law and stays meaningful whether the work is CPU-bound or I/O-bound. CPU is a reasonable proxy only when the service is genuinely compute-bound.',
          'For asynchronous workers I would scale on the age of the oldest message rather than queue depth — depth tells you how much work exists, age tells you whether you are falling behind.',
          'I would avoid scaling on p99 latency as the primary signal, since it lags: by the time it moves, users have already had a bad experience.',
        ],
        followUps: ['What would you do about a spike faster than your boot time?'],
      },
      {
        q: 'Your autoscaler is flapping. How do you fix it?',
        a: [
          'Separate the thresholds so scaling out and scaling in cannot both be true near the same utilisation — for example out at 70% and in at 40% — and require several consecutive breaching datapoints rather than one.',
          'Then make the cooldowns asymmetric: quick to add, slow to remove, because an extra instance is cheap and a missing one is an outage. Target-tracking policies help more than step rules, since they compute the desired count directly instead of nudging.',
        ],
      },
      {
        q: 'Traffic spikes 10× in 30 seconds. Can autoscaling handle it?',
        a: [
          'No — the reaction time is the problem. Metric collection, breach confirmation, boot and health checks typically total several minutes, so capacity arrives long after the spike.',
          'The defences are pre-provisioning for known events, a warm pool of instances, and load shedding or queueing so the existing fleet degrades gracefully instead of collapsing. Autoscaling then handles the sustained level after the initial burst.',
        ],
      },
    ],
    references: [
      { label: 'AWS — Target tracking scaling policies', href: 'https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html' },
      { label: 'Kubernetes — Horizontal Pod Autoscaler', href: 'https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/' },
    ],
  },
}

// ── 3. Backpressure & load shedding ──────────────────────────────────────────

const loadShedding: Lesson = {
  slug: 'scaling-load-shedding',
  title: 'Backpressure & Load Shedding',
  summary: 'When you cannot add capacity fast enough, refuse work early instead of failing at everything.',
  group: 'fundamentals',
  topic: 'Scaling Strategies',
  tier: 'pro',
  minutes: 8,
  concept: 'Resilience',
  tags: [
    { label: 'Goal', value: 'Graceful degradation' },
    { label: 'Signal', value: 'Queue depth / latency' },
    { label: 'Action', value: 'Reject early, cheaply' },
  ],
  notes: [
    'An overloaded system that accepts everything completes nothing — work times out after you already paid for it.',
    'Shedding rejects excess requests immediately so the accepted ones still succeed.',
    'Backpressure pushes the signal upstream so producers slow down rather than being dropped.',
  ],
  scene: {
    code: [
      'if queue.depth > HIGH_WATER:',
      '    return 503, Retry-After: 2   # shed',
      '',
      'if inflight >= MAX_CONCURRENCY:',
      '    return 429                   # backpressure',
      '',
      '# admitted work runs to completion',
      'process(request)',
    ],
    initialState: { arriving: '1000/s', admitted: '1000/s', completed: '400/s', 'goodput': '40%' },
    nodes: [
      { id: 'clients', kind: 'client', label: 'Clients', x: 10, y: 50 },
      { id: 'gate', kind: 'rateLimiter', label: 'Admission gate', x: 38, y: 50, badge: 'open' },
      { id: 'queue', kind: 'queue', label: 'Work queue', x: 64, y: 50, badge: '0 deep' },
      { id: 'workers', kind: 'server', label: 'Workers', x: 88, y: 50, badge: '400/s capacity' },
    ],
    edges: [
      { id: 'c-gate', from: 'clients', to: 'gate' },
      { id: 'gate-queue', from: 'gate', to: 'queue' },
      { id: 'queue-w', from: 'queue', to: 'workers' },
      { id: 'gate-c', from: 'gate', to: 'clients', curve: 0.5 },
    ],
    steps: [
      { id: '1', caption: 'Capacity is 400 requests/sec. Traffic arrives at 1,000/sec.', travel: 'c-gate', token: 'request', patches: [{ nodeId: 'workers', badge: '400/s capacity', highlight: true }], state: { arriving: '1000/s' } },
      { id: '2', caption: 'With no gate, everything is admitted and the queue grows by 600 every second.', travel: 'gate-queue', token: 'request', patches: [{ nodeId: 'queue', badge: '600 deep', highlight: true }], state: { admitted: '1000/s' } },
      { id: '3', caption: 'Queued requests wait so long they time out — the client gave up before the work finished.', travel: 'queue-w', token: 'miss', patches: [{ nodeId: 'queue', badge: '6000 deep ✗', highlight: true }], state: { completed: '~0/s', goodput: '0%' } },
      { id: '4', caption: 'Worst outcome: the server is 100% busy producing responses nobody is waiting for.', patches: [{ nodeId: 'workers', badge: 'busy · wasted', highlight: true }], state: { goodput: '0% — collapse' } },
      { id: '5', caption: 'Now with an admission gate: past the high-water mark, reject immediately with 503 + Retry-After.', travel: 'gate-c', token: 'miss', codeLine: 2, patches: [{ nodeId: 'gate', badge: 'shedding 60%', highlight: true }], state: { admitted: '400/s' } },
      { id: '6', caption: 'Rejection is cheap — no queueing, no work done. The queue stays shallow.', patches: [{ nodeId: 'queue', badge: '~20 deep' }], state: { completed: '400/s' } },
      { id: '7', caption: '400 users get a fast, correct answer instead of 1,000 users getting a timeout.', travel: 'queue-w', token: 'hit', codeLine: 8, patches: [{ nodeId: 'workers', badge: '400/s ✓', highlight: true }], state: { goodput: '100% of capacity' } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'Overload is not a capacity problem you can always solve with capacity — sometimes traffic simply exceeds what you have, and it will arrive faster than any autoscaler reacts. The question then is not *how do we serve everyone*, it is **how do we fail well**.',
      'The metric that matters is **goodput**: work completed that someone is still waiting for. A saturated system can run at 100% utilisation with near-zero goodput, burning CPU on responses whose clients timed out minutes ago. That is congestion collapse, and it is worse than being down.',
    ],
    sections: [
      {
        id: 'collapse',
        heading: 'Why accepting everything is the worst option',
        blocks: [
          {
            kind: 'prose',
            body: [
              'An unbounded queue looks like generosity and behaves like a trap. Every queued request holds memory and a client connection, and the queue grows without bound while arrival exceeds service rate. Latency grows linearly with queue depth until it crosses the client timeout — at which point every completed request is wasted work.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Service capacity', value: '400 req/s' },
              { label: 'Arrival rate', value: '1,000 req/s' },
              { label: 'Queue growth', value: '+600 /s' },
              { label: 'Queue depth after 10 s', value: '6,000' },
              { label: 'Wait time at that depth', value: '15 s', note: '6000 ÷ 400' },
              { label: 'Client timeout', value: '5 s' },
              { label: 'Goodput', value: '0', note: 'everything completes too late' },
            ],
            result: 'Past the timeout horizon, extra queue depth converts capacity into pure waste.',
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'A queue longer than the timeout is a machine for discarding work',
            body: [
              'Bound every queue by **time**, not just length: if an item has been waiting longer than the client\'s timeout, drop it without processing. Working on a request nobody will read is strictly worse than not working at all — it consumes the capacity a fresh request could have used.',
            ],
          },
        ],
      },
      {
        id: 'shedding',
        heading: 'Load shedding: reject early, cheaply, honestly',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Shedding means refusing work at the edge before you spend anything on it. The three properties that make it work: the rejection must be **cheap** (no database call, no auth lookup if avoidable), **early** (at the entry point, not after half the work), and **informative** (a `503` with `Retry-After` so clients back off rather than hammering).',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'admission.py — concurrency-limited admission with priority',
            lines: [
              'MAX_INFLIGHT = 200          # derived from capacity x target latency',
              'CRITICAL_RESERVE = 40       # slots only critical work may use',
              '',
              'def admit(request):',
              '    inflight = gauge.value()',
              '',
              '    # Cheapest possible rejection: no auth, no DB, no logging fan-out.',
              '    if request.priority == "bulk" and inflight > MAX_INFLIGHT - CRITICAL_RESERVE:',
              '        return reject(503, retry_after=5)      # shed low value first',
              '',
              '    if inflight >= MAX_INFLIGHT:',
              '        return reject(503, retry_after=1)',
              '',
              '    # Drop work that is already too old to be useful.',
              '    if request.age > request.deadline:',
              '        return reject(504)                     # never start it',
              '',
              '    return process(request)',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Shed by value, not at random.** A checkout is worth more than a recommendation carousel; an interactive request is worth more than a batch import. Assign priorities before the incident, not during it.',
              '**Shed retries before first attempts.** A request being tried for the first time is more valuable than one already retried twice — and shedding retries damps the amplification.',
              '**Protect the health check.** If liveness probes get shed, the orchestrator kills healthy instances during overload and makes it catastrophically worse.',
              '**Keep rejection cost near zero.** If refusing costs 20% of what serving costs, you can still collapse under enough load.',
            ],
          },
        ],
      },
      {
        id: 'backpressure',
        heading: 'Backpressure: make the producer slow down',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Shedding discards work. **Backpressure** propagates the constraint upstream so the work is never produced. It is strictly better when the producer is something you control — a queue consumer, a stream processor, an internal service — because nothing is wasted.',
              'TCP flow control is the canonical example: a slow receiver advertises a smaller window and the sender simply sends less. The same idea appears as bounded channels in Go, `Flowable` in reactive libraries, consumer lag driving producer pause in stream systems, and `429` responses with `Retry-After` between services.',
            ],
          },
          {
            kind: 'table',
            columns: ['Mechanism', 'Where it applies', 'What the producer does'],
            rows: [
              ['Bounded queue / blocking put', 'In-process pipelines', 'Blocks until space frees up'],
              ['TCP receive window', 'Any socket', 'Sends fewer bytes'],
              ['`429` + `Retry-After`', 'Service to service', 'Backs off with jitter'],
              ['Consumer lag monitoring', 'Kafka, Kinesis', 'Producer throttles or buffers durably'],
              ['Concurrency limits (semaphore)', 'Any caller', 'Waits for a permit or fails fast'],
              ['Credit-based flow control', 'gRPC/HTTP2 streams', 'Sends only what the receiver granted'],
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Backpressure with no bound is just a bigger queue',
            body: [
              'Buffering upstream instead of downstream does not remove the overload — it relocates it. Every buffer in the chain needs a bound and a policy for what happens when it fills: block, shed, or spill to durable storage. "Unbounded" anywhere in the chain reintroduces collapse at that point.',
            ],
          },
        ],
      },
      {
        id: 'adaptive',
        heading: 'Setting the limit without guessing',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A static concurrency limit is a guess that ages badly — capacity changes with deploys, instance types, and dependency health. **Adaptive limits** measure instead: they watch latency as concurrency rises and settle near the knee of the curve, exactly like TCP congestion control.',
              'The Little\'s Law starting point: if you want p99 under 200 ms and one instance completes 400 requests per second, then in-flight should sit around 80. Start there, then let an adaptive algorithm (AIMD, or Netflix\'s concurrency-limits) tune it.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Target latency', value: '200 ms' },
              { label: 'Measured throughput', value: '400 req/s' },
              { label: "Little's Law limit L = λW", value: '80 in flight' },
              { label: 'Observed min latency (unloaded)', value: '50 ms' },
              { label: 'Gradient limit ≈ L × (minRTT ÷ RTT)', value: 'shrinks as latency rises' },
            ],
            result: 'Let measured latency, not a config file, decide how much work you admit.',
          },
        ],
      },
    ],
    whenNotToUse: [
      'Do not shed when the work is genuinely irreplaceable and the producer cannot retry — persist it durably instead (write to a queue, then process).',
      'Do not apply backpressure to a producer that cannot slow down, such as an external client firehose; shed at the edge instead.',
      'Do not shed uniformly at random when request value varies — you will discard checkouts to preserve analytics.',
      'Do not add admission control before fixing an obvious capacity bug; shedding hides the symptom of a system that should be faster.',
    ],
    failureModes: [
      {
        name: 'Congestion collapse',
        symptom: 'CPU at 100%, throughput near zero, every request timing out.',
        cause: 'Unbounded queueing means all completed work finishes after clients gave up.',
        fix: 'Bound queues by time, drop expired work before processing, and add admission control.',
      },
      {
        name: 'Health checks shed',
        symptom: 'The orchestrator kills instances during overload, deepening the outage.',
        cause: 'Liveness and readiness endpoints subject to the same admission limits as user traffic.',
        fix: 'Exempt health checks, or serve them from a separate lightweight path.',
      },
      {
        name: 'Retry amplification through the shed',
        symptom: 'Rejection rate climbs even as real demand falls.',
        cause: 'Clients retry rejections immediately, so shedding increases traffic.',
        fix: 'Send `Retry-After`, require jittered backoff, and deprioritise retried requests.',
      },
      {
        name: 'Limit set too low',
        symptom: 'Requests are rejected while resources sit idle.',
        cause: 'A static concurrency limit inherited from smaller instances or an older workload.',
        fix: 'Derive from measured throughput and target latency; prefer adaptive limits that track the latency knee.',
      },
    ],
    interview: [
      {
        q: 'Traffic is 3× your capacity and autoscaling cannot keep up. What do you do?',
        a: [
          'Protect goodput. If I accept everything, queues grow past the client timeout and I end up doing full-cost work that nobody is waiting for — utilisation stays at 100% while useful throughput goes to zero.',
          'So I would admit only what I can complete within the latency budget and reject the rest immediately with a 503 and a Retry-After, shedding the lowest-value traffic first — bulk and batch before interactive, retries before first attempts.',
          'That turns "everyone gets a timeout" into "most users are served correctly and some are asked to come back", which is a much better outcome and lets the system recover on its own.',
        ],
        followUps: ['How would you decide the admission limit?'],
      },
      {
        q: 'What is the difference between backpressure and load shedding?',
        a: [
          'Backpressure propagates the constraint upstream so the producer slows down and the work is never created — bounded queues, TCP windows, 429s with Retry-After between services. Nothing is wasted, but it requires a producer that can be slowed.',
          'Load shedding discards work at the edge when you cannot control the producer, such as public internet traffic. It wastes the request but protects the requests you accept.',
          'Real systems use both: backpressure internally between components, shedding at the boundary.',
        ],
      },
      {
        q: 'How would you choose the concurrency limit?',
        a: [
          "I'd start from Little's Law: measured throughput times the target latency gives in-flight requests. If one instance does 400 requests per second and I want p99 under 200 ms, that is about 80 concurrent.",
          'A static number ages badly though, because capacity changes with deploys and dependency health, so I would prefer an adaptive limit that watches latency against its unloaded minimum and backs off as the ratio grows — the same idea as TCP congestion control.',
        ],
      },
    ],
    references: [
      { label: 'Google SRE Book — Handling Overload', href: 'https://sre.google/sre-book/handling-overload/' },
      { label: 'Netflix — Performance under load (adaptive concurrency limits)', href: 'https://netflixtechblog.medium.com/performance-under-load-3e6fa9a60581' },
    ],
  },
}

// ── 4. Cell architecture & blast radius ──────────────────────────────────────

const cells: Lesson = {
  slug: 'scaling-cells',
  title: 'Cell Architecture & Blast Radius',
  summary: 'Stop scaling one big system — run many small identical ones so failures stay small.',
  group: 'fundamentals',
  topic: 'Scaling Strategies',
  tier: 'pro',
  minutes: 8,
  concept: 'Architecture',
  tags: [
    { label: 'Unit', value: 'A full stack per cell' },
    { label: 'Blast radius', value: '1/N of users' },
    { label: 'Scale by', value: 'Adding cells' },
  ],
  notes: [
    'Horizontal scaling makes one system bigger; cells make many independent copies of it.',
    'A cell contains its own compute, cache and database — so a failure cannot cross the boundary.',
    'Deploys become a per-cell rollout, which turns a bad release into a 1/N incident.',
  ],
  scene: {
    code: [
      '# route users to a cell, permanently',
      'cell = cell_map[tenant_id]      # a directory',
      '',
      '# each cell is a complete, independent stack',
      'cell = { lb, app, cache, db }',
      '',
      '# deploy one cell at a time',
      'for c in cells: deploy(c); soak(30m)',
    ],
    initialState: { architecture: 'monolithic', 'blast radius': '100%', cells: 1, 'bad deploy' : '—' },
    nodes: [
      { id: 'router', kind: 'loadBalancer', label: 'Cell router', x: 14, y: 50, badge: 'directory' },
      { id: 'c1', kind: 'server', label: 'Cell 1', x: 48, y: 18, badge: '25% users' },
      { id: 'c2', kind: 'server', label: 'Cell 2', x: 48, y: 50, badge: '25% users' },
      { id: 'c3', kind: 'server', label: 'Cell 3', x: 48, y: 82, badge: '25% users' },
      { id: 'db1', kind: 'database', label: 'Cell 1 DB', x: 84, y: 18 },
      { id: 'db2', kind: 'database', label: 'Cell 2 DB', x: 84, y: 50 },
    ],
    edges: [
      { id: 'r-c1', from: 'router', to: 'c1', curve: -0.25 },
      { id: 'r-c2', from: 'router', to: 'c2' },
      { id: 'r-c3', from: 'router', to: 'c3', curve: 0.25 },
      { id: 'c1-db1', from: 'c1', to: 'db1' },
      { id: 'c2-db2', from: 'c2', to: 'db2' },
    ],
    steps: [
      { id: '1', caption: 'One shared system: every user hits the same app tier and the same database.', patches: [{ nodeId: 'c2', badge: '100% users', highlight: true }], state: { architecture: 'monolithic', 'blast radius': '100%', cells: 1 } },
      { id: '2', caption: 'A poison query or a bad deploy takes it down — for everyone, at once.', travel: 'r-c2', token: 'miss', patches: [{ nodeId: 'c2', badge: '✗ down · all users', highlight: true }], state: { 'bad deploy': 'total outage' } },
      { id: '3', caption: 'Cells instead: several complete, identical stacks, each owning a slice of users.', codeLine: 5, patches: [{ nodeId: 'c1', badge: '25% users' }, { nodeId: 'c3', badge: '25% users', highlight: true }], state: { architecture: 'cells', cells: 4, 'blast radius': '25%' } },
      { id: '4', caption: 'A router maps each tenant to its cell — a directory lookup, so cells can be rebalanced.', travel: 'r-c1', token: 'request', codeLine: 2, patches: [{ nodeId: 'router', badge: 'tenant → cell', highlight: true }] },
      { id: '5', caption: 'Cell 2\'s database fails. Cell 2 is down; cells 1, 3 and 4 do not even notice.', travel: 'c2-db2', token: 'miss', patches: [{ nodeId: 'db2', badge: '✗ failed', highlight: true }, { nodeId: 'c2', badge: '✗ 25% affected' }], state: { 'blast radius': '25%' } },
      { id: '6', caption: 'Deploys go cell by cell with a soak between. A bad release is caught at 25% of users.', codeLine: 8, patches: [{ nodeId: 'c1', badge: 'v2 · soaking', highlight: true }], state: { 'bad deploy': 'contained to 1 cell' } },
      { id: '7', caption: 'Growth means adding cell 5, not making an existing one bigger — capacity is a known unit.', patches: [{ nodeId: 'c3', badge: 'cell 5 added ✓', highlight: true }], state: { cells: 5, 'blast radius': '20%' } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'Horizontal scaling makes one system bigger: more app servers against one database, one cache, one deployment. That works until the shared components become the ceiling — and, more importantly, until the fact that *everything is shared* means every failure is a total failure.',
      'Cell architecture takes a different approach: build a complete, self-contained stack that serves a slice of users, and scale by **adding more of them**. Each cell has its own compute, cache and database, so nothing can propagate across the boundary.',
    ],
    sections: [
      {
        id: 'why',
        heading: 'Why blast radius beats raw scale',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Past a certain size, the binding constraint stops being throughput and becomes **correlated failure**. A single shared database means one bad query, one lock storm or one corrupt migration is a company-wide outage. Adding servers does not help; it adds load to the thing that broke.',
              'Cells change the arithmetic of failure. With eight cells, the worst realistic incident affects 12.5% of users — and that is not just a smaller number, it is a qualitatively different incident: on-call has working cells to compare against, the failure is reproducible in isolation, and the business impact is survivable.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Monolithic — users affected by a DB failure', value: '100%' },
              { label: '4 cells', value: '25%' },
              { label: '8 cells', value: '12.5%' },
              { label: '20 cells', value: '5%' },
              { label: 'Bad deploy caught in cell 1 of 8', value: '12.5% exposure' },
              { label: 'Operational overhead', value: 'grows with cell count' },
            ],
            result: 'Cell count is a dial between blast radius and operational complexity.',
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'A cell is a bulkhead made of infrastructure',
            body: [
              'The same principle as bulkheads in a thread pool or a ship\'s hull: partition the system so a breach floods one compartment. The difference is scope — here the compartment is an entire stack, so the isolation holds against database failures, cache poisoning, bad config and bad code alike.',
            ],
          },
        ],
      },
      {
        id: 'design',
        heading: 'What makes something a cell',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Complete.** A cell contains everything needed to serve its users — load balancer, application tier, cache, database. If it depends on a shared database, it is not a cell.',
              '**Independent.** No cell calls another. Cross-cell communication reintroduces the coupling you paid to remove.',
              '**Identical.** Same code, same configuration shape, same infrastructure definition. Cells that drift become individual snowflakes and the operational model collapses.',
              '**Bounded.** A cell has a maximum size — a known number of users or requests it is tested to handle. Growth adds cells rather than enlarging them.',
              '**Disposable.** You should be able to rebuild a cell from code and restore its data, because that is the recovery plan when one is badly broken.',
            ],
          },
          {
            kind: 'prose',
            body: [
              'The **cell router** is the one genuinely shared component, and it must therefore be trivially simple: a mapping from tenant or user to cell, with nothing else in it. Any logic you add there becomes a shared failure domain, defeating the design.',
              'Keeping it a directory lookup rather than a hash also lets you move a tenant between cells — essential for rebalancing, for isolating a noisy customer, and for evacuating a failing cell.',
            ],
          },
          {
            kind: 'code',
            language: 'text',
            caption: 'What is shared, and what must not be',
            lines: [
              'SHARED (keep minimal, make boring):',
              '  - cell router / directory        <- tenant -> cell',
              '  - identity provider              <- or replicate per cell',
              '  - deployment pipeline            <- but deploys are per cell',
              '  - observability (metrics, logs)  <- tagged by cell',
              '',
              'PER CELL (never shared):',
              '  - load balancer, app servers',
              '  - cache',
              '  - database and its replicas',
              '  - queues and workers',
              '',
              '# Rule: if it is shared, an incident in it is a full outage.',
              '# So the shared list is a list of things you have decided to over-invest in.',
            ],
          },
        ],
      },
      {
        id: 'deploys',
        heading: 'The deployment benefit is bigger than the failure benefit',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Most serious outages are caused by change, not by hardware. Cells turn deployment into a **progressive rollout with real isolation**: ship to one cell, soak, watch its metrics against the others, then continue.',
              'Unlike a canary of a few percent of traffic in a shared system, a cell rollout also contains **stateful** changes — a bad migration, a cache format change, a config that corrupts data — because the cell owns its own database.',
            ],
          },
          {
            kind: 'list',
            ordered: true,
            items: [
              '**Deploy to a designated first cell**, ideally one with internal or lower-value traffic.',
              '**Soak for a meaningful period** — long enough for slow-burn problems like memory leaks and lock contention to appear, typically 30 minutes to hours.',
              '**Compare against unchanged cells.** This is the underrated advantage: you have a live control group with identical code paths and real traffic.',
              '**Expand in waves** — one cell, then a few, then the rest — with automatic halt on error-rate or latency divergence.',
              '**Keep rollback per cell.** Rolling back one cell is routine; rolling back everything is an incident.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Name the control group',
            body: [
              '"With cells, a deploy always has a control group running the previous version on real traffic, so divergence is measurable rather than inferred" is a point most candidates miss and it is the practical reason cell-based teams ship more confidently.',
            ],
          },
        ],
      },
      {
        id: 'costs',
        heading: 'What it costs',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Cells are not free, and the costs fall in places that are easy to underestimate.',
            ],
          },
          {
            kind: 'table',
            columns: ['Cost', 'Detail', 'Mitigation'],
            rows: [
              ['Resource overhead', 'Each cell needs its own minimum footprint — HA database, cache, headroom', 'Larger cells, fewer of them; share nothing but accept a floor'],
              ['Operational surface', '8 cells means 8 databases to patch, back up and monitor', 'Full automation; a cell must be created by code, never by hand'],
              ['Cross-cell queries', 'Global search, admin views and analytics span every cell', 'Aggregate into a separate read model or warehouse'],
              ['Tenant migration', 'Moving a customer between cells is a data migration', 'Build and rehearse the tooling before you need it'],
              ['Uneven fill', 'One cell ends up with the largest customers', 'Directory-based placement lets you rebalance deliberately'],
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Cells are wrong before you have the scale to need them',
            body: [
              'For a system serving one region with a single database that is nowhere near its limits, cells multiply operational work for isolation you are not yet suffering without. The trigger is when a single shared failure domain has become an unacceptable business risk — not when the architecture diagram looks appealing.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Small systems where a single stack is far from its limits — the operational multiplication is not repaid.',
      'Workloads requiring global queries or transactions across all users; every such query becomes cross-cell aggregation.',
      'Teams without full infrastructure automation; hand-built cells drift and become individually-managed snowflakes.',
      'Products with no natural partition key — if users constantly interact across the whole population, cells cut through the middle of the workload.',
    ],
    failureModes: [
      {
        name: 'The router becomes a shared failure domain',
        symptom: 'Every cell is healthy but the whole service is down.',
        cause: 'Business logic or a fragile dependency added to the cell router.',
        fix: 'Keep the router a trivial directory lookup, heavily cached, deployed on its own conservative schedule.',
      },
      {
        name: 'Cell drift',
        symptom: 'A fix works in some cells and not others; incidents differ per cell.',
        cause: 'Manual changes applied to individual cells over time.',
        fix: 'Infrastructure as code with no manual access; rebuild cells from definition regularly.',
      },
      {
        name: 'Hot cell',
        symptom: 'One cell is saturated while others are half idle.',
        cause: 'Large tenants concentrated by naive placement.',
        fix: 'Directory-based placement with capacity awareness, plus tooling to migrate tenants between cells.',
      },
      {
        name: 'Cross-cell feature creep',
        symptom: 'Cells begin calling each other; an outage in one affects others.',
        cause: 'A feature requiring data from multiple cells implemented as direct calls.',
        fix: 'Aggregate asynchronously into a separate read model; never allow synchronous cell-to-cell dependencies.',
      },
    ],
    interview: [
      {
        q: 'What is cell architecture and when would you use it?',
        a: [
          'Instead of scaling one large system, you run several complete, identical stacks — each with its own load balancer, app tier, cache and database — and route each user or tenant permanently to one of them.',
          'The reason is blast radius. In a shared system, one bad query, migration or deploy is a total outage; with eight cells the worst case affects one eighth of users, and the unaffected cells give you a working control group to compare against.',
          'I would reach for it when correlated failure has become the binding constraint rather than throughput — typically a large multi-tenant system where a full outage is an unacceptable business risk.',
        ],
        followUps: ['What has to stay shared, and how do you protect it?'],
      },
      {
        q: 'How does it change deployments?',
        a: [
          'A deploy becomes a progressive rollout across cells with a real soak between waves, and crucially it contains stateful changes too — a bad migration or cache format change is confined to one cell because that cell owns its database.',
          'It also gives every deploy a live control group: cells still on the previous version, serving real traffic through identical code paths, so divergence in error rate or latency is measurable rather than inferred.',
          'Rollback is per cell, which turns "roll everything back" from an incident into a routine operation.',
        ],
      },
      {
        q: 'What are the downsides?',
        a: [
          'Operational multiplication, mainly. Eight cells means eight databases to patch, back up, monitor and upgrade, so it only works with complete infrastructure automation — a cell must be creatable from code, never assembled by hand.',
          'Anything global also gets harder: admin views, cross-tenant search and analytics now span every cell, so they need a separate aggregated read model.',
          'And the router is the one shared component, so it has to stay a trivial directory lookup — any logic there recreates the shared failure domain the whole design exists to remove.',
        ],
      },
    ],
    references: [
      { label: 'AWS — Reducing the scope of impact with cell-based architecture', href: 'https://docs.aws.amazon.com/wellarchitected/latest/reducing-scope-of-impact-with-cell-based-architecture/reducing-scope-of-impact-with-cell-based-architecture.html' },
      { label: 'Slack — Scaling with cells', href: 'https://slack.engineering/deploys-at-slack/' },
    ],
  },
}

export const scalingStrategies: Lesson[] = [scaling, autoScaling, loadShedding, cells]
