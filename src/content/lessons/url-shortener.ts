import type { Lesson } from '../types'

/** Topic: URL Shortener (group: case-studies). */

const urlShortener: Lesson = {
  slug: 'design-url-shortener',
  title: 'Design a URL Shortener',
  summary: 'Build TinyURL end to end — write path, read path, cache and scale.',
  group: 'case-studies',
  topic: 'URL Shortener',
  tier: 'pro',
  minutes: 12,
  concept: 'Case study',
  tags: [
    { label: 'Read latency', value: 'Sub-ms (cache hit)' },
    { label: 'Scale', value: 'Billions redirects/day' },
    { label: 'Pattern', value: 'Read-heavy · Cache-aside' },
  ],
  notes: [
    'Write: generate a short code, persist the mapping, then warm the cache.',
    'Read: resolve the code from cache (fast) or DB (fallback), then 301-redirect.',
    'Reads vastly outnumber writes, so caching is what makes it cheap at scale.',
  ],
  scene: {
    code: [
      '# WRITE  POST /shorten {long_url}',
      'code = base62(counter++)      # e.g. "a9Fk2"',
      'db.put(code, long_url)',
      'cache.set(code, long_url)',
      'return "short.ly/" + code',
      '',
      '# READ   GET /a9Fk2',
      'url = cache.get(code) or db.get(code)',
      'return redirect(301, url)',
    ],
    initialState: { mappings: 0, 'cache size': 0, 'read:write': '100:1' },
    nodes: [
      { id: 'client', kind: 'client', label: 'Client', x: 10, y: 50 },
      { id: 'api', kind: 'apiGateway', label: 'API', x: 38, y: 50 },
      { id: 'cache', kind: 'cache', label: 'Cache', x: 72, y: 24, badge: 'empty' },
      { id: 'db', kind: 'database', label: 'DB', x: 72, y: 78, badge: '0 rows' },
    ],
    edges: [
      { id: 'c-api', from: 'client', to: 'api' },
      { id: 'api-db', from: 'api', to: 'db' },
      { id: 'api-cache', from: 'api', to: 'cache' },
      { id: 'cache-api', from: 'cache', to: 'api', curve: 0.4 },
      { id: 'db-api', from: 'db', to: 'api', curve: -0.4 },
      { id: 'api-c', from: 'api', to: 'client', curve: 0.55 },
    ],
    steps: [
      { id: 'w1', caption: 'WRITE: a client posts a long URL to shorten.', travel: 'c-api', token: 'write', codeLine: 1 },
      { id: 'w2', caption: 'The API generates a short base-62 code from a counter.', codeLine: 2, patches: [{ nodeId: 'api', badge: 'code=a9Fk2', highlight: true }] },
      { id: 'w3', caption: 'It persists the code → long-URL mapping in the database.', travel: 'api-db', token: 'write', codeLine: 3, patches: [{ nodeId: 'db', badge: '1 row', highlight: true }], state: { mappings: 1 } },
      { id: 'w4', caption: 'And warms the cache so the first read will be instant.', travel: 'api-cache', token: 'write', codeLine: 4, patches: [{ nodeId: 'cache', badge: '1 key', highlight: true }], state: { 'cache size': 1 } },
      { id: 'w5', caption: 'The short URL short.ly/a9Fk2 is returned to the client.', travel: 'api-c', token: 'response', codeLine: 5 },
      { id: 'r1', caption: 'READ: someone opens the short link.', travel: 'c-api', token: 'request', codeLine: 7 },
      { id: 'r2', caption: 'The API checks the cache first — HIT.', travel: 'api-cache', token: 'hit', codeLine: 8, patches: [{ nodeId: 'cache', badge: 'HIT', highlight: true }] },
      { id: 'r3', caption: 'Cache returns the long URL — no database touch.', travel: 'cache-api', token: 'hit', codeLine: 8 },
      { id: 'r4', caption: 'The API replies with a 301 redirect to the original URL.', travel: 'api-c', token: 'response', codeLine: 9 },
      { id: 'r5', caption: 'On a cold cache it would fall back to the DB, then repopulate — reads stay O(1).', travel: 'api-db', token: 'request', codeLine: 8, patches: [{ nodeId: 'db', badge: 'fallback' }] },
      { id: 'scale', caption: 'With 100:1 read:write, the cache absorbs nearly all traffic — the DB barely works.', patches: [{ nodeId: 'cache', badge: 'hot', highlight: true }, { nodeId: 'db', badge: 'cold' }] },
    ],
  },
  deepDive: {
    readingMinutes: 10,
    intro: [
      'The URL shortener is the standard warm-up design question because it is small enough to finish and rich enough to expose everything: estimation, key generation, read/write asymmetry, caching, storage choice and cache invalidation.',
      'It is also the question where candidates most often lose points by starting at the whiteboard instead of the arithmetic. The numbers decide the architecture, and almost every subsequent choice follows from a single ratio: **reads outnumber writes by about a hundred to one.**',
    ],
    sections: [
      {
        id: 'requirements',
        heading: 'Requirements and the numbers that follow',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Functional:** shorten a long URL to a short code; redirect a code to its URL; optional custom aliases, expiry, and click analytics.',
              '**Non-functional:** redirects must be fast (they sit in front of a page load), the service must be highly available (a dead shortener breaks every link ever shared), and codes must never be reused.',
              '**Explicitly out of scope:** editing a destination after creation. Saying this out loud saves you from an ambiguous cache-invalidation discussion later — or lets you address it deliberately.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'New URLs per day', value: '10 M' },
              { label: 'Write QPS (avg)', value: '~116 /s' },
              { label: 'Read:write ratio', value: '100:1' },
              { label: 'Read QPS (avg)', value: '~11,600 /s' },
              { label: 'Read QPS (peak, 2×)', value: '~23,000 /s' },
              { label: 'Row size', value: '~500 B', note: 'code, URL, owner, timestamps' },
              { label: 'Storage per year', value: '~1.8 TB' },
              { label: 'Five years, ×3 replication', value: '~27 TB' },
            ],
            result: 'Trivial writes, heavy reads, modest storage — a caching problem, not a sharding problem.',
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Let the ratio pick the architecture',
            body: [
              '116 writes per second is comfortably one database. 23,000 reads per second is not, but it is trivially cacheable because the mapping is immutable. Stating that ratio early tells the interviewer exactly which parts of the design deserve time — and which do not.',
            ],
          },
        ],
      },
      {
        id: 'keygen',
        heading: 'Generating the short code',
        blocks: [
          {
            kind: 'prose',
            body: [
              'This is the heart of the question. The code must be short, unique, and — depending on the product — unguessable. The candidate approaches differ mainly in how they handle **collisions** and **coordination**.',
            ],
          },
          {
            kind: 'table',
            columns: ['Approach', 'Collisions', 'Coordination', 'Guessable', 'Verdict'],
            rows: [
              ['Hash the URL, take 7 chars', 'Possible; needs check-and-retry', 'A DB read per write', 'No', 'Works, but a read on the write path'],
              ['Random 7 chars', 'Rare; needs a uniqueness check', 'A DB read per write', 'No', 'Fine at this scale'],
              ['Auto-increment id → base62', 'Impossible', 'Single sequence — a bottleneck', 'Yes — sequential', 'Simple but leaks volume'],
              ['Counter ranges per node', 'Impossible', 'Occasional block allocation', 'Semi', 'Scales well'],
              ['Snowflake-style id → base62', 'Impossible', 'None', 'Partly', 'Good; longer codes'],
              ['Pre-generated key pool', 'Impossible', 'A pop from the pool', 'No', 'Best of both — my default'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'Base62 (`a–z A–Z 0–9`) gives 62⁷ ≈ **3.5 trillion** seven-character codes, which is roughly a thousand years of supply at 10 million a day. Six characters gives 56 billion — about fifteen years — so seven is the defensible choice.',
              'The **pre-generated key pool** deserves attention because it removes the collision check from the request path entirely: a background service generates unused random codes into a table, and creating a link is a single pop. It costs one more component and turns an unpredictable retry loop into a constant-time operation.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'shorten.py — counter ranges: no coordination on the hot path',
            lines: [
              'ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"',
              'BLOCK = 10_000',
              '',
              'class KeyGen:',
              '    """Each instance claims a block of ids, then serves from memory."""',
              '    def __init__(self):',
              '        self.next_id = self.end = 0',
              '',
              '    def next(self):',
              '        if self.next_id >= self.end:',
              '            # One coordinated call per 10k codes, not per request.',
              '            self.next_id = db.execute(',
              '                "UPDATE counters SET value = value + %s WHERE name = \'url\' "',
              '                "RETURNING value - %s", BLOCK, BLOCK)',
              '            self.end = self.next_id + BLOCK',
              '        i, self.next_id = self.next_id, self.next_id + 1',
              '        return base62(i)',
              '',
              'def base62(n):',
              '    if n == 0: return ALPHABET[0]',
              '    out = []',
              '    while n:',
              '        n, r = divmod(n, 62)',
              '        out.append(ALPHABET[r])',
              '    return "".join(reversed(out))',
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Sequential codes leak your business metrics',
            body: [
              'Base62 of an auto-increment id means anyone can create two links a day apart and subtract to learn exactly how many URLs you created in between. It also makes every other link enumerable, which is a privacy problem when people shorten unlisted documents. Randomise, or scramble the id space, unless enumeration is genuinely harmless.',
            ],
          },
        ],
      },
      {
        id: 'read',
        heading: 'The read path is the whole system',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A redirect is a key-value lookup, and the mapping is immutable once created — which is the single most useful property in the design. Immutable data can be cached forever, at every layer, with no invalidation logic at all.',
            ],
          },
          {
            kind: 'list',
            ordered: true,
            items: [
              '**CDN / edge.** A popular link can be served entirely at the edge with a long TTL. This alone removes the majority of traffic from your origin.',
              '**Application-local cache.** A small LRU per instance catches the hottest codes with zero network cost.',
              '**Shared Redis.** The main cache; hit rate should exceed 95% because access is heavily power-law distributed.',
              '**Database.** Only cold codes reach it. A simple point lookup on the primary key.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Peak read QPS', value: '23,000' },
              { label: 'Edge/CDN hit rate', value: '~50%' },
              { label: 'Redis hit rate on the remainder', value: '~95%' },
              { label: 'Reads reaching the database', value: '~575 /s' },
              { label: 'Hot set (top 20% of links)', value: '~2 M codes' },
              { label: 'Memory for the hot set', value: '~1 GB', note: '2M × ~500 B' },
            ],
            result: 'One Redis node and one database primary comfortably serve 23k redirects/sec.',
          },
          {
            kind: 'prose',
            body: [
              'The status code is a real design decision. **301** is permanent and aggressively cached by browsers — excellent for latency and terrible for analytics, since repeat visits never reach you and you can never change the destination. **302** is temporary: every click hits your service, which costs traffic and gives you click data plus the freedom to change or expire a link. Pick based on whether analytics is a product requirement, and say why.',
            ],
          },
        ],
      },
      {
        id: 'storage',
        heading: 'Storage, availability and the extras',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The access pattern is a pure key-value point lookup with no joins and no range scans, so almost any store works. A relational database is perfectly adequate at this scale and gives you easy uniqueness enforcement; a wide-column or key-value store scales further if the numbers grow.',
              'Availability matters more than it first appears: every link ever shared is a permanent dependency on your service, so an outage breaks content published years ago on sites you do not control. That argues for multi-region read replicas and a CDN in front, since redirects are read-only and cache extremely well.',
            ],
          },
          {
            kind: 'table',
            columns: ['Concern', 'Approach', 'Why'],
            rows: [
              ['Analytics', 'Fire an event to a queue, aggregate asynchronously', 'Never put a write on the redirect path'],
              ['Custom aliases', 'Separate namespace with a uniqueness check', 'Avoids colliding with generated codes'],
              ['Expiry', 'TTL column plus a background sweeper', 'Lazy deletion is fine; check on read'],
              ['Abuse / malware', 'Scan on creation, plus a deny list checked at redirect', 'Shorteners are heavily abused for phishing'],
              ['Rate limiting', 'Per-account limits on creation', 'Creation is the expensive, abusable side'],
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Never write synchronously on the redirect',
            body: [
              'Recording a click inline turns a cached read into a database write and destroys both latency and the ability to serve from cache. Emit the click to a queue or a log and aggregate offline — this is the single most common mistake in URL shortener designs.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Do not shard the database in the initial design — 116 writes per second and a few terabytes do not justify it, and proposing it signals you skipped the estimation.',
      'Do not use 301 redirects if click analytics is a requirement; browsers will cache away the data you need.',
      'Do not put click recording, rate limiting lookups, or malware checks synchronously on the redirect path.',
      'Do not use sequential codes for anything where enumeration or volume disclosure matters.',
    ],
    failureModes: [
      {
        name: 'Code collision under concurrency',
        symptom: 'Two links occasionally map to the same code; one destination is silently lost.',
        cause: 'Check-then-insert without a uniqueness constraint or atomic operation.',
        fix: 'A unique index on the code and an insert-or-retry loop, or a pre-generated key pool that cannot collide.',
      },
      {
        name: 'Redirect path doing writes',
        symptom: 'Redirect latency tracks database load; a database blip breaks all redirects.',
        cause: 'Click counting implemented as a synchronous update.',
        fix: 'Emit to a queue or log and aggregate asynchronously; the redirect must be a pure read.',
      },
      {
        name: 'Hot link overwhelming one shard',
        symptom: 'A viral link saturates a single cache node or database shard.',
        cause: 'One key attracting a disproportionate share of traffic.',
        fix: 'Edge caching with a long TTL, plus a local in-process cache on every instance.',
      },
      {
        name: 'Enumeration attack',
        symptom: 'Someone scrapes a large fraction of all links.',
        cause: 'Sequential base62 codes make the keyspace walkable.',
        fix: 'Random or scrambled codes, plus rate limiting on 404-heavy clients.',
      },
    ],
    interview: [
      {
        q: 'How do you generate the short code?',
        a: [
          'I would start from the keyspace: base62 with seven characters gives about 3.5 trillion codes, which at ten million new links a day is centuries of supply, so seven characters is the size.',
          'For generation I would avoid a single auto-increment sequence — it is a coordination bottleneck and the resulting codes are sequential, which leaks how many links we create and makes every link enumerable.',
          'My default is a pre-generated pool of random codes filled by a background job, so creating a link is a single pop with no collision check on the request path. A counter-range scheme, where each instance claims ten thousand ids at a time, is a good simpler alternative.',
        ],
        followUps: ['What happens if two requests get the same code anyway?'],
      },
      {
        q: 'How do you make redirects fast at 20,000 requests per second?',
        a: [
          'The key insight is that the mapping is immutable once created, so it can be cached at every layer with no invalidation logic. That makes this a caching problem rather than a database problem.',
          'I would put a CDN or edge cache in front with a long TTL, a small in-process LRU on each application instance, and a shared Redis behind that. With a power-law access distribution the hit rate is easily above 95%, so only a few hundred reads per second reach the database.',
          'I would also make sure nothing writes on that path — click analytics goes to a queue, never a synchronous update.',
        ],
      },
      {
        q: '301 or 302?',
        a: [
          '302, if click analytics matters. A 301 is cached permanently by browsers, so repeat visits never reach us — which is excellent for latency and means we lose the data and can never change or expire the destination.',
          '302 costs us the traffic of every click, but at this scale the redirect is a cache hit costing well under a millisecond, so it is affordable and it keeps the product options open.',
          'If analytics were explicitly out of scope and links were truly permanent, I would use 301 and enjoy the free offload.',
        ],
      },
      {
        q: 'Would you shard the database?',
        a: [
          'Not initially. The write rate is around 116 per second and five years of data with replication is under thirty terabytes, so a single primary with read replicas has plenty of headroom — proposing sharding here would mean I had not done the estimate.',
          'If growth changed those numbers, the access pattern is a pure key-value point lookup, so sharding by hash of the code would be straightforward and there are no cross-shard joins to worry about. That is a good property to note, but not a reason to do it early.',
        ],
      },
    ],
    references: [
      { label: 'System Design Interview — URL shortener chapter (Alex Xu)', href: 'https://bytebytego.com/courses/system-design-interview/design-a-url-shortener' },
      { label: 'Instagram — Sharding & IDs at Instagram', href: 'https://instagram-engineering.com/sharding-ids-at-instagram-1cf5a71e5a5c' },
    ],
  },
}

// ── 2. Key generation ────────────────────────────────────────────────────────

const keygen: Lesson = {
  slug: 'url-shortener-keygen',
  title: 'Short Code Generation',
  summary: 'Seven characters, no collisions, no coordination — and not guessable.',
  group: 'case-studies',
  topic: 'URL Shortener',
  tier: 'pro',
  minutes: 7,
  concept: 'Case study',
  tags: [
    { label: 'Space', value: '62⁷ ≈ 3.5 T' },
    { label: 'Best', value: 'Pre-generated pool' },
    { label: 'Avoid', value: 'Sequential codes' },
  ],
  notes: [
    'Base62 with 7 characters gives 3.5 trillion codes — about a thousand years at 10M/day.',
    'Random-and-check needs a database read on every write, and races under concurrency.',
    'Base62 of an auto-increment id makes every link enumerable and leaks your creation volume.',
  ],
  scene: {
    code: [
      '# option A: random + check (a read per write)',
      'code = random_base62(7)',
      'if db.exists(code): retry()',
      '',
      '# option B: pre-generated pool (one pop)',
      'code = pool.pop()          # never collides',
      '',
      '# background: keep the pool full',
      'while pool.size < LOW: pool.add(unused_random())',
    ],
    initialState: { strategy: 'random + check', 'db reads/write': 1, collisions: '~0.1%', enumerable: 'no' },
    nodes: [
      { id: 'api', kind: 'client', label: 'Shorten API', x: 12, y: 50 },
      { id: 'pool', kind: 'queue', label: 'Key pool', x: 44, y: 22, badge: 'empty' },
      { id: 'gen', kind: 'server', label: 'Key generator', x: 44, y: 78, badge: 'idle' },
      { id: 'db', kind: 'database', label: 'Mappings', x: 82, y: 50, badge: '4.1B rows' },
    ],
    edges: [
      { id: 'a-db', from: 'api', to: 'db', curve: -0.35 },
      { id: 'a-pool', from: 'api', to: 'pool' },
      { id: 'pool-db', from: 'pool', to: 'db', curve: -0.2 },
      { id: 'gen-pool', from: 'gen', to: 'pool' },
      { id: 'gen-db', from: 'gen', to: 'db', curve: 0.25 },
    ],
    steps: [
      { id: '1', caption: 'Naive: generate a random 7-character code, then check the database for a collision.', travel: 'a-db', token: 'request', codeLine: 2, patches: [{ nodeId: 'db', badge: 'exists?', highlight: true }], state: { strategy: 'random + check', 'db reads/write': 1 } },
      { id: '2', caption: 'Collisions are rare at 4 billion rows in a 3.5 trillion space — but the check runs on every write.', codeLine: 3, patches: [{ nodeId: 'db', badge: 'p(collision) 0.1%', highlight: true }], state: { collisions: '~0.1%' } },
      { id: '3', caption: 'Worse, two concurrent requests can both pass the check and both insert the same code.', travel: 'a-db', token: 'miss', patches: [{ nodeId: 'db', badge: 'race ✗', highlight: true }] },
      { id: '4', caption: 'Better: a background generator pre-creates unused codes into a pool table.', travel: 'gen-db', token: 'write', codeLine: 8, patches: [{ nodeId: 'gen', badge: 'generating', highlight: true }, { nodeId: 'pool', badge: '1M unused' }] },
      { id: '5', caption: 'Shortening is now a single atomic pop — constant time, no check, no retry loop.', travel: 'a-pool', token: 'hit', codeLine: 6, patches: [{ nodeId: 'pool', badge: '999,999 unused', highlight: true }], state: { strategy: 'pre-generated pool', 'db reads/write': 0, collisions: '0%' } },
      { id: '6', caption: 'The claimed code is written with the URL. A unique index remains the final backstop.', travel: 'pool-db', token: 'write', patches: [{ nodeId: 'db', badge: 'unique index ✓', highlight: true }] },
      { id: '7', caption: 'Codes stay random, so nobody can enumerate links or infer how many we create per day.', patches: [{ nodeId: 'pool', badge: 'random ✓', highlight: true }], state: { enumerable: 'no' } },
    ],
  },
  deepDive: {
    readingMinutes: 8,
    intro: [
      'Key generation is the part of the URL shortener question that separates a rehearsed answer from a designed one. It looks trivial — make a short unique string — and it quietly contains a coordination problem, a race condition, a security decision and an index-performance trade.',
      'The framing that organises it: you need uniqueness **without coordination**, at constant cost, in a namespace small enough for a human to type.',
    ],
    sections: [
      {
        id: 'space',
        heading: 'How long does the code need to be?',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Base62 uses `a–z A–Z 0–9`, so each character carries about 5.95 bits. The length falls straight out of projected volume and retention.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Base62, 5 chars', value: '916 M', note: '~3 months at 10M/day' },
              { label: '6 chars', value: '56.8 B', note: '~15 years' },
              { label: '7 chars', value: '3.52 T', note: '~1,000 years' },
              { label: '8 chars', value: '218 T' },
              { label: 'Rows after 10 years at 10M/day', value: '36.5 B' },
              { label: 'Namespace occupancy at 7 chars', value: '~1%' },
            ],
            result: 'Seven characters: centuries of headroom, still short enough to read aloud.',
          },
          {
            kind: 'prose',
            body: [
              'Low occupancy matters for more than longevity. With random selection, collision probability tracks how full the space is — at 1% occupancy roughly one attempt in a hundred collides, which is cheap to retry. At 50% occupancy every second attempt collides and the retry loop becomes the bottleneck.',
            ],
          },
        ],
      },
      {
        id: 'strategies',
        heading: 'The generation strategies',
        blocks: [
          {
            kind: 'table',
            columns: ['Strategy', 'Coordination', 'Collisions', 'Guessable', 'Cost per write'],
            rows: [
              ['Hash the URL, truncate', 'None', 'Check and re-hash with salt', 'No', 'One DB read'],
              ['Random, check, retry', 'None', 'Check and retry', 'No', 'One DB read, sometimes more'],
              ['Auto-increment → base62', 'A global sequence', 'Impossible', 'Yes — fully enumerable', 'Sequence round trip'],
              ['Counter ranges per node', 'Once per 10k codes', 'Impossible', 'Semi — ordered within a block', 'Amortised ~zero'],
              ['Snowflake → base62', 'None', 'Impossible', 'Partly (time-ordered)', 'Zero, but 11+ chars'],
              ['Pre-generated pool', 'One atomic pop', 'Impossible', 'No', 'One pop'],
            ],
          },
          {
            kind: 'prose',
            body: [
              '**Hashing the URL** has a property people like — the same URL yields the same code, deduplicating for free. It is also a privacy problem: anyone can test whether a given URL has been shortened, which for private documents is a real leak. And it still needs a collision check plus a salt-and-retry path.',
              '**Pre-generated pools** are the strongest general answer. A background job creates unused random codes into a table; shortening pops one atomically. The write path does no collision check, has constant latency with no retry variance, and codes stay unguessable. The cost is one more component and a pool-depth metric to watch.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'keygen.py — atomic pop with a unique-index backstop',
            lines: [
              'def shorten(long_url, user_id):',
              '    # Atomic claim: no two requests can pop the same row.',
              '    code = db.query_one("""',
              '        DELETE FROM key_pool',
              '        WHERE code = (SELECT code FROM key_pool',
              '                      ORDER BY random() LIMIT 1 FOR UPDATE SKIP LOCKED)',
              '        RETURNING code',
              '    """)',
              '    if code is None:',
              '        code = random_base62(7)      # pool empty: fall back, still safe',
              '',
              '    try:',
              '        db.execute("INSERT INTO links (code, url, user_id) VALUES (%s,%s,%s)",',
              '                   code, long_url, user_id)',
              '    except UniqueViolation:',
              '        return shorten(long_url, user_id)   # backstop; should never fire',
              '',
              '    cache.set(f"u:{code}", long_url, ex=86400)   # warm on write',
              '    return code',
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Check-then-insert is a race, not a solution',
            body: [
              'Two concurrent requests can both find a code unused and both attempt to insert it. The only thing that actually prevents duplicates is a **unique constraint** on the code column — the application check is an optimisation for the common case, not a guarantee. Always keep the index and handle the violation.',
            ],
          },
        ],
      },
      {
        id: 'enumeration',
        heading: 'Why sequential codes are a real problem',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Base62 of an auto-increment id is the neatest-looking answer and has two consequences that disqualify it for a public product.',
              'First, **enumeration**: codes are consecutive, so anyone can walk the keyspace and retrieve every link ever created. People shorten unlisted documents, invite links and internal dashboards assuming the code is unguessable.',
              'Second, **volume disclosure**: create two links a day apart, decode both to integers, subtract, and you know exactly how many links the service created in between.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Sequential codes — guesses to find a valid link', value: '1' },
              { label: 'Random 7-char at 1% occupancy', value: '~100' },
              { label: 'Random 7-char at 0.1% occupancy', value: '~1,000' },
              { label: 'Scraper at 1,000 req/s, sequential', value: 'Entire corpus' },
              { label: 'Same scraper, random codes', value: '~10 hits/s', note: 'and easily rate limited' },
            ],
            result: 'Randomness turns bulk scraping into a rate-limiting problem instead of a free download.',
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'If you want ordered ids, keep them internal',
            body: [
              'Use a monotonic integer as the internal primary key — it keeps B-tree inserts sequential and writes fast — and a separate random code as the public identifier. Index efficiency and unguessable URLs, for one extra indexed column.',
            ],
          },
        ],
      },
      {
        id: 'extras',
        heading: 'Custom aliases and the details that bite',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Custom aliases share the namespace.** One `links` table with a unique index on `code` handles both: custom aliases insert directly and fail on conflict.',
              '**Reserve system words.** `api`, `admin`, `login`, `static` must be blocked, or a user claims a path that shadows your own routes.',
              '**Filter offensive strings** as the pool is generated, not at request time — random base62 will eventually produce words you do not want on your domain.',
              '**Exclude ambiguous characters** if humans retype codes: `0/O` and `1/l/I` generate support tickets. The lost namespace is negligible.',
              '**Rate limit creation, not redirection.** Generating links is the expensive, abusable side; redirects are cheap cached reads.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Give the number, then the mechanism',
            body: [
              '"Base62 with seven characters is 3.5 trillion codes — a thousand years at ten million a day. I would pre-generate random codes into a pool so shortening is one atomic pop with no collision check on the write path, keep a unique index as the backstop, and avoid sequential codes because they make every link enumerable and leak our creation volume."',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Sequential or time-ordered public codes where links are semi-private or volume is sensitive.',
      'Hash-of-URL codes where an attacker testing whether a specific URL was shortened would be a leak.',
      'A central sequence service on the write path at high volume — it is a coordination bottleneck.',
      'Check-then-insert without a unique constraint; the check is an optimisation, not a guarantee.',
    ],
    failureModes: [
      {
        name: 'Duplicate code under concurrency',
        symptom: 'Two links map to the same code; one destination is silently lost.',
        cause: 'Application-level existence check with no unique constraint.',
        fix: 'Unique index on the code column plus retry on violation; prefer an atomic pool pop.',
      },
      {
        name: 'Key pool exhaustion',
        symptom: 'Shortening latency spikes or fails during a surge.',
        cause: 'The background generator could not keep pace with demand.',
        fix: 'Alert on pool depth, generate ahead of a high-water mark, and fall back to random-and-retry.',
      },
      {
        name: 'Mass enumeration',
        symptom: 'A scraper retrieves a large fraction of all links.',
        cause: 'Sequential codes making the keyspace walkable.',
        fix: 'Random codes, plus rate limiting on clients with high 404 rates.',
      },
      {
        name: 'Retry storm at high occupancy',
        symptom: 'Write latency degrades as the table grows.',
        cause: 'Random-and-check collides increasingly often as the namespace fills.',
        fix: 'Lengthen the code, or move to a pre-generated pool where occupancy does not affect writes.',
      },
    ],
    interview: [
      {
        q: 'How long should the short code be, and why?',
        a: [
          'Base62 with seven characters gives about 3.5 trillion combinations. At ten million new links a day that is roughly a thousand years of supply, and after ten years the namespace is only about one percent occupied.',
          'Occupancy matters beyond longevity: with random generation, collision probability tracks how full the space is, so staying near one percent keeps retries negligible.',
          'Six characters gives fifteen years, which is defensible but leaves less room; the extra character is nearly free in a URL.',
        ],
        followUps: ['How do you generate them without a database read per write?'],
      },
      {
        q: 'How do you avoid collisions without a database read per write?',
        a: [
          'Pre-generate. A background job creates unused random codes into a pool table, and shortening is a single atomic pop — constant time, no existence check, no retry variance.',
          'That also removes the check-then-insert race, where two concurrent requests both find a code free and both try to use it.',
          'I would still keep a unique index on the code column as the final backstop, because the application-level check is an optimisation and the constraint is what actually prevents duplicates.',
        ],
      },
      {
        q: 'Why not base62 of an auto-increment id?',
        a: [
          'Two reasons, both serious for a public product. Codes become consecutive, so anyone can walk the keyspace and download every link ever created — and people shorten unlisted documents and invite links assuming the code is unguessable.',
          'It also leaks business metrics: decode two links created a day apart, subtract, and you know how many links we created in between.',
          'If I wanted monotonic ids for index performance I would keep them internal as the primary key and expose a separate random code publicly.',
        ],
      },
    ],
    references: [
      { label: 'Instagram — Sharding & IDs at Instagram', href: 'https://instagram-engineering.com/sharding-ids-at-instagram-1cf5a71e5a5c' },
      { label: 'OWASP — Insecure direct object reference prevention', href: 'https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html' },
    ],
  },
}

export const urlShortenerTopic: Lesson[] = [urlShortener, keygen]
