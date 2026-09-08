import type { Lesson } from '../types'

/** Topic: Latency vs Throughput (group: fundamentals). */

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
  deepDive: {
    readingMinutes: 8,
    intro: [
      'Latency and throughput are the two numbers every performance conversation is really about, and conflating them is the most common way engineers optimise the wrong thing. **Latency is time per operation. Throughput is operations per unit time.** They are not reciprocals, and improving one often degrades the other.',
      'The relationship between them is not a matter of opinion — it is governed by Little\'s Law, and knowing that law turns vague performance talk into arithmetic.',
    ],
    sections: [
      {
        id: 'littles-law',
        heading: "Little's Law: the one equation to memorise",
        blocks: [
          {
            kind: 'prose',
            body: [
              'For any stable system, **L = λ × W**: the average number of requests in the system equals the arrival rate multiplied by the average time each spends there. It holds regardless of the distribution of arrivals or service times, which is what makes it so useful.',
              'Rearranged, it tells you the concurrency you must support, the pool size you need, and whether a latency regression will exhaust your resources.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Arrival rate λ', value: '2,000 req/s' },
              { label: 'Average latency W', value: '50 ms' },
              { label: 'Concurrent requests L', value: '100', note: '2000 × 0.05' },
              { label: 'Latency degrades to', value: '500 ms' },
              { label: 'New concurrency L', value: '1,000', note: 'same traffic' },
              { label: 'Threads available', value: '256' },
            ],
            result: 'A 10× latency regression at constant traffic is a 10× concurrency demand — and an outage.',
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Throughput has a ceiling; latency does not have a floor',
            body: [
              'You can always add workers to raise throughput — that is a budget question. You cannot make a single request faster than its critical path of network round trips and dependent queries, which is a design question. That asymmetry is why latency work is architectural and throughput work is often just capacity.',
            ],
          },
        ],
      },
      {
        id: 'independent',
        heading: 'Why they move independently',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The classic analogy: a delivery van full of hard drives driven across a country has appalling latency and extraordinary throughput. A fibre link has excellent latency and, for petabytes, worse throughput. Bandwidth is width; latency is length.',
              'In systems terms, **parallelism raises throughput without touching latency**. Adding three workers lets three requests run at once; each still takes 50 ms. Conversely, **batching raises throughput while actively harming latency**: waiting 10 ms to accumulate a batch of 100 makes every request 10 ms slower and the system far more efficient.',
            ],
          },
          {
            kind: 'table',
            columns: ['Change', 'Latency', 'Throughput', 'Why'],
            rows: [
              ['Add more workers', 'Unchanged', 'Up', 'More requests in parallel; each still takes the same time'],
              ['Batch requests', 'Worse', 'Up', 'Fixed per-batch cost amortised; requests wait to be grouped'],
              ['Add a cache', 'Better', 'Up', 'Removes the slow path entirely for hits'],
              ['Add a network hop', 'Worse', 'Unchanged', 'One more round trip on the critical path'],
              ['Compress payloads', 'Depends', 'Up', 'Less bandwidth, more CPU — a win on slow links only'],
              ['Increase concurrency past the knee', 'Much worse', 'Unchanged', 'Queueing, contention and context switching'],
            ],
          },
        ],
      },
      {
        id: 'utilisation',
        heading: 'The utilisation cliff',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The single most important non-obvious fact in capacity planning: **latency does not degrade linearly with load — it degrades hyperbolically as utilisation approaches 100%.** Queueing theory gives the approximation `wait ≈ service_time × ρ / (1 − ρ)` where ρ is utilisation.',
              'This is why a system that looks comfortable at 70% CPU falls apart at 90%. You did not lose much headroom; you lost most of it.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Service time', value: '10 ms' },
              { label: 'Utilisation 50%', value: '10 ms wait', note: 'total ~20 ms' },
              { label: 'Utilisation 80%', value: '40 ms wait', note: 'total ~50 ms' },
              { label: 'Utilisation 90%', value: '90 ms wait', note: 'total ~100 ms' },
              { label: 'Utilisation 95%', value: '190 ms wait' },
              { label: 'Utilisation 99%', value: '990 ms wait', note: '100× the service time' },
            ],
            result: 'Target 60–70% utilisation. The last 30% is the buffer that absorbs bursts.',
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'This explains most "it was fine yesterday" incidents',
            body: [
              'A 10% traffic increase on a system at 85% utilisation is not a 10% latency increase — it can be a 3× one. Being able to say that, with the formula, is a strong differentiator when an interviewer asks how much headroom you would keep.',
            ],
          },
        ],
      },
      {
        id: 'optimising',
        heading: 'Optimising the right one',
        blocks: [
          {
            kind: 'list',
            ordered: true,
            items: [
              '**Decide which the user feels.** An interactive page is a latency problem. A nightly pipeline is a throughput problem. Optimising the other one is invisible to everyone.',
              '**For latency, shorten the critical path.** Remove sequential round trips, parallelise independent calls, cache, and move computation closer to the user. Adding machines does nothing here.',
              '**For throughput, add parallelism and amortise fixed costs.** More workers, batching, connection reuse, bulk writes.',
              '**Watch the interaction.** Throughput techniques usually cost latency; latency techniques usually cost money or complexity. State which you are spending.',
              '**Keep utilisation in the safe zone.** Beyond ~70%, you are buying latency variance rather than capacity.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Do not optimise throughput for an interactive path — batching and queueing add exactly the delay users notice.',
      'Do not chase latency in a batch pipeline; total completion time and cost per record matter, not per-record delay.',
      'Do not run systems near full utilisation to "use what we pay for" — the queueing penalty makes it a false economy.',
      'Do not reason about capacity from averages alone; a bursty arrival pattern saturates long before the average suggests.',
    ],
    failureModes: [
      {
        name: 'Concurrency explosion from a latency regression',
        symptom: 'Thread or connection exhaustion while request rate is unchanged.',
        cause: "Little's Law: latency rose, so in-flight requests rose proportionally.",
        fix: 'Timeouts to bound W, bulkheads per dependency, and alerting on concurrency rather than only on rate.',
      },
      {
        name: 'Hidden serialisation',
        symptom: 'Adding servers stops improving throughput past a certain point.',
        cause: 'A shared bottleneck — a lock, a single primary, one partition — that all workers contend on.',
        fix: 'Find the serial fraction (Amdahl); shard or remove the shared resource rather than adding capacity around it.',
      },
      {
        name: 'Batching that destroys interactivity',
        symptom: 'Throughput dashboards look great while users complain the app feels sluggish.',
        cause: 'A batch window added to an interactive path.',
        fix: 'Batch only asynchronous work, or use adaptive batching that flushes immediately at low load.',
      },
      {
        name: 'The utilisation cliff',
        symptom: 'A modest traffic increase causes a disproportionate latency spike.',
        cause: 'The system was already operating at 85–95% utilisation.',
        fix: 'Autoscale on utilisation with headroom, and load-test past the knee to know where it is.',
      },
    ],
    interview: [
      {
        q: 'What is the difference between latency and throughput?',
        a: [
          'Latency is how long one operation takes; throughput is how many complete per unit time. They are independent — a system can have high latency and high throughput, like a batch pipeline, or low latency and low throughput, like a single fast server.',
          "They are linked by Little's Law: concurrency equals arrival rate times latency. That is the equation I would use to size pools and to predict what a latency regression does to resource usage.",
        ],
        followUps: ['If latency doubles and traffic is flat, what happens to your thread pool?'],
      },
      {
        q: 'Adding servers stopped improving throughput. Why?',
        a: [
          'Something in the path is serialised — a database primary, a lock, a single partition, or a shared external service. Amdahl\'s Law says the serial fraction caps your speedup no matter how many workers you add.',
          'I would find the shared resource by looking at where time is spent as concurrency rises, then either shard it, remove the contention, or accept the ceiling and scale that component specifically.',
        ],
      },
      {
        q: 'How much headroom would you keep on a service?',
        a: [
          'I would target around 60–70% utilisation at peak, because queueing delay grows as ρ/(1−ρ) — at 90% the wait is nine times the service time, and at 99% it is ninety-nine.',
          'That headroom is not waste; it is what absorbs bursts and instance failures. I would also scale on a utilisation signal rather than raw traffic so the buffer is maintained automatically.',
        ],
      },
    ],
    references: [
      { label: "Wikipedia — Little's Law", href: 'https://en.wikipedia.org/wiki/Little%27s_law' },
      { label: 'Brendan Gregg — The USE Method', href: 'https://www.brendangregg.com/usemethod.html' },
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
  deepDive: {
    readingMinutes: 9,
    intro: [
      'An average latency is very nearly useless. It is a single number summarising a distribution that is almost always **heavily right-skewed** — a dense cluster of fast requests plus a long tail of slow ones — and the average sits in a region where almost no request actually lands.',
      'Percentiles describe the distribution instead of collapsing it. p99 is not an edge case to be ignored: at scale it is thousands of real users per hour, and it is usually the same users repeatedly.',
    ],
    sections: [
      {
        id: 'why-averages',
        heading: 'Why the average lies',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Consider 100 requests: 90 served from cache at 5 ms, 9 from the database at 200 ms, and 1 hitting a cold query at 2,000 ms. The mean is about 25 ms — a number that describes **not a single request in the sample**. The median is 5 ms; the p99 is 2 seconds.',
              'Reporting "average latency 25 ms" is not merely imprecise, it is actively misleading: it suggests a typical experience four times worse than the median while hiding a worst case eighty times worse than that.',
            ],
          },
          {
            kind: 'table',
            columns: ['Statistic', 'Value', 'What it tells you'],
            rows: [
              ['Mean', '25 ms', 'Nothing about any real user; distorted by the tail'],
              ['p50 (median)', '5 ms', 'The typical experience'],
              ['p95', '200 ms', 'The bad-but-common experience — usually a cache miss'],
              ['p99', '2,000 ms', 'The pathological path; where SLOs and user churn live'],
              ['p99.9', 'often 10×  p99', 'Rare paths, GC pauses, failovers, retries'],
              ['Max', 'unbounded', 'One event; useful for debugging, useless for alerting'],
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'You cannot average percentiles',
            body: [
              'The p99 of a service is not the mean of its instances\' p99s, and yesterday\'s p99 plus today\'s p99 divided by two is not the two-day p99. Percentiles must be computed from merged distributions — which is why metrics systems store histograms (HDR, t-digest, Prometheus buckets) rather than pre-computed quantiles.',
            ],
          },
        ],
      },
      {
        id: 'fanout',
        heading: 'Tail amplification: why p99 is everyone\'s problem',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The reason tail latency matters far more than its name suggests is **fan-out**. If rendering a page requires 20 backend calls and each has a 1% chance of being slow, the probability that *at least one* is slow is 1 − 0.99²⁰ ≈ **18%**.',
              'So a per-service p99 becomes a user-facing p82. This is Dean and Barroso\'s "tail at scale" result, and it is why large systems invest so heavily in trimming outliers rather than improving the median.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Per-call probability of exceeding p99', value: '1%' },
              { label: 'Calls per page: 5', value: '4.9%', note: 'of pages are slow' },
              { label: 'Calls per page: 20', value: '18.2%' },
              { label: 'Calls per page: 100', value: '63.4%' },
              { label: 'Needed per-call percentile for 1% slow pages at fan-out 100', value: 'p99.99' },
            ],
            result: 'Fan-out converts a rare backend event into a common user experience.',
          },
          {
            kind: 'list',
            items: [
              '**Hedged requests.** Send a duplicate to a second replica after waiting p95; take whichever answers first. Costs a few percent extra load, cuts the tail dramatically.',
              '**Tied requests.** Send to two replicas immediately, each cancelling the other on start — lower tail than hedging, at the cost of coordination.',
              '**Reduce fan-out.** Batch backend calls or denormalise so a page needs five calls, not fifty.',
              '**Bound with timeouts and partial responses.** Render the page without the one slow module rather than waiting for it.',
            ],
          },
        ],
      },
      {
        id: 'causes',
        heading: 'What actually creates the tail',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The tail is rarely "the code is slow". It is a small set of recurring, identifiable causes — and naming them is what turns a percentile dashboard into an action.',
            ],
          },
          {
            kind: 'table',
            columns: ['Cause', 'Typical signature', 'Mitigation'],
            rows: [
              ['Cache miss', 'Bimodal: a fast mode and a slow mode', 'Raise hit rate; warm the cache'],
              ['Queueing at high utilisation', 'Tail grows sharply with load', 'Add headroom; shed load'],
              ['GC or runtime pause', 'Periodic spikes uncorrelated with traffic', 'Tune heap; use a low-pause collector'],
              ['Noisy neighbour / CPU steal', 'Spikes on specific instances only', 'Move workload; use dedicated capacity'],
              ['Lock or connection contention', 'Tail scales with concurrency', 'Reduce critical sections; bulkheads'],
              ['Retries and failover', 'Tail equals timeout plus retry time', 'Shorter timeouts; hedge instead of retry'],
              ['Data skew', 'Slowness tied to specific users or keys', 'Paginate; cap fan-out per entity'],
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'A bimodal distribution is a clue, not noise',
            body: [
              'When latency clusters into two modes, you are looking at two code paths — almost always a cache hit and a cache miss, or a local and a remote read. The fix is to change the *ratio* between the paths, not to speed either one up.',
            ],
          },
        ],
      },
      {
        id: 'slo',
        heading: 'Turning percentiles into SLOs',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A percentile only becomes useful when it is attached to a target, a window, and a consequence. "p99 < 300 ms over a rolling 30 days" defines an **error budget**: 1% of requests may exceed it, and how much of that budget you have spent determines whether you ship features or reliability work.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Requests per 30 days', value: '500 M' },
              { label: 'SLO', value: 'p99 < 300 ms' },
              { label: 'Permitted slow requests', value: '5 M' },
              { label: 'Per day', value: '~167,000' },
              { label: 'Budget consumed by one 20-minute incident at 50% slow', value: '~3.5 M', note: '70% of the month' },
            ],
            result: 'One bad twenty minutes can spend most of a monthly budget — which is exactly the point of measuring it.',
          },
          {
            kind: 'list',
            items: [
              '**Measure where the user is.** Server-side latency omits DNS, TLS, queueing at the load balancer and the network — often the majority of what the user feels.',
              '**Alert on the SLO, not on spikes.** Burn-rate alerts (fast burn, slow burn) page for things that threaten the budget rather than for every blip.',
              '**Track p99 per endpoint, not globally.** A global p99 is dominated by whichever endpoint is both slow and popular.',
              '**Watch p99.9 for capacity signals.** It moves first when a system starts to saturate.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Do not set SLOs on the maximum — a single pathological request would breach it forever with no useful signal.',
      'Do not use averages for user-facing latency at all; use them only for resource metrics like CPU where the distribution is not skewed.',
      'Do not compute percentiles over long windows for alerting — a 24-hour p99 hides a 30-minute outage entirely.',
      'Do not chase p99.99 on a low-traffic endpoint; with few requests it is statistical noise.',
    ],
    failureModes: [
      {
        name: 'Averaged percentiles',
        symptom: 'Dashboards look healthy during an incident users clearly felt.',
        cause: 'Per-instance quantiles averaged together, or long aggregation windows smoothing the spike away.',
        fix: 'Aggregate histograms and compute the quantile once; use short windows for alerting.',
      },
      {
        name: 'Tail amplification by fan-out',
        symptom: 'Every backend meets its p99 target but the page is frequently slow.',
        cause: 'A page issuing many calls; the probability that one is slow compounds.',
        fix: 'Reduce fan-out, hedge requests, and set per-call deadlines with graceful partial rendering.',
      },
      {
        name: 'Coordinated omission',
        symptom: 'Load-test results look far better than production.',
        cause: 'The test client waits for a response before sending the next request, so slow responses suppress load and never get measured.',
        fix: 'Use an open-model load generator that maintains the intended rate regardless of response time.',
      },
      {
        name: 'Retry-inflated tail',
        symptom: 'p99 sits suspiciously close to a timeout multiple.',
        cause: 'Requests that time out and retry, so the user-visible latency is timeout + retry duration.',
        fix: 'Shorter timeouts, hedged requests instead of sequential retries, and measuring end-to-end rather than per-attempt.',
      },
    ],
    interview: [
      {
        q: 'Why do we measure p99 instead of average latency?',
        a: [
          'Because latency distributions are right-skewed, so the average is pulled by the tail and describes no real request. A system with a 5 ms median and a 2 s p99 can average 25 ms, which sounds fine and is not.',
          'p99 also matters more than its 1% suggests: at scale it is a large absolute number of users, and with fan-out a per-service p99 becomes a much worse user-facing percentile.',
        ],
        followUps: ['How much worse, with 20 backend calls per page?'],
      },
      {
        q: 'Your p50 is flat but p99 tripled. Where do you look?',
        a: [
          'A stable median with a growing tail means the fast path is unchanged and something is affecting a subset of requests — so I would look for a path, not a global slowdown.',
          'The usual suspects are cache hit rate falling, utilisation approaching the queueing knee, GC or noisy-neighbour pauses on specific instances, lock or connection contention, and retries after a dependency started failing.',
          'I would break the latency histogram down by endpoint, instance and cache-hit status; a bimodal shape points straight at the two code paths involved.',
        ],
      },
      {
        q: 'How would you reduce tail latency on a page that makes 30 backend calls?',
        a: [
          'First reduce the fan-out — batch or denormalise so the page needs fewer calls, because the compounding probability is the dominant term.',
          'Then bound each call with a deadline and render partial results rather than blocking the page on the slowest module.',
          'Finally, hedge: after waiting the p95, issue a duplicate request to another replica and take the first response. That costs a small percentage of extra load and cuts the tail substantially, which is the trade Google documented in "The Tail at Scale".',
        ],
      },
    ],
    references: [
      { label: 'Dean & Barroso — The Tail at Scale', href: 'https://research.google/pubs/pub40801/' },
      { label: 'Google SRE Book — Service Level Objectives', href: 'https://sre.google/sre-book/service-level-objectives/' },
    ],
  },
}

// ── 3. Back-of-the-envelope ──────────────────────────────────────────────────

const napkinMath: Lesson = {
  slug: 'latency-napkin-math',
  title: 'Back-of-the-Envelope Estimation',
  summary: 'Turn "design Twitter" into numbers: QPS, storage, bandwidth and machine count.',
  group: 'fundamentals',
  topic: 'Latency vs Throughput',
  tier: 'pro',
  minutes: 8,
  concept: 'Method',
  tags: [
    { label: 'Skill', value: 'Capacity estimation' },
    { label: 'Accuracy', value: 'Order of magnitude' },
    { label: 'Used in', value: 'Every design round' },
  ],
  notes: [
    'Estimation is not about being right — it is about being right to within 10× and showing your reasoning.',
    'Four quantities answer almost every question: QPS, storage, bandwidth, and memory for the hot set.',
    'Always convert to a per-second rate, then compare against what one machine can do.',
  ],
  scene: {
    code: [
      'DAU              = 100 M',
      'reads/user/day   = 50',
      'writes/user/day  = 2',
      '',
      'read_qps  = 100M * 50 / 86400   ~= 58k',
      'write_qps = 100M *  2 / 86400   ~=  2.3k',
      'peak      = 2x average          ~= 116k',
      '',
      'storage/day = 200M * 1 KB       ~= 200 GB',
    ],
    initialState: { DAU: '100 M', 'read QPS': '—', 'write QPS': '—', storage: '—', servers: '—' },
    nodes: [
      { id: 'users', kind: 'client', label: '100M users', x: 12, y: 50 },
      { id: 'lb', kind: 'loadBalancer', label: 'Edge', x: 40, y: 50, badge: '116k peak QPS' },
      { id: 'app', kind: 'server', label: 'App tier', x: 68, y: 26, badge: '? servers' },
      { id: 'db', kind: 'database', label: 'Storage', x: 68, y: 76, badge: '? TB/yr' },
      { id: 'cache', kind: 'cache', label: 'Hot set', x: 92, y: 50, badge: '? GB' },
    ],
    edges: [
      { id: 'u-lb', from: 'users', to: 'lb' },
      { id: 'lb-app', from: 'lb', to: 'app', curve: -0.25 },
      { id: 'app-db', from: 'app', to: 'db', curve: 0.25 },
      { id: 'app-cache', from: 'app', to: 'cache', curve: -0.25 },
    ],
    steps: [
      { id: '1', caption: 'Start with users and behaviour: 100M daily actives, 50 reads and 2 writes each.', codeLine: 3, state: { DAU: '100 M' } },
      { id: '2', caption: 'Divide by 86,400 seconds. Reads: 5 billion/day ≈ 58k QPS.', travel: 'u-lb', token: 'request', codeLine: 5, patches: [{ nodeId: 'lb', badge: '58k avg QPS', highlight: true }], state: { 'read QPS': '~58k' } },
      { id: '3', caption: 'Writes are far rarer: 200M/day ≈ 2.3k QPS. A 25:1 read/write ratio.', codeLine: 6, state: { 'write QPS': '~2.3k' } },
      { id: '4', caption: 'Apply a 2× peak factor — traffic is never flat across the day.', codeLine: 7, patches: [{ nodeId: 'lb', badge: '116k peak QPS', highlight: true }] },
      { id: '5', caption: 'At ~5k QPS per app server, 116k peak needs ~25 servers, plus headroom → 35.', travel: 'lb-app', token: 'request', patches: [{ nodeId: 'app', badge: '~35 servers', highlight: true }], state: { servers: '~35' } },
      { id: '6', caption: 'Storage: 200M writes × 1 KB = 200 GB/day ≈ 73 TB/year before replication.', travel: 'app-db', token: 'write', codeLine: 9, patches: [{ nodeId: 'db', badge: '~73 TB/yr', highlight: true }], state: { storage: '73 TB/yr' } },
      { id: '7', caption: 'Hot set: 20% of users × 2 KB ≈ 40 GB — comfortably cacheable in memory.', travel: 'app-cache', token: 'hit', patches: [{ nodeId: 'cache', badge: '~40 GB', highlight: true }] },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'Every system design interview turns on one moment: can you convert a vague product description into **numbers that constrain the architecture?** Without them, "add a cache" and "shard the database" are guesses. With them, they are conclusions.',
      'The goal is never precision. It is being right to within an order of magnitude, quickly, while showing the assumptions — because the assumptions are what the interviewer is actually evaluating.',
    ],
    sections: [
      {
        id: 'constants',
        heading: 'The constants worth memorising',
        blocks: [
          {
            kind: 'math',
            rows: [
              { label: 'Seconds per day', value: '86,400', note: 'call it 100k' },
              { label: 'Seconds per month', value: '~2.5 M' },
              { label: '1 M writes/day', value: '~12 /s' },
              { label: '1 B writes/day', value: '~12,000 /s' },
              { label: 'Peak factor over average', value: '2–3×' },
              { label: 'Modern app server', value: '~5–10k QPS', note: 'simple request handling' },
              { label: 'Postgres primary, mixed workload', value: '~5–10k QPS' },
              { label: 'Redis node', value: '~100k ops/s' },
              { label: 'SSD sequential read', value: '~1 GB/s' },
              { label: '1 Gbps link', value: '~125 MB/s' },
            ],
            result: 'Rounding 86,400 to 100,000 costs you 15% and saves you a minute of arithmetic.',
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Powers of two for sizing',
            body: [
              'A KB is 10³, an MB 10⁶, a GB 10⁹, a TB 10¹². For an ASCII character count 1 byte, a UUID 16 bytes, a timestamp 8, a typical row 100 bytes to 1 KB, and a small image 100 KB to 1 MB. Those six numbers cover most storage estimates.',
            ],
          },
        ],
      },
      {
        id: 'method',
        heading: 'The method, in order',
        blocks: [
          {
            kind: 'list',
            ordered: true,
            items: [
              '**State the user base and the behaviour.** DAU, and how many reads and writes each user generates per day. Say the numbers out loud so they can be corrected.',
              '**Convert to QPS.** Divide by ~100k seconds. Compute reads and writes separately — the ratio drives the entire architecture.',
              '**Apply a peak factor.** 2× for a global product, 3–5× for one concentrated in a single timezone or with event spikes.',
              '**Size storage.** Writes per day × bytes per write, then × retention, then × replication factor. Then ask whether it grows forever or is bounded.',
              '**Size bandwidth.** QPS × payload size. This is where media-heavy designs reveal that a CDN is not optional.',
              '**Size the hot set.** What fraction of data is accessed regularly? That is the cache, and it decides whether one Redis node suffices.',
              '**Divide by per-machine capacity** to get server counts, then add headroom. Round to something operationally sane.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'The read/write ratio is the punchline',
            body: [
              'A 25:1 read-heavy ratio justifies caching, read replicas and denormalisation. A write-heavy ratio justifies sharding, queues and LSM-tree storage. Deriving that ratio in the first two minutes tells the interviewer which architecture you are about to defend, and why.',
            ],
          },
        ],
      },
      {
        id: 'worked',
        heading: 'A worked example: an image-sharing service',
        blocks: [
          {
            kind: 'prose',
            body: [
              '50 million daily actives; each views 100 images and uploads 0.2 images per day. Average image 300 KB after compression, plus a 30 KB thumbnail. Retain everything, replicate three times.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Image views/day', value: '5 B', note: '50M × 100' },
              { label: 'Read QPS (avg)', value: '~58,000' },
              { label: 'Read QPS (peak, 2×)', value: '~116,000' },
              { label: 'Uploads/day', value: '10 M' },
              { label: 'Write QPS (peak)', value: '~230' },
              { label: 'Read:write ratio', value: '~500:1', note: 'extremely read-heavy' },
              { label: 'Storage/day', value: '3.3 TB', note: '10M × 330 KB' },
              { label: 'Storage/year × 3 replicas', value: '~3.6 PB' },
              { label: 'Egress bandwidth at peak', value: '~35 GB/s', note: '116k × 300 KB' },
            ],
            result: '35 GB/s of egress is the finding: this is a CDN problem, not a server problem.',
          },
          {
            kind: 'prose',
            body: [
              'That last line is what estimation is *for*. Nothing about the description said "CDN", but the bandwidth number makes it unavoidable — 35 GB/s from origin would need hundreds of saturated 1 Gbps links and would cost more than the rest of the system combined. Meanwhile 230 write QPS is trivially handled by a single database, which tells you not to waste design time sharding writes.',
            ],
          },
        ],
      },
      {
        id: 'traps',
        heading: 'Where estimates go wrong',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Forgetting the peak factor.** Sizing for the daily average guarantees the system is underprovisioned exactly when it matters.',
              '**Forgetting replication and indexes.** Raw data times three replicas, plus indexes that are often 20–50% of table size again.',
              '**Ignoring metadata.** A 300 KB image may carry rows in five tables; small records at high volume add up.',
              '**Assuming uniform users.** Power-law distributions mean the top 1% may generate 30% of the load — which is where hot partitions come from.',
              '**Confusing bits and bytes.** A 1 Gbps link moves 125 MB/s, not 1 GB/s. This factor of eight has embarrassed many candidates.',
              '**Over-precision.** "58,333.33 QPS" signals you are calculating rather than reasoning. Say "roughly 60k".',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Do not estimate when real measurements exist — production data beats arithmetic every time.',
      'Do not use these numbers to choose between two similar designs; they are only accurate to an order of magnitude.',
      'Do not spend interview time on precision past the first significant figure; the reasoning is the deliverable.',
      'Do not extrapolate a single benchmark number to a different workload shape — a 100k ops/s Redis figure assumes small values and pipelining.',
    ],
    failureModes: [
      {
        name: 'Designed for average load',
        symptom: 'The system falls over at predictable daily peaks.',
        cause: 'Capacity derived from the daily mean with no peak multiplier.',
        fix: 'Apply 2–3× (more for event-driven products) and autoscale on utilisation.',
      },
      {
        name: 'Storage estimate off by the replication factor',
        symptom: 'Disks fill months earlier than planned.',
        cause: 'Counting logical data only, ignoring replicas, indexes, WAL and backups.',
        fix: 'Multiply raw data by replication, then add 30–50% for indexes and operational overhead.',
      },
      {
        name: 'Bandwidth surprise',
        symptom: 'Egress cost dominates the bill unexpectedly.',
        cause: 'Payload size multiplied by QPS was never computed.',
        fix: 'Estimate egress early; it usually decides whether a CDN is mandatory.',
      },
      {
        name: 'Uniformity assumption',
        symptom: 'A few shards or keys saturate while the cluster looks underused.',
        cause: 'Estimating with an average user rather than a power-law distribution.',
        fix: 'Estimate the top percentile explicitly and design for the hot key.',
      },
    ],
    interview: [
      {
        q: 'Estimate the QPS and storage for a Twitter-like feed.',
        a: [
          'I would start from 200 million daily actives, each reading roughly 50 timeline loads and posting twice a day. That is 10 billion reads and 400 million writes daily, which divided by about 100,000 seconds gives roughly 100k read QPS and 4k write QPS, doubled at peak.',
          'For storage, a tweet is a few hundred bytes with metadata, so 400 million writes is well under a terabyte a day of text — but media dominates: if 10% include an image at 300 KB, that is 12 TB a day before replication.',
          'The 25:1 read/write ratio and the media volume are the conclusions: heavy caching and fan-out-on-write for the text, object storage plus a CDN for the media.',
        ],
        followUps: ['How does the estimate change for celebrity accounts with 50 million followers?'],
      },
      {
        q: 'How many application servers would you provision for 100k peak QPS?',
        a: [
          'If a server handles roughly 5,000 QPS for this workload, 100k needs 20 servers at full utilisation — which is not a target. At 60–70% utilisation I would provision about 30, then add capacity for one or two instance failures, so 32 to 35 across at least three availability zones.',
          'I would state the per-server assumption explicitly, because it is the number most likely to be wrong, and confirm it with a load test before committing.',
        ],
      },
      {
        q: 'How do you know when to shard the database?',
        a: [
          'By comparing the estimate against what one primary can do. A single well-provisioned Postgres handles roughly 5–10k write QPS and tens of terabytes; if my write estimate is 300 QPS, sharding is premature complexity and I would say so.',
          'The triggers are write throughput past a single primary, a dataset beyond what one machine can hold or back up in a reasonable window, or a need to isolate tenants. Reads alone rarely justify sharding, since replicas and caching handle them more cheaply.',
        ],
      },
    ],
    references: [
      { label: 'Jeff Dean — Numbers Everyone Should Know', href: 'https://static.googleusercontent.com/media/research.google.com/en//people/jeff/stanford-295-talk.pdf' },
      { label: 'Latency numbers every programmer should know (interactive)', href: 'https://colin-scott.github.io/personal_website/research/interactive_latency.html' },
    ],
  },
}

// ── 4. Queueing & the utilisation cliff ──────────────────────────────────────

const queueing: Lesson = {
  slug: 'latency-queueing',
  title: 'Queueing & the Utilisation Cliff',
  summary: 'Latency does not rise linearly with load — it explodes as you approach capacity.',
  group: 'fundamentals',
  topic: 'Latency vs Throughput',
  tier: 'pro',
  minutes: 7,
  concept: 'Concept',
  tags: [
    { label: 'Formula', value: 'wait ≈ S·ρ/(1−ρ)' },
    { label: 'Target', value: '60–70% utilisation' },
    { label: 'Cause', value: 'Variance, not just load' },
  ],
  notes: [
    'At 90% utilisation the queueing delay is nine times the service time; at 99% it is ninety-nine.',
    'The headroom you keep is not waste — it is what absorbs bursts and instance failures.',
    'Variance in arrivals and service times makes the cliff arrive earlier than the formula suggests.',
  ],
  scene: {
    code: [
      '# M/M/1 queueing delay',
      'rho  = arrival_rate / service_rate',
      'wait = service_time * rho / (1 - rho)',
      '',
      '# 50% -> 1x   80% -> 4x',
      '# 90% -> 9x   99% -> 99x',
    ],
    initialState: { utilisation: '50%', 'service time': '10 ms', 'queue wait': '10 ms', total: '20 ms' },
    nodes: [
      { id: 'arrivals', kind: 'client', label: 'Arrivals', x: 12, y: 50 },
      { id: 'queue', kind: 'queue', label: 'Queue', x: 44, y: 50, badge: '1 waiting' },
      { id: 'worker', kind: 'server', label: 'Worker', x: 76, y: 50, badge: '10 ms each' },
      { id: 'done', kind: 'server', label: 'Completed', x: 95, y: 22, badge: '—' },
    ],
    edges: [
      { id: 'a-q', from: 'arrivals', to: 'queue' },
      { id: 'q-w', from: 'queue', to: 'worker' },
      { id: 'w-d', from: 'worker', to: 'done', curve: -0.25 },
    ],
    steps: [
      { id: '1', caption: 'At 50% utilisation the worker is often idle. A request waits about one service time.', travel: 'a-q', token: 'request', codeLine: 3, patches: [{ nodeId: 'queue', badge: '1 waiting', highlight: true }], state: { utilisation: '50%', 'queue wait': '10 ms', total: '20 ms' } },
      { id: '2', caption: 'Push to 80% and the queue rarely empties. Wait time is now four service times.', travel: 'a-q', token: 'request', patches: [{ nodeId: 'queue', badge: '4 waiting', highlight: true }], state: { utilisation: '80%', 'queue wait': '40 ms', total: '50 ms' } },
      { id: '3', caption: 'At 90% — still "10% headroom" on a dashboard — the wait is nine service times.', patches: [{ nodeId: 'queue', badge: '9 waiting', highlight: true }], state: { utilisation: '90%', 'queue wait': '90 ms', total: '100 ms' } },
      { id: '4', caption: 'At 95% it doubles again. The last few percent of capacity cost more than all the rest.', travel: 'q-w', token: 'miss', patches: [{ nodeId: 'queue', badge: '19 waiting', highlight: true }], state: { utilisation: '95%', 'queue wait': '190 ms', total: '200 ms' } },
      { id: '5', caption: 'At 99%, queueing dominates completely — 990 ms of waiting for 10 ms of work.', patches: [{ nodeId: 'queue', badge: '99 waiting ✗', highlight: true }, { nodeId: 'worker', badge: 'saturated' }], state: { utilisation: '99%', 'queue wait': '990 ms', total: '1000 ms' } },
      { id: '6', caption: 'A 10% traffic increase on an 85%-utilised system is not a 10% latency increase — it can be 3×.', patches: [{ nodeId: 'queue', badge: 'cliff', highlight: true }] },
      { id: '7', caption: 'Back at 65% the queue drains between arrivals and latency is stable and predictable.', travel: 'w-d', token: 'hit', patches: [{ nodeId: 'queue', badge: '2 waiting' }, { nodeId: 'worker', badge: '10 ms ✓', highlight: true }], state: { utilisation: '65%', 'queue wait': '19 ms', total: '29 ms' } },
    ],
  },
  deepDive: {
    readingMinutes: 8,
    intro: [
      'The single most counter-intuitive fact in capacity planning: **latency does not degrade proportionally with load.** It degrades hyperbolically, so a system that looks comfortable at 70% CPU can be unusable at 90% — and the difference between those two numbers is not 20% of your capacity, it is most of your latency budget.',
      'Once you internalise the shape of that curve, a great many production mysteries — "it was fine yesterday", "we only added 10% traffic" — stop being mysteries.',
    ],
    sections: [
      {
        id: 'formula',
        heading: 'The formula and what it means',
        blocks: [
          {
            kind: 'prose',
            body: [
              'For a simple queue with one server, average waiting time is approximately `W = S × ρ / (1 − ρ)`, where `S` is the service time and `ρ` is utilisation. The `(1 − ρ)` in the denominator is the whole story: as utilisation approaches 1, the denominator approaches zero and waiting time approaches infinity.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'ρ = 0.5', value: '1 × S', note: 'total 2S' },
              { label: 'ρ = 0.7', value: '2.3 × S' },
              { label: 'ρ = 0.8', value: '4 × S' },
              { label: 'ρ = 0.9', value: '9 × S' },
              { label: 'ρ = 0.95', value: '19 × S' },
              { label: 'ρ = 0.99', value: '99 × S' },
              { label: 'Going 0.7 → 0.9', value: 'latency ~4×', note: 'for 29% more traffic' },
            ],
            result: 'The last 30% of capacity costs you 4× your latency to use.',
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Utilisation is a latency setting, not a thriftiness score',
            body: [
              'Running at 90% "to use what we pay for" is choosing a 9× queueing multiplier. The idle 30% at a 70% target is not waste — it is the buffer that keeps latency flat and absorbs bursts, deploys and instance failures. Treat it as a purchased SLA rather than unused resource.',
            ],
          },
        ],
      },
      {
        id: 'variance',
        heading: 'Why real systems hit the cliff earlier',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The textbook formula assumes Poisson arrivals and exponential service times. Real traffic is burstier and real service times are far more variable — a cache hit takes 1 ms, a cache miss 50 ms, an unindexed query 2 seconds.',
              'Kingman\'s formula captures this: waiting time scales with `(C²ₐ + C²ₛ) / 2`, where those terms are the squared coefficients of variation for arrivals and service. **Double the variability, double the queueing delay at the same utilisation.**',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Uniform service times, ρ = 0.8', value: '~4 × S' },
              { label: 'Bimodal service (cache hit/miss), ρ = 0.8', value: '~8–12 × S' },
              { label: 'Bursty arrivals, ρ = 0.8', value: '~8 × S' },
              { label: 'Both, ρ = 0.8', value: '~16 × S' },
              { label: 'Practical safe utilisation', value: '50–70%' },
            ],
            result: 'Reducing variance is often cheaper than adding capacity.',
          },
          {
            kind: 'list',
            items: [
              '**Separate fast and slow work.** Putting 2-second exports in the same pool as 5 ms reads makes every read pay the variance. Give them separate queues or separate services.',
              '**Cap the tail with timeouts.** A bounded worst case bounds the variance directly.',
              '**Smooth arrivals** with shaping where the workload allows it — a leaky bucket in front of a fragile dependency converts burst into predictable rate.',
              '**Add servers, not just speed.** Many parallel servers (M/M/c) tolerate far higher utilisation than one, because a burst can be absorbed by whichever server is free.',
            ],
          },
        ],
      },
      {
        id: 'observing',
        heading: 'Seeing it before it hurts',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The cliff is predictable, which means it is detectable. What you cannot do is infer it from a utilisation number alone, because the metric that matters is **queue wait**, not resource busy-ness.',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Measure time spent waiting**, separately from time spent working — connection pool acquire time, thread pool queue time, run-queue depth. A rising wait fraction is the earliest signal.',
              '**Watch p99 against p50.** As utilisation rises, the tail lifts long before the median does; a widening ratio means you are approaching the knee.',
              '**Load test past the knee**, not up to it. You need to know where the curve turns for *your* workload — the formula gives the shape, not the number.',
              '**Autoscale on the signal that reflects queueing** — concurrency or in-flight requests — rather than CPU, which can be low while everything waits on I/O.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'The sentence that explains most incidents',
            body: [
              '"We were at 85% utilisation, so a 10% traffic increase did not add 10% latency — it moved us up the ρ/(1−ρ) curve and roughly tripled it." Being able to say that, with the formula, is what turns a post-mortem narrative into an explanation.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Do not apply single-server queueing intuition to a large parallel pool; many servers tolerate much higher utilisation.',
      'Do not target high utilisation on latency-sensitive services to save cost — the queueing penalty is the hidden bill.',
      'Do not treat CPU utilisation as the queueing signal for I/O-bound work; measure wait time directly.',
      'Batch systems with no latency requirement should run near 100% — the cliff only matters when someone is waiting.',
    ],
    failureModes: [
      {
        name: 'Latency cliff after a small traffic increase',
        symptom: 'A 10% traffic rise produces a 3× latency rise.',
        cause: 'The system was already operating at 85–90% utilisation.',
        fix: 'Target 60–70%, autoscale on concurrency, and load test past the knee to locate it.',
      },
      {
        name: 'Variance-driven queueing',
        symptom: 'p99 is poor despite moderate average utilisation.',
        cause: 'Highly variable service times — mixed cheap and expensive requests in one pool.',
        fix: 'Separate fast and slow work into different pools or services; bound the tail with timeouts.',
      },
      {
        name: 'Invisible queueing',
        symptom: 'Latency is high while CPU, memory and disk all look fine.',
        cause: 'Requests waiting on a pool or lock rather than consuming a measured resource.',
        fix: 'Instrument acquire and queue wait times explicitly as first-class metrics.',
      },
      {
        name: 'Scaling on the wrong signal',
        symptom: 'Autoscaler does not react while latency degrades.',
        cause: 'Scaling on CPU for an I/O-bound workload.',
        fix: 'Scale on in-flight concurrency or queue wait, which reflect the actual constraint.',
      },
    ],
    interview: [
      {
        q: 'Why does latency spike when a system approaches capacity?',
        a: [
          'Because queueing delay follows ρ over one minus ρ, so it grows hyperbolically rather than linearly. At 50% utilisation a request waits about one service time; at 90% it waits nine; at 99% it waits ninety-nine.',
          'That is why a system at 85% can look fine on a dashboard and then triple its latency from a 10% traffic increase — the increase moves you up a curve that is nearly vertical at that point.',
          'Real systems hit it earlier still, because variance in arrivals and service times multiplies the delay at the same utilisation.',
        ],
        followUps: ['What utilisation would you target, then?'],
      },
      {
        q: 'How much headroom would you keep?',
        a: [
          'I would target around 60 to 70% at peak. That is not thriftiness lost — it is what keeps latency flat and absorbs bursts, deploys and the loss of an instance.',
          'The exact number depends on variance: with highly variable request costs I would sit lower, and with many parallel servers I could safely run higher, because a burst can be absorbed by whichever server is free.',
          'I would establish it empirically by load testing past the knee rather than trusting the formula for a number — the formula gives the shape, the test gives the value.',
        ],
      },
      {
        q: 'Latency is bad but CPU is at 40%. What is happening?',
        a: [
          'Something is queueing on a resource I am not measuring. The usual candidates are connection pool acquisition, a thread pool, a lock, or waiting on a slow downstream dependency — all of which leave CPU idle while requests wait.',
          'I would instrument wait time directly: pool acquire duration, queue depth and time-in-queue, then compare it against service time to see what fraction of latency is waiting rather than working.',
          'It also means autoscaling on CPU will never react, so the scaling signal needs to be concurrency or queue wait instead.',
        ],
      },
    ],
    references: [
      { label: 'Kingman’s formula and queueing approximations', href: 'https://en.wikipedia.org/wiki/Kingman%27s_formula' },
      { label: 'Brendan Gregg — The USE Method', href: 'https://www.brendangregg.com/usemethod.html' },
    ],
  },
}

export const latencyThroughputTopic: Lesson[] = [
  latencyThroughput,
  latencyPercentiles,
  napkinMath,
  queueing,
]
