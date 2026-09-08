import type { Lesson } from '../types'

/** Topic: Database Replication (group: building-blocks). */

const replication: Lesson = {
  slug: 'database-replication',
  title: 'Primary–Replica Replication',
  summary: 'One leader takes writes; read replicas scale out reads.',
  group: 'building-blocks',
  topic: 'Database Replication',
  tier: 'free',
  minutes: 7,
  concept: 'Concept',
  tags: [
    { label: 'Availability', value: 'High' },
    { label: 'Consistency', value: 'Eventual' },
    { label: 'Read scale', value: 'Horizontal' },
  ],
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
  deepDive: {
    readingMinutes: 9,
    intro: [
      'Replication copies data to more than one machine, and it is doing two quite different jobs at once: **durability and availability** (if a node dies, the data survives and something can take over) and **read scalability** (many machines can answer reads).',
      'The design space is mostly one question — **how much do you wait for the replicas?** — and every answer trades latency for the guarantee that a failover will not lose data.',
    ],
    sections: [
      {
        id: 'sync-async',
        heading: 'Synchronous, asynchronous, and the middle ground',
        blocks: [
          {
            kind: 'table',
            columns: ['Mode', 'Primary waits for', 'Write latency', 'Data loss on failover', 'Availability cost'],
            rows: [
              ['Asynchronous', 'Nothing', 'Lowest', 'Whatever was in flight', 'None'],
              ['Semi-synchronous', 'One replica acknowledgement', '+1 RTT', 'Only if both fail together', 'Blocks if no replica responds'],
              ['Synchronous (all)', 'Every replica', '+slowest RTT', 'None', 'Any replica outage stops writes'],
              ['Quorum (majority)', 'A majority', '+median RTT', 'None if a majority survives', 'Tolerates a minority failing'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'Fully synchronous replication to every replica is almost never used, and the reason is worth internalising: it makes your availability the **product** of every node\'s availability. Three nodes at 99.9% each give 99.7% if all must acknowledge — you made the system *less* available by adding redundancy.',
              'Semi-synchronous — wait for one replica, replicate to the rest asynchronously — is the common compromise, and quorum systems generalise it: wait for a majority, and any minority can fail without stopping writes.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Local commit (fsync)', value: '~1–5 ms' },
              { label: 'Same-AZ replica ack', value: '+0.5 ms' },
              { label: 'Cross-AZ replica ack', value: '+1–2 ms' },
              { label: 'Cross-region replica ack', value: '+70–150 ms' },
              { label: 'Async write latency', value: '~5 ms' },
              { label: 'Sync cross-region write latency', value: '~150 ms', note: '30× worse' },
            ],
            result: 'Synchronous cross-region replication is a product decision, not a database setting.',
          },
        ],
      },
      {
        id: 'topology',
        heading: 'Who is allowed to write',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Single-primary is the default because it makes conflicts impossible: one node decides the order of all writes, so there is never a question of which of two concurrent updates wins. Everything else is a trade of that simplicity for write availability or locality.',
            ],
          },
          {
            kind: 'table',
            columns: ['Topology', 'Write conflicts', 'Good for', 'Cost'],
            rows: [
              ['Single primary', 'Impossible', 'Almost everything', 'Writes limited to one node; failover needed'],
              ['Multi-primary', 'Possible, must be resolved', 'Multi-region write locality', 'Conflict resolution is a permanent tax'],
              ['Leaderless (Dynamo-style)', 'Possible, resolved on read', 'High availability, tunable consistency', 'Read repair, vector clocks, complexity'],
              ['Chain replication', 'Impossible', 'Strong consistency with good read throughput', 'Latency proportional to chain length'],
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Multi-primary means writing a conflict resolution policy',
            body: [
              'Two regions updating the same row concurrently is not a rare edge case — it is the normal case for any actively-used record. "Last write wins" silently discards data and depends on clock synchronisation you do not have. Unless the data model is genuinely commutative (counters, sets, CRDTs), single-primary with regional read replicas is usually the better answer.',
            ],
          },
        ],
      },
      {
        id: 'mechanics',
        heading: 'What is actually shipped',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Statement-based** — send the SQL. Compact, but non-deterministic functions (`NOW()`, `RANDOM()`, auto-increment races) diverge the replicas. Largely abandoned for this reason.',
              '**Write-ahead log / physical** — ship the byte-level changes. Exact and efficient, but couples replicas to the same storage engine and version, so upgrades are lock-step.',
              '**Logical (row-based)** — ship the logical row changes. Decoupled from storage format, so it supports cross-version replication and feeds change-data-capture pipelines.',
              '**Trigger-based** — application-level; flexible and slow. Used when nothing else can express the requirement.',
            ],
          },
          {
            kind: 'prose',
            body: [
              'Logical replication matters beyond database-to-database copying: it is the same stream that drives **CDC**, which is how cache invalidation, search indexing and event pipelines stay consistent with the database without dual writes.',
            ],
          },
        ],
      },
      {
        id: 'reads',
        heading: 'Reading from replicas without lying to users',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Read replicas are the cheapest way to scale reads, and they introduce the one problem that will generate user reports: a user writes, immediately reads, is routed to a replica that has not caught up, and sees their change vanish.',
            ],
          },
          {
            kind: 'list',
            ordered: true,
            items: [
              '**Read-your-writes routing.** After a write, pin that user to the primary for a short window — a few seconds covers typical lag.',
              '**Monotonic reads.** Pin a user to one replica for their session so they never move backwards in time by hopping between replicas.',
              '**Write-timestamp tokens.** The write returns a log position; reads pass it and the replica waits until it has applied at least that position. Precise, but requires client cooperation.',
              '**Route by criticality.** Balances, permissions and anything transactional read from the primary; feeds, search and analytics read from replicas.',
              '**Cap acceptable lag.** Remove replicas from the pool when lag exceeds a threshold, so a lagging node stops serving stale data entirely.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Name the consistency model you are choosing',
            body: [
              'Saying "we\'ll use read replicas" without addressing read-your-writes is the most common gap in database answers. Saying "replicas give eventual consistency, so I route reads for the writing user to the primary for five seconds and everything else to replicas" shows you have shipped this.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Do not use replicas to scale writes — every replica applies every write, so write capacity does not increase.',
      'Do not use synchronous replication to all nodes; availability becomes the product of every node\'s availability.',
      'Do not read from replicas for transactional invariants — balances, stock counts, permission checks.',
      'Do not adopt multi-primary for write locality unless the data model tolerates conflicts or is genuinely commutative.',
    ],
    failureModes: [
      {
        name: 'Split brain',
        symptom: 'Two nodes both accept writes; data diverges irreconcilably.',
        cause: 'A network partition where the old primary never learned it was demoted.',
        fix: 'Quorum-based election, fencing tokens, and STONITH so a demoted primary cannot accept writes.',
      },
      {
        name: 'Replica falls permanently behind',
        symptom: 'Lag grows monotonically and never recovers.',
        cause: 'Single-threaded apply unable to keep up with a parallel write workload, or long-running queries blocking replay.',
        fix: 'Parallel apply, faster replica hardware, and killing long queries that block replication.',
      },
      {
        name: 'Stale read after write',
        symptom: 'Users report their own changes disappearing on refresh.',
        cause: 'Reads routed to a replica that has not applied the write yet.',
        fix: 'Route the writer to the primary briefly, or use write-position tokens on reads.',
      },
      {
        name: 'Data loss on async failover',
        symptom: 'Committed transactions missing after promotion.',
        cause: 'Asynchronous replication meant the new primary never received the final writes.',
        fix: 'Semi-synchronous replication for the acknowledged path, and accept a documented RPO otherwise.',
      },
    ],
    interview: [
      {
        q: 'Synchronous or asynchronous replication?',
        a: [
          'Asynchronous by default, because it keeps write latency at local commit speed and a slow or failed replica cannot block writes. The cost is a data-loss window on failover, bounded by replication lag.',
          'Where losing acknowledged writes is unacceptable, I would use semi-synchronous — wait for one replica before acknowledging — which bounds loss to a simultaneous double failure while adding only a round trip.',
          'I would avoid waiting for all replicas, since that makes availability the product of every node\'s availability and turns redundancy into a liability.',
        ],
        followUps: ['What does that imply for a cross-region setup?'],
      },
      {
        q: 'Users say their edits disappear after saving. What is happening?',
        a: [
          'Almost certainly read-your-writes violation: the write went to the primary, the subsequent read was load-balanced to a replica that had not applied it yet, and the user saw the old value.',
          'The direct fix is to route reads to the primary for a short window after a write by that user — a few seconds usually covers normal lag. A more precise version is to return the write\'s log position and have the replica wait until it has applied at least that far.',
          'I would also pin a session to one replica for monotonic reads, so users cannot bounce between replicas and see time move backwards.',
        ],
      },
      {
        q: 'What is split brain and how do you prevent it?',
        a: [
          'Two nodes both believing they are primary during a network partition, each accepting writes. The data diverges and reconciling it afterwards usually means losing some of it, because there is no correct merge.',
          'Prevention is quorum: only a node that can reach a majority may be promoted, so a minority partition cannot elect its own primary. Add fencing — a monotonically increasing token that storage or the proxy checks — so a demoted primary that comes back cannot write with stale authority.',
        ],
      },
    ],
    references: [
      { label: 'Designing Data-Intensive Applications — Ch. 5, Replication', href: 'https://dataintensive.net/' },
      { label: 'PostgreSQL — Streaming replication and synchronous commit', href: 'https://www.postgresql.org/docs/current/warm-standby.html' },
    ],
  },
}

const replicationLag: Lesson = {
  slug: 'database-replication-lag',
  title: 'Replication Lag & Stale Reads',
  summary: 'Replicas take time to catch up — reading stale data is a real risk.',
  group: 'building-blocks',
  topic: 'Database Replication',
  tier: 'free',
  minutes: 7,
  concept: 'Concept',
  tags: [
    { label: 'Consistency', value: 'Eventual' },
    { label: 'Lag', value: 'Typically < 1s' },
    { label: 'Risk', value: 'Read-after-write' },
  ],
  notes: [
    'Replication is asynchronous by default — the leader commits, then ships the change to replicas.',
    'During the lag window (ms to seconds), reads from a replica return stale data.',
    'Fix: "read-your-writes" consistency — route reads to the leader right after a write.',
  ],
  scene: {
    code: [
      '# write: always to leader',
      'leader.execute("UPDATE bio = \'new bio\'")',
      '# replication: async, ~50ms later',
      'replica.apply(change)',
      '',
      '# fix: read-your-writes',
      'if recently_wrote: read(leader)',
      'else:              read(replica)',
    ],
    initialState: { 'primary bio': 'old bio', 'replica bio': 'old bio', lag: '0ms', 'reader sees': '—' },
    nodes: [
      { id: 'writer', kind: 'client', label: 'Writer App', x: 10, y: 28 },
      { id: 'reader', kind: 'client', label: 'Reader App', x: 10, y: 72 },
      { id: 'primary', kind: 'database', label: 'Primary DB', x: 50, y: 28, badge: 'v5: old bio' },
      { id: 'replica', kind: 'database', label: 'Replica DB', x: 50, y: 72, badge: 'v4: old bio' },
      { id: 'sync', kind: 'queue', label: 'Repl. Queue', x: 80, y: 50, badge: 'async' },
    ],
    edges: [
      { id: 'w-p', from: 'writer', to: 'primary' },
      { id: 'p-sync', from: 'primary', to: 'sync', curve: -0.2 },
      { id: 'sync-r', from: 'sync', to: 'replica', curve: -0.2 },
      { id: 'r-reader', from: 'replica', to: 'reader', curve: 0.3 },
      { id: 'reader-r', from: 'reader', to: 'replica' },
    ],
    steps: [
      { id: '1', caption: 'Writer updates the user\'s bio. Write goes directly to the Primary.', travel: 'w-p', token: 'write', codeLine: 2, patches: [{ nodeId: 'primary', badge: 'v6: new bio ✓', highlight: true }], state: { 'primary bio': 'new bio (v6)' } },
      { id: '2', caption: 'Primary commits instantly and queues the change for replication.', travel: 'p-sync', token: 'write', codeLine: 3, patches: [{ nodeId: 'sync', badge: 'pending', highlight: true }], state: { lag: '~50ms pending' } },
      { id: '3', caption: 'Reader immediately queries the Replica for the bio (e.g., page refresh).', travel: 'reader-r', token: 'request', codeLine: 7 },
      { id: '4', caption: 'Replica hasn\'t applied the change yet. Returns OLD bio. Stale read!', travel: 'r-reader', token: 'miss', codeLine: 7, patches: [{ nodeId: 'replica', badge: 'v5: old bio ⚠', highlight: true }], state: { 'reader sees': 'old bio (stale!)', lag: '50ms' } },
      { id: '5', caption: '50ms later, the replica applies the change. It\'s now consistent.', travel: 'sync-r', token: 'write', codeLine: 4, patches: [{ nodeId: 'replica', badge: 'v6: new bio ✓', highlight: true }], state: { 'replica bio': 'new bio (v6)', lag: '0ms' } },
      { id: '6', caption: 'Fix: right after a write, route reads to the Primary (read-your-writes). Route to replicas otherwise.', codeLine: 7, state: { 'reader sees': 'new bio ✓' } },
    ],
  },
  deepDive: {
    readingMinutes: 8,
    intro: [
      'Replication lag is the time between a write committing on the primary and becoming visible on a replica. It is not a bug to be eliminated — it is the **inevitable price of asynchronous replication**, and the entire question is whether your application is written to tolerate it.',
      'Most systems handle lag perfectly well for months, then break spectacularly during an incident when lag goes from 20 milliseconds to 20 minutes and every assumption about "close enough" collapses at once.',
    ],
    sections: [
      {
        id: 'anomalies',
        heading: 'The three anomalies lag produces',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Eventual consistency does not mean "occasionally slightly wrong" — it produces three specific, nameable anomalies, and each has its own fix. Being able to name them is what separates a diagnosis from a shrug.',
            ],
          },
          {
            kind: 'table',
            columns: ['Anomaly', 'What the user sees', 'Fix'],
            rows: [
              ['Read-your-writes violation', 'Their own edit vanishes on refresh', 'Route the writer to the primary briefly, or use a write-position token'],
              ['Monotonic read violation', 'A comment appears, then disappears, then reappears', 'Pin a session to one replica'],
              ['Causal violation', 'A reply is visible before the message it replies to', 'Causal tokens, or keep causally-related writes on one shard'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'The second one is the most confusing to debug because nothing is broken: the user\'s first read hit a fast replica, the second hit a slower one, and time appeared to run backwards. Session affinity to a single replica eliminates it entirely and costs nothing.',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Lag is fine until it correlates with user attention',
            body: [
              'Nobody notices 50 ms of lag on a feed. Everybody notices it on the screen immediately after they pressed Save. The fix is rarely "reduce lag globally" — it is to identify the small number of read paths that follow a write and route those to the primary.',
            ],
          },
        ],
      },
      {
        id: 'causes',
        heading: 'Why lag spikes',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Replica apply is often **less parallel** than primary execution. A primary commits many transactions concurrently across cores; a replica that replays serially can only sustain what one thread can apply — so a write burst that the primary absorbs comfortably makes the replica fall behind and never catch up until the burst ends.',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Bulk writes.** A migration, backfill or bulk import generates far more log than normal traffic; replicas queue it.',
              '**Long-running queries on the replica.** In Postgres, a long read can block replay to avoid removing rows it still needs — so an analytics query causes lag.',
              '**Single-threaded apply.** MySQL historically, and many setups still, replay with limited parallelism.',
              '**Network saturation or cross-region links.** The log physically cannot arrive faster.',
              '**Replica hardware weaker than the primary.** A common cost saving that turns into an availability problem, since the replica must sustain the primary\'s full write rate.',
              '**Lock contention on the replica** between replay and read queries.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Normal write rate', value: '2,000 tx/s' },
              { label: 'Replica apply capacity', value: '3,000 tx/s' },
              { label: 'Migration write burst', value: '8,000 tx/s for 10 min' },
              { label: 'Backlog accumulated', value: '~3 M transactions' },
              { label: 'Catch-up rate after the burst', value: '1,000 tx/s', note: '3000 − 2000' },
              { label: 'Time to recover', value: '~50 min' },
            ],
            result: 'A ten-minute burst can produce an hour of lag — recovery is limited by the surplus, not the capacity.',
          },
        ],
      },
      {
        id: 'measuring',
        heading: 'Measuring lag correctly',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Lag is reported in two ways and they answer different questions. **Byte lag** (log position difference) tells you how much data is outstanding; **time lag** tells you how stale a read is. Only the second is directly comparable to a user-facing requirement.',
              'The trap: on an idle primary, time lag can read as zero simply because nothing new has been written, while the replica is genuinely behind on the last batch. A heartbeat row written to the primary every second, and read back on the replica, gives an unambiguous measurement.',
            ],
          },
          {
            kind: 'code',
            language: 'sql',
            caption: 'A heartbeat gives lag that is meaningful even on an idle primary',
            lines: [
              '-- On the primary, once per second:',
              'UPDATE replication_heartbeat SET beat_at = now() WHERE id = 1;',
              '',
              '-- On each replica:',
              'SELECT now() - beat_at AS lag FROM replication_heartbeat WHERE id = 1;',
              '',
              '-- Postgres native equivalents:',
              'SELECT now() - pg_last_xact_replay_timestamp() AS time_lag;   -- 0 when idle',
              'SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)     -- byte lag',
              '  FROM pg_stat_replication;',
            ],
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Eject lagging replicas from the read pool',
            body: [
              'A replica lagging by ten minutes should not be serving reads at all. Health checks that only verify the process is alive will happily route traffic to it. Make lag part of readiness: past a threshold, the replica reports unready and the balancer stops sending it traffic — reduced capacity is far better than confidently wrong answers.',
            ],
          },
        ],
      },
      {
        id: 'design',
        heading: 'Designing so lag is survivable',
        blocks: [
          {
            kind: 'list',
            ordered: true,
            items: [
              '**Classify every read path.** Which reads must be current, which tolerate seconds, which tolerate minutes? Most applications have very few in the first category, and finding them is the whole exercise.',
              '**Route by that classification**, not by convenience — primary for transactional reads, replicas for everything else.',
              '**Pin after write.** A short primary-affinity window keyed by user covers the read-your-writes case cheaply.',
              '**Make lag visible in the product** where it is unavoidable: "updated a moment ago" is better than silently showing stale data as current.',
              '**Throttle bulk writes.** Migrations and backfills should be rate-limited to leave replica apply headroom — this single practice prevents most lag incidents.',
              '**Test with induced lag.** Artificially delay a replica in staging; most read-your-writes bugs surface immediately and never reach production.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Do not serve reads from replicas for balances, inventory, permissions, or anything a transaction depends on.',
      'Do not treat lag as constant — design for the spike, not the median.',
      'Do not run migrations at full speed against a system whose replicas serve production reads.',
      'Do not rely on replicas at all where the requirement is genuinely strong consistency; use the primary or a consensus store.',
    ],
    failureModes: [
      {
        name: 'Stale reads after write',
        symptom: 'Users report saved changes not appearing.',
        cause: 'Post-write reads routed to a replica behind the write.',
        fix: 'Primary affinity for a few seconds after a write, or wait-for-position tokens on reads.',
      },
      {
        name: 'Time travelling UI',
        symptom: 'Content appears, disappears, then reappears across refreshes.',
        cause: 'Successive reads hitting replicas with different lag.',
        fix: 'Session affinity to a single replica for monotonic reads.',
      },
      {
        name: 'Migration-induced lag spike',
        symptom: 'Lag jumps from milliseconds to minutes during a deploy.',
        cause: 'A bulk backfill generating log faster than replicas can apply.',
        fix: 'Batch and throttle the migration; monitor lag as part of its progress and pause when it exceeds a threshold.',
      },
      {
        name: 'Lagging replica still serving traffic',
        symptom: 'A subset of users consistently see very old data.',
        cause: 'Health checks verify liveness but not replication position.',
        fix: 'Include lag in the readiness check and eject replicas past a threshold.',
      },
    ],
    interview: [
      {
        q: 'How do you handle read-your-writes with read replicas?',
        a: [
          'By routing reads that follow a write, for that user, to the primary for a short window — typically a few seconds, sized from observed p99 lag. It is simple, requires no client changes, and covers the case users actually notice.',
          'A more precise option is to return the write\'s log position to the client and have it send that with subsequent reads, so the replica either waits until it has applied that position or forwards to the primary. That costs client cooperation but avoids sending all post-write traffic to the primary.',
        ],
        followUps: ['What if the user opens the page on a second device?'],
      },
      {
        q: 'Replication lag suddenly jumps to 20 minutes. What do you do?',
        a: [
          'First, stop serving stale reads: make lag part of the replica\'s readiness check so it is removed from the pool. Reduced read capacity is much better than confidently wrong answers.',
          'Then find the cause — the usual candidates are a bulk write or migration generating more log than replicas can apply, a long-running query on the replica blocking replay, or single-threaded apply unable to keep up with parallel primary writes.',
          'Recovery is limited by the surplus apply capacity, not total capacity, so I would also throttle the write source; otherwise catch-up can take far longer than the burst that caused it.',
        ],
      },
      {
        q: 'How would you measure replication lag reliably?',
        a: [
          'With a heartbeat: the primary updates a timestamp row every second, and each replica reports the difference between now and the value it can see. That gives a meaningful number even when the primary is idle, which native time-lag metrics do not — they read zero simply because nothing new was written.',
          'I would track both time lag, which is what maps to user experience, and byte lag, which shows how much data is outstanding and how fast the gap is closing.',
        ],
      },
    ],
    references: [
      { label: 'Designing Data-Intensive Applications — Problems with Replication Lag', href: 'https://dataintensive.net/' },
      { label: 'Postgres — Monitoring streaming replication', href: 'https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-VIEW' },
    ],
  },
}

// ── 3. Failover & split brain ────────────────────────────────────────────────

const failover: Lesson = {
  slug: 'replication-failover',
  title: 'Failover, Split Brain & Fencing',
  summary: 'Promoting a replica is easy — stopping the old primary from writing is the hard part.',
  group: 'building-blocks',
  topic: 'Database Replication',
  tier: 'pro',
  minutes: 8,
  concept: 'Resilience',
  tags: [
    { label: 'Detect', value: 'Quorum, not one node' },
    { label: 'Prevent', value: 'Fencing tokens' },
    { label: 'Measure', value: 'RPO and RTO' },
  ],
  notes: [
    'A partitioned primary does not know it has been demoted — it keeps accepting writes until something stops it.',
    'Fencing gives every promotion a higher epoch, so storage rejects writes from the old one.',
    'Failing over on a single node\'s opinion causes more outages than the failures it responds to.',
  ],
  scene: {
    code: [
      '# a witness cannot promote alone',
      'if not majority_agrees(primary_down):',
      '    wait()                       # do nothing',
      '',
      'epoch += 1                       # fence the old primary',
      'promote(replica, epoch)',
      'storage.reject_writes(epoch < current)',
    ],
    initialState: { primary: 'n1', epoch: 7, writers: 1, 'data loss': 'none' },
    nodes: [
      { id: 'app', kind: 'client', label: 'App fleet', x: 10, y: 50 },
      { id: 'n1', kind: 'database', label: 'n1', x: 40, y: 22, badge: 'PRIMARY e7' },
      { id: 'n2', kind: 'database', label: 'n2', x: 40, y: 78, badge: 'replica' },
      { id: 'n3', kind: 'database', label: 'n3', x: 70, y: 78, badge: 'replica' },
      { id: 'store', kind: 'cache', label: 'Shared storage', x: 92, y: 40, badge: 'accepts e7' },
    ],
    edges: [
      { id: 'a-n1', from: 'app', to: 'n1', curve: -0.25 },
      { id: 'a-n2', from: 'app', to: 'n2', curve: 0.25 },
      { id: 'n1-n2', from: 'n1', to: 'n2' },
      { id: 'n1-store', from: 'n1', to: 'store', curve: -0.2 },
      { id: 'n2-store', from: 'n2', to: 'store', curve: 0.2 },
    ],
    steps: [
      { id: '1', caption: 'n1 is primary at epoch 7. Writes flow to it and replicate to n2 and n3.', travel: 'a-n1', token: 'write', patches: [{ nodeId: 'n1', badge: 'PRIMARY e7', highlight: true }], state: { primary: 'n1', epoch: 7, writers: 1 } },
      { id: '2', caption: 'A network partition isolates n1. It is healthy — it just cannot be reached.', patches: [{ nodeId: 'n1', badge: 'isolated ⚠', highlight: true }], state: { writers: 1 } },
      { id: '3', caption: 'n1 does not know it is isolated, so it keeps accepting writes from clients on its side.', travel: 'a-n1', token: 'write', patches: [{ nodeId: 'n1', badge: 'still writing ✗', highlight: true }] },
      { id: '4', caption: 'The majority side agrees n1 is unreachable — a decision no single node may make alone.', codeLine: 2, patches: [{ nodeId: 'n2', badge: 'voting', highlight: true }, { nodeId: 'n3', badge: 'voting' }] },
      { id: '5', caption: 'n2 is promoted at epoch 8. Now two nodes believe they are primary — split brain.', codeLine: 6, patches: [{ nodeId: 'n2', badge: 'PRIMARY e8', highlight: true }], state: { primary: 'n2', epoch: 8, writers: 2, 'data loss': 'diverging ✗' } },
      { id: '6', caption: 'Fencing saves it: storage now accepts only epoch 8, so n1\'s writes are rejected.', travel: 'n1-store', token: 'miss', codeLine: 7, patches: [{ nodeId: 'store', badge: 'accepts e8 only', highlight: true }, { nodeId: 'n1', badge: 'writes rejected' }], state: { writers: 1 } },
      { id: '7', caption: 'n1 rejoins as a replica and rewinds its unreplicated tail. One writer, bounded loss.', travel: 'n1-n2', token: 'hit', patches: [{ nodeId: 'n1', badge: 'replica e8 ✓', highlight: true }], state: { primary: 'n2', writers: 1, 'data loss': 'RPO bounded' } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'Replication gives you a copy of the data. **Failover** is the process of deciding that the primary is gone and making one of those copies authoritative — and it is where most database availability incidents actually originate, more often than the hardware failures it exists to handle.',
      'Two questions decide whether it works: **who is allowed to declare the primary dead**, and **what stops the old primary from continuing to write?** Get either wrong and failover produces a worse outcome than the failure would have.',
    ],
    sections: [
      {
        id: 'detection',
        heading: 'Detection: the hardest part is being sure',
        blocks: [
          {
            kind: 'prose',
            body: [
              'You cannot distinguish a dead node from a slow one, or from a healthy one behind a broken network link. Every failure detector is therefore a **timeout with a guess attached**, and the guess trades false positives against detection time.',
              'Fail over too eagerly and a two-second GC pause triggers an unnecessary promotion, with all its cost — dropped connections, lost in-flight transactions, cache invalidation. Fail over too slowly and you extend a real outage.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Health check interval', value: '1 s' },
              { label: 'Failures before declaring down', value: '3' },
              { label: 'Detection time', value: '~3 s' },
              { label: 'Election + promotion', value: '~2 s' },
              { label: 'Client reconnect / DNS or proxy update', value: '~5–30 s' },
              { label: 'Total RTO', value: '~10–35 s' },
              { label: 'Longest normal GC pause observed', value: '2.5 s', note: 'must stay under detection' },
            ],
            result: 'Detection must exceed your worst legitimate pause, or you will fail over healthy primaries.',
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Never let one observer trigger a failover',
            body: [
              'A single monitoring node that cannot reach the primary has learned one thing: *it* cannot reach the primary. That may be its own network. Promotion must require agreement from a majority of observers, which is why an odd number of voting members — often including a lightweight witness that stores no data — is standard.',
            ],
          },
        ],
      },
      {
        id: 'split-brain',
        heading: 'Split brain, and why fencing is mandatory',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The dangerous case is not a crashed primary — a crashed node writes nothing. It is a **partitioned** primary: fully healthy, still accepting writes from clients on its side of the partition, entirely unaware that a new primary now exists.',
              'You now have two nodes accepting writes to what is supposed to be one dataset. When the partition heals, the histories have diverged and there is no correct merge — reconciliation means choosing which customers\' writes to discard.',
            ],
          },
          {
            kind: 'list',
            ordered: true,
            items: [
              '**Quorum for promotion.** Only a node that can reach a majority may be promoted, so a minority partition cannot elect its own primary.',
              '**Epoch (fencing) tokens.** Each promotion increments a monotonic number. Every write carries it, and the **storage layer or proxy rejects any write with an older epoch** — so the old primary is neutralised even if it never learns it was demoted.',
              '**Self-demotion on quorum loss.** A primary that cannot reach a majority should stop accepting writes on its own, without waiting to be told.',
              '**STONITH as the backstop.** "Shoot The Other Node In The Head" — power off or network-isolate the old primary before promoting. Crude, and the only thing that works when the storage layer cannot enforce fencing.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'fencing.py — the check that makes promotion safe',
            lines: [
              '# Every write carries the epoch of the primary that issued it.',
              'def storage_write(key, value, epoch):',
              '    current = storage.get_current_epoch()',
              '    if epoch < current:',
              '        # An old primary that never learned it was demoted.',
              '        raise FencedOut(f"epoch {epoch} < {current}")',
              '    storage.apply(key, value)',
              '',
              '# Promotion is what advances the epoch.',
              'def promote(candidate):',
              '    if not reachable_majority():',
              '        raise NoQuorum("refusing to promote from a minority")',
              '    new_epoch = storage.increment_epoch()      # atomic',
              '    candidate.become_primary(new_epoch)',
              '',
              '# And a primary polices itself.',
              'def primary_loop():',
              '    while True:',
              '        if not reachable_majority():',
              '            step_down()        # stop accepting writes immediately',
              '        sleep(0.5)',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Fencing works even when nothing is reachable',
            body: [
              'The elegance of an epoch token is that it needs no communication with the old primary. The *resource* enforces it: storage, or a proxy, simply refuses stale epochs. That is why fencing succeeds precisely in the situation — a partition — where telling the old primary anything is impossible by definition.',
            ],
          },
        ],
      },
      {
        id: 'rpo-rto',
        heading: 'RPO and RTO: naming what you are willing to lose',
        blocks: [
          {
            kind: 'prose',
            body: [
              '**RPO** (recovery point objective) is how much data you accept losing. **RTO** (recovery time objective) is how long you accept being down. Both are business decisions with direct architectural consequences, and stating them turns a vague "highly available" requirement into something you can design and test against.',
            ],
          },
          {
            kind: 'table',
            columns: ['Setup', 'RPO', 'RTO', 'Cost'],
            rows: [
              ['Async replica, manual failover', 'Seconds of writes', '10–60 min', 'Lowest'],
              ['Async replica, automated failover', 'Seconds of writes', '30 s – 2 min', 'Low'],
              ['Semi-sync replica, automated', 'Near zero', '30 s – 2 min', 'Moderate — one RTT per write'],
              ['Quorum (3+ nodes)', 'Zero for committed writes', '5–30 s', 'Higher — coordination per write'],
              ['Multi-region sync', 'Zero', '< 1 min', 'Highest — 100 ms+ per write'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'The asymmetry worth internalising: **RTO is mostly an automation problem, RPO is mostly a physics problem.** You can shrink recovery time by scripting and rehearsing, but you cannot shrink data loss below what your replication mode allows without paying latency on every write, forever.',
            ],
          },
        ],
      },
      {
        id: 'clients',
        heading: 'The client side, which people forget',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Promoting a replica in ten seconds means nothing if applications take five minutes to notice. In practice the client-side reconnection story dominates real RTO more often than the database-side election does.',
            ],
          },
          {
            kind: 'list',
            items: [
              '**DNS failover is slow and unreliable.** Resolvers and JVMs cache well beyond the TTL you set. Prefer a proxy (ProxySQL, PgBouncer, HAProxy) or a driver that supports multiple endpoints and discovers the primary.',
              '**Connection pools hold stale connections.** Set a max lifetime, validate on borrow, and discard the whole pool on a failover error rather than retrying each connection into the void.',
              '**Expect a write outage window regardless.** Applications must handle write failures gracefully — queue, retry with backoff, or degrade to read-only — because there is always a gap.',
              '**Cached reads mask the problem, then surprise you.** Reads may keep succeeding from replicas and caches while writes fail, so a partial outage can look healthy on the dashboards that matter most.',
              '**Rehearse it.** A failover path that has never been exercised in production is a hypothesis, not a capability.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'The two questions that show you have done this',
            body: [
              '"Who decides the primary is dead, and what stops the old one from writing?" Answering with quorum-based detection and fencing tokens — rather than "we promote the replica" — is the difference between describing failover and understanding it.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Automated failover with aggressive detection on a database prone to long pauses — you will cause more outages than you prevent.',
      'Any automated promotion without fencing; you are choosing split brain over downtime.',
      'Synchronous cross-region replication for latency-sensitive writes just to reduce RPO — measure what that costs every write.',
      'Relying on DNS for failover when a proxy or multi-endpoint driver is available.',
    ],
    failureModes: [
      {
        name: 'Split brain',
        symptom: 'Two primaries accept writes; data diverges and cannot be merged.',
        cause: 'Promotion without quorum, or without fencing the previous primary.',
        fix: 'Majority-based promotion, monotonic epoch tokens enforced at storage, and self-demotion on quorum loss.',
      },
      {
        name: 'Flapping failover',
        symptom: 'The cluster promotes repeatedly, each time causing an outage.',
        cause: 'Detection thresholds tighter than normal GC or I/O pauses.',
        fix: 'Raise detection time above the worst legitimate pause; require multiple observers to agree.',
      },
      {
        name: 'Clients never reconnect',
        symptom: 'The database recovered in 15 seconds; the application was down for 10 minutes.',
        cause: 'Cached DNS and pooled connections pointing at the old primary.',
        fix: 'Route through a proxy or multi-endpoint driver; set connection max lifetime and drop pools on failover errors.',
      },
      {
        name: 'Lost committed writes',
        symptom: 'Transactions acknowledged to users are missing after promotion.',
        cause: 'Asynchronous replication meant the new primary never received the tail.',
        fix: 'Semi-synchronous replication for acknowledged writes; document and accept the RPO otherwise.',
      },
    ],
    interview: [
      {
        q: 'Walk me through a database failover.',
        a: [
          'Detection first, and it must be a quorum decision — a single monitor that cannot reach the primary has only learned that it cannot reach the primary, which may be its own network. So a majority of observers must agree before anything is promoted.',
          'Then promotion: choose the replica with the most complete log, increment a monotonic epoch, and make it primary. The epoch is essential because the old primary may be partitioned rather than dead and will keep accepting writes.',
          'Finally the client side, which usually dominates real recovery time: connections must be routed through a proxy or multi-endpoint driver rather than DNS, and pools must be discarded rather than retried into the void.',
        ],
        followUps: ['What stops the old primary from writing during that window?'],
      },
      {
        q: 'What is fencing and why is it necessary?',
        a: [
          'Fencing gives each promotion a monotonically increasing epoch that every write carries, and the storage layer or proxy rejects any write with an older epoch.',
          'It is necessary because the dangerous failure is a partitioned primary rather than a crashed one — it is fully healthy, still serving writes on its side, and cannot be told it has been demoted precisely because it is unreachable.',
          'The elegance is that fencing requires no communication with it: the resource itself enforces the rule, which works exactly in the situation where communication is impossible. STONITH is the cruder backstop when storage cannot enforce it.',
        ],
      },
      {
        q: 'What RPO and RTO would you target?',
        a: [
          'That depends on what the data is worth, and I would push for explicit numbers rather than "highly available". For a payments ledger, RPO zero for acknowledged writes, which means semi-synchronous or quorum replication and accepting a round trip on every write.',
          'For a content system, seconds of RPO from asynchronous replication is usually fine and far cheaper.',
          'RTO is mostly an automation and rehearsal problem — you can drive it down with scripting and practice. RPO is closer to physics: you cannot reduce it below what your replication mode allows without paying latency on every write forever.',
        ],
      },
    ],
    references: [
      { label: 'Kleppmann — How to do distributed locking (fencing tokens)', href: 'https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html' },
      { label: 'Patroni — PostgreSQL HA, leader election and fencing', href: 'https://patroni.readthedocs.io/en/latest/' },
    ],
  },
}

// ── 4. Change data capture ───────────────────────────────────────────────────

const cdc: Lesson = {
  slug: 'replication-cdc',
  title: 'Change Data Capture',
  summary: 'The replication log is an event stream — read it instead of writing events twice.',
  group: 'building-blocks',
  topic: 'Database Replication',
  tier: 'pro',
  minutes: 8,
  concept: 'Pattern',
  tags: [
    { label: 'Source', value: 'WAL / binlog' },
    { label: 'Solves', value: 'Dual-write drift' },
    { label: 'Catches', value: 'Every writer' },
  ],
  notes: [
    'Writing to the database and then publishing an event is two operations — a crash between them loses the event forever.',
    'CDC reads the database\'s own replication log, so the event cannot exist without the committed row.',
    'It also catches writes your application never made: migrations, batch jobs, manual SQL.',
  ],
  scene: {
    code: [
      '# dual write — broken',
      'db.insert(order)',
      'kafka.publish(event)     # crash here = lost forever',
      '',
      '# CDC — the log IS the event',
      'for change in wal.stream(slot="cdc"):',
      '    kafka.publish(topic(change.table), change)',
      '    wal.ack(change.lsn)',
    ],
    initialState: { mode: 'dual write', 'events lost': 0, 'search index': 'in sync', drift: 'none' },
    nodes: [
      { id: 'app', kind: 'client', label: 'Orders svc', x: 10, y: 50 },
      { id: 'db', kind: 'database', label: 'Postgres', x: 38, y: 50, badge: 'WAL' },
      { id: 'connector', kind: 'queue', label: 'CDC connector', x: 64, y: 50, badge: 'idle' },
      { id: 'search', kind: 'server', label: 'Search index', x: 90, y: 24, badge: 'in sync' },
      { id: 'cache', kind: 'cache', label: 'Cache', x: 90, y: 76, badge: 'in sync' },
    ],
    edges: [
      { id: 'a-db', from: 'app', to: 'db' },
      { id: 'a-search', from: 'app', to: 'search', curve: -0.4 },
      { id: 'db-conn', from: 'db', to: 'connector' },
      { id: 'conn-search', from: 'connector', to: 'search', curve: -0.25 },
      { id: 'conn-cache', from: 'connector', to: 'cache', curve: 0.25 },
    ],
    steps: [
      { id: '1', caption: 'Dual write: the service commits the order, then publishes an event to update search.', travel: 'a-db', token: 'write', codeLine: 2, patches: [{ nodeId: 'db', badge: 'order committed', highlight: true }], state: { mode: 'dual write' } },
      { id: '2', caption: 'The process dies between the two. The row exists; the event never happened.', travel: 'a-search', token: 'miss', codeLine: 3, patches: [{ nodeId: 'search', badge: 'missing order ✗', highlight: true }], state: { 'events lost': 1, 'search index': 'drifted', drift: 'permanent' } },
      { id: '3', caption: 'Nothing detects it. Search is silently wrong until someone complains months later.', patches: [{ nodeId: 'search', badge: 'silently stale', highlight: true }] },
      { id: '4', caption: 'CDC instead: the connector tails the write-ahead log the database already writes.', travel: 'db-conn', token: 'write', codeLine: 7, patches: [{ nodeId: 'connector', badge: 'reading WAL', highlight: true }], state: { mode: 'CDC', drift: 'none' } },
      { id: '5', caption: 'The event cannot exist without the commit — they are the same durable record.', travel: 'conn-search', token: 'write', codeLine: 8, patches: [{ nodeId: 'search', badge: 'in sync ✓', highlight: true }], state: { 'events lost': 0, 'search index': 'in sync' } },
      { id: '6', caption: 'A DBA runs manual SQL. No application code involved — CDC still captures it.', travel: 'db-conn', token: 'write', patches: [{ nodeId: 'db', badge: 'manual UPDATE', highlight: true }, { nodeId: 'cache', badge: 'invalidated ✓' }] },
      { id: '7', caption: 'The connector crashes, restarts from its stored LSN, and replays. At-least-once, never lost.', travel: 'conn-cache', token: 'hit', codeLine: 9, patches: [{ nodeId: 'connector', badge: 'resumed at LSN', highlight: true }], state: { drift: 'none', 'events lost': 0 } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'Every system eventually needs the same data in more than one place: a search index, a cache, an analytics warehouse, another service. The obvious approach — write to the database, then publish an event — is the **dual-write problem**, and it is broken in a way that produces silent, permanent drift.',
      'Change data capture solves it by reading the log the database already maintains for its own replication. The event stops being something you *also* do and becomes a **view of what the database durably committed**.',
    ],
    sections: [
      {
        id: 'dual-write',
        heading: 'Why dual writes are unfixable',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Committing a row and publishing an event are two operations against two systems with no shared transaction. Whatever order you choose, a crash in between leaves them inconsistent — and no amount of retry logic closes the gap, because the process that would retry is the one that died.',
            ],
          },
          {
            kind: 'table',
            columns: ['Order', 'Crash in between leaves', 'Detectable?'],
            rows: [
              ['DB then publish', 'Row exists, no event — downstream permanently missing it', 'No — nothing knows the event was owed'],
              ['Publish then DB', 'Event exists, no row — downstream has a phantom record', 'Only if consumers validate against the source'],
              ['Both in a "transaction"', 'Not possible — different systems', 'n/a'],
              ['DB + outbox row, then relay', 'Both or neither', 'Yes — outbox rows visibly unprocessed'],
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'The failure is silent, which is what makes it expensive',
            body: [
              'A lost event produces no error, no alert and no retry — just a search index that is quietly missing some records. Teams typically discover it months later through a customer report, and by then the drift is large enough that reconciliation is a project rather than a fix.',
            ],
          },
        ],
      },
      {
        id: 'how',
        heading: 'Reading the log the database already writes',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Every durable database maintains a write-ahead log — Postgres WAL, MySQL binlog, MongoDB oplog — because that is how it survives crashes and feeds its own replicas. CDC simply attaches to that stream as if it were another replica.',
              'The consequence is the important part: **an event cannot exist unless the transaction committed, and cannot be missing if it did.** Atomicity is inherited from the database rather than reimplemented.',
            ],
          },
          {
            kind: 'code',
            language: 'sql',
            caption: 'Postgres logical replication — the mechanics',
            lines: [
              '-- Log the data needed to reconstruct a full row, not just changed columns.',
              'ALTER TABLE orders REPLICA IDENTITY FULL;',
              '',
              '-- A publication declares what to stream.',
              'CREATE PUBLICATION cdc_pub FOR TABLE orders, payments;',
              '',
              '-- A slot tracks how far the consumer has read, and pins WAL until then.',
              "SELECT pg_create_logical_replication_slot('cdc_slot', 'pgoutput');",
              '',
              '-- Watch this. An inactive slot retains WAL forever and fills the disk.',
              'SELECT slot_name, active,',
              '       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained',
              '  FROM pg_replication_slots;',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Ordered per table and per row.** Changes arrive in commit order, so a consumer sees create-then-update, never the reverse.',
              '**Before and after images.** With full replica identity you get the previous row too, which makes diffing and targeted cache invalidation possible.',
              '**Transaction boundaries are preserved.** Changes from one transaction arrive grouped, so a consumer can apply them atomically.',
              '**No application involvement.** Migrations, batch jobs, admin SQL and other services all flow through — this is the capability application-level events fundamentally cannot match.',
              '**At-least-once.** The connector may crash after publishing and before storing its position, so consumers must be idempotent.',
            ],
          },
        ],
      },
      {
        id: 'outbox',
        heading: 'CDC or outbox — and why the outbox often wins',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The **transactional outbox** achieves the same atomicity differently: the application inserts an event row into an `outbox` table inside the same transaction as the business write, and a relay publishes from that table. Both commit or neither does.',
              'The distinction that matters is **who defines the event**. CDC emits row changes — your database schema becomes the public contract, so renaming a column breaks consumers. The outbox emits events you designed, so the schema stays private and the event is a deliberate domain concept like `OrderPlaced` rather than a diff of the `orders` table.',
            ],
          },
          {
            kind: 'table',
            columns: ['', 'CDC', 'Transactional outbox'],
            rows: [
              ['Event shape', 'Row diff — schema is the contract', 'Whatever you choose to emit'],
              ['Captures non-app writes', 'Yes — migrations, manual SQL', 'No'],
              ['Application changes needed', 'None', 'Write to the outbox table'],
              ['Schema coupling', 'High — a rename breaks consumers', 'Low — decoupled by design'],
              ['Extra write load', 'None', 'One row per event'],
              ['Operational surface', 'Connector, slots, WAL retention', 'A relay process and a table to prune'],
              ['Best for', 'Search indexing, caches, warehouse sync', 'Domain events between services'],
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'A common hybrid: outbox table read by CDC',
            body: [
              'Write your designed event into an outbox table, then use CDC to stream that table. You get the outbox\'s clean domain contract plus CDC\'s reliable delivery without writing a polling relay — and the relay is no longer a component you have to keep alive.',
            ],
          },
        ],
      },
      {
        id: 'operating',
        heading: 'What CDC costs you operationally',
        blocks: [
          {
            kind: 'prose',
            body: [
              'CDC is reliable and it is not free. The most common production incident is not data loss but a **full disk**, caused by the mechanism that makes it reliable in the first place.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'WAL generated per hour', value: '~20 GB' },
              { label: 'Connector down for', value: '6 h' },
              { label: 'WAL retained by the slot', value: '~120 GB' },
              { label: 'Free disk on the primary', value: '100 GB' },
              { label: 'Outcome', value: 'Primary stops accepting writes' },
            ],
            result: 'An inactive replication slot is an outage timer on your primary — alert on slot lag first.',
          },
          {
            kind: 'list',
            items: [
              '**Alert on replication slot lag**, not just connector health. A slot pins WAL from the moment it stops advancing.',
              '**Set `max_slot_wal_keep_size`** so the database drops the slot rather than filling the disk — you lose the stream, which is recoverable, instead of the primary, which is not.',
              '**Plan the initial snapshot.** Bootstrapping means reading the whole table, which can take hours and compete with production traffic. Throttle it.',
              '**Handle schema changes deliberately.** A column rename flows straight through to consumers; use a schema registry with compatibility checks, or emit through an outbox.',
              '**Filter early.** Streaming every table to every consumer wastes bandwidth and leaks internal structure — publish only what is genuinely needed.',
              '**Expect duplicates and reordering across tables.** Ordering holds per row, not globally, so consumers must be idempotent and tolerant.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'The one-line justification',
            body: [
              '"Dual writes cannot be made atomic across two systems, so the event has to derive from the same durable record as the data — either the database log via CDC, or an outbox row in the same transaction." That sentence answers the question and names both solutions.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'When consumers need domain events rather than row diffs — CDC makes your schema a public contract.',
      'For synchronous workflows; CDC is asynchronous with lag measured in the hundreds of milliseconds at best.',
      'On databases where you cannot operate replication slots safely, or cannot monitor WAL retention.',
      'For very high-churn tables whose changes nobody consumes — filter at the publication rather than streaming everything.',
    ],
    failureModes: [
      {
        name: 'Replication slot fills the disk',
        symptom: 'The primary stops accepting writes; disk usage climbed for hours beforehand.',
        cause: 'An inactive slot retaining WAL because the connector stopped consuming.',
        fix: 'Alert on slot lag, cap retention with `max_slot_wal_keep_size`, and treat connector downtime as urgent.',
      },
      {
        name: 'Schema change breaks consumers',
        symptom: 'Deserialisation errors downstream after an unrelated migration.',
        cause: 'CDC exposes the table schema directly; a rename propagates immediately.',
        fix: 'Schema registry with compatibility enforcement, or route domain events through an outbox.',
      },
      {
        name: 'Duplicate application of changes',
        symptom: 'Counters or aggregates drift upward after a connector restart.',
        cause: 'At-least-once delivery replaying events published before the offset was stored.',
        fix: 'Idempotent consumers keyed on primary key plus LSN; prefer upserts over increments.',
      },
      {
        name: 'Snapshot overwhelms the primary',
        symptom: 'Latency degrades badly while a new connector initialises.',
        cause: 'An unthrottled initial table scan competing with production traffic.',
        fix: 'Snapshot from a replica, throttle the scan, and run it during low-traffic windows.',
      },
    ],
    interview: [
      {
        q: 'You write to the database and then publish an event. What is wrong with that?',
        a: [
          'It is two operations against two systems with no shared transaction, so a crash in between leaves them inconsistent — and nothing detects it. If the row commits and the publish fails, downstream is permanently missing that record with no error and no retry.',
          'The fix is to make the event derive from the same durable record as the data. Either change data capture, where a connector reads the database\'s own write-ahead log so the event cannot exist without the commit, or a transactional outbox where the event row is inserted in the same transaction and a relay publishes it.',
        ],
        followUps: ['Which of those two would you choose, and why?'],
      },
      {
        q: 'CDC or outbox?',
        a: [
          'It depends on who should define the event. CDC emits row diffs, which makes your table schema the public contract — a column rename then breaks every consumer. It is excellent for search indexing, cache invalidation and warehouse sync, and it uniquely captures writes the application never made, like migrations and manual SQL.',
          'An outbox lets me emit a designed domain event such as OrderPlaced, keeping the schema private, which is what I want for events crossing service boundaries.',
          'A good hybrid is to write the designed event into an outbox table and use CDC to stream that table — clean contract, reliable delivery, and no polling relay to keep alive.',
        ],
      },
      {
        q: 'What breaks in production with CDC?',
        a: [
          'Most often the disk. A replication slot pins write-ahead log from the moment it stops advancing, so a connector that has been down for a few hours can retain a hundred gigabytes and stop the primary accepting writes entirely.',
          'So I would alert on slot lag rather than just connector liveness, and cap retention so the database drops the slot instead of filling the disk — losing the stream is recoverable, losing the primary is not.',
          'The other two are schema changes propagating straight to consumers, and the initial snapshot competing with production traffic if it is not throttled.',
        ],
      },
    ],
    references: [
      { label: 'Debezium — Change data capture architecture', href: 'https://debezium.io/documentation/reference/stable/architecture.html' },
      { label: 'microservices.io — Transactional Outbox', href: 'https://microservices.io/patterns/data/transactional-outbox.html' },
    ],
  },
}

// ── 5. Multi-region replication ──────────────────────────────────────────────

const multiRegion: Lesson = {
  slug: 'replication-multi-region',
  title: 'Multi-Region Replication',
  summary: 'The speed of light sets your write latency — pick which continent pays it.',
  group: 'building-blocks',
  topic: 'Database Replication',
  tier: 'pro',
  minutes: 8,
  concept: 'Architecture',
  tags: [
    { label: 'Constraint', value: '~150 ms cross-region' },
    { label: 'Default', value: 'Single write region' },
    { label: 'Escape', value: 'Partition by geography' },
  ],
  notes: [
    'Cross-region round trips are 70–150 ms and no engineering removes them — only geography does.',
    'One write region with global read replicas is the boring, correct default.',
    'Multi-primary is a conflict-resolution project, not a configuration flag.',
  ],
  scene: {
    code: [
      '# single write region',
      'writes  -> us-east (primary)',
      'reads   -> nearest replica',
      '',
      '# read-your-writes across regions',
      'lsn = write(...)              # returns log position',
      'read(replica, wait_for=lsn)   # or route to primary',
    ],
    initialState: { 'write region': 'us-east', 'EU write latency': '—', 'EU read latency': '—', conflicts: 0 },
    nodes: [
      { id: 'eu', kind: 'client', label: 'EU users', x: 10, y: 24 },
      { id: 'us', kind: 'client', label: 'US users', x: 10, y: 76 },
      { id: 'primary', kind: 'database', label: 'us-east PRIMARY', x: 50, y: 76, badge: 'writes' },
      { id: 'eurep', kind: 'database', label: 'eu-west replica', x: 50, y: 24, badge: 'reads' },
      { id: 'apac', kind: 'database', label: 'ap-south replica', x: 86, y: 50, badge: 'reads' },
    ],
    edges: [
      { id: 'us-p', from: 'us', to: 'primary' },
      { id: 'eu-p', from: 'eu', to: 'primary', curve: 0.4 },
      { id: 'eu-r', from: 'eu', to: 'eurep' },
      { id: 'p-eur', from: 'primary', to: 'eurep', curve: -0.3 },
      { id: 'p-apac', from: 'primary', to: 'apac', curve: 0.3 },
    ],
    steps: [
      { id: '1', caption: 'One write region. US users write locally — about 5 ms.', travel: 'us-p', token: 'write', codeLine: 2, patches: [{ nodeId: 'primary', badge: '5 ms ✓', highlight: true }], state: { 'write region': 'us-east' } },
      { id: '2', caption: 'EU users write to the same primary, paying a transatlantic round trip every time.', travel: 'eu-p', token: 'write', patches: [{ nodeId: 'primary', badge: '90 ms from EU', highlight: true }], state: { 'EU write latency': '~90 ms' } },
      { id: '3', caption: 'But EU reads come from a local replica — 3 ms, and reads are 95% of traffic.', travel: 'eu-r', token: 'hit', codeLine: 3, patches: [{ nodeId: 'eurep', badge: '3 ms ✓', highlight: true }], state: { 'EU read latency': '~3 ms' } },
      { id: '4', caption: 'Replication is asynchronous, so the EU replica trails the primary by 80–200 ms.', travel: 'p-eur', token: 'write', patches: [{ nodeId: 'eurep', badge: 'lag ~120 ms', highlight: true }] },
      { id: '5', caption: 'An EU user writes, then immediately reads locally — and sees the old value.', travel: 'eu-r', token: 'miss', patches: [{ nodeId: 'eurep', badge: 'stale read ✗', highlight: true }] },
      { id: '6', caption: 'Fix: return the log position on write and have the read wait for it, or route to the primary.', travel: 'eu-p', token: 'hit', codeLine: 7, patches: [{ nodeId: 'eurep', badge: 'waits for LSN ✓', highlight: true }] },
      { id: '7', caption: 'The alternative is partitioning: EU users get an EU primary. No conflicts, because no row has two writers.', patches: [{ nodeId: 'eurep', badge: 'PRIMARY for EU', highlight: true }, { nodeId: 'primary', badge: 'PRIMARY for US' }], state: { 'write region': 'per-user home', 'EU write latency': '~5 ms', conflicts: 0 } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'Multi-region is the point where physics stops being an abstraction. A round trip from London to Virginia is about 75 milliseconds and no amount of engineering reduces it — light in fibre is the budget, and you are already close to it.',
      'So every multi-region design is an answer to one question: **which users pay the round trip on writes?** Everything else — read replicas, multi-primary, geo-partitioning — is a different way of distributing that unavoidable cost.',
    ],
    sections: [
      {
        id: 'physics',
        heading: 'The numbers that constrain everything',
        blocks: [
          {
            kind: 'math',
            rows: [
              { label: 'Same availability zone', value: '~0.5 ms' },
              { label: 'Cross-AZ, same region', value: '~1–2 ms' },
              { label: 'US east ↔ US west', value: '~60 ms' },
              { label: 'US east ↔ Europe', value: '~75 ms' },
              { label: 'US east ↔ Singapore', value: '~200 ms' },
              { label: 'Synchronous write across 3 regions', value: '~150–250 ms', note: 'per write' },
              { label: 'Theoretical floor (speed of light in fibre)', value: '~60% of these', note: 'you are close already' },
            ],
            result: 'Cross-region synchrony costs 20–50× a local write. Design around it, not through it.',
          },
          {
            kind: 'prose',
            body: [
              'The practical consequence: **synchronous cross-region replication is a product decision**, not a database setting. A checkout that takes 200 ms per write instead of 5 ms is a different product. Occasionally that is worth it — for a financial ledger where zero RPO is non-negotiable — but it must be a stated, priced choice.',
            ],
          },
        ],
      },
      {
        id: 'topologies',
        heading: 'The four topologies',
        blocks: [
          {
            kind: 'table',
            columns: ['Topology', 'Write latency', 'Conflicts', 'Complexity', 'Use when'],
            rows: [
              ['Single region', 'Local for one region', 'None', 'Lowest', 'Users concentrated in one geography'],
              ['One primary + global read replicas', 'Remote for distant users', 'None', 'Low', 'Read-heavy global product — the default'],
              ['Geo-partitioned primaries', 'Local for everyone', 'None by construction', 'Moderate', 'Users belong to a home region'],
              ['Multi-primary (active-active)', 'Local for everyone', 'Real and constant', 'High', 'Global writes on shared rows, conflicts tolerable'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'The second row is the boring, correct answer for most global products, and it works because of the **read/write asymmetry**: reads typically outnumber writes 50:1 or more, so serving reads locally captures almost all of the latency benefit while writes keep a single ordering authority and zero conflicts.',
              'The third row is the underrated one. If every row has a natural **home region** — a user, a tenant, an account — then you can run a primary per region owning its own partition. Writes are local, there is no conflict resolution because no row has two writers, and cross-region reads are the rare case. This is how most large global systems actually work.',
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Multi-primary is a conflict-resolution project',
            body: [
              'Two regions accepting writes to the same row is not an edge case — it is the normal case for any actively-used record. "Last write wins" silently discards data and depends on clock synchronisation across continents that you do not have. Unless the data type is genuinely commutative (counters, sets, CRDTs), pick geo-partitioning instead.',
            ],
          },
        ],
      },
      {
        id: 'partitioning',
        heading: 'Geo-partitioning: the escape hatch',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The insight is that most data is not globally shared — it belongs to someone. A user\'s profile, orders and settings are written almost exclusively by that user, who is almost always in one place. Assign each row a home region and route writes there.',
            ],
          },
          {
            kind: 'code',
            language: 'sql',
            caption: 'Home region as a first-class column',
            lines: [
              'CREATE TABLE users (',
              '  id           uuid PRIMARY KEY,',
              '  home_region  text NOT NULL,      -- eu-west, us-east, ap-south',
              '  email        text NOT NULL,',
              '  ...',
              ') PARTITION BY LIST (home_region);',
              '',
              '-- Each partition is pinned to the region that owns it.',
              'CREATE TABLE users_eu PARTITION OF users FOR VALUES IN (\'eu-west\');',
              'CREATE TABLE users_us PARTITION OF users FOR VALUES IN (\'us-east\');',
              '',
              '-- Routing: a write goes to the row\'s home, not the caller\'s location.',
              '-- A travelling EU user still writes to eu-west, paying the round trip',
              '-- themselves rather than making their data ambiguous.',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Conflicts become impossible**, because each row has exactly one writer region. That eliminates the entire hardest problem.',
              '**Data residency comes free.** GDPR and similar rules often require EU personal data to stay in the EU — geo-partitioning enforces it structurally rather than by policy.',
              '**Cross-region reads still need a story.** A global search or an admin view touches every region; serve those from replicas or an aggregated read model.',
              '**Home region must be movable.** Users relocate, and moving a row between regions is a small migration — design the mechanism before you need it.',
              '**Global uniqueness gets harder.** A unique email across all regions needs either a global index or a coordination service.',
            ],
          },
        ],
      },
      {
        id: 'consistency',
        heading: 'What users notice across regions',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Cross-region lag is 100–200 ms rather than the 5–20 ms of a local replica, which turns anomalies that were theoretical into ones users hit routinely — especially read-your-writes.',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Read-your-writes:** after a write, either route that user\'s reads to the primary for a window, or return the log position and have the local replica wait until it has applied at least that far.',
              '**Monotonic reads:** pin a session to one replica so a user never sees data move backwards by hopping regions mid-session.',
              '**Causal ordering:** a reply arriving before the message it replies to is jarring; carry a causal token so dependent reads wait.',
              '**Failover between regions is different.** Cross-region promotion means accepting a much larger RPO, since the lag is the loss window — decide in advance whether that is acceptable or whether you would rather stay down.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Local replica lag', value: '~10 ms' },
              { label: 'Cross-region replica lag', value: '~120 ms' },
              { label: 'Writes per second', value: '2,000' },
              { label: 'Writes at risk on regional failover', value: '~240' },
              { label: 'With semi-sync to one remote region', value: '~0', note: '+75 ms per write' },
            ],
            result: 'Regional RPO is lag × write rate — compute it before promising anything.',
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Lead with the asymmetry',
            body: [
              '"Reads outnumber writes by roughly fifty to one, so I would serve reads from local replicas everywhere and keep a single write region — that captures nearly all the latency benefit with none of the conflict complexity. I would only move to per-region primaries if write latency for distant users proved unacceptable, and I would do it by partitioning on a home region rather than going active-active."',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'When users are concentrated in one geography — multi-region adds cost and complexity for latency nobody experiences.',
      'Multi-primary on shared, contended rows without a commutative data model; conflict resolution will lose data.',
      'Synchronous cross-region replication on latency-sensitive write paths unless zero RPO is a hard requirement.',
      'As a substitute for availability within a region; most outages are zonal, and multi-AZ is far cheaper.',
    ],
    failureModes: [
      {
        name: 'Cross-region write latency in the product',
        symptom: 'Distant users report the app feels sluggish on every action that saves.',
        cause: 'All writes routed to one remote primary.',
        fix: 'Geo-partition by home region, or make writes asynchronous with optimistic UI.',
      },
      {
        name: 'Silent conflict loss in active-active',
        symptom: 'User edits disappear with no error.',
        cause: 'Last-write-wins resolution using unsynchronised clocks across regions.',
        fix: 'Geo-partition so each row has one writer, or use CRDTs/version vectors with explicit merges.',
      },
      {
        name: 'Read-your-writes broken globally',
        symptom: 'Users see their own change only after several seconds.',
        cause: 'Local replica lag of 100–200 ms plus retry timing.',
        fix: 'Primary affinity after writes, or wait-for-LSN reads.',
      },
      {
        name: 'Regional failover loses more than expected',
        symptom: 'Hundreds of acknowledged writes missing after promoting another region.',
        cause: 'Asynchronous cross-region replication with lag proportional to distance.',
        fix: 'Semi-synchronous to one nearby region, or accept and document the RPO explicitly.',
      },
    ],
    interview: [
      {
        q: 'How would you make a database multi-region?',
        a: [
          'I would start from the asymmetry: reads usually outnumber writes fifty to one, so one write region with read replicas in every other region captures nearly all the latency benefit while keeping a single ordering authority and zero conflicts.',
          'Distant users then pay a round trip on writes — around 75 milliseconds transatlantic — which for most products is acceptable because writes are rare and users expect a save to take a moment.',
          'If that proved unacceptable, I would geo-partition rather than go active-active: give each row a home region and route its writes there, so writes are local everywhere and no row ever has two writers.',
        ],
        followUps: ['What happens when a user moves between regions?'],
      },
      {
        q: 'Why not run active-active with writes in every region?',
        a: [
          'Because two regions writing the same row is the normal case, not an edge case, and there is no correct automatic merge. Last-write-wins depends on clocks synchronised across continents, which you do not have, and it silently discards data.',
          'You can do it well when the data type is commutative — counters, sets, CRDTs — or when you accept and design an explicit merge policy per entity.',
          'For everything else, geo-partitioning gives you local writes without conflicts at all, which is nearly always the better trade.',
        ],
      },
      {
        q: 'What is the RPO if you lose an entire region?',
        a: [
          'Replication lag times the write rate. With 120 milliseconds of cross-region lag and two thousand writes a second, that is roughly two hundred and forty acknowledged writes lost on promotion.',
          'Reducing it means semi-synchronous replication to at least one remote region, which adds the full round trip — around 75 milliseconds — to every write, forever. That is the trade, and it should be an explicit decision rather than a default.',
          'For most products, documenting a small RPO is correct; for a ledger it is not, and the latency is the price of correctness.',
        ],
      },
    ],
    references: [
      { label: 'CockroachDB — Multi-region topology patterns', href: 'https://www.cockroachlabs.com/docs/stable/topology-patterns' },
      { label: 'Google — Spanner: Google’s Globally-Distributed Database', href: 'https://research.google/pubs/pub39966/' },
    ],
  },
}

export const replicationTopic: Lesson[] = [
  replication,
  replicationLag,
  failover,
  cdc,
  multiRegion,
]
