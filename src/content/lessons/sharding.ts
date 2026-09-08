import type { Lesson } from '../types'

/** Topic: Sharding (group: scaling-patterns). */

const sharding: Lesson = {
  slug: 'sharding',
  title: 'Sharding',
  summary: 'Split one huge dataset across many databases by a shard key.',
  group: 'scaling-patterns',
  topic: 'Sharding',
  tier: 'free',
  minutes: 7,
  concept: 'Concept',
  tags: [
    { label: 'Scalability', value: 'Horizontal' },
    { label: 'Trade-off', value: 'Cross-shard joins' },
    { label: 'Key choice', value: 'Critical' },
  ],
  notes: [
    'A single DB eventually can\'t hold or serve all the data.',
    'A shard key (e.g. user_id) decides which shard a row lives on.',
    'Each query touches only one shard, so capacity scales with shard count.',
  ],
  scene: {
    code: [
      'shard = hash(user_id) % SHARDS',
      'route:  db[shard].query(user_id)',
      '# each shard holds ~1/N of the data',
    ],
    initialState: { shards: 3, 'rows per shard': '~33%', 'query fanout': 1 },
    nodes: [
      { id: 'app', kind: 'client', label: 'App', x: 12, y: 50 },
      { id: 'router', kind: 'apiGateway', label: 'Shard Router', x: 42, y: 50 },
      { id: 's0', kind: 'database', label: 'Shard 0', x: 82, y: 22, badge: 'ids %3=0' },
      { id: 's1', kind: 'database', label: 'Shard 1', x: 82, y: 50, badge: 'ids %3=1' },
      { id: 's2', kind: 'database', label: 'Shard 2', x: 82, y: 78, badge: 'ids %3=2' },
    ],
    edges: [
      { id: 'app-r', from: 'app', to: 'router' },
      { id: 'r-s0', from: 'router', to: 's0', curve: -0.35 },
      { id: 'r-s1', from: 'router', to: 's1' },
      { id: 'r-s2', from: 'router', to: 's2', curve: 0.35 },
    ],
    steps: [
      { id: '1', caption: 'A query for user 42 arrives at the shard router.', travel: 'app-r', token: 'request', codeLine: 2 },
      { id: '2', caption: 'hash(42) % 3 = 0 → this row lives on Shard 0.', codeLine: 1, patches: [{ nodeId: 'router', badge: '→ shard 0', highlight: true }] },
      { id: '3', caption: 'Only Shard 0 is queried — the other shards do nothing.', travel: 'r-s0', token: 'request', patches: [{ nodeId: 's0', badge: 'hit', highlight: true }] },
      { id: '4', caption: 'User 43 hashes to Shard 1 instead — load spreads across shards.', travel: 'r-s1', token: 'request', codeLine: 1, patches: [{ nodeId: 's1', badge: 'hit', highlight: true }] },
      { id: '5', caption: 'Each shard stores ~1/N of the data, so capacity grows with shard count.', state: { shards: 3 } },
    ],
  },
  deepDive: {
    readingMinutes: 10,
    intro: [
      'Sharding splits one logical dataset across many independent databases so that **writes and storage scale past a single machine**. It is the last resort in the scaling ladder, and deliberately so: it is the one architectural decision that is genuinely hard to undo.',
      'The reason is that sharding does not just distribute data — it **removes guarantees you have been relying on**. Cross-shard joins, transactions, unique constraints and aggregate queries all stop working the way they did, and every feature built afterwards must respect the shard boundary.',
    ],
    sections: [
      {
        id: 'when',
        heading: 'When it is actually justified',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Read scaling is not a reason to shard — replicas and caching handle reads far more cheaply. The legitimate triggers are narrower than most designs assume.',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Write throughput exceeds one primary.** A well-tuned Postgres or MySQL primary handles roughly 5,000–20,000 write transactions per second. Beyond that, no amount of replication helps, because every replica applies every write.',
              '**Dataset exceeds what one machine can hold or operate.** Not just disk: backup windows, index rebuilds, vacuum and restore times all grow with size, and a 20 TB database is operationally painful long before it is full.',
              '**Isolation is a requirement.** Regulatory data residency, or a large tenant whose load must not affect others.',
              '**Working set exceeds RAM** and cannot be cached, so every query hits disk.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Single primary write ceiling', value: '~10,000 tx/s' },
              { label: 'Your estimated peak writes', value: '2,300 tx/s' },
              { label: 'Headroom', value: '4×' },
              { label: 'Verdict', value: 'Do not shard' },
              { label: 'Cheaper options first', value: 'Index tuning, batching, caching, bigger instance' },
            ],
            result: 'Compute the number before proposing the architecture — most systems are nowhere near the ceiling.',
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Saying "not yet" is a strong answer',
            body: [
              'Interviewers frequently ask about sharding to see whether you reach for it reflexively. "At 2,000 writes per second a single primary has four times the headroom we need, so I would cache and add replicas and revisit sharding at around 8,000" demonstrates judgement that jumping straight to a shard key does not.',
            ],
          },
        ],
      },
      {
        id: 'key',
        heading: 'Choosing the shard key: the decision you live with',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The shard key determines which shard holds a row, and therefore which queries are fast, which are catastrophic, and how evenly load spreads. Changing it later means rewriting every row and every query, so it deserves more design time than the rest of the schema combined.',
              'A good key satisfies three properties at once: **high cardinality** (enough distinct values to spread across shards), **even distribution** (no value dominates), and **query alignment** (the common queries include the key, so they touch one shard).',
            ],
          },
          {
            kind: 'table',
            columns: ['Key', 'Cardinality', 'Distribution', 'Query alignment', 'Verdict'],
            rows: [
              ['`user_id`', 'High', 'Good', 'Excellent for user-scoped apps', 'Usually right'],
              ['`tenant_id`', 'Medium', 'Poor — tenants vary hugely', 'Excellent for B2B', 'Good with hot-tenant handling'],
              ['`created_at`', 'High', 'Terrible — all writes hit one shard', 'Good for time-range queries', 'Only for append-only analytics'],
              ['Auto-increment id', 'High', 'Terrible with range partitioning', 'Poor', 'Avoid — writes concentrate'],
              ['`hash(user_id)`', 'High', 'Excellent', 'Good for point lookups, kills range scans', 'Common default'],
              ['`country`', 'Very low', 'Severe skew', 'Only for geo queries', 'Avoid'],
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Timestamps and sequential ids concentrate writes',
            body: [
              'Range-partitioning on time or an auto-increment id means **every new write goes to the newest shard**. You get all the complexity of sharding with none of the write distribution, and the newest shard is a permanent hotspot. If you need time-ordered ids, use something with a random or hashed prefix.',
            ],
          },
        ],
      },
      {
        id: 'strategy',
        heading: 'Range, hash, and directory',
        blocks: [
          {
            kind: 'table',
            columns: ['Strategy', 'Placement', 'Range queries', 'Rebalancing', 'Skew risk'],
            rows: [
              ['Range', 'Contiguous key ranges per shard', 'Efficient — one shard', 'Split a range in two', 'High — sequential keys'],
              ['Hash', '`hash(key) % N`', 'Must query every shard', 'Painful — changing N rehashes everything', 'Low'],
              ['Consistent hash', 'Position on a ring', 'Must query every shard', 'Only 1/N of keys move', 'Low with vnodes'],
              ['Directory', 'An explicit lookup table', 'Depends on the mapping', 'Easiest — update the table', 'Controlled manually'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'Directory-based sharding is underrated in interviews. A lookup service that maps key → shard adds one indirection but makes everything else tractable: you can move a single tenant to its own shard, rebalance incrementally, and handle hot keys individually. The lookup table is small, cacheable, and the one thing you must keep highly available.',
            ],
          },
        ],
      },
      {
        id: 'lost',
        heading: 'What you give up',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Cross-shard joins.** Gone. Either denormalise so related data shares a shard, or join in the application — which is N queries plus a merge.',
              '**Cross-shard transactions.** Two-phase commit is available and slow and fragile; the usual answer is a **saga**: a sequence of local transactions with compensating actions on failure. That means intermediate states are visible.',
              '**Global unique constraints.** A database can only enforce uniqueness within itself. Global uniqueness needs a separate service, a shared sequence, or UUIDs.',
              '**Global aggregates.** `COUNT(*)` becomes scatter-gather across every shard, with latency equal to the slowest one.',
              '**`AUTO_INCREMENT`.** Each shard would generate the same ids. Use UUIDv7, Snowflake ids, or per-shard offset ranges.',
              '**Simple operations.** Schema migrations, backups and restores now run N times, and must handle partial failure.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Shards', value: '16' },
              { label: 'Per-shard p99 latency', value: '20 ms' },
              { label: 'Single-shard query p99', value: '20 ms' },
              { label: 'Scatter-gather p99', value: '~60 ms', note: 'slowest of 16 draws' },
              { label: 'Probability at least one shard is slow (1% each)', value: '15%' },
            ],
            result: 'Fan-out queries inherit the tail of every shard they touch — design to avoid them.',
          },
        ],
      },
      {
        id: 'migration',
        heading: 'Getting there without downtime',
        blocks: [
          {
            kind: 'list',
            ordered: true,
            items: [
              '**Introduce a routing layer first**, while there is still one shard. All queries go through it, so the application already speaks shard-aware.',
              '**Backfill.** Copy data to the new shards in batches, throttled so replication and production traffic are unaffected.',
              '**Dual-write.** Write to both old and new for a period, with the old still authoritative.',
              '**Verify.** Compare reads from both continuously and reconcile differences until they are zero.',
              '**Cut over reads** progressively — 1%, 10%, 100% — with an instant rollback path.',
              '**Stop dual-writing** and retire the old path only after a soak period.',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Over-shard logically, under-shard physically',
            body: [
              'Create many more logical shards than you need — say 1,024 — and map several onto each physical machine. Rebalancing then means moving logical shards between machines, which is a routine operation, instead of resharding data, which is a project. This is how Vitess, Citus and most large deployments do it.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'When reads are the bottleneck — replicas and caching are dramatically cheaper and reversible.',
      'When a bigger instance, better indexes or fewer queries would buy the headroom you need.',
      'When the workload requires frequent cross-entity transactions or joins that no shard key can co-locate.',
      'When the dataset is small enough that operational simplicity outweighs the theoretical ceiling.',
    ],
    failureModes: [
      {
        name: 'Hot shard',
        symptom: 'One shard saturates while the rest idle.',
        cause: 'A skewed shard key — a huge tenant, a celebrity user, or time-based partitioning.',
        fix: 'Sub-shard the hot key, move it to a dedicated shard via a directory, or add a salt to its key.',
      },
      {
        name: 'Scatter-gather latency',
        symptom: 'p99 degrades as shard count grows even though each shard is fast.',
        cause: 'Queries missing the shard key fan out to every shard and wait for the slowest.',
        fix: 'Denormalise or add a secondary index table keyed by the alternate access pattern.',
      },
      {
        name: 'Cross-shard write inconsistency',
        symptom: 'Money leaves one account and never arrives in another.',
        cause: 'A multi-shard operation without atomicity, and no compensation on partial failure.',
        fix: 'Sagas with compensating transactions plus an outbox, or co-locate the entities on one shard.',
      },
      {
        name: 'Resharding outage',
        symptom: 'Adding shards causes broad errors or data unavailability.',
        cause: 'Modulo hashing, so changing shard count relocates nearly every key.',
        fix: 'Consistent hashing or many fixed logical shards mapped onto physical nodes.',
      },
    ],
    interview: [
      {
        q: 'How would you choose a shard key?',
        a: [
          'I would look for three properties together: high cardinality so there are enough distinct values to spread, even distribution so no single value dominates a shard, and alignment with the dominant query pattern so common reads touch one shard.',
          'For a consumer product, user id usually satisfies all three. I would avoid timestamps or auto-increment ids, since range partitioning on them sends every new write to the newest shard — all the complexity of sharding with none of the distribution.',
          'I would also check what queries do *not* include the key, because those become scatter-gather and inherit the tail latency of every shard.',
        ],
        followUps: ['What do you do about a tenant that is ten times larger than any other?'],
      },
      {
        q: 'What breaks once you shard?',
        a: [
          'Anything that assumed one database: cross-shard joins, multi-row transactions across shards, global unique constraints, aggregate queries and auto-increment ids.',
          'Transactions are the sharpest edge. Two-phase commit is available but slow and blocks on coordinator failure, so most systems use sagas — a sequence of local transactions with compensating actions — which means partial states become visible and must be modelled in the product.',
          'Operationally, migrations, backups and restores now run N times and must tolerate partial failure.',
        ],
      },
      {
        q: 'How do you migrate from a single database to sharded with no downtime?',
        a: [
          'Introduce the routing layer first, while there is still one shard, so the application is already shard-aware and that change can be verified independently.',
          'Then backfill in throttled batches, dual-write to old and new, and continuously compare reads from both until differences are zero. Only then shift reads progressively — one percent, ten, a hundred — keeping instant rollback available.',
          'I would also create far more logical shards than physical machines, so future rebalancing is moving logical shards rather than resharding data.',
        ],
      },
    ],
    references: [
      { label: 'Vitess — Sharding in MySQL at scale', href: 'https://vitess.io/docs/concepts/shard/' },
      { label: 'Citus — Distributed PostgreSQL: choosing a distribution column', href: 'https://docs.citusdata.com/en/stable/sharding/data_modeling.html' },
    ],
  },
}

const shardingHotspot: Lesson = {
  slug: 'sharding-hotspot',
  title: 'Hotspot & Hot Key Problem',
  summary: 'When one shard handles 90% of traffic — and why naive shard keys cause it.',
  group: 'scaling-patterns',
  topic: 'Sharding',
  tier: 'free',
  minutes: 7,
  concept: 'Concept',
  tags: [
    { label: 'Problem', value: 'Uneven load' },
    { label: 'Cause', value: 'Skewed shard key' },
    { label: 'Fix', value: 'Salting / remap' },
  ],
  notes: [
    'If your shard key is non-uniform (e.g. celebrity user_id), one shard gets all the traffic.',
    'The hot shard becomes a bottleneck — adding more shards doesn\'t help if the key is the same.',
    'Fixes: key salting (append random suffix to spread one key across N shards), or re-shard with a better key.',
  ],
  scene: {
    code: [
      '# naive: hash(user_id) % 3',
      'user_id = "celebrity"     # ALL traffic!',
      'shard = hash("celebrity") % 3  # → always shard 1',
      '',
      '# fix: salt the key',
      'suffix = request_id % 10',
      'shard = hash(f"celebrity:{suffix}") % 3',
    ],
    initialState: { 'shard 0 load': '5%', 'shard 1 load': '90%', 'shard 2 load': '5%' },
    nodes: [
      { id: 'app', kind: 'client', label: 'App', x: 12, y: 50 },
      { id: 'router', kind: 'apiGateway', label: 'Shard Router', x: 42, y: 50 },
      { id: 's0', kind: 'database', label: 'Shard 0', x: 82, y: 22, badge: '5% load' },
      { id: 's1', kind: 'database', label: 'Shard 1', x: 82, y: 50, badge: '90% load ⚠' },
      { id: 's2', kind: 'database', label: 'Shard 2', x: 82, y: 78, badge: '5% load' },
    ],
    edges: [
      { id: 'app-r', from: 'app', to: 'router' },
      { id: 'r-s0', from: 'router', to: 's0', curve: -0.35 },
      { id: 'r-s1', from: 'router', to: 's1' },
      { id: 'r-s2', from: 'router', to: 's2', curve: 0.35 },
    ],
    steps: [
      { id: '1', caption: 'Celebrity user gets millions of profile views. Each request hashes the same user_id.', travel: 'app-r', token: 'request', codeLine: 2 },
      { id: '2', caption: 'hash("celebrity") % 3 always lands on Shard 1. All traffic funnels there.', travel: 'r-s1', token: 'request', codeLine: 3, patches: [{ nodeId: 's1', badge: '90% load ⚠', highlight: true }], state: { 'shard 1 load': '90% ⚠' } },
      { id: '3', caption: 'Shard 0 and Shard 2 are idle. Adding more shards does nothing — hot key is still the same.', patches: [{ nodeId: 's0', badge: 'idle' }, { nodeId: 's2', badge: 'idle' }] },
      { id: '4', caption: 'Fix: append a random suffix to the key. Same data, different shard each time.', codeLine: 6 },
      { id: '5', caption: 'celebrity:0 → shard 2, celebrity:1 → shard 0, celebrity:2 → shard 1 … load spreads!', patches: [{ nodeId: 's0', badge: '33% load' }, { nodeId: 's1', badge: '33% load' }, { nodeId: 's2', badge: '34% load' }], codeLine: 7, state: { 'shard 0 load': '33%', 'shard 1 load': '33%', 'shard 2 load': '34%' } },
    ],
  },
  deepDive: {
    readingMinutes: 8,
    intro: [
      'Sharding balances **data**; it does not balance **traffic**. A perfectly even distribution of rows can still produce one shard at 100% and the rest at 5%, because real access patterns follow power laws — a small number of entities attract a disproportionate share of requests.',
      'This is the failure that survives good design. You can pick an excellent shard key and still get a hot shard the day a celebrity signs up or a single customer grows ten times larger than the rest.',
    ],
    sections: [
      {
        id: 'kinds',
        heading: 'Three different skews, three different fixes',
        blocks: [
          {
            kind: 'table',
            columns: ['Type', 'Cause', 'Signature', 'Fix'],
            rows: [
              ['Data skew', 'One key owns far more rows', 'Disk usage uneven across shards', 'Sub-shard that key; move it to a dedicated shard'],
              ['Request skew (hot key)', 'One key gets far more traffic', 'CPU/network uneven, disk even', 'Cache it locally; replicate the value'],
              ['Temporal skew', 'All writes target the newest range', 'The newest shard is always the busy one', 'Hash or salt the key; avoid time-ordered partitioning'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'Distinguishing them matters because the fixes do not overlap. Adding shards helps data skew a little and request skew not at all — a key lives on one shard no matter how many shards exist. That sentence is the single most useful thing to know about hot keys.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Shards', value: '10' },
              { label: 'Rows per shard', value: '~10 M each', note: 'perfectly even' },
              { label: 'Requests to shard 3', value: '45,000 /s' },
              { label: 'Requests to each other shard', value: '~1,200 /s' },
              { label: 'Effect of doubling shard count', value: 'None for shard 3' },
            ],
            result: 'Even data with uneven traffic is the normal case, not the exception.',
          },
        ],
      },
      {
        id: 'detect',
        heading: 'Detecting skew before users do',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Per-shard metrics, never aggregates.** A cluster average of 30% CPU hides one node at 100%. Alert on the *maximum* across shards, and on the ratio of max to median.',
              '**Track top-N keys by request count** at the routing layer with a sampled counter or a count-min sketch — you cannot fix a hot key you cannot name.',
              '**Watch the max/median ratio over time.** Skew rarely appears instantly; it grows as one tenant grows, and a trend line gives you weeks of warning.',
              '**Instrument the shard key on every query.** Being able to group latency by shard key value turns a two-day investigation into a two-minute one.',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Skew is a distribution problem, so measure the distribution',
            body: [
              'Percentiles across shards are more informative than averages: p50 shard load tells you the typical shard, p100 tells you whether one is dying. Any monitoring that only shows cluster totals is structurally blind to the most common failure in a sharded system.',
            ],
          },
        ],
      },
      {
        id: 'fixes',
        heading: 'The remedies, cheapest first',
        blocks: [
          {
            kind: 'list',
            ordered: true,
            items: [
              '**Cache the hot key.** A short-TTL local cache on every application node collapses reads by orders of magnitude for the price of seconds of staleness. Almost always the correct first move for request skew.',
              '**Replicate the value.** Store it under N suffixed keys spread across shards; readers pick one at random. Costs N× writes, so it suits read-heavy hot keys.',
              '**Salt the key for writes.** Append a bucket number — `user:42:b7` — so writes spread across shards, and read by fanning out to all buckets. Good for append-heavy hot entities such as a celebrity\'s follower list.',
              '**Give the hot entity its own shard.** With directory-based sharding this is a lookup-table update, not a resharding project — one of the strongest arguments for a directory.',
              '**Split the entity in the data model.** A "global counter" row is a hotspot by construction; N sharded counters summed on read remove the contention entirely.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'sharded_counter.py — removing a write hotspot by construction',
            lines: [
              'BUCKETS = 64',
              '',
              'def increment(entity_id, delta=1):',
              '    # Spread contention across 64 rows on (likely) different shards.',
              '    bucket = random.randrange(BUCKETS)',
              '    db.execute(',
              '        "INSERT INTO counters (entity_id, bucket, value) VALUES (%s, %s, %s) "',
              '        "ON CONFLICT (entity_id, bucket) DO UPDATE SET value = counters.value + %s",',
              '        entity_id, bucket, delta, delta)',
              '',
              'def read(entity_id):',
              '    # Fan-out read; cache the result since exact counts rarely matter.',
              '    return db.query("SELECT SUM(value) FROM counters WHERE entity_id = %s",',
              '                    entity_id)',
            ],
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Salting moves the cost from writes to reads',
            body: [
              'Every salted write is cheap and every read must gather all buckets. That is a good trade for write-heavy hot keys and a bad one for read-heavy ones. Decide from the actual ratio, and cache the gathered result where you can.',
            ],
          },
        ],
      },
      {
        id: 'tenants',
        heading: 'The multi-tenant version of the problem',
        blocks: [
          {
            kind: 'prose',
            body: [
              'In B2B systems, skew is guaranteed rather than probable: customer sizes follow a power law, so your largest tenant may generate more load than the bottom thousand combined. Sharding by tenant id gives clean isolation and, inevitably, an unbalanced cluster.',
              'The standard resolution is **tiering**. Small tenants share pooled shards; large tenants get dedicated ones; the very largest may be sharded internally by user. A directory maps tenant to placement, so promoting a growing tenant is an operation rather than a redesign.',
            ],
          },
          {
            kind: 'table',
            columns: ['Tier', 'Placement', 'Isolation', 'Cost per tenant'],
            rows: [
              ['Small (most tenants)', 'Many per shard', 'Low — noisy neighbours possible', 'Very low'],
              ['Medium', 'A few per shard', 'Moderate', 'Low'],
              ['Large', 'Dedicated shard', 'Strong', 'High'],
              ['Very large', 'Sharded internally', 'Strong', 'Highest'],
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Bring up skew before you are asked',
            body: [
              'Proposing a shard key and immediately naming its skew risk — "user id distributes well, but a celebrity account will still hot-spot one shard, so I would cache that entity locally and be able to promote it to a dedicated shard" — is one of the clearest senior signals available in a design interview.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Do not salt keys that are read far more than written; you multiply read cost to fix a write problem you may not have.',
      'Do not add shards in response to request skew — the hot key stays on one shard regardless.',
      'Do not give every large tenant a dedicated shard reflexively; it multiplies operational surface for tenants that a pooled shard could serve.',
      'Do not rely on random distribution alone in a multi-tenant system, where skew is structural rather than accidental.',
    ],
    failureModes: [
      {
        name: 'Celebrity hot key',
        symptom: 'One shard saturates the moment a popular entity trends.',
        cause: 'A single key attracting a disproportionate share of reads.',
        fix: 'Short-TTL local caching on app nodes, plus replicated copies for the extreme cases.',
      },
      {
        name: 'Newest-shard hotspot',
        symptom: 'The most recently created shard is always the busiest.',
        cause: 'Range partitioning on time or sequential ids.',
        fix: 'Hash the key or prefix it with a random bucket; reserve time ranges for append-only analytics only.',
      },
      {
        name: 'Noisy neighbour',
        symptom: 'One tenant\'s batch job degrades unrelated tenants on the same shard.',
        cause: 'Pooled placement with no per-tenant resource limits.',
        fix: 'Per-tenant rate limits and concurrency caps; promote heavy tenants to their own shard.',
      },
      {
        name: 'Global counter contention',
        symptom: 'Write latency spikes on a single row under concurrency.',
        cause: 'Every writer contending on one row\'s lock.',
        fix: 'Sharded counters summed on read, or move the counter to a write-back cache.',
      },
    ],
    interview: [
      {
        q: 'One shard is at 100% CPU and the others are idle. What is going on?',
        a: [
          'That is a hot key rather than general imbalance — imbalance produces a gradient across shards, a hot key produces one outlier. I would confirm by checking whether the shard holds more data or simply receives more requests, since the fixes differ.',
          'If it is request skew, adding shards does nothing, because the key lives on exactly one shard regardless of cluster size. The effective fix is a short-TTL cache on every application node, which can reduce traffic to that key by orders of magnitude for a few seconds of staleness.',
          'If staleness is unacceptable, I would replicate the value under several suffixed keys so reads spread, accepting the extra write cost.',
        ],
        followUps: ['What if the hot entity is write-heavy rather than read-heavy?'],
      },
      {
        q: 'How do you shard a multi-tenant SaaS where one customer is 10× larger than the rest?',
        a: [
          'By tiering rather than by a single uniform rule. Most tenants share pooled shards, medium ones get a few per shard, and the largest get dedicated shards — with a directory mapping tenant to placement so promotion is an operational change, not a redesign.',
          'The very largest tenant may need internal sharding by user id, which means the routing layer has to support a two-level lookup for that tenant.',
          'I would also add per-tenant rate limits regardless, so a pooled tenant running a batch job cannot degrade its neighbours.',
        ],
      },
      {
        q: 'How would you handle a counter that every request increments?',
        a: [
          'Not as a single row, since every writer contends on the same lock and it becomes a serialisation point that no amount of sharding fixes.',
          'I would use sharded counters: increment a randomly chosen one of N bucket rows, and sum them on read, caching the sum since exact real-time counts are rarely required.',
          'If the count tolerates a small loss window, a write-back cache is even better — increments accumulate in memory and flush periodically, turning tens of thousands of writes per second into a handful.',
        ],
      },
    ],
    references: [
      { label: 'Google Cloud — Designing schemas to avoid hotspots', href: 'https://cloud.google.com/spanner/docs/schema-design' },
      { label: 'DynamoDB — Partition key design and adaptive capacity', href: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html' },
    ],
  },
}

// ── 3. Cross-shard queries & transactions ────────────────────────────────────

const crossShard: Lesson = {
  slug: 'sharding-cross-shard',
  title: 'Cross-Shard Queries & Sagas',
  summary: 'Joins, transactions and unique constraints stop working — here is what replaces them.',
  group: 'scaling-patterns',
  topic: 'Sharding',
  tier: 'pro',
  minutes: 9,
  concept: 'Concept',
  tags: [
    { label: 'Lost', value: 'Joins · ACID · uniqueness' },
    { label: 'Replaced by', value: 'Sagas · denormalisation' },
    { label: 'Cost', value: 'Visible intermediate states' },
  ],
  notes: [
    'A query without the shard key becomes scatter-gather and inherits the tail latency of every shard.',
    'Two-phase commit is available, slow, and blocks everything if the coordinator dies mid-flight.',
    'Sagas replace atomicity with compensation — which means partial states become part of your domain.',
  ],
  scene: {
    code: [
      '# saga: local transactions + compensations',
      'reserve_inventory(order)    # shard A',
      'charge_payment(order)       # shard B',
      '  on failure:',
      '    release_inventory(order)  # compensate',
      '',
      '# scatter-gather: no shard key in the query',
      'results = await gather(*[s.query(q) for s in shards])',
    ],
    initialState: { shards: 4, 'query type': 'point lookup', latency: '20 ms', state: 'consistent' },
    nodes: [
      { id: 'app', kind: 'client', label: 'Order svc', x: 10, y: 50 },
      { id: 's1', kind: 'database', label: 'Shard A · inventory', x: 46, y: 18, badge: 'stock 12' },
      { id: 's2', kind: 'database', label: 'Shard B · payments', x: 46, y: 50, badge: 'idle' },
      { id: 's3', kind: 'database', label: 'Shard C', x: 46, y: 82, badge: 'idle' },
      { id: 's4', kind: 'database', label: 'Shard D', x: 80, y: 50, badge: 'idle' },
    ],
    edges: [
      { id: 'a-s1', from: 'app', to: 's1', curve: -0.3 },
      { id: 'a-s2', from: 'app', to: 's2' },
      { id: 'a-s3', from: 'app', to: 's3', curve: 0.3 },
      { id: 'a-s4', from: 'app', to: 's4', curve: -0.15 },
      { id: 's1-a', from: 's1', to: 'app', curve: 0.4 },
    ],
    steps: [
      { id: '1', caption: 'A query containing the shard key hits exactly one shard — fast and simple.', travel: 'a-s2', token: 'request', patches: [{ nodeId: 's2', badge: 'HIT 20 ms', highlight: true }], state: { 'query type': 'point lookup', latency: '20 ms' } },
      { id: '2', caption: 'A query without it must ask every shard: scatter-gather.', travel: 'a-s1', token: 'request', codeLine: 8, patches: [{ nodeId: 's1', badge: 'scanning' }, { nodeId: 's3', badge: 'scanning', highlight: true }], state: { 'query type': 'scatter-gather' } },
      { id: '3', caption: 'You wait for the slowest of four. The aggregate p99 is far worse than any single shard.', travel: 'a-s4', token: 'miss', patches: [{ nodeId: 's4', badge: 'slow 180 ms ✗', highlight: true }], state: { latency: '180 ms' } },
      { id: '4', caption: 'Now a write spanning shards: reserve inventory on A, charge payment on B.', travel: 'a-s1', token: 'write', codeLine: 2, patches: [{ nodeId: 's1', badge: 'stock 11 · reserved', highlight: true }], state: { state: 'partial' } },
      { id: '5', caption: 'Inventory commits locally. There is no transaction spanning both shards.', patches: [{ nodeId: 's1', badge: 'committed ✓' }] },
      { id: '6', caption: 'The payment fails. Inventory is already reduced — the system is now inconsistent.', travel: 'a-s2', token: 'miss', codeLine: 3, patches: [{ nodeId: 's2', badge: '✗ declined', highlight: true }], state: { state: 'INCONSISTENT' } },
      { id: '7', caption: 'The saga compensates: release the reservation. Consistency restored, but it was briefly visible.', travel: 'a-s1', token: 'write', codeLine: 5, patches: [{ nodeId: 's1', badge: 'stock 12 ✓', highlight: true }], state: { state: 'eventually consistent' } },
    ],
  },
  deepDive: {
    readingMinutes: 10,
    intro: [
      'Sharding buys write throughput and storage by removing the thing that made everything else easy: **a single database that could see all the data at once**. Joins, transactions, unique constraints and aggregate queries all depended on that, and all of them now need a replacement.',
      'This is the part of sharding that shapes your codebase for years. The shard key decides which queries stay fast; everything else becomes an engineering problem you solve one feature at a time.',
    ],
    sections: [
      {
        id: 'reads',
        heading: 'Reads: single-shard, scatter-gather, or a second index',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A query that includes the shard key routes to one shard and behaves exactly as before. A query that does not must ask **every** shard and merge — scatter-gather — and it degrades in two distinct ways as the cluster grows.',
              'First, work multiplies: N shards each do the query. Second, and worse, latency becomes the **maximum** across N draws from the latency distribution, so the aggregate p99 approaches the individual p99.9 or beyond.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Per-shard p50', value: '5 ms' },
              { label: 'Per-shard p99', value: '50 ms' },
              { label: 'Scatter-gather over 4 shards, p99', value: '~80 ms' },
              { label: 'Over 16 shards, p99', value: '~150 ms' },
              { label: 'Chance ≥1 shard is slow (16 × 1%)', value: '15%' },
              { label: 'Query work multiplier', value: '16×' },
            ],
            result: 'Scatter-gather gets worse as you scale — the opposite of what sharding is for.',
          },
          {
            kind: 'list',
            items: [
              '**Denormalise into the shard.** Store a copy of the data alongside the entity that queries it, so the join disappears.',
              '**Build a secondary index table keyed differently.** An `email → user_id` table sharded by email turns a scatter-gather lookup into two point lookups.',
              '**Use a dedicated search index.** Elasticsearch or similar, fed by CDC, absorbs the arbitrary-predicate queries that no shard key can serve.',
              '**Push aggregates to a read model.** Counts and rollups maintained incrementally, not computed by fanning out on every request.',
              '**Bound the fan-out.** Deadline each shard call and return partial results rather than waiting for the worst one.',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Design the shard key from the query patterns, not the data model',
            body: [
              'List the ten most frequent queries before choosing a key. Whichever ones lack the key become scatter-gather forever — and if the top query is one of them, the key is wrong no matter how nicely it distributes.',
            ],
          },
        ],
      },
      {
        id: 'twopc',
        heading: 'Two-phase commit, and why it is rarely the answer',
        blocks: [
          {
            kind: 'prose',
            body: [
              '2PC does provide atomicity across shards. A coordinator asks every participant to **prepare** — durably promising it can commit — then, once all agree, tells them to **commit**. It is correct, and it is avoided at scale for three specific reasons.',
            ],
          },
          {
            kind: 'list',
            ordered: true,
            items: [
              '**It holds locks across a network round trip.** Every participant keeps its rows locked from prepare until commit, so contended rows serialise on the slowest participant.',
              '**The coordinator is a single point of failure at the worst moment.** If it dies after prepare and before commit, participants are stuck holding locks with no authority to proceed or abort — the blocking problem, and it requires human intervention or a recovery protocol.',
              '**Availability multiplies downward.** All participants must be reachable, so a five-shard transaction is less available than any single shard.',
            ],
          },
          {
            kind: 'table',
            columns: ['', '2PC', 'Saga'],
            rows: [
              ['Atomicity', 'Real — all or nothing', 'Eventual, via compensation'],
              ['Isolation', 'Yes', 'No — partial states are visible'],
              ['Locks held', 'Across the whole protocol', 'Only within each local transaction'],
              ['Availability', 'Product of all participants', 'Each step independent'],
              ['Failure mode', 'Blocking on coordinator loss', 'Compensation may itself fail'],
              ['Latency', 'Two round trips minimum', 'One per step, no coordination'],
            ],
          },
        ],
      },
      {
        id: 'sagas',
        heading: 'Sagas: trading isolation for availability',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A saga is a sequence of **local** transactions, each committing independently, with a **compensating** transaction defined for each step. If step four fails, you run the compensations for steps three, two and one in reverse.',
              'The critical property to internalise: a saga gives up **isolation**, not just atomicity. Between steps, the system is in a state that never existed under ACID — inventory reserved for an order that will not exist, a charge without a shipment. Those states are visible to other transactions and to users, so they must be modelled in the domain rather than treated as impossible.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'saga.py — orchestrated saga with compensations and idempotency',
            lines: [
              'STEPS = [',
              '    Step(do=reserve_inventory, undo=release_inventory),',
              '    Step(do=charge_payment,    undo=refund_payment),',
              '    Step(do=create_shipment,   undo=cancel_shipment),',
              ']',
              '',
              'def run_saga(order):',
              '    completed = []',
              '    for step in STEPS:',
              '        try:',
              '            # Each step is idempotent, keyed by saga id: safe to retry.',
              '            step.do(order, idempotency_key=f"{order.id}:{step.name}")',
              '            completed.append(step)',
              '            log_state(order.id, step.name, "done")   # durable progress',
              '        except Exception:',
              '            # Compensate in reverse. Compensations must never fail',
              '            # permanently — retry them forever, then alert a human.',
              '            for done in reversed(completed):',
              '                retry_forever(done.undo, order)',
              '            return FAILED',
              '    return COMPLETED',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Compensations are not rollbacks.** You cannot un-send an email or un-charge a card without a trace — you send an apology and issue a refund. Design the business meaning, not just the data change.',
              '**Some steps cannot be compensated.** Put those **last**, so everything reversible has already succeeded before you do the irreversible thing.',
              '**Persist saga state.** A crash mid-saga must be recoverable, which means the progress log is durable and a supervisor resumes orphaned sagas.',
              '**Every step and compensation must be idempotent**, because retries are guaranteed.',
              '**Choreography vs orchestration.** Choreography (each service reacts to events) has no central component but the flow is invisible; orchestration (one coordinator drives) is easier to reason about and debug, and is usually the better choice past three steps.',
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'A failing compensation is the real emergency',
            body: [
              'If `release_inventory` fails after the payment declined, stock is held for an order that does not exist — and nothing will fix it automatically. Compensations need infinite retry with backoff, a dead letter queue, and an alert, because they are the only thing standing between a partial failure and permanently corrupted state.',
            ],
          },
        ],
      },
      {
        id: 'constraints',
        heading: 'Uniqueness and other lost guarantees',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A unique index enforces uniqueness **within one database**. Sharded across ten, two users can register the same email simultaneously on different shards and both succeed. The database is no longer able to help.',
            ],
          },
          {
            kind: 'table',
            columns: ['Guarantee', 'Replacement', 'Cost'],
            rows: [
              ['Unique constraint', 'A dedicated table sharded by that attribute, written first', 'One extra round trip; needs cleanup on failure'],
              ['Foreign keys', 'Application-level validation, or co-locate in one shard', 'Referential integrity becomes your problem'],
              ['`AUTO_INCREMENT`', 'UUIDv7, Snowflake ids, or per-shard ranges', 'Larger keys, or a coordination step'],
              ['`COUNT(*)` / aggregates', 'Incrementally maintained counters or a warehouse', 'Eventual consistency'],
              ['`ORDER BY … LIMIT` across shards', 'Fetch N from each shard, merge, truncate', 'N × shards rows transferred'],
              ['Multi-row transactions', 'Co-locate by shard key, or saga', 'Design constraint on the schema'],
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'The strongest move is avoiding the problem',
            body: [
              'Before describing sagas, say what you would do to not need them: choose a shard key that co-locates entities which change together. If a user and their orders live on the same shard, an order placement is one local ACID transaction and none of this applies. Sagas are for the cases that genuinely span boundaries — usually across *services*, not just shards.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Sagas where a single-shard transaction is achievable by co-locating the entities — always prefer the local transaction.',
      '2PC on hot, contended rows or across many participants; lock hold times and blocking risk dominate.',
      'Scatter-gather on user-facing paths at high shard counts — build a secondary index or read model instead.',
      'Application-enforced uniqueness for security-critical values without a dedicated registry table and careful failure handling.',
    ],
    failureModes: [
      {
        name: 'Stuck 2PC transaction',
        symptom: 'Rows locked indefinitely; queries time out on one shard.',
        cause: 'The coordinator failed between prepare and commit, leaving participants blocked.',
        fix: 'Coordinator recovery log and heuristic resolution; prefer sagas for cross-shard writes.',
      },
      {
        name: 'Orphaned saga',
        symptom: 'Inventory reserved for an order that never completed and never released.',
        cause: 'The process died mid-saga with no durable state or supervisor.',
        fix: 'Persist saga progress, run a supervisor that resumes or compensates orphans, and alert on stuck sagas.',
      },
      {
        name: 'Duplicate unique values',
        symptom: 'Two accounts with the same email exist.',
        cause: 'Uniqueness enforced per shard by a database index that only sees its own shard.',
        fix: 'A global registry table sharded by the unique attribute, written before the entity, with cleanup on failure.',
      },
      {
        name: 'Scatter-gather tail latency',
        symptom: 'p99 degrades as shards are added, despite each shard being fast.',
        cause: 'Query latency is the maximum across all shards.',
        fix: 'Secondary index tables, denormalisation, search index, and per-shard deadlines with partial results.',
      },
    ],
    interview: [
      {
        q: 'How do you run a transaction across two shards?',
        a: [
          'First I would try not to. If the entities change together, co-locating them under the same shard key turns it back into one local ACID transaction — that is the cheapest possible answer and the one I would push for.',
          'If it genuinely spans shards, two-phase commit is correct but holds locks across a network round trip and blocks if the coordinator dies between prepare and commit, which is why it is avoided at scale.',
          'So in practice: a saga — a sequence of local transactions each with a compensating action. It gives up isolation rather than just atomicity, so intermediate states become visible and must be modelled in the domain.',
        ],
        followUps: ['What happens if a compensation fails?'],
      },
      {
        q: 'A query does not include the shard key. What happens?',
        a: [
          'It becomes scatter-gather: every shard runs the query and the results are merged. That multiplies the work by shard count, and worse, latency becomes the maximum across all of them, so the aggregate p99 approaches each shard\'s p99.9.',
          'It also gets worse as you scale, which is the opposite of what sharding is supposed to do.',
          'The fixes are a secondary index table sharded by the alternate attribute, denormalising the data into the shard that needs it, or a dedicated search index fed by change data capture for genuinely arbitrary predicates.',
        ],
      },
      {
        q: 'How do you enforce a unique email across shards?',
        a: [
          'The database cannot help — a unique index only sees its own shard, so two registrations with the same email on different shards both succeed.',
          'I would keep a dedicated registry table sharded by email itself, and write to it first: claim the email, then create the user. Since the registry is sharded by email, all claims for one address land on the same shard and its unique index does work.',
          'That introduces a failure window where a claim exists but the user creation failed, so the claim needs a TTL or a cleanup job, and the claim write must be idempotent for retries.',
        ],
      },
    ],
    references: [
      { label: 'microservices.io — Saga pattern', href: 'https://microservices.io/patterns/data/saga.html' },
      { label: 'Vitess — Cross-shard queries and transaction modes', href: 'https://vitess.io/docs/reference/features/two-phase-commit/' },
    ],
  },
}

// ── 4. Distributed ID generation ─────────────────────────────────────────────

const ids: Lesson = {
  slug: 'sharding-ids',
  title: 'Distributed ID Generation',
  summary: 'AUTO_INCREMENT dies at the shard boundary — what replaces it changes your index performance.',
  group: 'scaling-patterns',
  topic: 'Sharding',
  tier: 'pro',
  minutes: 8,
  concept: 'Concept',
  tags: [
    { label: 'Need', value: 'Unique without coordination' },
    { label: 'Want', value: 'Roughly time-ordered' },
    { label: 'Watch', value: 'B-tree write amplification' },
  ],
  notes: [
    'Every shard running its own AUTO_INCREMENT produces the same ids on different rows.',
    'Random UUIDv4 keys scatter B-tree inserts across the whole index and destroy write throughput.',
    'Snowflake and UUIDv7 are time-prefixed: unique, uncoordinated, and still append-friendly.',
  ],
  scene: {
    code: [
      '# Snowflake: 64 bits, no coordination',
      'id = (timestamp_ms - EPOCH) << 22',
      '   | (machine_id  << 12)',
      '   | sequence',
      '',
      '# same shape, 128 bits, standardised',
      'id = uuid7()   # time prefix + random suffix',
    ],
    initialState: { scheme: 'auto-increment', collisions: 'yes', 'index writes': 'sequential', sortable: 'yes' },
    nodes: [
      { id: 'app1', kind: 'server', label: 'Node 1', x: 14, y: 24 },
      { id: 'app2', kind: 'server', label: 'Node 2', x: 14, y: 76 },
      { id: 's1', kind: 'database', label: 'Shard A', x: 52, y: 24, badge: 'id 1,2,3' },
      { id: 's2', kind: 'database', label: 'Shard B', x: 52, y: 76, badge: 'id 1,2,3' },
      { id: 'idx', kind: 'cache', label: 'B-tree index', x: 88, y: 50, badge: 'appending' },
    ],
    edges: [
      { id: 'a1-s1', from: 'app1', to: 's1' },
      { id: 'a2-s2', from: 'app2', to: 's2' },
      { id: 's1-idx', from: 's1', to: 'idx', curve: -0.25 },
      { id: 's2-idx', from: 's2', to: 'idx', curve: 0.25 },
    ],
    steps: [
      { id: '1', caption: 'Each shard runs its own AUTO_INCREMENT, so both mint id 1, 2, 3 for different rows.', travel: 'a1-s1', token: 'write', patches: [{ nodeId: 's1', badge: 'id 1,2,3' }, { nodeId: 's2', badge: 'id 1,2,3 ✗', highlight: true }], state: { scheme: 'auto-increment', collisions: 'yes' } },
      { id: '2', caption: 'A single central sequence would fix uniqueness — and become a coordination bottleneck.', travel: 'a2-s2', token: 'miss', patches: [{ nodeId: 's2', badge: 'waiting on sequence', highlight: true }] },
      { id: '3', caption: 'UUIDv4 solves it with randomness: unique everywhere, no coordination at all.', patches: [{ nodeId: 's1', badge: 'a3f9… random', highlight: true }], state: { scheme: 'UUIDv4', collisions: 'no', sortable: 'no' } },
      { id: '4', caption: 'But random keys insert all over the B-tree — every write touches a different page.', travel: 's1-idx', token: 'write', patches: [{ nodeId: 'idx', badge: 'random pages ✗', highlight: true }], state: { 'index writes': 'random · slow' } },
      { id: '5', caption: 'Cache hit rate collapses, pages split constantly, and write throughput drops several fold.', patches: [{ nodeId: 'idx', badge: 'splits · 3× slower', highlight: true }] },
      { id: '6', caption: 'Snowflake puts the timestamp in the high bits — unique, uncoordinated, and time-ordered.', codeLine: 2, patches: [{ nodeId: 's1', badge: '17…|node1|seq', highlight: true }, { nodeId: 's2', badge: '17…|node2|seq' }], state: { scheme: 'Snowflake', collisions: 'no', sortable: 'yes' } },
      { id: '7', caption: 'Inserts land at the right edge of the index again — sequential, cache-friendly writes.', travel: 's2-idx', token: 'hit', codeLine: 6, patches: [{ nodeId: 'idx', badge: 'appending ✓', highlight: true }], state: { 'index writes': 'sequential · fast' } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'Auto-increment ids are a coordination primitive disguised as a convenience: they work because exactly one process hands out numbers. Shard the database and that assumption breaks — every shard starts at 1 and mints ids that collide across the cluster.',
      'The replacement matters more than it looks, because the id becomes the **primary key**, and primary keys drive physical storage layout. A choice that is correct on uniqueness can quietly cost you most of your write throughput.',
    ],
    sections: [
      {
        id: 'options',
        heading: 'The options, and what each trades',
        blocks: [
          {
            kind: 'table',
            columns: ['Scheme', 'Bits', 'Coordination', 'Time-sortable', 'Leaks info'],
            rows: [
              ['Per-shard AUTO_INCREMENT', '64', 'Per shard', 'Within a shard', 'Volume per shard'],
              ['Central sequence service', '64', 'Every id', 'Yes', 'Total volume'],
              ['Range allocation (blocks)', '64', 'Per 10k ids', 'Roughly', 'Volume'],
              ['UUIDv4 (random)', '128', 'None', 'No', 'Nothing'],
              ['UUIDv7 (time-ordered)', '128', 'None', 'Yes', 'Creation time'],
              ['Snowflake', '64', 'Machine id only', 'Yes', 'Creation time, volume'],
              ['ULID', '128', 'None', 'Yes', 'Creation time'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'Snowflake is the canonical design and worth being able to draw from memory: **41 bits of millisecond timestamp**, **10 bits of machine id**, **12 bits of per-millisecond sequence**, in one 64-bit integer. That gives 4,096 ids per millisecond per machine, 1,024 machines, and roughly 69 years of timestamps from a chosen epoch.',
              'UUIDv7 is the same idea standardised into the UUID format: a 48-bit millisecond timestamp followed by random bits. It needs no machine-id allocation at all, which removes the one operational wrinkle Snowflake has, at the cost of 128 bits instead of 64.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Snowflake timestamp bits', value: '41', note: '~69 years' },
              { label: 'Machine bits', value: '10', note: '1,024 nodes' },
              { label: 'Sequence bits', value: '12', note: '4,096 per ms per node' },
              { label: 'Theoretical ceiling', value: '~4.1 M ids/sec/node' },
              { label: 'Cluster ceiling', value: '~4.2 B ids/sec' },
            ],
            result: 'Two bit-fields and a clock replace a global coordinator entirely.',
          },
        ],
      },
      {
        id: 'btree',
        heading: 'Why random ids destroy write throughput',
        blocks: [
          {
            kind: 'prose',
            body: [
              'This is the part most people miss, and it is the strongest argument in the whole topic. A B-tree index stores rows in key order. With a **monotonic** key, every insert lands at the right edge — the same few pages, already in memory, filling neatly.',
              'With a **random** key, each insert targets a random page. That page is probably not cached, so you pay a read before the write; the page is probably partly full, so it splits; and your working set becomes the entire index rather than its right edge.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Index size', value: '50 GB' },
              { label: 'Buffer pool', value: '8 GB' },
              { label: 'Sequential key — pages touched per insert', value: '~1', note: 'cached' },
              { label: 'Random key — cache hit probability', value: '~16%' },
              { label: 'Random key — page splits', value: 'Frequent' },
              { label: 'Observed insert throughput penalty', value: '3–10×' },
              { label: 'Index bloat from splits', value: '30–50% larger' },
            ],
            result: 'A random primary key can cost more throughput than sharding gained.',
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'The cost is worst exactly where it hurts',
            body: [
              'The penalty scales with how much your index exceeds RAM — so it is invisible in development and on a small production table, and appears months later as a mysterious, gradual write slowdown that no query plan explains. This is why UUIDv7 exists and why UUIDv4 primary keys are a well-known anti-pattern in MySQL and Postgres.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'snowflake.py — monotonic, uncoordinated, clock-aware',
            lines: [
              'EPOCH = 1704067200000       # 2024-01-01, chosen once, forever',
              '',
              'class Snowflake:',
              '    def __init__(self, machine_id):',
              '        assert 0 <= machine_id < 1024',
              '        self.machine_id = machine_id',
              '        self.last_ms = -1',
              '        self.sequence = 0',
              '',
              '    def next_id(self):',
              '        now = int(time.time() * 1000)',
              '',
              '        if now < self.last_ms:',
              '            # Clock went backwards (NTP step). Never mint duplicates:',
              '            # wait it out rather than reusing a timestamp.',
              '            time.sleep((self.last_ms - now) / 1000)',
              '            now = int(time.time() * 1000)',
              '',
              '        if now == self.last_ms:',
              '            self.sequence = (self.sequence + 1) & 0xFFF',
              '            if self.sequence == 0:            # 4096 exhausted this ms',
              '                while now <= self.last_ms:',
              '                    now = int(time.time() * 1000)',
              '        else:',
              '            self.sequence = 0',
              '',
              '        self.last_ms = now',
              '        return ((now - EPOCH) << 22) | (self.machine_id << 12) | self.sequence',
            ],
          },
        ],
      },
      {
        id: 'operational',
        heading: 'The operational details that bite',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Machine id allocation.** Snowflake needs each node to have a unique one. Static config breaks with autoscaling; the usual fixes are ZooKeeper/etcd leases, a hash of the pod ordinal in a StatefulSet, or switching to UUIDv7 which needs none.',
              '**Clock skew and NTP steps.** If the clock jumps backwards, a naive generator re-mints timestamps and can produce duplicates. Detect and wait, and monitor clock drift as a first-class metric.',
              '**Sequence exhaustion.** 4,096 per millisecond per node is a lot until a bulk import; the generator must spin to the next millisecond rather than wrapping silently.',
              '**Ordering is approximate.** Ids from different machines in the same millisecond have no meaningful relative order. Never use id ordering as a substitute for a timestamp column or a logical clock.',
              '**Ids leak information.** A time-prefixed id reveals when a record was created, and sequential ids reveal volume. If that matters, expose an opaque public id and keep the sortable one internal.',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Two ids is often the right answer',
            body: [
              'Use a time-ordered id (UUIDv7 or Snowflake) as the internal primary key for storage efficiency, and a separate opaque, random public id for URLs and APIs. You get append-friendly writes and no information disclosure, at the cost of one extra indexed column.',
            ],
          },
        ],
      },
      {
        id: 'shardkey',
        heading: 'The id and the shard key are not the same decision',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A common conflation: using the generated id as the shard key. They serve different purposes and often want different properties.',
              'The **id** should be monotonic for index efficiency. The **shard key** should distribute evenly — and a monotonic value distributes terribly under range partitioning, since every new row targets the newest shard.',
            ],
          },
          {
            kind: 'table',
            columns: ['Design', 'Id property', 'Shard placement', 'Result'],
            rows: [
              ['Snowflake id, range-sharded by id', 'Monotonic', 'All writes to newest shard', 'Hotspot — avoid'],
              ['Snowflake id, hash-sharded by id', 'Monotonic', 'Even', 'Good; loses range scans'],
              ['Snowflake id, sharded by user_id', 'Monotonic', 'Even, query-aligned', 'Usually best'],
              ['Snowflake with shard id embedded', 'Monotonic', 'Encoded in the id', 'Routing without a lookup'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'The last row is a neat trick used by several large systems: dedicate some of the machine-id bits to the **shard number**, so the id itself tells you where the row lives. Routing needs no directory lookup, at the cost of making the id and the placement permanently coupled — moving a row between shards then invalidates its id.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Lead with the B-tree argument',
            body: [
              'Most candidates answer "use UUIDs" and stop. Adding "but not UUIDv4 as a primary key — random keys scatter B-tree inserts, so once the index exceeds RAM you lose several times your write throughput; I would use UUIDv7 or Snowflake so inserts stay at the right edge of the index" is the answer that demonstrates production experience.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'A central sequence service in a high-write system — it is a coordination bottleneck and a single point of failure.',
      'UUIDv4 as a clustered primary key on large tables; the write amplification is severe and appears only at scale.',
      'Snowflake without a reliable machine-id allocation story under autoscaling — prefer UUIDv7 there.',
      'Time-ordered public ids where creation time or volume is sensitive; expose an opaque id instead.',
    ],
    failureModes: [
      {
        name: 'Duplicate ids after a clock step',
        symptom: 'Primary key violations following an NTP correction.',
        cause: 'The clock moved backwards and the generator reused timestamps.',
        fix: 'Detect backwards movement and wait it out; monitor clock drift; never mint on a stale timestamp.',
      },
      {
        name: 'Machine id collision',
        symptom: 'Two nodes generate identical ids after a scaling event.',
        cause: 'Static machine ids reused, or allocation racing on startup.',
        fix: 'Lease ids from etcd/ZooKeeper, derive from a StatefulSet ordinal, or switch to UUIDv7.',
      },
      {
        name: 'Write throughput collapse',
        symptom: 'Insert rate degrades steadily as a table grows past memory.',
        cause: 'Random primary keys causing scattered B-tree page access and splits.',
        fix: 'Migrate to a time-ordered id; keep the random value as a secondary public identifier.',
      },
      {
        name: 'Hot shard from monotonic ids',
        symptom: 'The newest shard receives every write.',
        cause: 'Range-sharding on a monotonically increasing id.',
        fix: 'Hash the id for placement, or shard on an entity key such as user id instead.',
      },
    ],
    interview: [
      {
        q: 'How do you generate unique ids across shards?',
        a: [
          'Without coordination, using a time-prefixed scheme. Snowflake packs a 41-bit millisecond timestamp, a 10-bit machine id and a 12-bit sequence into 64 bits, which gives about four thousand ids per millisecond per node and needs no central sequence.',
          'UUIDv7 is the same idea in the standard UUID format and avoids machine-id allocation entirely, which matters under autoscaling — at the cost of 128 bits rather than 64.',
          'I would avoid a central sequence service, since it becomes a coordination bottleneck and a single point of failure on the write path.',
        ],
        followUps: ['Why not just use UUIDv4?'],
      },
      {
        q: 'Why not UUIDv4?',
        a: [
          'Uniqueness is fine; the problem is physical storage. A B-tree keeps rows in key order, so a monotonic key appends to the right edge of the index — the same few pages, already cached. A random key targets a random page on every insert, which is usually not cached, so you pay a read before every write and the pages split constantly.',
          'The penalty is typically three to ten times on insert throughput once the index exceeds the buffer pool, plus significant index bloat.',
          'And it is invisible in development, appearing months later as a gradual write slowdown — which is exactly why UUIDv7 was standardised.',
        ],
      },
      {
        q: 'Should the id also be the shard key?',
        a: [
          'Usually not, because they want opposite properties. The id should be monotonic for index efficiency, and a monotonic value is the worst possible range-shard key — every new row lands on the newest shard, creating a permanent hotspot.',
          'I would shard on an entity key such as user id, which distributes evenly and aligns with the common queries, while keeping a time-ordered id as the primary key.',
          'One neat option is embedding the shard number in some of the id\'s bits so routing needs no directory lookup — though that permanently couples the id to placement, so moving a row between shards invalidates it.',
        ],
      },
    ],
    references: [
      { label: 'Instagram — Sharding & IDs at Instagram', href: 'https://instagram-engineering.com/sharding-ids-at-instagram-1cf5a71e5a5c' },
      { label: 'RFC 9562 — UUID versions 6, 7 and 8', href: 'https://datatracker.ietf.org/doc/html/rfc9562' },
    ],
  },
}

// ── 5. Online resharding ─────────────────────────────────────────────────────

const resharding: Lesson = {
  slug: 'sharding-resharding',
  title: 'Online Resharding',
  summary: 'Split a shard while it serves traffic — backfill, dual-write, verify, cut over.',
  group: 'scaling-patterns',
  topic: 'Sharding',
  tier: 'pro',
  minutes: 8,
  concept: 'Migration',
  tags: [
    { label: 'Rule', value: 'Never a big-bang cutover' },
    { label: 'Order', value: 'Backfill → dual-write → verify' },
    { label: 'Trick', value: 'Many logical shards' },
  ],
  notes: [
    'Over-provision logical shards so rebalancing moves whole units rather than rehashing rows.',
    'The migration is always: copy, dual-write, verify continuously, shift reads gradually, then stop.',
    'Every step must be reversible until the very last one.',
  ],
  scene: {
    code: [
      '# 1024 logical shards, 4 physical nodes',
      'logical  = hash(key) % 1024',
      'physical = shard_map[logical]     # a lookup, not a modulo',
      '',
      '# moving a logical shard is a range copy',
      'copy(range) -> dual_write -> verify -> cutover',
    ],
    initialState: { 'logical shards': 1024, nodes: 4, moving: 'none', reads: 'old', drift: 0 },
    nodes: [
      { id: 'app', kind: 'client', label: 'App', x: 10, y: 50 },
      { id: 'router', kind: 'apiGateway', label: 'Shard router', x: 34, y: 50, badge: 'map v1' },
      { id: 'n1', kind: 'database', label: 'Node 1 · 0–341', x: 66, y: 20, badge: '341 shards' },
      { id: 'n2', kind: 'database', label: 'Node 2 · 342–682', x: 66, y: 50, badge: '341 shards' },
      { id: 'n4', kind: 'database', label: 'Node 4 (new)', x: 92, y: 76, badge: 'empty' },
    ],
    edges: [
      { id: 'a-r', from: 'app', to: 'router' },
      { id: 'r-n1', from: 'router', to: 'n1', curve: -0.25 },
      { id: 'r-n2', from: 'router', to: 'n2' },
      { id: 'r-n4', from: 'router', to: 'n4', curve: 0.3 },
      { id: 'n1-n4', from: 'n1', to: 'n4', curve: 0.2 },
    ],
    steps: [
      { id: '1', caption: '1,024 logical shards across 4 nodes. The router maps logical → physical via a table.', codeLine: 3, patches: [{ nodeId: 'router', badge: 'map v1', highlight: true }], state: { 'logical shards': 1024, nodes: 4 } },
      { id: '2', caption: 'Node 1 is hot. We move logical shards 0–85 to a new node — a copy, not a rehash.', travel: 'n1-n4', token: 'write', codeLine: 6, patches: [{ nodeId: 'n4', badge: 'backfilling', highlight: true }], state: { moving: 'shards 0–85' } },
      { id: '3', caption: 'Backfill runs throttled in the background. Traffic is untouched and reads still go to Node 1.', patches: [{ nodeId: 'n4', badge: '62% copied' }], state: { reads: 'old' } },
      { id: '4', caption: 'Then dual-write: every write to those shards goes to both old and new. Old is still authoritative.', travel: 'r-n4', token: 'write', patches: [{ nodeId: 'router', badge: 'dual-write', highlight: true }, { nodeId: 'n4', badge: 'in sync' }] },
      { id: '5', caption: 'A continuous verifier compares both copies. Drift must reach zero and stay there.', patches: [{ nodeId: 'n4', badge: 'drift 0 ✓', highlight: true }], state: { drift: 0 } },
      { id: '6', caption: 'Shift reads gradually — 1%, then 10%, then all. Any anomaly and we shift back instantly.', travel: 'r-n4', token: 'hit', patches: [{ nodeId: 'n4', badge: 'serving 10%', highlight: true }], state: { reads: '10% new' } },
      { id: '7', caption: 'Publish map v2, stop dual-writing, and only then delete the old copy.', patches: [{ nodeId: 'router', badge: 'map v2 ✓', highlight: true }, { nodeId: 'n4', badge: '86 shards ✓' }, { nodeId: 'n1', badge: '255 shards' }], state: { moving: 'none', reads: 'new', nodes: 5 } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'Adding capacity to a sharded system is where the design decisions you made months earlier get graded. Done well, it is a routine background operation nobody notices. Done badly, it is an outage plus a data-integrity investigation.',
      'Almost all of the difficulty is avoidable with one choice made up front: **create far more logical shards than physical machines.** Then growth is moving whole logical units between machines — a copy — rather than recomputing where every row belongs.',
    ],
    sections: [
      {
        id: 'logical',
        heading: 'Logical shards: the decision that makes this easy',
        blocks: [
          {
            kind: 'prose',
            body: [
              'If placement is `hash(key) % physical_nodes`, changing the node count relocates nearly every row. If it is `hash(key) % 1024` followed by a **lookup** of which machine owns that logical shard, then adding a machine means reassigning some entries in a small table.',
              'The indirection costs one map lookup — the map is a few kilobytes and cached everywhere — and converts resharding from a data-rewriting project into a data-moving operation.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Logical shards', value: '1,024' },
              { label: 'Physical nodes today', value: '4' },
              { label: 'Logical shards per node', value: '256' },
              { label: 'Adding a 5th node moves', value: '~205 logical shards', note: '~20% of data' },
              { label: 'Rows rehashed', value: '0', note: 'placement unchanged' },
              { label: 'Max nodes without resharding logically', value: '1,024' },
            ],
            result: 'Choose the logical count once, generously; you should never need to change it.',
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Same idea, four names',
            body: [
              'Redis Cluster calls them hash slots (16,384). Cassandra calls them vnodes. Elasticsearch calls them shards. Vitess calls them keyspace ranges. All are the same principle: **many more units of assignment than machines**, so rebalancing moves units, not data-by-key.',
            ],
          },
        ],
      },
      {
        id: 'procedure',
        heading: 'The migration, step by step',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Whether you are splitting a shard, adding a node, or changing the shard key entirely, the sequence is the same — and every step before the last is reversible.',
            ],
          },
          {
            kind: 'list',
            ordered: true,
            items: [
              '**Route through an indirection layer first.** If queries currently address databases directly, introduce the router *before* any migration and verify it in isolation. Debugging a router and a migration simultaneously is how these go wrong.',
              '**Backfill.** Copy the data in throttled batches, watching replication lag and production latency. This is the long step, and it is safe: nothing reads the new copy yet.',
              '**Dual-write.** Writes go to both old and new; old remains authoritative. New writes must not be lost during the remaining backfill, so this usually starts before the copy completes and the backfill skips rows already dual-written.',
              '**Verify continuously.** Compare source and destination — full checksums for small ranges, sampled row-by-row comparison for large ones — until drift is zero and stays zero across a full traffic cycle.',
              '**Shift reads gradually.** 1%, 10%, 50%, 100%, with automatic rollback triggers on error rate and latency. Reads are safe to shift because the data is verified identical.',
              '**Cut over writes.** Publish the new shard map. Keep dual-writing for a soak period so rollback remains possible.',
              '**Stop dual-writing, then delete.** Deleting the old copy is the first irreversible action — do it days later, not minutes.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'reshard.py — throttled backfill that respects production',
            lines: [
              'def backfill(logical_shard, batch=1000):',
              '    cursor = load_checkpoint(logical_shard)     # resumable',
              '    while True:',
              '        rows = source.query(',
              '            "SELECT * FROM t WHERE shard = %s AND id > %s "',
              '            "ORDER BY id LIMIT %s", logical_shard, cursor, batch)',
              '        if not rows:',
              '            break',
              '',
              '        # Never overwrite a newer value written by dual-write.',
              '        dest.upsert_if_older(rows)',
              '        cursor = rows[-1].id',
              '        save_checkpoint(logical_shard, cursor)',
              '',
              '        # Back off when we are hurting production.',
              '        if replication_lag() > 5 or p99_latency() > SLO:',
              '            sleep(5)',
              '        else:',
              '            sleep(0.05)',
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'The backfill must not overwrite live writes',
            body: [
              'Once dual-write is on, the destination may hold a **newer** row than the source snapshot the backfill is copying. A naive `INSERT … ON CONFLICT UPDATE` will overwrite it with stale data, silently. Use conditional upserts guarded by a version or updated-at column, and make the backfill idempotent so it can be resumed after any interruption.',
            ],
          },
        ],
      },
      {
        id: 'verification',
        heading: 'Verification is the step people skip',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Every difficult resharding post-mortem contains the same sentence: the data looked fine. Verification is what turns "we believe it copied correctly" into evidence, and it must run *continuously* rather than once, because dual-write bugs produce drift over time rather than at a moment.',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Row counts per range** as a cheap continuous signal — divergence means something is wrong even if you do not yet know what.',
              '**Checksums over ranges** to detect content differences, computed in chunks so they can run alongside traffic.',
              '**Shadow reads**: serve from the old shard but also read from the new one and compare, logging mismatches without affecting users. This exercises the real read path, not just the data.',
              '**Compare across a full cycle** — a day at minimum — so batch jobs, nightly processes and weekly traffic patterns are all covered.',
              '**Alert on any non-zero drift.** A handful of mismatched rows is not an acceptable baseline; it is an unexplained bug.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Rows in the moving range', value: '400 M' },
              { label: 'Backfill rate (throttled)', value: '5,000 rows/s' },
              { label: 'Backfill duration', value: '~22 h' },
              { label: 'Dual-write soak', value: '48 h' },
              { label: 'Read shift ramp', value: '24 h' },
              { label: 'Total elapsed', value: '~4 days' },
            ],
            result: 'Resharding is measured in days. Plan it before you need it urgently.',
          },
        ],
      },
      {
        id: 'shardkey',
        heading: 'Changing the shard key itself',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Adding capacity is routine. Discovering the shard key is **wrong** — it skews, or the dominant query does not include it — is the expensive case, because every row must move and the routing logic changes.',
              'The procedure is the same but the scope is total: it is effectively building a second copy of the entire dataset with different placement, then migrating to it. Teams that have done this describe it in months.',
            ],
          },
          {
            kind: 'table',
            columns: ['Change', 'Data moved', 'Typical duration', 'Risk'],
            rows: [
              ['Add a node', '~1/N of data', 'Hours to days', 'Low'],
              ['Split a hot logical shard', 'One shard', 'Hours', 'Low'],
              ['Increase logical shard count', 'Most data', 'Weeks', 'High — avoid by over-provisioning'],
              ['Change the shard key', 'All data', 'Weeks to months', 'Very high'],
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Say what you did to make this cheap',
            body: [
              'The strongest answer starts before the migration: "I would have created a thousand logical shards up front, so adding capacity is reassigning ranges rather than rehashing rows — then the migration is backfill, dual-write, verify, shift reads, and the only irreversible step is deleting the old copy days later."',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Big-bang cutovers with a maintenance window — they remove your ability to roll back at the moment you most need it.',
      'Migrating without an indirection layer already in place and verified.',
      'Unthrottled backfills; they will degrade production and often trigger replication lag incidents.',
      'Deleting the source data at cutover rather than after a soak period.',
    ],
    failureModes: [
      {
        name: 'Backfill overwrites live writes',
        symptom: 'Recent updates silently revert to older values.',
        cause: 'Unconditional upsert from a stale snapshot over rows already dual-written.',
        fix: 'Conditional upsert guarded by version or updated-at; make the backfill idempotent and resumable.',
      },
      {
        name: 'Backfill destabilises production',
        symptom: 'Replication lag and p99 latency spike during migration.',
        cause: 'Copy running at full speed alongside production traffic.',
        fix: 'Throttle by observed lag and latency; run during low-traffic windows; read from a replica.',
      },
      {
        name: 'Split-brain routing',
        symptom: 'Some clients read the old shard and some the new; writes land in both.',
        cause: 'Shard map updated without versioning or coordinated rollout.',
        fix: 'Version the map, roll it out gradually, and keep dual-write on until every client has converged.',
      },
      {
        name: 'Undetected drift',
        symptom: 'Missing or stale rows discovered weeks after cutover.',
        cause: 'Verification run once at the end rather than continuously.',
        fix: 'Continuous checksums and shadow reads across a full traffic cycle before shifting reads.',
      },
    ],
    interview: [
      {
        q: 'How do you add a shard without downtime?',
        a: [
          'Ideally the design already makes it easy: many more logical shards than physical nodes, with a lookup table mapping logical to physical. Then adding a node is reassigning some logical shards, which is a data copy rather than a rehash.',
          'The procedure is backfill in throttled batches, then dual-write to old and new while the old stays authoritative, then verify continuously with checksums and shadow reads until drift is zero across a full traffic cycle.',
          'Only then shift reads gradually with automatic rollback, publish the new map, and keep dual-writing through a soak period. Deleting the old copy is the first irreversible step and happens days later.',
        ],
        followUps: ['What if the backfill races with a live write?'],
      },
      {
        q: 'What makes resharding hard if you did not plan for it?',
        a: [
          'Placement computed as hash modulo node count. Changing the node count then relocates nearly every row, so the migration is rewriting the whole dataset rather than moving units of it — and during the transition a key can legitimately live in two places.',
          'The fix is indirection: fix the logical shard count high, say a thousand, and map logical to physical through a table. Redis calls them slots, Cassandra vnodes, Elasticsearch shards — the same idea each time.',
          'If that was not done up front, increasing the logical count is itself a full migration, which is why over-provisioning early is worth so much.',
        ],
      },
      {
        q: 'You discover the shard key is wrong. Now what?',
        a: [
          'It is the expensive case, because every row moves and the routing changes — effectively building a second copy of the dataset with different placement and migrating to it. Realistically weeks to months, not days.',
          'The mechanics are the same as any migration — backfill, dual-write, verify, shift reads — but the scope is total, so I would do it incrementally by entity or tenant rather than all at once, keeping both placements live throughout.',
          'And before committing to it I would check whether a secondary index table or a denormalised read model solves the actual query problem, since that is dramatically cheaper than re-keying the dataset.',
        ],
      },
    ],
    references: [
      { label: 'Vitess — Resharding workflow', href: 'https://vitess.io/docs/user-guides/configuration-advanced/resharding/' },
      { label: 'Stripe — Online migrations at scale', href: 'https://stripe.com/blog/online-migrations' },
    ],
  },
}

export const shardingTopic: Lesson[] = [
  sharding,
  shardingHotspot,
  crossShard,
  ids,
  resharding,
]
