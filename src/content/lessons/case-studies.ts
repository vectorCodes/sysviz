import type { Lesson } from '../types'

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
}

export const caseStudies: Lesson[] = [urlShortener]
