import type { Lesson } from '../types'

/**
 * Topic: Caching.
 * The reference topic for the deep-dive format — every lesson pairs an animated
 * scene with a `deepDive` covering mechanism, trade-offs, capacity math,
 * failure modes and interview questions.
 */

// ── 1. Cache-aside ───────────────────────────────────────────────────────────

const cacheAside: Lesson = {
  slug: 'caching',
  title: 'Cache-Aside (Lazy Loading)',
  summary: 'Serve hot data from memory; fall back to the database only on a miss.',
  group: 'building-blocks',
  topic: 'Caching',
  tier: 'free',
  minutes: 7,
  concept: 'Concept',
  tags: [
    { label: 'Latency', value: 'Sub-ms reads' },
    { label: 'Consistency', value: 'Eventual (TTL)' },
    { label: 'Trade-off', value: 'Freshness vs Speed' },
  ],
  notes: [
    'Cache-aside: the app checks the cache first. On a miss it reads the DB, then stores the result.',
    'The next read for the same key is a hit — served from memory in microseconds.',
    'A TTL expires stale entries so the cache does not serve outdated data forever.',
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
      { id: '2', caption: "Cache miss — the key isn't there yet.", travel: 'cache-c', token: 'miss', codeLine: 2, patches: [{ nodeId: 'cache', badge: 'MISS', highlight: true }], state: { misses: 1 } },
      { id: '3', caption: 'So the app falls back to the database.', travel: 'c-db', token: 'request', codeLine: 3 },
      { id: '4', caption: 'The DB returns the value, and the app populates the cache with a TTL.', travel: 'db-cache', token: 'write', codeLine: 4, patches: [{ nodeId: 'cache', badge: '1 key', highlight: true }], state: { 'cache size': 1 } },
      { id: '5', caption: "The same request again — this time it's a cache HIT.", travel: 'c-cache', token: 'hit', codeLine: 1, patches: [{ nodeId: 'cache', badge: 'HIT', highlight: true }], state: { hits: 1 } },
      { id: '6', caption: 'Served from memory — no database touch. Hit rate climbs as traffic repeats.', travel: 'cache-c', token: 'hit', codeLine: 5, state: { 'hit rate': '50%' } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'Cache-aside (also called **lazy loading**) is the default caching pattern on the internet. The cache is a dumb key-value box that knows nothing about your database — **your application code owns the logic**: look in the cache, and on a miss, read the source of truth and put the result back.',
      'That single design decision is why it is everywhere: the cache can fail entirely and your system still serves correct answers, just slower. Every other pattern on this page trades some of that safety for something else.',
    ],
    sections: [
      {
        id: 'mechanism',
        heading: 'The mechanism, precisely',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A read does at most two hops. The app asks the cache for `user:42`. If the cache returns a value, that is a **hit** and the request is done in a few hundred microseconds. If it returns nothing, that is a **miss**: the app queries the database, writes the result into the cache with a TTL, and returns it. The next reader of `user:42` gets a hit.',
              'Writes are where cache-aside gets opinionated. The app writes to the database and then **deletes** the cache key — it does not update it. Deleting is safer than updating because it is idempotent and it cannot leave a wrong value behind if two writers race.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'cache_aside.py — the read and write paths',
            lines: [
              'def get_user(user_id):',
              '    key = f"user:{user_id}"',
              '    cached = cache.get(key)',
              '    if cached is not None:',
              '        return json.loads(cached)          # HIT',
              '',
              '    row = db.query("SELECT * FROM users WHERE id = %s", user_id)',
              '    if row is None:',
              '        cache.set(key, NULL_SENTINEL, ex=30)  # negative cache',
              '        return None',
              '',
              '    cache.set(key, json.dumps(row), ex=300)   # populate, 5 min TTL',
              '    return row',
              '',
              'def update_user(user_id, patch):',
              '    db.execute("UPDATE users SET ... WHERE id = %s", user_id)',
              '    cache.delete(f"user:{user_id}")        # invalidate, do NOT set',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Delete on write, never update on write',
            body: [
              'If you `cache.set()` on write, two concurrent writers can interleave so that the *older* value lands in the cache last and sticks there until the TTL expires. `cache.delete()` has no such ordering hazard — the worst case is an extra miss.',
            ],
          },
        ],
      },
      {
        id: 'why',
        heading: 'Why it is worth the complexity',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Caching is only ever justified by the **latency and cost gap** between memory and durable storage. Memorising the rough ladder below is what lets you defend a cache in an interview without hand-waving.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'L1 cache reference', value: '~1 ns' },
              { label: 'Main memory reference', value: '~100 ns' },
              { label: 'Redis GET, same datacenter', value: '~0.5 ms', note: 'dominated by network' },
              { label: 'Postgres indexed lookup, warm', value: '~1–5 ms' },
              { label: 'Postgres query hitting disk', value: '~10–50 ms' },
              { label: 'Cross-region round trip', value: '~70–150 ms' },
            ],
            result: 'A cache hit is roughly 10–100× cheaper than the query it replaces.',
          },
          {
            kind: 'prose',
            body: [
              'The payoff is non-linear, and this is the part most candidates get wrong. **Average latency is governed by the miss rate, not the hit rate.** With a 0.5 ms hit and a 20 ms miss, going from 90% to 99% hit rate does not shave 9% off your latency — it takes the average from 2.45 ms to 0.7 ms, a 3.5× improvement, because you removed 90% of the *remaining* database traffic.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: '90% hit rate', value: '2.45 ms', note: '0.9(0.5) + 0.1(20)' },
              { label: '95% hit rate', value: '1.48 ms' },
              { label: '99% hit rate', value: '0.70 ms' },
              { label: 'DB load at 90% vs 99%', value: '10× lower' },
            ],
            result: 'The last few points of hit rate are where the database survives.',
          },
        ],
      },
      {
        id: 'sizing',
        heading: 'Sizing the cache: back-of-the-envelope',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Interviewers ask "how big should the cache be?" to see whether you reason about the **working set** rather than the total dataset. You cache what is hot, not what exists. Traffic to most systems is Zipfian: the top ~20% of keys serve ~80% of reads.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Total users', value: '50 M' },
              { label: 'Daily active users (hot set)', value: '5 M', note: '10%' },
              { label: 'Serialised profile size', value: '2 KB' },
              { label: 'Raw working set', value: '10 GB', note: '5M × 2KB' },
              { label: 'Redis overhead factor', value: '~1.3×', note: 'keys, pointers, fragmentation' },
              { label: 'Headroom for spikes', value: '~1.5×' },
            ],
            result: 'Provision ≈ 20 GB — comfortably one node, or 3 for HA.',
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Say the number, then say the check',
            body: [
              'Follow the estimate with the observable that validates it: "I would then watch `evicted_keys` and the hit rate. If evictions are non-zero while hit rate sags, the working set is bigger than I assumed and I scale memory before I touch the eviction policy."',
            ],
          },
        ],
      },
      {
        id: 'tradeoffs',
        heading: 'Cache-aside vs the alternatives',
        blocks: [
          {
            kind: 'table',
            columns: ['Pattern', 'Who talks to the DB', 'Read after write', 'Best for'],
            rows: [
              ['Cache-aside', 'Application', 'Miss, then repopulate', 'Read-heavy, tolerant of brief staleness'],
              ['Read-through', 'Cache library / provider', 'Miss handled inside the cache', 'When you want the miss logic centralised'],
              ['Write-through', 'Cache, synchronously', 'Always a hit', 'Read-after-write correctness matters'],
              ['Write-back', 'Cache, asynchronously', 'Always a hit', 'Write-heavy, loss-tolerant counters'],
            ],
            caption: 'Cache-aside is the only one where a total cache outage is merely a slowdown.',
          },
          {
            kind: 'list',
            items: [
              '**Resilience.** The cache is optional. Lose Redis and you serve from the database — degraded, not down (assuming the DB can take the load, which is exactly what a stampede test verifies).',
              '**Only what is asked for is cached.** No wasted memory on cold keys, but every key pays one cold miss.',
              '**Two systems can disagree.** Between the DB write and the cache delete there is a window where readers see the old value. Usually microseconds; occasionally not.',
              '**The logic lives in your code.** Every service that reads the key must implement the same pattern, or one of them will serve uncached, or worse, cache badly.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'The data changes on nearly every read (a live counter, a ticking balance) — you pay cache cost for a permanent miss rate.',
      'Correctness requires read-your-own-writes with no window at all — money movement, inventory decrements at checkout. Use write-through, or read those specific keys from the primary.',
      'The dataset has no hot set: uniformly random access over billions of keys means your hit rate approximates cache size ÷ dataset size, which is usually not worth the operational cost.',
      'The query is already sub-millisecond and the database is bored. A cache you did not need is one more thing that can serve you a wrong answer.',
    ],
    failureModes: [
      {
        name: 'Cache stampede',
        symptom: 'One popular key expires and database CPU spikes to 100% for a few seconds.',
        cause: 'Thousands of concurrent requests all miss the same key and all run the same expensive query.',
        fix: 'Single-flight locking, probabilistic early expiry, or a background refresh. Covered fully in the Stampede lesson.',
      },
      {
        name: 'Stale read after write',
        symptom: 'A user edits their profile, reloads, and sees the old name.',
        cause: 'The cache delete failed, arrived before the DB commit was visible, or a concurrent reader repopulated the key with a pre-commit read.',
        fix: 'Delete after commit; consider a short second delete (delayed double-delete) or bind the write path to a version number in the key.',
      },
      {
        name: 'Cache penetration',
        symptom: 'Traffic for keys that do not exist sails straight through to the database.',
        cause: 'Misses are never cached, so a scraper requesting random ids gets a free DB query every time.',
        fix: 'Cache a negative sentinel with a short TTL, and/or front the lookup with a Bloom filter of existing ids.',
      },
      {
        name: 'Cold restart avalanche',
        symptom: 'A cache node restarts and the database immediately saturates.',
        cause: 'An empty cache means a 0% hit rate against full production traffic.',
        fix: 'Warm the cache before taking traffic, restart nodes one at a time, and keep a request-rate limiter in front of the DB as a backstop.',
      },
    ],
    interview: [
      {
        q: 'Why delete the cache key on write instead of updating it?',
        a: [
          'Deleting is idempotent and race-free. If two writers update the same row, an update-the-cache strategy can interleave — writer A reads, writer B reads, B writes DB and cache, A writes DB and cache — leaving A\'s older value cached until the TTL expires.',
          'Deleting can only cost you an extra miss, which is a latency cost, not a correctness cost. It also avoids caching values that nobody ever reads again.',
        ],
        followUps: [
          'What if the DB commit succeeds and the cache delete fails?',
          'How would you make the invalidation reliable across services?',
        ],
      },
      {
        q: 'The DB write succeeds but the cache delete fails. What now?',
        a: [
          'You are serving a stale value until the TTL expires, so the TTL is your correctness backstop — this is the real reason every entry should have one.',
          'To do better, make invalidation a durable step rather than a best-effort call: publish the invalidation onto a queue or read it off the database\'s change stream (CDC/binlog) so it retries until it lands. That decouples cache correctness from the request path.',
        ],
        followUps: ['How does CDC-based invalidation behave during a replication lag spike?'],
      },
      {
        q: 'How do you choose the TTL?',
        a: [
          'Start from the business tolerance for staleness, not from a round number. A product catalogue can be minutes stale; a permissions check should be seconds at most.',
          'Then adjust for load: TTL sets the floor on database traffic, because each key costs one query per TTL window. QPS to the DB ≈ number of hot keys ÷ TTL. With 100k hot keys and a 60 s TTL, that is ~1,700 queries/sec of pure refresh traffic — a number worth computing out loud.',
          'Finally, add jitter. Identical TTLs set at the same moment expire at the same moment.',
        ],
        followUps: ['What TTL would you pick for a session token, and why?'],
      },
      {
        q: 'Your hit rate is 70% and the database is struggling. What do you look at first?',
        a: [
          'Whether the misses are compulsory, capacity, or invalidation misses — they have different fixes. Check `evicted_keys`: if it is high, the working set does not fit and the answer is memory, not policy.',
          'If evictions are near zero, look at TTL and invalidation churn — an aggressive TTL or a write path that deletes broadly (or a key namespace flush) recreates misses faster than traffic can fill them.',
          'Also check key distribution. A low hit rate with plenty of memory often means the key is too specific — caching a whole rendered page rather than the three entities it is built from.',
        ],
      },
    ],
    references: [
      { label: 'AWS — Caching patterns and best practices', href: 'https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html' },
      { label: 'Facebook — Scaling Memcache at Facebook (NSDI ’13)', href: 'https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final170_update.pdf' },
      { label: 'Redis — Key eviction and maxmemory policies', href: 'https://redis.io/docs/latest/develop/reference/eviction/' },
    ],
  },
}

// ── 2. Write-through ─────────────────────────────────────────────────────────

const writeThrough: Lesson = {
  slug: 'caching-write-through',
  title: 'Write-Through Cache',
  summary: 'Write to cache and database together — always consistent, never stale.',
  group: 'building-blocks',
  topic: 'Caching',
  tier: 'free',
  minutes: 6,
  concept: 'Concept',
  tags: [
    { label: 'Consistency', value: 'Strong' },
    { label: 'Write cost', value: '2× (cache + DB)' },
    { label: 'Read cost', value: 'Cache-only' },
  ],
  notes: [
    'Write-through: every write goes to cache AND database synchronously before acknowledging the client.',
    'Reads are always cache hits — no cold-start problem after a write.',
    'Trade-off: writes are slower (must wait for both). Best for read-heavy data written occasionally.',
  ],
  scene: {
    code: [
      '# write-through: update both together',
      'cache.set(key, value)',
      'db.write(key, value)     # synchronous',
      'return ok',
      '',
      '# read: always a cache hit',
      'return cache.get(key)',
    ],
    initialState: { consistency: 'strong', writes: 0, reads: 0 },
    nodes: [
      { id: 'app', kind: 'client', label: 'App', x: 12, y: 50 },
      { id: 'cache', kind: 'cache', label: 'Cache', x: 46, y: 26, badge: 'empty' },
      { id: 'db', kind: 'database', label: 'Database', x: 82, y: 50 },
    ],
    edges: [
      { id: 'a-cache', from: 'app', to: 'cache' },
      { id: 'cache-db', from: 'cache', to: 'db' },
      { id: 'cache-a', from: 'cache', to: 'app', curve: 0.5 },
    ],
    steps: [
      { id: '1', caption: "App writes a user's name. First, it goes into the cache.", travel: 'a-cache', token: 'write', codeLine: 2, patches: [{ nodeId: 'cache', badge: 'writing...', highlight: true }] },
      { id: '2', caption: 'Cache immediately writes through to the database — synchronously.', travel: 'cache-db', token: 'write', codeLine: 3, patches: [{ nodeId: 'db', badge: 'writing', highlight: true }] },
      { id: '3', caption: 'Both are updated. Cache and DB are always in sync. Write acknowledged.', patches: [{ nodeId: 'cache', badge: 'name: Hassan' }, { nodeId: 'db', badge: 'name: Hassan' }], state: { consistency: 'strong', writes: 1 } },
      { id: '4', caption: 'App reads the same key.', travel: 'a-cache', token: 'request', codeLine: 7 },
      { id: '5', caption: 'Cache HIT — the data is there because we wrote it through. Zero DB reads needed.', travel: 'cache-a', token: 'hit', codeLine: 7, patches: [{ nodeId: 'cache', badge: 'HIT ✓', highlight: true }], state: { reads: 1 } },
      { id: '6', caption: 'Trade-off: each write pays 2× cost. For data read many times after one write, this wins.', state: { writes: 1, reads: 100, consistency: 'strong' } },
    ],
  },
  deepDive: {
    readingMinutes: 8,
    intro: [
      'Write-through moves the population of the cache from the **read path** to the **write path**. Every write updates the cache and the database before the client gets an acknowledgement, so a subsequent read is guaranteed to be a hit and guaranteed to be current.',
      'You are buying read-after-write correctness with write latency. That is the whole trade, and an interviewer will want to hear you say it in exactly those terms.',
    ],
    sections: [
      {
        id: 'mechanism',
        heading: 'The mechanism, precisely',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The write is a two-phase operation on the request path. Order matters more than most people expect: **write the database first, then the cache**. If you write the cache first and the database write fails, you have just published a value that does not exist in the source of truth, and readers will happily serve it until the TTL expires.',
              'Writing the database first inverts the failure into a benign one: the DB has the truth, the cache is missing an entry, and the next read is a miss that repopulates correctly.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'write_through.py — DB first, then cache, with a delete-on-failure guard',
            lines: [
              'def save_profile(user_id, profile):',
              '    key = f"user:{user_id}"',
              '',
              '    db.execute("UPDATE users SET ... WHERE id = %s", user_id, profile)',
              '',
              '    try:',
              '        cache.set(key, json.dumps(profile), ex=3600)',
              '    except CacheError:',
              '        # Never leave a possibly-stale entry behind.',
              '        best_effort(lambda: cache.delete(key))',
              '',
              '    return profile     # reads after this point are guaranteed hits',
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'There is no atomic write across two systems',
            body: [
              'Cache and database are separate systems with separate failure domains, so a write-through is not a transaction. Anyone claiming "write-through guarantees consistency" is glossing over the crash-between-the-two-writes case.',
              'What write-through actually guarantees is that **the success path is consistent**. The failure path must degrade to a miss, never to a stale hit — which is why the `except` branch deletes.',
            ],
          },
        ],
      },
      {
        id: 'latency',
        heading: 'What it costs on the write path',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Because both writes are synchronous and sequential, the client-visible write latency is the **sum**, plus a serialisation cost. On a healthy setup that is a small absolute number, but it lands on p99 during any cache hiccup — and unlike a read, you cannot simply skip it without losing the guarantee.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'DB write (commit + fsync)', value: '~5 ms' },
              { label: 'Cache SET round trip', value: '~0.5 ms' },
              { label: 'Serialisation to JSON', value: '~0.1 ms' },
              { label: 'Write-through total', value: '~5.6 ms', note: '+12% vs DB alone' },
              { label: 'Cache-aside write (DB + DEL)', value: '~5.5 ms' },
              { label: 'First read after write — write-through', value: '~0.5 ms', note: 'guaranteed hit' },
              { label: 'First read after write — cache-aside', value: '~20 ms', note: 'guaranteed miss' },
            ],
            result: 'Write-through pays ~0.1 ms per write to remove a ~20 ms miss per write.',
          },
          {
            kind: 'prose',
            body: [
              'That arithmetic only pays off when the **read:write ratio is high and reads follow writes closely**. A user profile written once and read 500 times is the ideal case. A telemetry row written once and never read is the pathological case — you fill memory with data nobody will request, evicting things people actually want. That is called **cache pollution**, and it is the standard argument against write-through for write-heavy tables.',
            ],
          },
        ],
      },
      {
        id: 'variants',
        heading: 'Write-through, write-around, write-back',
        blocks: [
          {
            kind: 'table',
            columns: ['Strategy', 'On write', 'Read after write', 'Risk of data loss', 'Cache pollution'],
            rows: [
              ['Write-through', 'Cache + DB, synchronous', 'Hit, fresh', 'None beyond the DB', 'High for write-heavy data'],
              ['Write-around', 'DB only, skip the cache', 'Miss', 'None beyond the DB', 'None'],
              ['Write-back', 'Cache now, DB later', 'Hit, fresh', 'Real — unflushed writes', 'High'],
              ['Cache-aside + delete', 'DB, then delete key', 'Miss', 'None beyond the DB', 'None'],
            ],
            caption: 'Write-around is the deliberate opposite of write-through: it protects the cache from data nobody reads.',
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Real systems mix strategies per key type',
            body: [
              'A single service will commonly use write-through for user profiles and settings (read-heavy, freshness matters), write-around for audit logs and event rows (write-once, read-rarely), and cache-aside for expensive derived queries.',
              'Saying "I would pick the strategy per data type, not per service" is a strong signal in a design interview.',
            ],
          },
        ],
      },
      {
        id: 'consistency',
        heading: 'What consistency you actually get',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Read-after-write for a single reader: yes**, on the success path. The value is in the cache before the client is told the write succeeded.',
              '**Across replicas: only as good as your cache topology.** If each app node has its own local in-process cache, write-through updates *one* node. The others keep serving their own stale copies — this is the single most common write-through bug.',
              '**Under concurrent writers: last-writer-wins**, with the same interleaving hazard as cache-aside\'s update path. If two writers race, order the cache write by a version or timestamp, or fall back to deleting.',
              '**On cache failover: undefined.** A replica promoted mid-write may not have the entry. Treat the cache as a cache and keep the TTL.',
            ],
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Local caches break write-through silently',
            body: [
              'With N app servers each holding an in-process cache, a write-through on server 3 leaves N−1 stale copies with no error anywhere. Either use a shared remote cache, or add a pub/sub invalidation broadcast so every node drops the key.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Write-heavy workloads with low read ratios — you spend memory and write latency caching data nobody will read.',
      'Very large values (rendered pages, blobs) written frequently: each write pushes megabytes across the wire twice.',
      'When write latency is on a critical, tight budget (checkout, ad serving) and a first-read miss is acceptable.',
      'Anywhere the cache is per-process and unsynchronised, unless you also broadcast invalidations.',
    ],
    failureModes: [
      {
        name: 'Phantom write',
        symptom: 'Readers see a value that the database has never contained.',
        cause: 'The cache was written before the DB, and the DB write then failed or rolled back.',
        fix: 'Always write the database first; on cache failure, delete rather than leave the entry.',
      },
      {
        name: 'Stale local replicas',
        symptom: 'Refreshing the page shows the new value, then the old one, alternating.',
        cause: 'Per-process caches on several app servers; the load balancer sends you to a node that missed the update.',
        fix: 'Move to a shared cache, or broadcast invalidations over pub/sub to every node.',
      },
      {
        name: 'Cache pollution',
        symptom: 'Hit rate falls after a bulk import even though nothing about read traffic changed.',
        cause: 'Write-through inserted every imported row, evicting the genuinely hot working set.',
        fix: 'Use write-around for bulk and low-read paths; keep write-through for read-heavy entities.',
      },
      {
        name: 'Write amplification on large objects',
        symptom: 'Network saturation and p99 write latency climbing with object size.',
        cause: 'Every write serialises and ships the full object to both stores.',
        fix: 'Cache identifiers or small projections rather than whole documents; consider write-around for the big field.',
      },
    ],
    interview: [
      {
        q: 'Write-through: cache first or database first?',
        a: [
          'Database first. The database is the source of truth, so a crash between the two writes should leave the cache *missing* an entry, not holding one the database never accepted.',
          'If you write the cache first and the DB write fails, you have published a phantom value that readers will trust until the TTL expires — a correctness bug caused purely by ordering.',
        ],
        followUps: ['What do you do if the cache write fails after the DB commit?'],
      },
      {
        q: 'When would you prefer write-through over cache-aside?',
        a: [
          'When reads follow writes closely and a first-read miss is expensive or user-visible. Profile updates, settings, feature flags — write once, read constantly, and the user expects to see their own change immediately.',
          'I would not use it for write-heavy or write-once data: that pollutes the cache with entries nobody reads and evicts the hot set.',
        ],
      },
      {
        q: 'Does write-through remove the need for a TTL?',
        a: [
          'No. The TTL is the backstop for every path that bypasses your write-through code — an admin running SQL directly, a batch job, a replication repair, a failed cache write, or simply a bug in a service that forgot the pattern.',
          'A cache without a TTL turns any one-off inconsistency into a permanent one.',
        ],
      },
      {
        q: 'You have ten app servers with in-process caches. Does write-through work?',
        a: [
          'Not on its own. A write-through updates the cache of the node that handled the write; the other nine keep serving stale values with no error signal anywhere.',
          'Fix it by centralising the cache, or by publishing an invalidation message that all nodes consume and act on. In practice a two-tier setup is common: a small local cache with a short TTL in front of a shared Redis, accepting bounded staleness deliberately.',
        ],
        followUps: ['How would you size the local TTL in that two-tier design?'],
      },
    ],
    references: [
      { label: 'AWS — Database caching strategies (write-through)', href: 'https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html' },
      { label: 'Microsoft — Cache-Aside pattern (contrast)', href: 'https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside' },
    ],
  },
}

// ── 3. Write-back ────────────────────────────────────────────────────────────

const writeBack: Lesson = {
  slug: 'caching-write-back',
  title: 'Write-Back (Write-Behind) Cache',
  summary: 'Acknowledge the write from memory and flush to the database asynchronously.',
  group: 'building-blocks',
  topic: 'Caching',
  tier: 'pro',
  minutes: 8,
  concept: 'Concept',
  tags: [
    { label: 'Write latency', value: 'Sub-ms' },
    { label: 'Durability', value: 'At risk' },
    { label: 'DB writes', value: 'Coalesced' },
  ],
  notes: [
    'Write-back acknowledges the client as soon as the cache accepts the write; the database is updated later.',
    'Many updates to the same key collapse into one database write — huge savings for counters and view tallies.',
    'The cost is durability: anything not yet flushed is lost if the cache node dies.',
  ],
  scene: {
    code: [
      'on write(key, value):',
      '    cache.set(key, value)',
      '    dirty.add(key)',
      '    return ok               # client is done here',
      '',
      'every flush_interval:',
      '    batch = [(k, cache.get(k)) for k in dirty]',
      '    db.bulk_write(batch)',
      '    dirty.clear()',
    ],
    initialState: { 'dirty keys': 0, 'db writes': 0, 'client acks': 0, durability: 'at risk' },
    nodes: [
      { id: 'app', kind: 'client', label: 'App', x: 12, y: 50 },
      { id: 'cache', kind: 'cache', label: 'Cache (write buffer)', x: 46, y: 40, badge: 'clean' },
      { id: 'db', kind: 'database', label: 'Database', x: 84, y: 62 },
    ],
    edges: [
      { id: 'a-cache', from: 'app', to: 'cache' },
      { id: 'cache-a', from: 'cache', to: 'app', curve: 0.45 },
      { id: 'cache-db', from: 'cache', to: 'db' },
    ],
    steps: [
      { id: '1', caption: 'A view counter increments. The write lands in the cache only.', travel: 'a-cache', token: 'write', codeLine: 2, patches: [{ nodeId: 'cache', badge: 'views: 1 ·dirty', highlight: true }], state: { 'dirty keys': 1, 'client acks': 1 } },
      { id: '2', caption: 'The client is acknowledged immediately — no database round trip on the request path.', travel: 'cache-a', token: 'hit', codeLine: 4 },
      { id: '3', caption: '999 more increments arrive. All of them mutate the same key in memory.', travel: 'a-cache', token: 'write', codeLine: 2, patches: [{ nodeId: 'cache', badge: 'views: 1000 ·dirty', highlight: true }], state: { 'client acks': 1000 } },
      { id: '4', caption: 'The flush timer fires. The buffer is drained as one batched write.', travel: 'cache-db', token: 'write', codeLine: 7, patches: [{ nodeId: 'db', badge: 'flushing', highlight: true }] },
      { id: '5', caption: '1,000 client writes became 1 database write — coalescing is the whole point.', codeLine: 8, patches: [{ nodeId: 'cache', badge: 'clean' }, { nodeId: 'db', badge: 'views: 1000' }], state: { 'dirty keys': 0, 'db writes': 1, durability: 'safe' } },
      { id: '6', caption: 'But if the node had died before the flush, those 1,000 increments were gone. That is the trade.', patches: [{ nodeId: 'cache', badge: '✗ crash', highlight: true }], state: { durability: 'data loss window' } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'Write-back inverts the durability contract: the **cache becomes the write buffer** and the database becomes an eventually-updated follower. The client is told the write succeeded as soon as memory accepts it, and a background flusher pushes batches to the database on an interval or a threshold.',
      'This is the highest-throughput caching pattern and the only one that can genuinely lose committed data. Both facts come from the same mechanism, so never present one without the other.',
    ],
    sections: [
      {
        id: 'mechanism',
        heading: 'The mechanism, precisely',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Three moving parts: the **write path** (set the key in cache, mark it dirty, acknowledge), the **dirty set** (which keys have unflushed changes), and the **flusher** (a loop that drains the dirty set into the database in batches).',
              'The magic is **write coalescing**. Because the value lives in memory, N updates to the same key between two flushes produce exactly one database write. For counters, view tallies, "last seen at" timestamps and leaderboard scores, that collapses a 100k-writes/sec workload into a few hundred database writes per second.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'write_back.py — buffered writes with a bounded flush',
            lines: [
              'FLUSH_INTERVAL = 5          # seconds',
              'FLUSH_THRESHOLD = 10_000    # dirty keys',
              '',
              'def increment_views(post_id):',
              '    key = f"views:{post_id}"',
              '    cache.incr(key)                    # atomic, in memory',
              '    cache.sadd("dirty:views", key)     # remember to flush it',
              '    return "ok"                        # client is done, ~0.3 ms',
              '',
              'def flusher():                          # background worker',
              '    while True:',
              '        keys = cache.spop("dirty:views", FLUSH_THRESHOLD)',
              '        if keys:',
              '            values = cache.mget(keys)',
              '            db.bulk_upsert(zip(keys, values))   # one round trip',
              '        sleep(FLUSH_INTERVAL)',
            ],
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Pop the dirty set before reading the values, not after',
            body: [
              'If you read values first and clear the dirty flag afterwards, any write that lands in between is silently dropped from the next flush. Popping first means a concurrent write re-adds the key and it flushes next round — you may write it twice, which is harmless for an idempotent upsert.',
            ],
          },
        ],
      },
      {
        id: 'numbers',
        heading: 'What coalescing is actually worth',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Take a video platform recording view counts. 50,000 views per second across a catalogue where the top 1,000 videos take most of the traffic.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Incoming increments', value: '50,000 /s' },
              { label: 'Write-through DB writes', value: '50,000 /s', note: 'far past a single primary' },
              { label: 'Distinct hot keys', value: '~1,000' },
              { label: 'Flush interval', value: '5 s' },
              { label: 'Write-back DB writes', value: '~200 /s', note: '1,000 keys ÷ 5 s' },
              { label: 'Reduction', value: '250×' },
              { label: 'Worst-case data loss', value: '≤ 5 s of increments' },
            ],
            result: 'A single Postgres primary handles 200 upserts/sec comfortably; it cannot handle 50,000.',
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Quantify the loss window, do not just admit it',
            body: [
              'Weak answer: "write-back can lose data." Strong answer: "the exposure is bounded by the flush interval — at 5 seconds and 50k writes/sec that is up to 250,000 increments, which for view counts is an acceptable rounding error and for payments would be a catastrophe. So: counters yes, ledgers no."',
            ],
          },
        ],
      },
      {
        id: 'durability',
        heading: 'Making the loss window survivable',
        blocks: [
          {
            kind: 'prose',
            body: [
              'You cannot eliminate the window without giving up the pattern, but you can shrink it and make the failure detectable.',
            ],
          },
          {
            kind: 'list',
            ordered: true,
            items: [
              '**Persist the buffer.** Redis AOF with `appendfsync everysec` bounds loss to roughly one second of writes rather than the whole flush interval, at a real throughput cost.',
              '**Replicate the buffer.** A replica with automatic failover means a single node loss does not take the dirty set with it — though asynchronous replication still leaves a small window.',
              '**Flush on a threshold as well as a timer.** Draining whenever the dirty set exceeds N keys caps the *volume* at risk even during a traffic spike, which a pure timer does not.',
              '**Make the flush idempotent.** Use upserts keyed by id, or store absolute values rather than deltas, so a retried or duplicated batch cannot double-count.',
              '**Alarm on flush lag.** Dirty-set size and time-since-last-successful-flush are the two metrics that tell you the buffer is growing into an outage.',
            ],
          },
          {
            kind: 'table',
            columns: ['Configuration', 'Loss window', 'Write throughput', 'Use for'],
            rows: [
              ['In-memory only, 30 s flush', 'Up to 30 s', 'Highest', 'View counts, presence, analytics'],
              ['AOF everysec + 5 s flush', '~1 s', 'High', 'Leaderboards, rate-limit counters'],
              ['Replicated + threshold flush', 'Sub-second, node-tolerant', 'Moderate', 'Session state, cart contents'],
              ['Write-through instead', 'None', 'Lowest', 'Balances, orders, anything financial'],
            ],
          },
        ],
      },
      {
        id: 'reads',
        heading: 'Reads, and why the cache is now authoritative',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The consequence people miss: while a key is dirty, **the database is wrong and the cache is right**. Any consumer that reads the database directly — a reporting job, a read replica, another microservice, a data export — will see stale values.',
              'That makes write-back a poor fit for data with multiple independent readers, and it means your read path must go through the cache. If a read misses on a dirty key because the entry was evicted before its flush, you will read a stale value from the DB and, worse, you may then write it back over the newer state.',
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Never let the eviction policy evict a dirty key',
            body: [
              'Under `allkeys-lru`, Redis will happily evict an unflushed key when memory fills, silently destroying the write. Keep buffered writes in a separate instance or namespace configured with `noeviction`, and alert on memory pressure there.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Financial or inventory data — any value where losing a few seconds of writes is a correctness incident rather than a metrics blip.',
      'Data read directly from the database by other systems (BI, exports, other services), which would see stale values for the whole flush window.',
      'Low write volume: without many writes to the same key there is nothing to coalesce, so you take the durability risk and get no throughput benefit.',
      'Teams without the operational maturity to monitor buffer depth and flush lag — this pattern fails quietly.',
    ],
    failureModes: [
      {
        name: 'Silent write loss on node death',
        symptom: 'Counters jump backwards after a cache restart; nothing in the logs.',
        cause: 'The dirty set and its values lived only in the memory of the node that died.',
        fix: 'Enable AOF persistence, replicate the buffer, and shorten the flush interval to bound the loss.',
      },
      {
        name: 'Dirty key evicted before flush',
        symptom: 'Occasional lost updates under memory pressure, unrelated to any crash.',
        cause: 'An LRU/LFU eviction policy removed a key that still had unflushed state.',
        fix: 'Run the write buffer with `noeviction`, separate from the read cache, and alert on used memory.',
      },
      {
        name: 'Flush backlog turning into an outage',
        symptom: 'Memory climbs steadily, then writes start failing.',
        cause: 'The database or flusher slowed down and drains less than the incoming write rate, so the dirty set grows without bound.',
        fix: 'Threshold-based flushing, backpressure or shedding on the write path, and an alarm on dirty-set size.',
      },
      {
        name: 'Double counting on retry',
        symptom: 'View counts higher than actual traffic after a transient database error.',
        cause: 'A batch partially applied and was retried using deltas rather than absolute values.',
        fix: 'Make flushes idempotent — upsert absolute values keyed by id rather than issuing relative increments.',
      },
    ],
    interview: [
      {
        q: 'When is write-back the right call, and when is it disqualifying?',
        a: [
          'It is right when writes are frequent, repeated against the same keys, and individually low-value — view counts, likes, presence, rate-limit counters, leaderboard scores. Coalescing turns an impossible write rate into a trivial one.',
          'It is disqualifying whenever losing the flush window is a correctness failure: payments, inventory, orders, audit trails. There I would use write-through, or write to the database first and treat the cache as derived.',
        ],
        followUps: ['How would you bound the loss window if you had to use it for session data?'],
      },
      {
        q: 'A write-back node crashes. Exactly what is lost?',
        a: [
          'Everything written since the last successful flush that was not persisted — that is, the dirty set and its values. The bound is the flush interval times the write rate, so it is computable rather than mysterious.',
          'With AOF at `everysec` the bound drops to about a second of writes. With a replicated buffer and automatic failover, a single node loss costs only the un-replicated tail.',
        ],
      },
      {
        q: 'Your reporting service reads the same table directly. Does write-back still work?',
        a: [
          'Not without a caveat. While keys are dirty the database is behind, so reports lag by up to the flush interval and will disagree with what the product UI shows.',
          'Either point reporting at the cache, accept and document the lag, or shorten the flush interval for the tables reporting depends on. The general rule is that write-back wants a single reader of that data.',
        ],
      },
      {
        q: 'How do you keep the buffer from growing without bound?',
        a: [
          'Flush on a size threshold as well as a timer, so a spike drains immediately rather than accumulating for the full interval.',
          'Then add backpressure: if the dirty set exceeds a hard ceiling, degrade to synchronous writes or shed the lowest-value updates. And monitor dirty-set size plus time-since-last-flush — a growing buffer is an outage you can see coming minutes in advance.',
        ],
      },
    ],
    references: [
      { label: 'Redis — Persistence (AOF, RDB, and their guarantees)', href: 'https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/' },
      { label: 'Meta — Scaling Memcache at Facebook', href: 'https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final170_update.pdf' },
    ],
  },
}

// ── 4. Eviction ──────────────────────────────────────────────────────────────

const eviction: Lesson = {
  slug: 'caching-eviction-lru',
  title: 'LRU Eviction & Replacement Policies',
  summary: 'When the cache is full, something must go — and the choice decides your hit rate.',
  group: 'building-blocks',
  topic: 'Caching',
  tier: 'free',
  minutes: 8,
  concept: 'Concept',
  tags: [
    { label: 'Eviction', value: 'Least Recently Used' },
    { label: 'Complexity', value: 'O(1) get/put' },
    { label: 'Used in', value: 'Redis · Memcached' },
  ],
  notes: [
    'When the cache is full, something must be evicted to make room for new data.',
    'LRU evicts the entry untouched for the longest time — betting that recency predicts reuse.',
    'Implemented with a hash map + doubly linked list for O(1) access and eviction.',
  ],
  scene: {
    code: [
      '# cache is full: slots A B C D (A = LRU)',
      'cache.get("E")   # MISS',
      'evict(LRU)       # evict A',
      'cache.set("E")',
      '',
      '# every access moves key to MRU position',
      'cache.get("B")   # B becomes MRU',
    ],
    initialState: { slots: 'A  B  C  D', LRU: 'A', MRU: 'D', hits: 0, misses: 0, evicted: 'none' },
    nodes: [
      { id: 'app', kind: 'client', label: 'App', x: 12, y: 50 },
      { id: 'cache', kind: 'cache', label: 'Cache (full)', x: 50, y: 50, badge: 'A B C D' },
      { id: 'db', kind: 'database', label: 'Database', x: 86, y: 50 },
    ],
    edges: [
      { id: 'a-cache', from: 'app', to: 'cache' },
      { id: 'a-db', from: 'app', to: 'db', curve: 0.4 },
      { id: 'db-cache', from: 'db', to: 'cache', curve: -0.4 },
      { id: 'cache-a', from: 'cache', to: 'app', curve: 0.4 },
    ],
    steps: [
      { id: '1', caption: 'Cache holds A, B, C, D (4 slots full). A is the Least Recently Used.', codeLine: 1, state: { slots: 'A  B  C  D', LRU: 'A', MRU: 'D' } },
      { id: '2', caption: 'App requests key E — not in cache. Cache miss!', travel: 'a-cache', token: 'miss', codeLine: 2, patches: [{ nodeId: 'cache', badge: 'MISS ✗', highlight: true }], state: { misses: 1 } },
      { id: '3', caption: "Cache is full. LRU policy evicts A — it hasn't been touched the longest.", codeLine: 3, patches: [{ nodeId: 'cache', badge: '_ B C D', highlight: true }], state: { evicted: 'A', slots: '_  B  C  D' } },
      { id: '4', caption: 'E is fetched from the database.', travel: 'a-db', token: 'request', codeLine: 4 },
      { id: '5', caption: "E is stored in A's old slot. Cache now holds E, B, C, D.", travel: 'db-cache', token: 'write', codeLine: 4, patches: [{ nodeId: 'cache', badge: 'E B C D', highlight: true }], state: { slots: 'E  B  C  D', LRU: 'B', MRU: 'E' } },
      { id: '6', caption: 'App accesses B — cache hit. B is now the MRU, moves to front of queue.', travel: 'a-cache', token: 'hit', codeLine: 7, patches: [{ nodeId: 'cache', badge: 'HIT: B', highlight: true }], state: { hits: 1, LRU: 'C', MRU: 'B' } },
      { id: '7', caption: 'If A is requested now — cache miss. It was evicted. Must reload from DB.', travel: 'a-cache', token: 'miss', codeLine: 2, state: { misses: 2 } },
    ],
  },
  deepDive: {
    readingMinutes: 10,
    intro: [
      'A cache is a **bounded** store, so eviction is not an edge case — it is the steady state. Every production cache runs full. The replacement policy is the algorithm that decides which key dies so a new one can live, and it is the single biggest lever on hit rate once memory is fixed.',
      'LRU is the default because it is cheap and usually good. Knowing *why* it is usually good, and the two workloads where it is catastrophically bad, is what separates a memorised answer from an engineering one.',
    ],
    sections: [
      {
        id: 'lru-impl',
        heading: 'LRU in O(1): the data structure',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The classic implementation — and one of the most-asked coding interview questions — pairs a **hash map** with a **doubly linked list**. The map gives O(1) lookup from key to node; the list maintains recency order, most-recently-used at the head, least at the tail.',
              'Every `get` unlinks the node and re-inserts it at the head. Every `put` inserts at the head and, if over capacity, drops the tail. Both are O(1) because the map hands you the node directly, so you never scan the list. A doubly linked list is required rather than singly: removing a node from the middle needs its predecessor.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'lru.py — hash map + doubly linked list, O(1) get and put',
            lines: [
              'class Node:',
              '    __slots__ = ("key", "val", "prev", "next")',
              '',
              'class LRUCache:',
              '    def __init__(self, capacity):',
              '        self.cap = capacity',
              '        self.map = {}                    # key -> Node',
              '        self.head = Node()               # sentinel: MRU side',
              '        self.tail = Node()               # sentinel: LRU side',
              '        self.head.next, self.tail.prev = self.tail, self.head',
              '',
              '    def get(self, key):',
              '        node = self.map.get(key)',
              '        if node is None:',
              '            return None                  # miss',
              '        self._unlink(node)',
              '        self._push_front(node)           # touch = becomes MRU',
              '        return node.val',
              '',
              '    def put(self, key, val):',
              '        if key in self.map:',
              '            node = self.map[key]',
              '            node.val = val',
              '            self._unlink(node); self._push_front(node)',
              '            return',
              '        if len(self.map) >= self.cap:',
              '            lru = self.tail.prev         # evict from the tail',
              '            self._unlink(lru)',
              '            del self.map[lru.key]',
              '        node = Node(); node.key, node.val = key, val',
              '        self.map[key] = node',
              '        self._push_front(node)',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'The follow-up is always concurrency',
            body: [
              'A single list head is a global mutex under multi-threaded load — every read mutates shared state. Real caches avoid it: Redis is single-threaded for command execution, Memcached shards the LRU with per-slab locks, and Caffeine (JVM) buffers reads in a ring and replays them asynchronously so `get` stays lock-free.',
              '"LRU\'s problem at scale is that reads are writes" is the sentence that shows you have implemented one.',
            ],
          },
        ],
      },
      {
        id: 'approximation',
        heading: 'Why real caches do not implement true LRU',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Exact LRU costs two pointers per entry plus the list maintenance on every read. At millions of keys that overhead is significant, and the contention is worse. So production systems **approximate**.',
              'Redis samples: with `maxmemory-policy allkeys-lru` it picks `maxmemory-samples` random keys (default 5), and evicts the one with the oldest access timestamp. It is not the true LRU key, but with 10 samples the choice is close enough that the hit-rate difference is negligible — and it costs no per-key list pointers at all.',
            ],
          },
          {
            kind: 'table',
            columns: ['Redis policy', 'What it evicts', 'Use when'],
            rows: [
              ['`noeviction`', 'Nothing — writes fail with an error', 'The store is authoritative (write-back buffers, queues)'],
              ['`allkeys-lru`', 'Approximated least-recently-used, any key', 'General-purpose cache, unknown key importance'],
              ['`allkeys-lfu`', 'Approximated least-frequently-used', 'Stable hot set with periodic scans over cold data'],
              ['`volatile-lru`', 'LRU, but only keys that have a TTL', 'Mixed workload: cached entries expire, durable keys stay'],
              ['`volatile-ttl`', 'The key expiring soonest', 'When TTL already encodes importance'],
              ['`allkeys-random`', 'A random key', 'Uniform access patterns; cheapest possible'],
            ],
            caption: 'Choosing `volatile-*` with no TTLs set behaves like `noeviction` — a classic production surprise.',
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'The default policy is `noeviction`',
            body: [
              'Out of the box, Redis does not evict — it starts rejecting writes with an OOM error when `maxmemory` is reached. Teams discover this during their first traffic spike. If the instance is a cache, set an eviction policy deliberately; if it is a buffer or a queue, keep `noeviction` and alarm on memory.',
            ],
          },
        ],
      },
      {
        id: 'lru-vs-lfu',
        heading: 'When LRU is the wrong policy',
        blocks: [
          {
            kind: 'prose',
            body: [
              'LRU bets that **recency predicts reuse**. That bet loses in two specific, common situations.',
              '**Sequential scans.** A nightly analytics job reads a million rows once. Each read is recent, so LRU promotes all of them and evicts the genuinely hot working set. Your hit rate collapses at 2 a.m. and recovers by morning, which is exactly the shape that makes it hard to diagnose.',
              '**Cyclic access slightly larger than the cache.** Loop over N+1 keys in a cache of size N and LRU achieves a 0% hit rate: every key is evicted immediately before it is needed again. Random replacement would score roughly N/(N+1).',
            ],
          },
          {
            kind: 'table',
            columns: ['Policy', 'Bets that', 'Strong on', 'Weak on'],
            rows: [
              ['LRU', 'Recently used will be used again', 'Temporal locality, session-shaped traffic', 'Scans, cyclic access, one-hit wonders'],
              ['LFU', 'Frequently used will be used again', 'Stable hot sets, scan resistance', 'Shifting popularity; old keys stay cached forever'],
              ['LFU with decay', 'Recent frequency predicts reuse', 'Trending content, news feeds', 'Extra bookkeeping; a decay constant to tune'],
              ['FIFO', 'Nothing — insertion order only', 'Simplicity, no per-read cost', 'Evicts hot keys purely for being old'],
              ['Random', 'Nothing', 'Scan resistance, zero metadata', 'No locality exploitation at all'],
              ['W-TinyLFU', 'Frequency sketch + small LRU window', 'Near-optimal across mixed workloads', 'Complexity; used by Caffeine, not Redis'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'Redis LFU (since 4.0) addresses the "cached forever" flaw with a probabilistic counter that **decays**: `lfu-log-factor` controls how quickly the counter saturates, and `lfu-decay-time` how fast it ages in minutes. That combination makes it resistant to scans without permanently pinning yesterday\'s popular keys.',
            ],
          },
        ],
      },
      {
        id: 'diagnosing',
        heading: 'Diagnosing eviction problems',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Eviction pressure is measurable, and the fix depends entirely on which miss type dominates. The three classic categories — the "three Cs" — carry straight over from CPU caches.',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Compulsory (cold) misses** — the first ever request for a key. Unavoidable; reduce by warming.',
              '**Capacity misses** — the working set does not fit. `evicted_keys` climbing is the signal. Fix with memory, not policy.',
              '**Invalidation misses** — you deleted or expired it yourself. Signal: high `expired_keys` with low `evicted_keys`. Fix with TTL tuning.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: '`evicted_keys` high, hit rate falling', value: 'Capacity', note: 'add memory or shard' },
              { label: '`evicted_keys` ~0, hit rate falling', value: 'TTL / invalidation', note: 'tune expiry' },
              { label: 'Hit rate drops on a schedule', value: 'Scan pollution', note: 'switch to LFU, or isolate the job' },
              { label: '`used_memory_rss` ≫ `used_memory`', value: 'Fragmentation', note: 'activedefrag, or restart' },
            ],
            result: 'Read the counters before changing the policy — most "policy problems" are memory problems.',
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Isolate the scanner instead of retuning the cache',
            body: [
              'When a batch job pollutes the cache, the cleanest fix is usually not a smarter eviction policy — it is giving the job its own connection that bypasses the cache entirely, or its own read replica. Policy tuning is what you do when you cannot change the caller.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'LRU on scan-heavy workloads — a single nightly job can flush your entire hot set. Prefer LFU, or isolate the scanner.',
      'LFU where popularity shifts quickly (breaking news, trending video) unless decay is configured — otherwise yesterday\'s winners squat in memory.',
      '`volatile-*` policies when most keys have no TTL: the cache silently behaves like `noeviction` and starts refusing writes.',
      'Any eviction policy at all on a store holding unflushed writes or queue state — that instance needs `noeviction` and a memory alarm.',
    ],
    failureModes: [
      {
        name: 'OOM write errors on a cache',
        symptom: 'Writes fail with OOM once memory fills; reads are fine.',
        cause: '`maxmemory-policy` left at the default `noeviction`.',
        fix: 'Set `allkeys-lru` (or `allkeys-lfu`) explicitly for cache instances.',
      },
      {
        name: 'Nightly hit-rate collapse',
        symptom: 'Hit rate falls off a cliff at the same time each night and recovers by morning.',
        cause: 'A batch or analytics job scans cold data; LRU promotes it and evicts the hot working set.',
        fix: 'Switch to LFU, or route the job around the cache / to a replica.',
      },
      {
        name: 'Thrashing on a cyclic workload',
        symptom: 'Near-zero hit rate despite plenty of repeat requests.',
        cause: 'The access loop is slightly larger than the cache, so LRU evicts every key just before it is reused.',
        fix: 'Increase memory past the cycle size, or use a scan-resistant policy — random replacement beats LRU here.',
      },
      {
        name: 'Memory fragmentation masquerading as capacity',
        symptom: '`used_memory_rss` far exceeds `used_memory`; evictions start well below the expected key count.',
        cause: 'Allocator fragmentation from mixed value sizes and heavy churn.',
        fix: 'Enable `activedefrag`, normalise value sizes, or restart the node during a maintenance window.',
      },
    ],
    interview: [
      {
        q: 'Implement an LRU cache with O(1) get and put.',
        a: [
          'Hash map from key to node, plus a doubly linked list ordered by recency with sentinel head and tail nodes. The map makes lookup O(1); the list makes reordering and eviction O(1).',
          '`get` looks the node up, unlinks it, and pushes it to the head. `put` either updates and promotes an existing node, or inserts a new one at the head, evicting `tail.prev` first if at capacity. The list must be doubly linked so a middle node can be unlinked without a scan.',
          'The subtlety worth mentioning is that `get` mutates shared structure, which makes it the contention point under concurrency.',
        ],
        followUps: ['How would you make it thread-safe without a global lock?', 'How would you extend it to support TTLs?'],
      },
      {
        q: 'Redis does not implement exact LRU. Why is that acceptable?',
        a: [
          'Exact LRU needs per-key list pointers and a mutation on every read, which costs memory and creates contention for a decision that only has to be approximately right.',
          'Redis samples a handful of random keys (`maxmemory-samples`, default 5) and evicts the oldest among them. With 10 samples the result is very close to true LRU, and the memory saved goes into caching more keys — which improves hit rate more than perfect eviction would.',
        ],
      },
      {
        q: 'A nightly ETL job tanks your cache hit rate. Walk me through the fix.',
        a: [
          'First confirm the mechanism: `evicted_keys` spiking during the job window with a hit-rate drop that recovers afterwards means the scan is promoting cold keys under LRU and pushing out the hot set.',
          'Cheapest real fix is isolation — point the job at a read replica or have it bypass the cache, since it gets no benefit from caching data it reads exactly once.',
          'If I cannot change the job, switch to `allkeys-lfu` so a single access cannot displace a frequently-read key, and verify with a hit-rate comparison across a few nights.',
        ],
      },
      {
        q: 'When would random eviction beat LRU?',
        a: [
          'When the access pattern is cyclic and slightly larger than the cache. LRU degenerates to a 0% hit rate because it always evicts precisely the key needed next; random keeps a fraction of the cycle resident and does far better.',
          'More generally, random wins whenever recency carries no signal — uniform access, or scan-dominated traffic — and it costs nothing to maintain.',
        ],
      },
    ],
    references: [
      { label: 'Redis — Key eviction policies and LFU tuning', href: 'https://redis.io/docs/latest/develop/reference/eviction/' },
      { label: 'Caffeine — TinyLFU design notes', href: 'https://github.com/ben-manes/caffeine/wiki/Efficiency' },
    ],
  },
}

// ── 5. TTL & invalidation ────────────────────────────────────────────────────

const invalidation: Lesson = {
  slug: 'caching-ttl-invalidation',
  title: 'TTL & Cache Invalidation',
  summary: 'Expiry, deletion and versioned keys — three ways to stop serving the past.',
  group: 'building-blocks',
  topic: 'Caching',
  tier: 'free',
  minutes: 8,
  concept: 'Concept',
  tags: [
    { label: 'Staleness', value: 'Bounded by TTL' },
    { label: 'DB load', value: 'keys ÷ TTL' },
    { label: 'Strategy', value: 'Expire · Delete · Version' },
  ],
  notes: [
    'A TTL bounds how wrong the cache can be, and sets a floor on database refresh traffic.',
    'Explicit invalidation is faster but unreliable — the TTL is the backstop when it fails.',
    'Versioned keys sidestep deletion entirely: change the key, and the old entry ages out on its own.',
  ],
  scene: {
    code: [
      'cache.set("post:7", body, ttl=60)',
      '',
      '# t+10s  read  -> HIT (fresh)',
      '# t+30s  UPDATE post 7 in DB',
      'cache.delete("post:7")     # explicit invalidation',
      '',
      '# if the delete fails, the TTL',
      '# still expires it at t+60s',
    ],
    initialState: { 'cache age': '0s', ttl: '60s', value: '—', 'db value': 'v1', stale: 'no' },
    nodes: [
      { id: 'app', kind: 'client', label: 'App', x: 12, y: 50 },
      { id: 'cache', kind: 'cache', label: 'Cache', x: 48, y: 30, badge: 'empty' },
      { id: 'db', kind: 'database', label: 'Database', x: 84, y: 64, badge: 'v1' },
    ],
    edges: [
      { id: 'a-cache', from: 'app', to: 'cache' },
      { id: 'cache-a', from: 'cache', to: 'app', curve: 0.4 },
      { id: 'a-db', from: 'app', to: 'db' },
      { id: 'db-cache', from: 'db', to: 'cache', curve: -0.4 },
    ],
    steps: [
      { id: '1', caption: 'A read misses, loads post v1 from the DB and caches it with a 60 s TTL.', travel: 'db-cache', token: 'write', codeLine: 1, patches: [{ nodeId: 'cache', badge: 'v1 · ttl 60s', highlight: true }], state: { 'cache age': '0s', value: 'v1' } },
      { id: '2', caption: 'Ten seconds later the same read is a hit — served from memory, still correct.', travel: 'cache-a', token: 'hit', codeLine: 3, state: { 'cache age': '10s' } },
      { id: '3', caption: 'An editor updates the post. The database now holds v2 — the cache does not know.', travel: 'a-db', token: 'write', codeLine: 4, patches: [{ nodeId: 'db', badge: 'v2', highlight: true }], state: { 'db value': 'v2', stale: 'YES', 'cache age': '30s' } },
      { id: '4', caption: 'Readers are now being served a stale v1. This window is the whole problem.', travel: 'cache-a', token: 'miss', patches: [{ nodeId: 'cache', badge: 'v1 · STALE', highlight: true }] },
      { id: '5', caption: 'The write path deletes the key — invalidation. The next read must go to the DB.', travel: 'a-cache', token: 'write', codeLine: 5, patches: [{ nodeId: 'cache', badge: 'empty', highlight: true }], state: { stale: 'no', value: '—' } },
      { id: '6', caption: 'That read repopulates the cache with v2 and a fresh TTL.', travel: 'db-cache', token: 'write', codeLine: 1, patches: [{ nodeId: 'cache', badge: 'v2 · ttl 60s', highlight: true }], state: { value: 'v2', 'cache age': '0s' } },
      { id: '7', caption: 'Had the delete failed, the TTL would still have expired v1 at t+60s — bounded staleness.', codeLine: 8, state: { stale: 'bounded by ttl' } },
    ],
  },
  deepDive: {
    readingMinutes: 10,
    intro: [
      'Phil Karlton\'s line — "there are only two hard things in Computer Science: cache invalidation and naming things" — is quoted constantly and explained rarely. The difficulty is not the deletion. It is that **the cache and the source of truth are two systems with no shared transaction**, so every invalidation scheme is a choice about which inconsistency you can live with.',
      'There are exactly three tools: **expire it** (TTL), **delete it** (explicit invalidation), or **rename it** (versioned keys). Real systems use all three at once, for different reasons.',
    ],
    sections: [
      {
        id: 'ttl',
        heading: 'TTL: the backstop you must always have',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A TTL is a promise about the **worst case**: no matter what bug, failed delete, direct SQL edit or forgotten code path exists, the cache converges on the truth within the TTL. That is why "every entry gets a TTL" is a rule, not a preference. A cache without expiry converts any one-off inconsistency into a permanent one.',
              'The TTL is also a **load dial**, and this is the part interviewers probe. Each hot key costs one database query per TTL window, so refresh traffic is roughly `hot_keys ÷ TTL`.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Hot keys', value: '100,000' },
              { label: 'TTL = 60 s', value: '~1,667 q/s', note: 'refresh traffic alone' },
              { label: 'TTL = 300 s', value: '~333 q/s' },
              { label: 'TTL = 3600 s', value: '~28 q/s' },
              { label: 'Staleness at TTL = 3600 s', value: 'up to 1 hour' },
            ],
            result: 'TTL trades database load against staleness on a straight inverse curve.',
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Always jitter the TTL',
            body: [
              'Entries created together with an identical TTL expire together. After a deploy or a cache warm-up, that produces a synchronised wave of misses — a **cache avalanche**. Use `ttl = base + random(0, base * 0.1)` so expiry spreads out.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'ttl.py — jittered expiry, negative caching, and a sane default',
            lines: [
              'import random',
              '',
              'DEFAULT_TTL = 300',
              '',
              'def cache_set(key, value, ttl=DEFAULT_TTL):',
              '    jittered = int(ttl * random.uniform(1.0, 1.1))',
              '    cache.set(key, serialize(value), ex=jittered)',
              '',
              'def cache_miss_value(key, loader):',
              '    row = loader()',
              '    if row is None:',
              '        # negative cache, short TTL: blocks penetration attacks',
              '        cache.set(key, TOMBSTONE, ex=30)',
              '        return None',
              '    cache_set(key, row)',
              '    return row',
            ],
          },
        ],
      },
      {
        id: 'explicit',
        heading: 'Explicit invalidation and where it leaks',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Deleting the key on write gives you near-immediate correctness instead of waiting out the TTL. The problem is that the delete is a **best-effort network call in a code path that can fail halfway**, and there are four distinct races worth being able to name.',
            ],
          },
          {
            kind: 'list',
            ordered: true,
            items: [
              '**Delete before commit.** A concurrent reader misses, reads the pre-commit value from the DB, and caches it. Now the cache holds the old value with a full TTL ahead of it. Always delete *after* the transaction commits.',
              '**Delete fails.** The DB is updated, the cache call times out. Staleness lasts until the TTL — which is exactly the situation the TTL exists for.',
              '**Read repopulates during the write.** Reader fetches v1, writer commits v2 and deletes, reader then writes v1 into the cache. The classic mitigation is **delayed double delete**: delete, commit, wait a few hundred milliseconds, delete again.',
              '**Multi-service writes.** Another service (or a human with psql) updates the row and never invalidates. No in-process scheme can catch this — only a TTL or change-data-capture can.',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'CDC turns invalidation into a durable job',
            body: [
              'Reading the database\'s replication log (Postgres logical decoding, MySQL binlog, via Debezium or similar) and publishing invalidations from it moves the delete off the request path and makes it retryable. It also catches writes from every source, including manual SQL — the one class of staleness application code can never see.',
              'The cost is a new pipeline plus replication lag added to your staleness window.',
            ],
          },
        ],
      },
      {
        id: 'versioning',
        heading: 'Versioned keys: invalidation without deletion',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The third tool avoids the problem instead of solving it. Put a version into the key: `user:42:v7`. On write, bump the version. Readers immediately compute a *different* key, miss, and load fresh data. The old entry is now unreachable and simply ages out under its TTL or gets evicted.',
              'This is atomic in a way deletion is not — there is no window where a reader can see the old value under the new version — and it makes invalidating *groups* cheap. A single `catalog:v9` prefix invalidates every derived key in one integer increment, which is otherwise a `SCAN`-and-delete nightmare.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'versioned_keys.py — one INCR invalidates an entire namespace',
            lines: [
              'def product_key(product_id):',
              '    v = cache.get(f"ver:product:{product_id}") or 1',
              '    return f"product:{product_id}:v{v}"',
              '',
              'def invalidate_product(product_id):',
              '    cache.incr(f"ver:product:{product_id}")   # atomic; old keys orphaned',
              '',
              'def invalidate_whole_catalog():',
              '    cache.incr("ver:catalog")                 # every derived key misses next read',
            ],
          },
          {
            kind: 'table',
            columns: ['Strategy', 'Staleness window', 'Fails how', 'Best for'],
            rows: [
              ['TTL only', 'Up to the TTL', 'Gracefully — converges on its own', 'Everything, as a backstop'],
              ['TTL + delete on write', 'Milliseconds, usually', 'Silently, if the delete is lost', 'Entity reads with a clear write path'],
              ['Versioned keys', 'None for readers', 'Wastes memory until orphans expire', 'Group invalidation, derived/rendered data'],
              ['CDC-driven', 'Replication lag', 'Pipeline outage stalls all invalidation', 'Many writers, including outside the app'],
              ['Write-through', 'None on the success path', 'Phantom values if ordered wrongly', 'Read-after-write-critical entities'],
            ],
          },
        ],
      },
      {
        id: 'granularity',
        heading: 'Choosing what to key on',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Most invalidation pain is self-inflicted through **key granularity**. Cache a fully rendered dashboard and any change to any of its twelve underlying entities invalidates the whole thing — your hit rate tracks the *union* of all their write rates.',
              'Cache the twelve entities separately and each write invalidates one small key. You pay a little assembly cost per request and get a dramatically higher hit rate. The rule of thumb: **cache at the granularity at which data changes, not the granularity at which it is displayed.**',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Entities on the page', value: '12' },
              { label: 'Write rate per entity', value: '1 per 10 min' },
              { label: 'Coarse key (whole page) invalidation rate', value: '~1 per 50 s', note: '12 × the individual rate' },
              { label: 'Fine keys — invalidation per key', value: '1 per 10 min' },
              { label: 'Hit rate, coarse vs fine', value: '≈ 60% vs 95%' },
            ],
            result: 'Fine-grained keys buy hit rate; coarse keys buy fewer round trips. Usually hit rate wins.',
          },
        ],
      },
    ],
    whenNotToUse: [
      'Do not skip TTLs "because we invalidate explicitly" — the delete is exactly the thing that fails.',
      'Avoid very long TTLs on data with legal or safety implications (permissions, entitlements, pricing) unless invalidation is durable.',
      'Do not use versioned keys where memory is tight and values are large: orphaned versions occupy memory until they expire.',
      'Avoid whole-page cache keys on pages assembled from many independently-changing entities.',
    ],
    failureModes: [
      {
        name: 'Cache avalanche',
        symptom: 'A synchronised wall of misses at a round time, database CPU spikes together.',
        cause: 'Many keys written at once with identical TTLs, so they all expire in the same second.',
        fix: 'Add jitter to every TTL; stagger cache warming after deploys.',
      },
      {
        name: 'Zombie value after delete',
        symptom: 'A key reappears with the old value moments after being invalidated.',
        cause: 'A concurrent reader had already fetched the pre-write value and wrote it back after the delete.',
        fix: 'Delayed double delete, or versioned keys, which make the race impossible.',
      },
      {
        name: 'Invisible writer',
        symptom: 'The cache is stale but no application write path was involved.',
        cause: 'A batch job, migration or manual SQL statement changed the row without invalidating.',
        fix: 'CDC-driven invalidation, and a TTL short enough to bound the damage.',
      },
      {
        name: 'Cache penetration',
        symptom: 'Constant database queries for ids that do not exist.',
        cause: 'Misses are not cached, so lookups for nonexistent keys always fall through.',
        fix: 'Cache a tombstone with a short TTL; add a Bloom filter for large id spaces.',
      },
    ],
    interview: [
      {
        q: 'Why is cache invalidation considered hard?',
        a: [
          'Because the cache and the database are separate systems with no shared transaction, so there is always an interval in which they disagree, and every scheme just chooses which interval and which failure mode you get.',
          'On top of that, invalidation is a distributed problem: you may have multiple app nodes with local caches, multiple writers, CDNs, and writers outside your application entirely. Being *correct* means every one of those paths participates, and in practice at least one of them will not.',
        ],
        followUps: ['Which of those windows would you accept for a permissions check?'],
      },
      {
        q: 'Delete the key or update it on write?',
        a: [
          'Delete. Updating re-introduces an ordering hazard between concurrent writers that can leave the older value cached until the TTL expires, whereas a delete can only ever cost an extra miss.',
          'The exception is write-through, where updating *is* the point — but there you accept the ordering risk deliberately and usually guard it with a version.',
        ],
      },
      {
        q: 'How do you invalidate a thousand derived keys when one upstream record changes?',
        a: [
          'Not by scanning and deleting — `SCAN` over a large keyspace is slow and `KEYS` will stall the server.',
          'I would use a version prefix: keys embed a namespace version, and invalidation is a single atomic `INCR` on that version. Every reader immediately computes new keys and misses; the orphans expire on their own TTL.',
          'The cost is transient memory for the orphaned entries, which is usually much cheaper than the scan.',
        ],
        followUps: ['What if the version key itself is evicted?'],
      },
      {
        q: 'How would you pick a TTL for a permissions cache?',
        a: [
          'Start from the revocation requirement: if a revoked admin must lose access within a minute, the TTL cannot exceed a minute — that is a security bound, not a performance choice.',
          'Then check the load implication: hot keys divided by TTL gives the refresh QPS, and if 60 seconds is too expensive I would keep the short TTL and add explicit invalidation on the revoke path so the common case is fast and the TTL only backstops failures.',
        ],
      },
    ],
    references: [
      { label: 'Debezium — change data capture for cache invalidation', href: 'https://debezium.io/documentation/reference/stable/architecture.html' },
      { label: 'Redis — expiration semantics', href: 'https://redis.io/docs/latest/commands/expire/' },
    ],
  },
}

// ── 6. Stampede ──────────────────────────────────────────────────────────────

const stampede: Lesson = {
  slug: 'caching-stampede',
  title: 'Cache Stampede & Thundering Herd',
  summary: 'One expired key, ten thousand simultaneous misses, one dead database.',
  group: 'building-blocks',
  topic: 'Caching',
  tier: 'pro',
  minutes: 8,
  concept: 'Failure mode',
  tags: [
    { label: 'Trigger', value: 'Hot key expiry' },
    { label: 'Blast radius', value: 'Database saturation' },
    { label: 'Fix', value: 'Single-flight · Early refresh' },
  ],
  notes: [
    'When a hot key expires, every concurrent reader misses at once and runs the same expensive query.',
    'Single-flight: one request rebuilds the value, the rest wait for it — N queries collapse to 1.',
    'Probabilistic early expiry refreshes hot keys just before they die, so the miss never happens under load.',
  ],
  scene: {
    code: [
      'value = cache.get(key)',
      'if value is None:                 # 10,000 threads land here',
      '    if lock.acquire(key, ttl=5):  # only ONE wins',
      '        value = db.query(key)     # single expensive query',
      '        cache.set(key, value, ttl=60)',
      '        lock.release(key)',
      '    else:',
      '        sleep(50ms); return cache.get(key)   # the rest wait',
      'return value',
    ],
    initialState: { 'concurrent readers': 0, 'db queries': 0, 'db cpu': '8%', status: 'healthy' },
    nodes: [
      { id: 'clients', kind: 'client', label: '10k Readers', x: 12, y: 50 },
      { id: 'cache', kind: 'cache', label: 'Cache', x: 44, y: 28, badge: 'hot key · ttl 1s' },
      { id: 'lock', kind: 'rateLimiter', label: 'Single-flight lock', x: 50, y: 76, badge: 'free' },
      { id: 'db', kind: 'database', label: 'Database', x: 84, y: 50, badge: 'idle' },
    ],
    edges: [
      { id: 'c-cache', from: 'clients', to: 'cache' },
      { id: 'c-lock', from: 'clients', to: 'lock', curve: 0.3 },
      { id: 'lock-db', from: 'lock', to: 'db', curve: 0.3 },
      { id: 'c-db', from: 'clients', to: 'db', curve: -0.15 },
      { id: 'db-cache', from: 'db', to: 'cache', curve: -0.35 },
    ],
    steps: [
      { id: '1', caption: 'A single hot key serves 10,000 reads a second — the homepage feed. Everything is fine.', travel: 'c-cache', token: 'hit', codeLine: 1, patches: [{ nodeId: 'cache', badge: 'HIT ×10k', highlight: true }], state: { 'concurrent readers': 10000, 'db cpu': '8%' } },
      { id: '2', caption: 'Its TTL expires. In that instant the key is simply gone.', codeLine: 2, patches: [{ nodeId: 'cache', badge: 'EXPIRED', highlight: true }], state: { status: 'key expired' } },
      { id: '3', caption: 'Without protection: all 10,000 readers miss together and all run the same 200 ms query.', travel: 'c-db', token: 'miss', codeLine: 2, patches: [{ nodeId: 'db', badge: '10,000 queries', highlight: true }], state: { 'db queries': 10000, 'db cpu': '100%', status: 'STAMPEDE' } },
      { id: '4', caption: 'The database saturates. Queries queue, latency explodes, and the retries make it worse.', patches: [{ nodeId: 'db', badge: '✗ saturated', highlight: true }], state: { status: 'outage', 'db cpu': '100%' } },
      { id: '5', caption: 'Now with single-flight: every reader first tries to take a per-key lock.', travel: 'c-lock', token: 'request', codeLine: 3, patches: [{ nodeId: 'lock', badge: 'contended', highlight: true }], state: { status: 'single-flight' } },
      { id: '6', caption: 'Exactly one wins the lock and runs the query. The other 9,999 wait on the result.', travel: 'lock-db', token: 'request', codeLine: 4, patches: [{ nodeId: 'db', badge: '1 query', highlight: true }], state: { 'db queries': 1, 'db cpu': '11%' } },
      { id: '7', caption: 'The winner repopulates the cache and releases the lock; everyone else gets a hit.', travel: 'db-cache', token: 'write', codeLine: 5, patches: [{ nodeId: 'cache', badge: 'HIT ×10k' }, { nodeId: 'lock', badge: 'free' }], state: { status: 'healthy', 'db cpu': '9%' } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'A cache stampede — also called a **thundering herd** or **dog-piling** — is the canonical way a caching layer takes down the database it was installed to protect. It needs only two ingredients you almost certainly have: **one very hot key**, and **an expiry**.',
      'What makes it dangerous is that it is invisible until it is not. Your hit rate is 99.9%, your dashboards are green, and then one key expires at peak traffic and the 0.1% arrives all at once.',
    ],
    sections: [
      {
        id: 'anatomy',
        heading: 'The anatomy of the collapse',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The failure is a **queueing** failure, not a caching one. Consider a key serving 10,000 requests per second, backed by a query that takes 200 ms.',
              'The moment the key expires, requests keep arriving at 10,000/s while the first rebuild takes 200 ms to finish. In that window **2,000 requests** all discover a miss and all start their own copy of the same query. Each one consumes a connection, memory and CPU on the database; each one takes longer than 200 ms because they are now competing; and the longer they take, the more requests pile in behind them.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Requests to the key', value: '10,000 /s' },
              { label: 'Rebuild query duration', value: '200 ms' },
              { label: 'Misses before the first rebuild lands', value: '2,000' },
              { label: 'DB connection pool size', value: '100' },
              { label: 'Requests that get a connection', value: '100' },
              { label: 'Requests that queue or fail', value: '1,900', note: 'pool exhaustion' },
            ],
            result: 'The pool saturates in ~10 ms and the failure spreads to every other query on that database.',
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'The blast radius is not the hot key',
            body: [
              'The stampede exhausts a **shared** resource — the connection pool, the database CPU — so the outage hits every unrelated endpoint using the same database. Post-mortems that focus on the expired key miss the point: the fix has to bound concurrency, not just improve the cache.',
            ],
          },
        ],
      },
      {
        id: 'single-flight',
        heading: 'Fix 1 — single-flight (request coalescing)',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The direct fix: allow **exactly one** rebuild per key at a time. The first thread to acquire a per-key lock does the work; every other thread either waits briefly and re-reads, or is served the stale value if you kept one.',
              'The lock must have a TTL of its own, or a process that dies mid-rebuild leaves the key permanently un-rebuildable — a deadlock that presents as a permanent outage for one key.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'single_flight.py — one rebuild per key, with a self-expiring lock',
            lines: [
              'def get_with_single_flight(key, loader, ttl=60):',
              '    value = cache.get(key)',
              '    if value is not None:',
              '        return value',
              '',
              '    lock_key = f"lock:{key}"',
              '    # SET NX EX: atomic acquire with automatic expiry',
              '    got_lock = cache.set(lock_key, TOKEN, nx=True, ex=10)',
              '',
              '    if got_lock:',
              '        try:',
              '            value = loader()                  # the one expensive query',
              '            cache.set(key, value, ex=jitter(ttl))',
              '            return value',
              '        finally:',
              '            cache.delete(lock_key)',
              '',
              '    # Lost the race: wait for the winner, with a bounded retry.',
              '    for _ in range(20):',
              '        sleep(0.05)',
              '        value = cache.get(key)',
              '        if value is not None:',
              '            return value',
              '    return loader()      # last resort, after ~1s',
            ],
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Waiting converts a database problem into a latency problem',
            body: [
              '9,999 requests blocking for 200 ms is much better than 9,999 queries — but it is still 200 ms added to your p99, and those requests are holding application threads. Always bound the wait and have a fallback, or a slow rebuild will exhaust your web workers instead of your database connections.',
            ],
          },
        ],
      },
      {
        id: 'early-refresh',
        heading: 'Fix 2 — refresh before it expires',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Single-flight handles the herd once it forms. **Probabilistic early expiration** prevents it forming at all: as an entry approaches its expiry, each reader has a small and growing chance of deciding to refresh it *early*, while the existing value is still valid and still being served.',
              'The standard formulation (the "XFetch" algorithm) stores the time the last rebuild took, `delta`, alongside the value. A reader recomputes when `now - delta * beta * ln(random()) >= expiry`. Expensive values (large `delta`) start refreshing earlier, cheap ones refresh nearer the deadline, and because the trigger is random, exactly one reader typically wins.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'xfetch.py — probabilistic early recomputation',
            lines: [
              'import math, random, time',
              '',
              'BETA = 1.0   # >1 refreshes earlier, <1 later',
              '',
              'def get_xfetch(key, loader, ttl=60):',
              '    payload = cache.get(key)          # {value, delta, expiry}',
              '    if payload is None:',
              '        return rebuild(key, loader, ttl)',
              '',
              '    now = time.time()',
              '    should_refresh = (',
              '        now - payload["delta"] * BETA * math.log(random.random())',
              '        >= payload["expiry"]',
              '    )',
              '    if should_refresh:',
              '        return rebuild(key, loader, ttl)   # early, while old value still valid',
              '    return payload["value"]',
              '',
              'def rebuild(key, loader, ttl):',
              '    start = time.time()',
              '    value = loader()',
              '    delta = time.time() - start           # how expensive this was',
              '    cache.set(key, {"value": value, "delta": delta,',
              '                    "expiry": time.time() + ttl}, ex=ttl * 2)',
              '    return value',
            ],
          },
          {
            kind: 'table',
            columns: ['Technique', 'Extra latency', 'DB queries per expiry', 'Complexity', 'Serves stale?'],
            rows: [
              ['Nothing', 'Enormous under load', 'Thousands', 'None', 'No'],
              ['Single-flight lock', 'One rebuild (~200 ms) for waiters', '1', 'Low', 'No'],
              ['Stale-while-revalidate', 'None', '1', 'Low', 'Yes, briefly'],
              ['Probabilistic early expiry', 'None', '~1', 'Medium', 'No'],
              ['Scheduled background refresh', 'None', '1 per interval', 'Medium — needs a worker', 'No'],
              ['Never expire + explicit invalidation', 'None', '0', 'High — invalidation must be reliable', 'On failure'],
            ],
          },
        ],
      },
      {
        id: 'stale',
        heading: 'Fix 3 — serve stale while you revalidate',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Often the cheapest answer is to decide that **slightly stale beats slow**. Store the value with a *logical* expiry that is shorter than its physical TTL. Past the logical expiry, readers get the old value immediately while one of them kicks off an asynchronous refresh.',
              'This is exactly what HTTP\'s `stale-while-revalidate` directive does at the CDN layer, and it composes well with single-flight: the refresh is coalesced, and nobody waits.',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Latency stays flat** — no reader ever blocks on a rebuild.',
              '**Database load is one query per logical TTL**, regardless of traffic.',
              '**The staleness is bounded and explicit**, which makes it a product decision rather than an accident.',
              '**It degrades well.** If the database is down, you can keep serving the stale value rather than erroring — often the difference between a degraded homepage and no homepage.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Name the herd before you name the fix',
            body: [
              'Interviewers score the diagnosis more than the remedy. "The homepage feed is one key at 10k QPS with a 200 ms rebuild, so an expiry admits ~2,000 concurrent misses and exhausts a 100-connection pool" earns more than immediately reciting "use a mutex".',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Do not add single-flight locking to keys that are cheap to rebuild — the lock round trip can cost more than the query it protects.',
      'Avoid stale-while-revalidate for data where serving a slightly old value is a correctness or compliance problem (balances, entitlements).',
      'Do not use a lock without a TTL and a bounded wait; you trade a database outage for an application-thread outage.',
      'Background refresh loops are wasted work for keys with low or bursty traffic — they refresh things nobody is asking for.',
    ],
    failureModes: [
      {
        name: 'Connection pool exhaustion',
        symptom: 'Unrelated endpoints time out during the stampede, not just the hot path.',
        cause: 'Thousands of simultaneous rebuilds each grab a database connection from a shared pool.',
        fix: 'Single-flight to bound rebuild concurrency, plus a separate pool or a bulkhead for expensive queries.',
      },
      {
        name: 'Lock deadlock on crash',
        symptom: 'One key never repopulates; that endpoint stays broken while everything else is fine.',
        cause: 'The rebuild process died holding a lock that had no expiry.',
        fix: 'Always `SET NX EX`; keep the lock TTL slightly above the p99 rebuild time and release in a `finally`.',
      },
      {
        name: 'Retry amplification',
        symptom: 'Load keeps climbing after the initial spike, even as requests fail.',
        cause: 'Clients retry failed requests, adding traffic to an already-saturated database.',
        fix: 'Exponential backoff with jitter, a circuit breaker in front of the rebuild, and load shedding at the edge.',
      },
      {
        name: 'Synchronised expiry across keys',
        symptom: 'Many different keys stampede simultaneously after a deploy or cache flush.',
        cause: 'Identical TTLs set at the same instant — an avalanche rather than a single herd.',
        fix: 'TTL jitter, staggered warming, and gradual traffic ramp after a cold start.',
      },
    ],
    interview: [
      {
        q: 'Your database CPU spikes to 100% for five seconds every few minutes, but the cache hit rate is 99%. What is happening?',
        a: [
          'That pattern is a stampede on a hot key. A 99% hit rate says nothing about the *distribution* of the 1% — if the misses are concentrated on one key expiring under high concurrency, thousands of identical queries arrive in the same instant.',
          'I would confirm it by correlating the spikes with key expiry and looking at whether the queries during the spike are identical. Then bound rebuild concurrency with single-flight and remove the synchronised trigger with probabilistic early expiry.',
        ],
        followUps: ['How would you verify the fix without waiting for the next incident?'],
      },
      {
        q: 'Compare single-flight locking with probabilistic early expiry.',
        a: [
          'Single-flight is reactive: the herd forms and the lock collapses it to one query, but the waiters still pay the rebuild latency and hold threads. It is simple, and it is a hard guarantee.',
          'Early expiry is preventive: the refresh happens before expiry, while the old value is still being served, so nobody waits. It is probabilistic rather than guaranteed, and it needs you to store the rebuild duration.',
          'In production I would use both — early expiry to avoid the herd in the common case, and a lock as the guarantee when it forms anyway, for instance after a cache flush.',
        ],
      },
      {
        q: 'Would you ever just never expire the hot key?',
        a: [
          'Yes, for a small set of very hot, very expensive keys — but only paired with reliable invalidation and a background refresher, because you have removed the TTL backstop that saves you when invalidation fails.',
          'The safer version of that idea is a long physical TTL with a short logical one: serve stale, refresh in the background, and let the physical TTL still catch a permanently orphaned entry.',
        ],
      },
      {
        q: 'A cache node restarts during peak traffic. What do you expect and how do you prevent an outage?',
        a: [
          'A 0% hit rate against full production traffic — the same failure as a stampede, but across every key at once, which no per-key lock will save you from.',
          'Prevention is capacity and process: warm the cache before it takes traffic, restart nodes one at a time so the ring only loses a fraction of keys, and keep a rate limiter or circuit breaker in front of the database so it degrades rather than dies.',
        ],
      },
    ],
    references: [
      { label: 'Vattani, Chierichetti, Lowenstein — Optimal Probabilistic Cache Stampede Prevention (VLDB ’15)', href: 'https://cseweb.ucsd.edu/~avattani/papers/cache_stampede.pdf' },
      { label: 'MDN — stale-while-revalidate', href: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate' },
    ],
  },
}

// ── 7. The cache hierarchy ───────────────────────────────────────────────────

const layers: Lesson = {
  slug: 'caching-layers',
  title: 'The Cache Hierarchy: Browser to Database',
  summary: 'Six places to cache a response — and why the cheapest hit is the one nearest the user.',
  group: 'building-blocks',
  topic: 'Caching',
  tier: 'pro',
  minutes: 8,
  concept: 'Architecture',
  tags: [
    { label: 'Layers', value: 'Browser · CDN · App · DB' },
    { label: 'Best hit', value: 'Closest to user' },
    { label: 'Control', value: 'Cache-Control headers' },
  ],
  notes: [
    'Every layer you pass costs latency, so the best cache hit is the one that never leaves the device.',
    'Each layer has a different invalidation story — browsers are the hardest to reach, the database the easiest.',
    'HTTP caching semantics (max-age, ETag, stale-while-revalidate) drive the first two layers for free.',
  ],
  scene: {
    code: [
      'Cache-Control: public, max-age=60,',
      '               s-maxage=300,',
      '               stale-while-revalidate=86400',
      'ETag: "a1b2c3"',
      '',
      '# 304 Not Modified = a hit that still',
      '# pays one round trip, but no body',
    ],
    initialState: { layer: 'none', latency: '—', 'origin load': '100%' },
    nodes: [
      { id: 'browser', kind: 'client', label: 'Browser', x: 10, y: 50, badge: 'cold' },
      { id: 'cdn', kind: 'cdn', label: 'CDN edge', x: 33, y: 50, badge: 'cold' },
      { id: 'gw', kind: 'apiGateway', label: 'App server', x: 56, y: 50 },
      { id: 'cache', kind: 'cache', label: 'Redis', x: 78, y: 26, badge: 'cold' },
      { id: 'db', kind: 'database', label: 'Database', x: 92, y: 74, badge: 'buffer pool' },
    ],
    edges: [
      { id: 'b-cdn', from: 'browser', to: 'cdn' },
      { id: 'cdn-gw', from: 'cdn', to: 'gw' },
      { id: 'gw-cache', from: 'gw', to: 'cache' },
      { id: 'gw-db', from: 'gw', to: 'db' },
      { id: 'cdn-b', from: 'cdn', to: 'browser', curve: 0.45 },
      { id: 'gw-b', from: 'gw', to: 'browser', curve: -0.5 },
    ],
    steps: [
      { id: '1', caption: 'First request: nothing is cached anywhere. It travels the whole chain.', travel: 'b-cdn', token: 'request', codeLine: 1, state: { layer: 'miss everywhere', 'origin load': '100%' } },
      { id: '2', caption: 'CDN edge misses, so it forwards to the app server.', travel: 'cdn-gw', token: 'miss', patches: [{ nodeId: 'cdn', badge: 'MISS', highlight: true }] },
      { id: '3', caption: 'The app checks Redis — also cold. It falls through to the database.', travel: 'gw-db', token: 'miss', patches: [{ nodeId: 'cache', badge: 'MISS', highlight: true }, { nodeId: 'db', badge: 'disk read', highlight: true }], state: { latency: '~180 ms' } },
      { id: '4', caption: 'On the way back, every layer stores a copy with its own lifetime.', travel: 'gw-b', token: 'write', codeLine: 2, patches: [{ nodeId: 'cache', badge: '300 s' }, { nodeId: 'cdn', badge: 's-maxage 300' }, { nodeId: 'browser', badge: 'max-age 60' }] },
      { id: '5', caption: 'The same user reloads within 60 s: the browser answers from disk. Zero network.', travel: 'b-cdn', token: 'hit', codeLine: 1, patches: [{ nodeId: 'browser', badge: 'HIT · 0 ms', highlight: true }], state: { layer: 'browser', latency: '~0 ms', 'origin load': '0%' } },
      { id: '6', caption: 'A different user in the same city hits the CDN edge — one short round trip.', travel: 'cdn-b', token: 'hit', patches: [{ nodeId: 'cdn', badge: 'HIT · 20 ms', highlight: true }], state: { layer: 'cdn', latency: '~20 ms' } },
      { id: '7', caption: 'A personalised request skips the CDN but still hits Redis — the origin never touches disk.', travel: 'gw-cache', token: 'hit', patches: [{ nodeId: 'cache', badge: 'HIT · 0.5 ms', highlight: true }], state: { layer: 'redis', latency: '~25 ms', 'origin load': '3%' } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'Caching is not one component, it is a **hierarchy**. A response can be served from the browser\'s disk, a CDN edge, a reverse proxy, the application\'s local memory, a shared Redis, or the database\'s own buffer pool — and each layer is roughly an order of magnitude further from the user than the one before it.',
      'Senior candidates are separated from mid-level ones here. Anyone can say "add Redis". Placing the cache at the **right** layer, and explaining what each layer can and cannot invalidate, is the actual design skill.',
    ],
    sections: [
      {
        id: 'ladder',
        heading: 'The layers, with real numbers',
        blocks: [
          {
            kind: 'table',
            columns: ['Layer', 'Typical hit latency', 'Scope', 'Invalidation'],
            rows: [
              ['Browser cache', '0 ms', 'One user, one device', 'Nearly impossible — you must wait out `max-age`'],
              ['CDN edge', '10–30 ms', 'Everyone near that PoP', 'Purge API, seconds to propagate'],
              ['Reverse proxy (nginx/Varnish)', '1–5 ms', 'Everyone behind it', 'Purge request, immediate'],
              ['App local memory', '~0.01 ms', 'One process', 'Hard — needs a broadcast to every node'],
              ['Shared Redis / Memcached', '0.3–1 ms', 'All app nodes', 'Easy — one DELETE'],
              ['Database buffer pool', '0.1–1 ms', 'That database', 'Automatic, not yours to manage'],
            ],
            caption: 'Latency falls as you move outward; invalidation control falls as you move outward too. That tension is the design problem.',
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Cache-ability is decided by scope, not by cost',
            body: [
              'The right question for each layer is "how many users can share this exact bytes?" A product image is shared by everyone, so it belongs at the CDN with a year-long TTL. A logged-in dashboard is shared by exactly one user, so a CDN cannot help and the caching must happen at Redis or below.',
            ],
          },
        ],
      },
      {
        id: 'http',
        heading: 'The two outer layers are configured with headers',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Browser and CDN caching are controlled almost entirely by `Cache-Control`, and getting the directives right is free performance most teams leave on the table.',
            ],
          },
          {
            kind: 'list',
            items: [
              '`max-age=60` — how long the **browser** may reuse it without asking.',
              '`s-maxage=300` — how long **shared** caches (CDN, proxy) may, overriding `max-age` for them. This is how you give the browser a short leash and the CDN a long one.',
              '`stale-while-revalidate=86400` — serve the stale copy instantly and refresh in the background. This is stampede protection at the edge, for free.',
              '`private` vs `public` — `private` forbids shared caches from storing it. Every authenticated response needs this, or a CDN may serve one user\'s data to another.',
              '`no-store` — never write it down anywhere. For genuinely secret responses only; it disables all caching.',
              '`ETag` / `If-None-Match` — revalidation. A `304 Not Modified` still costs a round trip but skips the body, which is a large win for big payloads on slow links.',
            ],
          },
          {
            kind: 'code',
            language: 'http',
            caption: 'Header strategy by response type',
            lines: [
              '# Immutable, fingerprinted asset (app.a1b2c3.js)',
              'Cache-Control: public, max-age=31536000, immutable',
              '',
              '# Shared HTML that changes occasionally',
              'Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
              '',
              '# Personalised API response',
              'Cache-Control: private, max-age=30',
              '',
              '# Anything sensitive',
              'Cache-Control: no-store',
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Never cache HTML at the browser without a way out',
            body: [
              'Fingerprinted assets can safely carry a one-year `max-age` because a new deploy changes their filenames. The HTML that references them cannot — if you give `index.html` a long `max-age`, users are pinned to an old build with no mechanism to recover, because you cannot reach into their browser to purge it.',
              'The standard pattern is: **immutable assets, revalidated HTML.**',
            ],
          },
        ],
      },
      {
        id: 'two-tier',
        heading: 'Local + shared: the two-tier application cache',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Inside the application, a local in-process cache is ~50× faster than Redis because it skips the network and the deserialisation. But it is per-process, so N app servers means N copies that can disagree.',
              'The standard resolution is a **two-tier cache**: a small local tier with a deliberately short TTL in front of a large shared tier. You accept a bounded staleness of a few seconds in exchange for absorbing the overwhelming majority of reads in-process.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Read QPS per app node', value: '20,000' },
              { label: 'Local tier hit rate (5 s TTL)', value: '~90%' },
              { label: 'Reads reaching Redis', value: '2,000 /s', note: 'per node' },
              { label: 'Redis network round trips saved', value: '18,000 /s' },
              { label: 'Worst-case staleness added', value: '5 s' },
            ],
            result: 'A tiny local TTL removes an order of magnitude of network traffic.',
          },
          {
            kind: 'prose',
            body: [
              'If five seconds of staleness is too much, add a **pub/sub invalidation channel**: on write, publish the key; every node subscribes and drops it locally. Redis calls this pattern client-side caching with tracking, and it is what lets the local tier hold a longer TTL safely.',
            ],
          },
        ],
      },
      {
        id: 'placement',
        heading: 'Deciding where a given response belongs',
        blocks: [
          {
            kind: 'list',
            ordered: true,
            items: [
              '**Is it identical for all users?** If yes, it belongs at the CDN. Static assets, marketing pages, public product data.',
              '**Is it identical for a segment?** Cache at the CDN keyed on that dimension (country, language, device class) via a `Vary` header — but keep the cardinality low, because each variant is a separate cached object.',
              '**Is it per-user but read repeatedly?** Redis, keyed by user. A CDN cannot help; a local cache risks serving another node\'s stale copy.',
              '**Is it expensive and shared, but not a full response?** Cache the *computation* — an aggregate, a search result set, a rendered fragment — in Redis, not the HTTP response.',
              '**Is it cheap and already indexed?** Do not cache it. Let the database buffer pool do its job and keep one fewer thing that can be wrong.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Push the cache outward until correctness stops you',
            body: [
              'A clean way to reason aloud: start at the browser and move inward only when personalisation or invalidation forbids the current layer. It shows you are optimising for the user\'s latency rather than the server\'s convenience.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Do not cache authenticated responses in shared caches — a missing `private` directive is a data-leak bug, not a performance bug.',
      'Avoid long browser `max-age` on anything you cannot rename; you have no purge mechanism for a device you do not control.',
      'Do not add a local tier when writes must be visible immediately across nodes, unless you also broadcast invalidations.',
      'Avoid high-cardinality `Vary` headers (per-user, per-cookie) — they fragment the CDN cache until the hit rate approaches zero.',
    ],
    failureModes: [
      {
        name: 'Cross-user data leak at the CDN',
        symptom: 'A user reports seeing another account\'s name or dashboard.',
        cause: 'An authenticated response was served with `public` (or no) `Cache-Control` and a shared cache stored it.',
        fix: 'Default to `private, no-store` for authenticated routes and enforce it in middleware, not per-handler.',
      },
      {
        name: 'Users pinned to an old build',
        symptom: 'After a deploy some users keep hitting removed API routes and see errors.',
        cause: 'HTML cached in the browser with a long `max-age` still references old asset filenames.',
        fix: 'Revalidate HTML (`max-age=0` + ETag) and only give long TTLs to fingerprinted assets.',
      },
      {
        name: 'Nodes disagreeing after a write',
        symptom: 'Repeated refreshes alternate between old and new values.',
        cause: 'Per-process local caches; the load balancer sends each request to a different node.',
        fix: 'Shorten the local TTL, or broadcast invalidations over pub/sub so every node drops the key.',
      },
      {
        name: 'CDN cache fragmentation',
        symptom: 'CDN hit rate is low despite mostly-static content.',
        cause: 'A `Vary` on a high-cardinality header, or cache-busting query parameters, splitting one object into thousands.',
        fix: 'Normalise the cache key at the edge — strip irrelevant params, reduce `Vary` to low-cardinality dimensions.',
      },
    ],
    interview: [
      {
        q: 'Where would you cache the response for a personalised feed?',
        a: [
          'Not at the CDN — it is per-user, so an edge cache either cannot help or is a leak risk. I would cache the expensive *pieces* rather than the response: the feed id list per user in Redis with a short TTL, and the post objects themselves in a shared cache since they are read by many users.',
          'Then I would put a `private, max-age=30` on the HTTP response so a rapid refresh is served by the user\'s own browser without hitting us at all.',
        ],
        followUps: ['How would you invalidate the feed when someone the user follows posts?'],
      },
      {
        q: 'Explain `max-age` versus `s-maxage`.',
        a: [
          '`max-age` applies to every cache, including the user\'s browser. `s-maxage` overrides it for shared caches — CDNs and proxies — and is ignored by browsers.',
          'The combination is how you keep control: a short `max-age` means the browser revalidates often, so you can fix a mistake quickly, while a long `s-maxage` still keeps the origin idle because the CDN absorbs the traffic. You can purge a CDN; you cannot purge a browser.',
        ],
      },
      {
        q: 'Would you use an in-process cache in front of Redis?',
        a: [
          'Often, yes — it removes a network hop and deserialisation on the hottest keys, which at high per-node QPS is a large saving.',
          'The condition is that I can tolerate staleness bounded by the local TTL, because each process has its own copy. I would keep that TTL to a few seconds, and if the data needs to be fresher, add a pub/sub invalidation channel so writes drop the key on every node.',
        ],
      },
      {
        q: 'A deploy went out but users still see the old version. Diagnose it.',
        a: [
          'Work outward-in, since the outermost cache is the one you cannot purge. Check the `Cache-Control` on the HTML document first — if it carries a long `max-age`, browsers are serving the old document from disk and no purge will reach them.',
          'If the HTML is fine, purge the CDN and check whether the edge is keyed on something that made the new object a different entry. Only after those would I look at the app-level cache.',
          'The durable fix is the immutable-assets/revalidated-HTML split, plus a build id the client can compare so it can prompt a reload.',
        ],
      },
    ],
    references: [
      { label: 'MDN — HTTP caching', href: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching' },
      { label: 'Redis — client-side caching with tracking', href: 'https://redis.io/docs/latest/develop/reference/client-side-caching/' },
    ],
  },
}

// ── 8. Distributed caching ───────────────────────────────────────────────────

const distributed: Lesson = {
  slug: 'caching-distributed',
  title: 'Distributed Caching & Hot Keys',
  summary: 'Spread the cache across nodes without reshuffling every key — and survive the one key everyone wants.',
  group: 'building-blocks',
  topic: 'Caching',
  tier: 'pro',
  minutes: 9,
  concept: 'Architecture',
  tags: [
    { label: 'Sharding', value: 'Consistent hashing' },
    { label: 'Redis Cluster', value: '16,384 slots' },
    { label: 'Risk', value: 'Hot key / hot shard' },
  ],
  notes: [
    'One cache node eventually runs out of memory or network bandwidth — so the keyspace gets sharded.',
    'Consistent hashing (or fixed hash slots) means adding a node moves a fraction of keys, not all of them.',
    'A single hot key can saturate one shard while the others idle; the fix is replication or local caching, not more shards.',
  ],
  scene: {
    code: [
      'slot = CRC16(key) % 16384',
      'node = slot_owner[slot]',
      '',
      '# adding a 4th node moves ~1/4',
      '# of the slots, not all keys',
      '',
      '# hot key fix: replicate it',
      'key = f"celeb:{id}:copy{rand(0,9)}"',
    ],
    initialState: { nodes: 3, 'keys moved': '0%', 'hot shard load': 'even', status: 'balanced' },
    nodes: [
      { id: 'app', kind: 'client', label: 'App fleet', x: 10, y: 50 },
      { id: 'n1', kind: 'cache', label: 'Shard A', x: 50, y: 18, badge: 'slots 0–5460' },
      { id: 'n2', kind: 'cache', label: 'Shard B', x: 50, y: 50, badge: 'slots 5461–10922' },
      { id: 'n3', kind: 'cache', label: 'Shard C', x: 50, y: 82, badge: 'slots 10923–16383' },
      { id: 'n4', kind: 'cache', label: 'Shard D (new)', x: 86, y: 50, badge: 'empty' },
    ],
    edges: [
      { id: 'a-n1', from: 'app', to: 'n1', curve: -0.3 },
      { id: 'a-n2', from: 'app', to: 'n2' },
      { id: 'a-n3', from: 'app', to: 'n3', curve: 0.3 },
      { id: 'n1-n4', from: 'n1', to: 'n4', curve: -0.25 },
      { id: 'n2-n4', from: 'n2', to: 'n4' },
    ],
    steps: [
      { id: '1', caption: 'The keyspace is split into 16,384 slots, divided evenly across three shards.', codeLine: 1, state: { nodes: 3, status: 'balanced' } },
      { id: '2', caption: 'The client hashes the key itself, so a read goes straight to the owning shard — no proxy hop.', travel: 'a-n2', token: 'request', codeLine: 2, patches: [{ nodeId: 'n2', badge: 'HIT', highlight: true }] },
      { id: '3', caption: 'Memory runs low, so a fourth shard joins the cluster.', codeLine: 4, patches: [{ nodeId: 'n4', badge: 'joining', highlight: true }], state: { nodes: 4 } },
      { id: '4', caption: 'Only a quarter of the slots migrate. With a naive hash(key) % N, every key would move.', travel: 'n1-n4', token: 'write', codeLine: 5, patches: [{ nodeId: 'n4', badge: 'slots 0–1365', highlight: true }], state: { 'keys moved': '25%' } },
      { id: '5', caption: 'Migration done — load is even again, and 75% of the cache was never disturbed.', patches: [{ nodeId: 'n1', badge: 'slots 1366–5460' }, { nodeId: 'n4', badge: 'slots 0–1365' }], state: { status: 'rebalanced', 'keys moved': '25%' } },
      { id: '6', caption: 'Then a celebrity posts. One key on Shard B takes 400k reads/sec — that shard saturates alone.', travel: 'a-n2', token: 'miss', patches: [{ nodeId: 'n2', badge: '✗ 100% CPU', highlight: true }], state: { 'hot shard load': 'B at 100%', status: 'HOT KEY' } },
      { id: '7', caption: 'Fix: write the value under 10 suffixed copies so the load spreads across every shard.', travel: 'a-n3', token: 'hit', codeLine: 7, patches: [{ nodeId: 'n2', badge: 'HIT · 40k/s' }, { nodeId: 'n3', badge: 'HIT · 40k/s', highlight: true }], state: { 'hot shard load': 'even', status: 'balanced' } },
    ],
  },
  deepDive: {
    readingMinutes: 10,
    intro: [
      'A single cache node is bounded by three things: **memory**, **network bandwidth**, and **single-threaded CPU**. Long before you exhaust the first, a busy service tends to hit the second. So the keyspace gets split across nodes — and that introduces a placement problem, a rebalancing problem, and a skew problem.',
      'The placement and rebalancing problems have textbook answers. The skew problem — one key hotter than an entire shard — does not, and it is where most real incidents live.',
    ],
    sections: [
      {
        id: 'placement',
        heading: 'Placing keys: why modulo hashing fails',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The obvious scheme is `node = hash(key) % N`. It distributes evenly and costs nothing — until N changes. Adding one node to a three-node cluster changes the modulus, and **almost every key now maps somewhere else**. In practice that means a near-total cache miss, and the database receives your entire read load at once.',
              'Consistent hashing fixes this by hashing nodes and keys onto the same ring: a key belongs to the first node clockwise from it. Adding a node only steals keys from its immediate successor, so roughly `1/N` of the keyspace moves rather than all of it.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Keys moved, modulo hashing, 3 → 4 nodes', value: '~75%', note: 'catastrophic' },
              { label: 'Keys moved, consistent hashing, 3 → 4 nodes', value: '~25%' },
              { label: 'Virtual nodes per physical node', value: '100–200', note: 'evens out the ring' },
              { label: 'Redis Cluster fixed slots', value: '16,384' },
              { label: 'Slots moved, Redis Cluster, 3 → 4 nodes', value: '4,096', note: 'exactly 1/4' },
            ],
            result: 'Rebalancing cost should scale as 1/N, never as N.',
          },
          {
            kind: 'prose',
            body: [
              'Redis Cluster uses a pragmatic variant: a **fixed 16,384 hash slots** assigned to nodes. `CRC16(key) % 16384` gives the slot; a slot map (gossiped between nodes and cached client-side) gives the owner. The indirection means resharding is just reassigning slot ranges, and the client can route in one hop with no proxy. Memcached, by contrast, has no cluster protocol at all — clients implement consistent hashing themselves.',
            ],
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Multi-key operations need hash tags',
            body: [
              'In a sharded cache, `MGET user:1 user:2` may span nodes and will be rejected. Redis lets you force co-location with a **hash tag**: only the substring inside braces is hashed, so `{user:42}:profile` and `{user:42}:settings` always land on the same shard.',
              'Over-using hash tags recreates skew — everything tagged the same way lands on one node.',
            ],
          },
        ],
      },
      {
        id: 'hotkeys',
        heading: 'The hot key problem',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Sharding balances the *keyspace*, not the *traffic*. A single key — a celebrity profile, a flash-sale product, a global feature-flag document — can attract more requests than one node can serve, and no amount of resharding helps, because a key lives on exactly one node.',
              'The symptom is unmistakable and worth memorising: **one shard at 100% CPU or saturated network while the others sit near idle.** If load were merely uneven you would see a gradient; a hot key gives you a cliff.',
            ],
          },
          {
            kind: 'table',
            columns: ['Mitigation', 'How it works', 'Cost'],
            rows: [
              ['Key replication (fan-out)', 'Store N copies under suffixed keys; readers pick one at random', 'N× memory; N invalidations per write'],
              ['Client-side local cache', 'Each app node caches the hot key in-process for a few seconds', 'Bounded staleness; the strongest fix by far'],
              ['Read replicas per shard', 'Reads spread across replicas of the hot shard', 'Replication lag; more nodes'],
              ['Request coalescing', 'Collapse concurrent reads of the key within a node', 'Helps bursts, not sustained load'],
              ['Move it out of the cache', 'Serve the value from the CDN or embed it in config', 'Only works for public, slow-changing data'],
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'hot_key.py — replicate the value across N shards',
            lines: [
              'HOT_COPIES = 10',
              '',
              'def read_hot(key):',
              '    # random suffix -> different hash slot -> different shard',
              '    return cache.get(f"{key}:copy{random.randrange(HOT_COPIES)}")',
              '',
              'def write_hot(key, value, ttl=60):',
              '    pipe = cache.pipeline()',
              '    for i in range(HOT_COPIES):',
              '        pipe.set(f"{key}:copy{i}", value, ex=jitter(ttl))',
              '    pipe.execute()      # N writes, but reads spread across N shards',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'The best fix for a hot key is not to ask the cache',
            body: [
              'If one key serves 400,000 reads/sec, a five-second in-process cache on each of 50 app nodes reduces cache traffic to 10 reads/sec — a 40,000× reduction, for the price of five seconds of staleness. Replication schemes are what you reach for when even that staleness is unacceptable.',
            ],
          },
        ],
      },
      {
        id: 'topology',
        heading: 'Topology and failure',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A distributed cache is a distributed system, so it has all the usual failure modes — and one unusual property: **losing data is supposed to be survivable**. That should shape every availability decision you make about it.',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Replicas are for availability, not durability.** A Redis replica keeps the shard serving through a node loss; it does not make the cache a database.',
              '**Failover is not free.** Promotion takes seconds, and asynchronous replication means a small tail of writes is lost. Fine for a cache, fatal for a write-back buffer.',
              '**A partitioned cluster can split-brain.** Redis Cluster requires a majority of masters to accept writes, which is why odd node counts matter.',
              '**Client slot maps go stale.** After a reshard, clients get `MOVED` redirects and must refresh their map — a client library that does not handle this correctly produces mysterious latency spikes.',
              '**Losing a shard is a partial cold cache.** With four shards, one loss means a 25% miss rate against full traffic. Your database must be able to absorb that, or the cache outage becomes a site outage.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Read QPS served by the cache', value: '200,000 /s' },
              { label: 'Shards', value: '4' },
              { label: 'One shard lost — misses generated', value: '50,000 /s' },
              { label: 'Database sustainable read QPS', value: '~8,000 /s' },
              { label: 'Overload factor', value: '6×', note: 'the DB dies' },
            ],
            result: 'Plan the failure: rate-limit the DB, serve stale, or shed load before the cache node dies.',
          },
        ],
      },
      {
        id: 'choosing',
        heading: 'Redis or Memcached?',
        blocks: [
          {
            kind: 'table',
            columns: ['Dimension', 'Redis', 'Memcached'],
            rows: [
              ['Data model', 'Strings, hashes, sets, sorted sets, streams', 'Opaque strings only'],
              ['Clustering', 'Built in — hash slots, gossip, failover', 'Client-side sharding only'],
              ['Persistence', 'RDB snapshots + AOF', 'None'],
              ['Threading', 'Single-threaded execution (I/O threads since 6)', 'Truly multi-threaded'],
              ['Memory efficiency', 'Good, richer metadata', 'Slightly better for plain key/value'],
              ['Best at', 'Anything needing structure, atomicity or failover', 'Enormous, simple, purely volatile caches'],
            ],
            caption: 'Redis is the default choice today; Memcached still wins on raw multi-core throughput for flat key/value at very large scale.',
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Do not shard prematurely',
            body: [
              'A single modern Redis node handles roughly 100k operations/sec and tens of gigabytes comfortably. If the numbers you just estimated fit inside that, say so and use a replicated single node — proposing a cluster you do not need reads as unfamiliarity with the scale, not sophistication.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Do not cluster when one replicated node covers your working set and throughput — you are adding failure modes for nothing.',
      'Avoid distributed caches for tiny, ultra-hot configuration values; ship them to each process instead.',
      'Do not rely on cache replicas for durability — anything that must survive a node loss belongs in a database.',
      'Avoid heavy multi-key transactions in a sharded cache; either the operation is rejected or hash tags force skew.',
    ],
    failureModes: [
      {
        name: 'Hot shard saturation',
        symptom: 'One node pinned at 100% CPU or network while its peers are idle.',
        cause: 'A single key attracting a disproportionate share of traffic, which sharding cannot spread.',
        fix: 'Local in-process caching of that key, replicated copies under suffixed keys, or read replicas for the shard.',
      },
      {
        name: 'Total invalidation after resharding',
        symptom: 'Hit rate drops to near zero after adding a node; the database saturates.',
        cause: 'Modulo hashing, or a client library that recomputes placement instead of following slot migration.',
        fix: 'Consistent hashing or fixed slots; verify the client honours `MOVED`/`ASK` redirects during migration.',
      },
      {
        name: 'Cascading failure on shard loss',
        symptom: 'One cache node dies and the whole site goes down, not just a fraction of requests.',
        cause: 'The database cannot absorb the miss traffic from the lost shard.',
        fix: 'Rate-limit or circuit-break the database path, serve stale on failure, and size shards so one loss is survivable.',
      },
      {
        name: 'Skew from hash tags',
        symptom: 'Uneven memory and traffic across shards with no single obvious hot key.',
        cause: 'Too many keys sharing a hash tag, forcing co-location on one node.',
        fix: 'Tag only what genuinely needs multi-key atomicity; audit tag cardinality.',
      },
    ],
    interview: [
      {
        q: 'Why not just use hash(key) % number_of_nodes?',
        a: [
          'Because the moment the node count changes, the modulus changes and nearly every key maps to a different node. Going from three nodes to four invalidates roughly 75% of the cache in an instant, and the database takes that entire read load at once.',
          'Consistent hashing or fixed hash slots keep the movement proportional to the change — about 1/N of keys — so scaling is a routine operation rather than an outage.',
        ],
        followUps: ['How do virtual nodes improve consistent hashing?'],
      },
      {
        q: 'One shard is at 100% CPU, the rest are at 10%. What is going on and what do you do?',
        a: [
          'That shape is a hot key, not general imbalance — imbalance produces a gradient, a hot key produces one outlier. I would confirm with `redis-cli --hotkeys` or by sampling the command stream on that node.',
          'The most effective fix is a short-TTL in-process cache for that key on every app node, which collapses the traffic by orders of magnitude for a few seconds of staleness. If staleness is unacceptable, I would replicate the value under N suffixed keys so reads spread across shards, accepting N× write cost.',
          'Adding shards would not help at all, since a key lives on exactly one of them — worth saying explicitly.',
        ],
      },
      {
        q: 'A cache shard dies. Walk me through what happens.',
        a: [
          'Its share of the keyspace becomes a miss — with four shards, 25% of reads immediately fall through to the database. Whether that is an incident depends entirely on whether the database can absorb that fraction of your peak read load, which is a number I would compute in advance.',
          'Mitigations are a replica with automatic failover to keep the shard serving, a rate limiter or circuit breaker so the database degrades rather than dies, and serving stale values where the product allows it.',
        ],
      },
      {
        q: 'How do you handle a multi-key operation in a sharded cache?',
        a: [
          'By deciding whether the keys need to be co-located. If they do — a user\'s profile and settings read together — I would use a hash tag so only the shared substring is hashed and they land on the same shard.',
          'If they do not, I would fan out the reads in parallel from the client and assemble the result, which is usually fine because the requests hit different nodes concurrently.',
          'I would avoid tagging broadly, since every key sharing a tag also shares a node, which is how you manufacture a hot shard.',
        ],
      },
    ],
    references: [
      { label: 'Redis — Cluster specification (hash slots, MOVED/ASK)', href: 'https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/' },
      { label: 'Karger et al. — Consistent Hashing and Random Trees', href: 'https://www.cs.princeton.edu/courses/archive/fall09/cos518/papers/chash.pdf' },
    ],
  },
}

export const caching: Lesson[] = [
  cacheAside,
  writeThrough,
  writeBack,
  eviction,
  invalidation,
  stampede,
  layers,
  distributed,
]
