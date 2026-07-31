import type { Lesson } from '../types'

const sharding: Lesson = {
  slug: 'sharding',
  title: 'Sharding',
  summary: 'Split one huge dataset across many databases by a shard key.',
  group: 'scaling-patterns',
  tier: 'free',
  minutes: 7,
  concept: 'Concept',
  complexity: { time: 'O(1)', space: 'O(n)' },
  notes: [
    'A single DB eventually can’t hold or serve all the data.',
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
}

const consistentHashing: Lesson = {
  slug: 'consistent-hashing',
  title: 'Consistent Hashing',
  summary: 'Add or remove a node and remap only a tiny slice of keys.',
  group: 'scaling-patterns',
  tier: 'pro',
  minutes: 8,
  concept: 'Concept',
  complexity: { time: 'O(log n)', space: 'O(n)' },
  notes: [
    'Plain hash % N remaps almost every key when N changes — catastrophic for caches.',
    'Consistent hashing places nodes on a ring; a key belongs to the next node clockwise.',
    'Adding a node steals keys from just one neighbour — the rest are untouched.',
  ],
  scene: {
    code: [
      'ring = sorted(hash(node) for node in nodes)',
      'owner(key) = first node clockwise of hash(key)',
      '# add node → only keys between it and',
      '# its predecessor move. O(K/N) remapped.',
    ],
    initialState: { nodes: 3, 'keys moved': '0%', method: 'hash ring' },
    nodes: [
      { id: 'k', kind: 'client', label: 'Key "cart:42"', x: 12, y: 50 },
      { id: 'n1', kind: 'cache', label: 'Node A', x: 60, y: 20, badge: 'keys 0–120°' },
      { id: 'n2', kind: 'cache', label: 'Node B', x: 86, y: 60, badge: 'keys 120–240°' },
      { id: 'n3', kind: 'cache', label: 'Node C', x: 40, y: 82, badge: 'keys 240–360°' },
    ],
    edges: [
      { id: 'k-n2', from: 'k', to: 'n2' },
      { id: 'k-n1', from: 'k', to: 'n1', curve: -0.3 },
    ],
    steps: [
      { id: '1', caption: 'Each node owns an arc of the hash ring.', codeLine: 1 },
      { id: '2', caption: 'The key hashes onto the ring and belongs to the next node clockwise — Node B.', travel: 'k-n2', token: 'request', codeLine: 2, patches: [{ nodeId: 'n2', badge: 'owns key', highlight: true }] },
      { id: '3', caption: 'Now we add a new node between A and B on the ring.', codeLine: 3, patches: [{ nodeId: 'n1', badge: 'splitting arc', highlight: true }], state: { nodes: 4 } },
      { id: '4', caption: 'Only the keys in that small arc move to the new node…', codeLine: 4, state: { 'keys moved': '~25%' } },
      { id: '5', caption: '…every other key stays put. With hash % N, nearly all keys would have moved.', patches: [{ nodeId: 'n2', badge: 'unchanged' }, { nodeId: 'n3', badge: 'unchanged' }] },
    ],
  },
}

const capTheorem: Lesson = {
  slug: 'cap-theorem',
  title: 'CAP Theorem',
  summary: 'During a network partition you must choose: consistency or availability.',
  group: 'scaling-patterns',
  tier: 'pro',
  minutes: 8,
  concept: 'Concept',
  complexity: { time: '—', space: '—' },
  notes: [
    'Consistency: every read sees the latest write. Availability: every request gets a response.',
    'When the network partitions, you cannot have both — you must pick one.',
    'CP systems reject requests to stay correct; AP systems answer but may serve stale data.',
  ],
  scene: {
    code: [
      'on read during partition:',
      '  if mode == CP:',
      '    if not reachable(leader): error()  # consistent',
      '  if mode == AP:',
      '    return local_copy()                # available',
    ],
    initialState: { partition: 'no', mode: '—', reads: 'fresh' },
    nodes: [
      { id: 'user', kind: 'client', label: 'User', x: 12, y: 50 },
      { id: 'a', kind: 'database', label: 'Replica A', x: 52, y: 26, badge: 'v5' },
      { id: 'b', kind: 'database', label: 'Replica B', x: 52, y: 74, badge: 'v5' },
      { id: 'user2', kind: 'client', label: 'User 2', x: 90, y: 74 },
    ],
    edges: [
      { id: 'u-a', from: 'user', to: 'a' },
      { id: 'a-b', from: 'a', to: 'b' },
      { id: 'b-u2', from: 'b', to: 'user2' },
    ],
    steps: [
      { id: '1', caption: 'Two replicas normally stay in sync — both at version 5.', travel: 'a-b', token: 'write', codeLine: 1 },
      { id: '2', caption: 'The link between them breaks — a network partition.', patches: [{ nodeId: 'a', badge: 'v6 ✎', highlight: true }, { nodeId: 'b', badge: 'v5 (stale)' }], state: { partition: 'yes' } },
      { id: '3', caption: 'A CP system: Replica B refuses the read rather than serve stale data.', travel: 'b-u2', token: 'miss', codeLine: 3, patches: [{ nodeId: 'b', badge: 'error', highlight: true }], state: { mode: 'CP (consistent)', reads: 'rejected' } },
      { id: '4', caption: 'An AP system instead: B answers with its local copy — available, but stale.', travel: 'b-u2', token: 'response', codeLine: 5, patches: [{ nodeId: 'b', badge: 'v5 served', highlight: true }], state: { mode: 'AP (available)', reads: 'stale' } },
      { id: '5', caption: 'You pick per system. There is no option that keeps both during a partition.', patches: [{ nodeId: 'a', badge: 'v6' }, { nodeId: 'b', badge: 'v5' }] },
    ],
  },
}

export const scalingPatterns: Lesson[] = [sharding, consistentHashing, capTheorem]
