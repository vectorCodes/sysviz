import type { Lesson } from '../types'

/** Topic: Consistent Hashing (group: scaling-patterns). */

const consistentHashing: Lesson = {
  slug: 'consistent-hashing',
  title: 'Consistent Hashing',
  summary: 'Add or remove a node and remap only a tiny slice of keys.',
  group: 'scaling-patterns',
  topic: 'Consistent Hashing',
  tier: 'pro',
  minutes: 8,
  concept: 'Concept',
  tags: [
    { label: 'Rebalancing', value: 'Minimal (~1/N keys)' },
    { label: 'Pattern', value: 'Hash ring' },
    { label: 'Used in', value: 'Cassandra · DynamoDB' },
  ],
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
  deepDive: {
    readingMinutes: 9,
    intro: [
      'Consistent hashing solves one precise problem: **how to assign keys to nodes so that adding or removing a node moves as few keys as possible**. With naive modulo hashing, changing the node count relocates almost everything; with consistent hashing, it relocates roughly 1/N.',
      'That difference is not an optimisation. It is what makes a distributed cache or datastore *operable* — the difference between "adding a node is routine" and "adding a node causes an outage".',
    ],
    sections: [
      {
        id: 'problem',
        heading: 'Why modulo hashing fails',
        blocks: [
          {
            kind: 'prose',
            body: [
              '`node = hash(key) % N` distributes evenly and costs nothing to compute. Its fatal property is that **every key\'s assignment depends on N**. Change the node count and the modulus changes, so a key that mapped to node 2 now maps to node 3 — for nearly every key at once.',
              'For a cache that means a near-total miss storm and the full read load arriving at the database in one instant. For a datastore it means moving the entire dataset across the network before the cluster is usable.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Keys relocated, 3 → 4 nodes (modulo)', value: '~75%' },
              { label: 'Keys relocated, 9 → 10 nodes (modulo)', value: '~90%' },
              { label: 'Keys relocated, consistent hashing', value: '~1/N', note: '25% and 10%' },
              { label: 'Cache hit rate immediately after (modulo)', value: '~25%' },
              { label: 'DB read multiplier during that window', value: '~30×' },
            ],
            result: 'Modulo hashing makes scaling the cache the thing that takes down the database.',
          },
        ],
      },
      {
        id: 'ring',
        heading: 'The ring, precisely',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Map both keys and nodes onto the same circular hash space — conventionally 0 to 2³²−1. A key belongs to the **first node encountered walking clockwise** from the key\'s position. Because a node only owns the arc between itself and its predecessor, adding a node steals keys from exactly one neighbour and disturbs nobody else.',
              'Lookup is a binary search over the sorted node positions: O(log N) with a tiny constant. The ring itself is a few kilobytes, so every client can hold a copy and route without a coordinator — which is why this pattern appears in Memcached clients, Dynamo, Cassandra, Riak and countless proxies.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'ring.py — consistent hashing with virtual nodes',
            lines: [
              'import bisect, hashlib',
              '',
              'class HashRing:',
              '    def __init__(self, nodes, vnodes=150):',
              '        self.vnodes = vnodes',
              '        self.ring = {}          # position -> node',
              '        self.sorted_keys = []',
              '        for n in nodes:',
              '            self.add(n)',
              '',
              '    def _hash(self, key):',
              '        return int(hashlib.md5(key.encode()).hexdigest()[:8], 16)',
              '',
              '    def add(self, node):',
              '        for i in range(self.vnodes):          # many points per physical node',
              '            pos = self._hash(f"{node}#{i}")',
              '            self.ring[pos] = node',
              '            bisect.insort(self.sorted_keys, pos)',
              '',
              '    def remove(self, node):',
              '        for i in range(self.vnodes):',
              '            pos = self._hash(f"{node}#{i}")',
              '            del self.ring[pos]',
              '            self.sorted_keys.remove(pos)',
              '',
              '    def get(self, key):',
              '        if not self.ring:',
              '            return None',
              '        pos = self._hash(key)',
              '        idx = bisect.bisect(self.sorted_keys, pos) % len(self.sorted_keys)',
              '        return self.ring[self.sorted_keys[idx]]   # first node clockwise',
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'A plain ring distributes badly',
            body: [
              'With one point per node, arc sizes are random and the variance is large — with 10 nodes it is common for one to own two or three times its fair share. That is why virtual nodes exist, and why "consistent hashing" in practice always means "consistent hashing with vnodes".',
            ],
          },
        ],
      },
      {
        id: 'alternatives',
        heading: 'What replaced it, and where',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The ring is not the only answer, and knowing the alternatives signals real familiarity rather than textbook recall.',
            ],
          },
          {
            kind: 'table',
            columns: ['Scheme', 'Keys moved on resize', 'Balance', 'Supports weights / removal', 'Used by'],
            rows: [
              ['Modulo', 'Almost all', 'Excellent', 'No', 'Nothing distributed'],
              ['Ring + vnodes', '~1/N', 'Good with 100–200 vnodes', 'Yes', 'Cassandra, Dynamo, Memcached clients'],
              ['Rendezvous (HRW)', 'Optimal', 'Excellent', 'Yes, naturally weighted', 'CDNs, some proxies'],
              ['Jump consistent hash', 'Optimal', 'Excellent', 'No arbitrary removal', 'Google, sharded storage'],
              ['Maglev hashing', 'Near-optimal', 'Excellent', 'Yes', 'Google load balancers'],
              ['Fixed slots (16,384)', 'Exactly the moved slots', 'Excellent', 'Yes', 'Redis Cluster'],
            ],
          },
          {
            kind: 'prose',
            body: [
              '**Rendezvous hashing** is often the better choice and is barely known: for each key, compute `hash(key, node)` for every node and pick the highest. It needs no ring, distributes optimally, handles weights naturally, and moves only the keys that belonged to a departing node. Its cost is O(N) per lookup, which is irrelevant for small N and prohibitive for thousands of nodes.',
              '**Fixed slots**, as in Redis Cluster, are the pragmatic industrial answer: a constant number of buckets (16,384) assigned to nodes. Resharding means reassigning slot ranges, which is explicit, observable and resumable — properties a ring migration does not naturally have.',
            ],
          },
        ],
      },
      {
        id: 'replication',
        heading: 'Replication and failure on the ring',
        blocks: [
          {
            kind: 'prose',
            body: [
              'In a datastore, a key is not stored on one node but on the **N successors** walking clockwise — the preference list. That gives replication with no separate placement logic, and it is why Dynamo-style systems describe quorums as R and W over that list.',
              'The subtlety: virtual nodes mean consecutive ring positions can belong to the *same* physical machine, which would silently reduce your replication factor. Implementations must skip duplicates when building the preference list, and rack- or zone-aware versions skip nodes sharing a failure domain too.',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Node failure** hands its arcs to the next node clockwise, which absorbs its traffic — so a failure is a 1/N load increase for one neighbour, not an even spread. With vnodes the arcs are scattered, so the load spreads over many neighbours instead.',
              '**Hinted handoff** lets a neighbour temporarily accept writes for a down node and replay them on recovery, so a brief outage does not cost availability.',
              '**Bootstrapping a new node** streams data from its predecessors; throttle it or the migration competes with production traffic.',
              '**Zone awareness** is essential in cloud deployments: without it, all replicas of a key can land in one availability zone.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Say what problem it solves, not how the circle works',
            body: [
              'Many candidates describe the ring mechanically and never state the point. Leading with "modulo hashing relocates ~75% of keys when you add a node to a three-node cluster, which means a cache-wide miss storm; consistent hashing bounds that to about 25%" answers the actual question in one sentence.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'A fixed cluster that never changes size — modulo is simpler and distributes better.',
      'Small clusters where rendezvous hashing gives optimal balance with less machinery.',
      'Where an explicit, resumable, observable migration is required — fixed slot maps are easier to operate than a ring.',
      'When placement must satisfy constraints (residency, tenancy, capacity tiers) that a hash cannot express — use a directory.',
    ],
    failureModes: [
      {
        name: 'Uneven distribution',
        symptom: 'Some nodes hold two or three times their share.',
        cause: 'Too few virtual nodes, so arc sizes vary widely.',
        fix: 'Increase vnodes to 100–200 per physical node; weight them by capacity.',
      },
      {
        name: 'Replicas on one machine or in one zone',
        symptom: 'A single node or AZ failure loses all copies of some keys.',
        cause: 'The preference list walked consecutive vnodes belonging to the same physical node or zone.',
        fix: 'Skip duplicates when building preference lists; make placement rack- and zone-aware.',
      },
      {
        name: 'Migration overwhelms the cluster',
        symptom: 'Latency degrades badly while a new node bootstraps.',
        cause: 'Unthrottled data streaming competing with production traffic.',
        fix: 'Rate-limit bootstrap streams; add nodes one at a time and during low-traffic windows.',
      },
      {
        name: 'Ring disagreement between clients',
        symptom: 'Some clients read misses for keys others find.',
        cause: 'Clients holding different views of ring membership during a change.',
        fix: 'Propagate membership through gossip or a config service with versioning; tolerate a brief double-read window.',
      },
    ],
    interview: [
      {
        q: 'What problem does consistent hashing solve?',
        a: [
          'It bounds how much data has to move when the node count changes. With `hash(key) % N`, changing N changes almost every assignment — going from three nodes to four relocates about three quarters of the keys, which for a cache is a near-total miss storm and for a datastore is moving the whole dataset.',
          'Consistent hashing maps keys and nodes onto the same circular space, so a node owns the arc up to its predecessor. Adding a node takes keys from one neighbour only, which keeps the movement at roughly one over N.',
        ],
        followUps: ['Why do implementations always add virtual nodes?'],
      },
      {
        q: 'Why virtual nodes?',
        a: [
          'With one position per node, the arcs are random and unevenly sized, so with a handful of nodes some end up owning several times their fair share. Placing 100–200 positions per physical node averages the variance away and gets distribution close to uniform.',
          'They also spread the failure load: when a node dies, its many small arcs are inherited by many different neighbours rather than dumping everything on one successor. And they let you weight capacity simply — a machine with twice the RAM gets twice the vnodes.',
        ],
      },
      {
        q: 'Would you always use a ring?',
        a: [
          'No. For small clusters, rendezvous hashing gives optimal distribution and natural weighting with no ring to maintain — its O(N) lookup is irrelevant at that size.',
          'For systems that need explicit, resumable migrations I would prefer fixed slots like Redis Cluster\'s 16,384: resharding becomes reassigning slot ranges, which is observable and can be paused, whereas a ring change is implicit.',
          'And if placement must satisfy constraints a hash cannot express — data residency, dedicated tenants, capacity tiers — I would use a directory and accept the extra lookup.',
        ],
      },
    ],
    references: [
      { label: 'Karger et al. — Consistent Hashing and Random Trees', href: 'https://www.cs.princeton.edu/courses/archive/fall09/cos518/papers/chash.pdf' },
      { label: 'Amazon — Dynamo: Amazon’s Highly Available Key-value Store', href: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf' },
    ],
  },
}

const consistentHashingVnodes: Lesson = {
  slug: 'consistent-hashing-vnodes',
  title: 'Virtual Nodes (Vnodes)',
  summary: 'Spread each physical node across many ring positions for even load distribution.',
  group: 'scaling-patterns',
  topic: 'Consistent Hashing',
  tier: 'pro',
  minutes: 7,
  concept: 'Concept',
  tags: [
    { label: 'Pattern', value: 'Vnodes / token ranges' },
    { label: 'Balance', value: 'Even per-node' },
    { label: 'Used in', value: 'Cassandra · DynamoDB' },
  ],
  notes: [
    'Even with consistent hashing, physical nodes can end up with very different arc sizes — causing imbalance.',
    'Virtual nodes (vnodes): each physical server claims many small arc segments spread around the ring.',
    'When a node is added or removed, its many vnodes each donate a little to neighbors — perfectly even rebalancing.',
  ],
  scene: {
    code: [
      '# 1 node → 1 arc (can be huge)',
      'ring.add(node_A)         # owns: 0–120°',
      '',
      '# vnodes: each node gets many small arcs',
      'for i in range(150):',
      '    ring.add(f"{node_A}#{i}")  # spread evenly',
    ],
    initialState: { 'Node A load': '60%', 'Node B load': '25%', 'Node C load': '15%', vnodes: 'off' },
    nodes: [
      { id: 'a', kind: 'cache', label: 'Node A', x: 24, y: 26, badge: '60% (huge arc)' },
      { id: 'b', kind: 'cache', label: 'Node B', x: 78, y: 26, badge: '25%' },
      { id: 'c', kind: 'cache', label: 'Node C', x: 50, y: 74, badge: '15% (tiny arc)' },
      { id: 'ring', kind: 'queue', label: 'Hash Ring', x: 50, y: 46, badge: '3 arcs' },
    ],
    edges: [
      { id: 'a-ring', from: 'a', to: 'ring', curve: -0.2 },
      { id: 'b-ring', from: 'b', to: 'ring', curve: 0.2 },
      { id: 'c-ring', from: 'c', to: 'ring' },
    ],
    steps: [
      { id: '1', caption: 'Without vnodes each node owns one arc. Lucky placement gives A a huge arc — 60% of keys.', codeLine: 2, patches: [{ nodeId: 'a', badge: '60% ⚠', highlight: true }] },
      { id: '2', caption: 'C got a tiny arc by accident — only 15% of keys. Nodes are imbalanced just from hashing.', patches: [{ nodeId: 'c', badge: '15% ⚠', highlight: true }] },
      { id: '3', caption: 'Vnodes: each physical node claims 150 small positions spread uniformly around the ring.', codeLine: 5, patches: [{ nodeId: 'ring', badge: '450 vnodes', highlight: true }], state: { vnodes: 'on' } },
      { id: '4', caption: 'Now each node owns roughly 150/450 = 33% of the ring — regardless of hash luck.', patches: [{ nodeId: 'a', badge: '~33%' }, { nodeId: 'b', badge: '~33%' }, { nodeId: 'c', badge: '~33%' }], state: { 'Node A load': '33%', 'Node B load': '33%', 'Node C load': '33%' } },
      { id: '5', caption: 'Adding a new node: its 150 vnodes steal a few keys from each existing node\'s many arcs — very smooth.', travel: 'a-ring', token: 'write', codeLine: 6 },
    ],
  },
  deepDive: {
    readingMinutes: 8,
    intro: [
      'A plain hash ring is elegant and, in practice, unbalanced. With one position per node the arcs are randomly sized, so with ten nodes it is entirely normal for one to own two or three times its fair share of the keyspace.',
      'Virtual nodes fix this by giving each physical machine **many** positions on the ring. The mechanism is trivial; the consequences — balance, weighted capacity, spread failure load, incremental rebalancing — are what make consistent hashing usable in production.',
    ],
    sections: [
      {
        id: 'variance',
        heading: 'The variance problem, quantified',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Placing N random points on a circle produces arcs whose lengths follow an exponential distribution. The expected largest arc is far bigger than the average — roughly `ln(N)/N` of the circle rather than `1/N` — so imbalance is the expected outcome, not bad luck.',
              'Adding V positions per node averages V independent samples, and the standard deviation of the mean falls as `1/√V`. That is why the customary value is around 100–200: it is where the curve flattens.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: '1 vnode per node (10 nodes)', value: '±30–40% typical spread' },
              { label: '10 vnodes', value: '±10–15%' },
              { label: '100 vnodes', value: '±3–5%' },
              { label: '200 vnodes', value: '±2–3%' },
              { label: '1,000 vnodes', value: '±1%', note: 'diminishing returns' },
              { label: 'Ring memory at 200 vnodes × 100 nodes', value: '20,000 entries', note: 'trivial' },
            ],
            result: 'Balance improves as 1/√V, so 150 is a good default and 1,000 is mostly wasted.',
          },
        ],
      },
      {
        id: 'benefits',
        heading: 'What else vnodes buy',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Weighted capacity.** A machine with twice the memory gets twice the vnodes and therefore twice the keys — heterogeneous clusters become expressible with no special logic.',
              '**Spread failure load.** Without vnodes, a dead node dumps its entire arc onto one successor, which then holds double and may fall over in turn — a cascading failure. With vnodes the arcs are scattered, so many neighbours each absorb a small increment.',
              '**Faster rebuild.** A replacement node streams its data from many peers in parallel rather than from a single predecessor, which shortens the window of reduced redundancy considerably.',
              '**Smoother scaling.** A new node takes a little from many nodes instead of a lot from one, so the migration is gentler on any individual peer.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Cluster', value: '10 nodes, 1 vnode each' },
              { label: 'One node fails — successor load', value: '+100%', note: 'it now owns two arcs' },
              { label: 'Same cluster, 200 vnodes each', value: '+11% spread over ~9 nodes' },
              { label: 'Rebuild sources, 1 vnode', value: '1 peer' },
              { label: 'Rebuild sources, 200 vnodes', value: '~all peers, in parallel' },
            ],
            result: 'Vnodes convert a cascading-failure risk into a barely noticeable load increase.',
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'The failure argument is stronger than the balance argument',
            body: [
              'Balance is the reason usually given, but the operational reason vnodes matter more is failure behaviour. A single-vnode ring means every node death doubles a neighbour\'s load — which is precisely how a one-node outage becomes a cluster-wide one.',
            ],
          },
        ],
      },
      {
        id: 'costs',
        heading: 'What they cost',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Preference lists get harder.** Consecutive ring positions may belong to the same physical node, so replica selection must skip duplicates — and ideally skip nodes sharing a rack or availability zone too. Getting this wrong silently reduces your replication factor.',
              '**More ring metadata to gossip.** 200 vnodes × 500 nodes is 100,000 entries to propagate and keep consistent; large Cassandra clusters reduced default vnodes from 256 to 16 partly for this reason.',
              '**Range scans fragment.** In an ordered datastore, one logical token range becomes many small ones, so scans touch more nodes.',
              '**Repair and streaming overhead.** Anti-entropy operations work per range, so more ranges means more coordination.',
            ],
          },
          {
            kind: 'table',
            columns: ['Cluster size', 'Typical vnodes/node', 'Reason'],
            rows: [
              ['3–20 nodes', '128–256', 'Balance dominates; metadata is negligible'],
              ['20–100 nodes', '32–128', 'Balance already good; keep gossip manageable'],
              ['100+ nodes', '8–32', 'Many physical nodes already average the variance'],
              ['Fixed-slot systems (Redis)', 'n/a', '16,384 slots serve the same purpose'],
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Replicas landing on one machine',
            body: [
              'The classic vnode bug: the preference list walks clockwise and picks three consecutive positions that all happen to belong to the same physical node — or the same availability zone. Replication factor three becomes replication factor one, and nobody notices until that node dies. Always dedupe by physical node and by failure domain.',
            ],
          },
        ],
      },
      {
        id: 'practice',
        heading: 'How real systems do it',
        blocks: [
          {
            kind: 'prose',
            body: [
              '**Cassandra** exposes `num_tokens`; it defaulted to 256, then to 16 with a token-allocation algorithm that places new tokens to minimise imbalance rather than at random — a better balance with far less metadata.',
              '**DynamoDB** and **Redis Cluster** sidestep the ring entirely with a fixed number of partitions or slots, which serves the same purpose: many small units of assignment that can be moved between machines individually.',
              '**Ceph** uses CRUSH, a hierarchical placement function that understands racks, hosts and disks — vnodes generalised into a full failure-domain-aware topology.',
              'The common thread across all of them: **more, smaller units of assignment than there are machines**. Whether you call them vnodes, slots, partitions or placement groups, that is the idea that makes rebalancing incremental.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Generalise the idea',
            body: [
              'Saying "vnodes, fixed slots and logical shards are the same idea — create many more units of assignment than machines so rebalancing is moving units rather than rehashing data" shows you understand the principle rather than one implementation of it.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Very large clusters where physical node count already averages the variance — high vnode counts then cost gossip and repair overhead for no benefit.',
      'Ordered datastores doing frequent large range scans, where fragmenting ranges across many nodes hurts.',
      'Systems using fixed slots or logical shards, which already provide fine-grained assignment units.',
      'Any implementation that cannot dedupe replicas by physical node and failure domain — the balance is not worth silently losing redundancy.',
    ],
    failureModes: [
      {
        name: 'Replication factor silently reduced',
        symptom: 'A single node or AZ loss makes some keys unavailable despite RF=3.',
        cause: 'Preference list selected multiple vnodes belonging to one physical node or zone.',
        fix: 'Deduplicate by physical node and failure domain when building the preference list; test by simulating an AZ loss.',
      },
      {
        name: 'Gossip and metadata overload',
        symptom: 'Membership changes take a long time to converge in a large cluster.',
        cause: 'Very high vnode counts multiplied by many nodes.',
        fix: 'Reduce vnodes as the cluster grows; use a token allocation algorithm rather than random placement.',
      },
      {
        name: 'Cascading failure without vnodes',
        symptom: 'One node dies, its successor is overwhelmed and dies, and so on around the ring.',
        cause: 'Single-position ring: each failure doubles a neighbour\'s load.',
        fix: 'Use vnodes so failure load spreads across many peers.',
      },
      {
        name: 'Slow range scans',
        symptom: 'Analytical queries degrade after increasing vnodes.',
        cause: 'A contiguous token range fragmented across many nodes.',
        fix: 'Lower vnode count for ordered workloads, or serve scans from a separate analytical store.',
      },
    ],
    interview: [
      {
        q: 'Why do virtual nodes improve a hash ring?',
        a: [
          'Because random points on a circle produce very uneven arcs — with ten nodes it is common for one to own several times its share. Giving each machine many positions averages that variance away, and balance improves as one over the square root of the vnode count, so 100 to 200 gets you within a few percent.',
          'The operationally more important reason is failure behaviour: with one position per node, a node death hands its whole arc to a single successor and doubles its load, which is how one failure cascades. With vnodes, many neighbours each absorb a small fraction.',
        ],
        followUps: ['What breaks if two replicas land on the same physical node?'],
      },
      {
        q: 'What do virtual nodes cost?',
        a: [
          'More ring metadata to gossip and keep consistent, which matters in large clusters — Cassandra reduced its default from 256 to 16 for that reason. Range scans also fragment across more nodes in an ordered store.',
          'The subtle correctness cost is replica placement: consecutive ring positions can belong to the same physical node or availability zone, so a naive preference list silently reduces the replication factor. Implementations must dedupe by failure domain.',
        ],
      },
      {
        q: 'How do vnodes relate to Redis Cluster slots or logical shards?',
        a: [
          'They are the same idea with different names: create many more units of assignment than there are machines, so rebalancing means moving units rather than rehashing data.',
          'Redis fixes 16,384 slots, Cassandra uses tokens per node, and sharded databases over-provision logical shards mapped onto physical ones. Fixed slots have an operational advantage — migration is explicit, observable and resumable — while a ring handles arbitrary membership changes more naturally.',
        ],
      },
    ],
    references: [
      { label: 'Cassandra — Virtual nodes and token allocation', href: 'https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html' },
      { label: 'Ceph — CRUSH: Controlled, Scalable, Decentralized Placement', href: 'https://ceph.io/assets/pdfs/weil-crush-sc06.pdf' },
    ],
  },
}

// ── 3. Rendezvous & jump hashing ─────────────────────────────────────────────

const rendezvous: Lesson = {
  slug: 'consistent-hashing-rendezvous',
  title: 'Rendezvous & Jump Hashing',
  summary: 'Two algorithms that beat the ring — no ring to maintain, better balance.',
  group: 'scaling-patterns',
  topic: 'Consistent Hashing',
  tier: 'pro',
  minutes: 7,
  concept: 'Concept',
  tags: [
    { label: 'Rendezvous', value: 'O(N) lookup, perfect balance' },
    { label: 'Jump', value: 'O(log N), no memory' },
    { label: 'Both', value: 'Optimal key movement' },
  ],
  notes: [
    'Rendezvous hashing scores every node per key and picks the highest — no ring, no vnodes, natural weighting.',
    'Jump consistent hash needs no memory at all: a loop over a pseudo-random sequence.',
    'Jump cannot remove an arbitrary node, which is exactly why it is used for fixed shard counts.',
  ],
  scene: {
    code: [
      '# rendezvous (highest random weight)',
      'node = max(nodes, key=lambda n:',
      '           hash(key, n) * n.weight)',
      '',
      '# jump consistent hash — no state at all',
      'b, j = -1, 0',
      'while j < num_buckets:',
      '    b = j; key = key*2862933555777941757 + 1',
      '    j = (b+1) * (2**31 / ((key>>33)+1))',
    ],
    initialState: { algorithm: 'ring', memory: '20k entries', balance: '±4%', 'moved on add': '1/N' },
    nodes: [
      { id: 'client', kind: 'client', label: 'Client', x: 12, y: 50 },
      { id: 'n1', kind: 'cache', label: 'Node A', x: 50, y: 16, badge: 'score 0.31' },
      { id: 'n2', kind: 'cache', label: 'Node B', x: 50, y: 50, badge: 'score 0.87' },
      { id: 'n3', kind: 'cache', label: 'Node C', x: 50, y: 84, badge: 'score 0.42' },
      { id: 'n4', kind: 'cache', label: 'Node D (new)', x: 86, y: 50, badge: '—' },
    ],
    edges: [
      { id: 'c-n1', from: 'client', to: 'n1', curve: -0.3 },
      { id: 'c-n2', from: 'client', to: 'n2' },
      { id: 'c-n3', from: 'client', to: 'n3', curve: 0.3 },
      { id: 'c-n4', from: 'client', to: 'n4', curve: -0.15 },
    ],
    steps: [
      { id: '1', caption: 'A ring needs 150 virtual nodes per machine — 20,000 entries to build, hold and gossip.', patches: [{ nodeId: 'n2', badge: 'ring: 150 vnodes', highlight: true }], state: { algorithm: 'ring', memory: '20k entries' } },
      { id: '2', caption: 'Rendezvous instead: hash the key together with each node id to get a score.', travel: 'c-n1', token: 'request', codeLine: 2, patches: [{ nodeId: 'n1', badge: 'score 0.31', highlight: true }], state: { algorithm: 'rendezvous', memory: 'none' } },
      { id: '3', caption: 'Highest score wins. Node B owns this key — no ring, no vnodes, nothing stored.', travel: 'c-n2', token: 'hit', codeLine: 3, patches: [{ nodeId: 'n2', badge: 'score 0.87 ✓', highlight: true }], state: { balance: '±1%' } },
      { id: '4', caption: 'Weighting is natural: multiply the score by capacity and bigger machines win more keys.', codeLine: 3, patches: [{ nodeId: 'n2', badge: 'weight 2× ', highlight: true }] },
      { id: '5', caption: 'Add node D. Only keys where D scores highest move — every other key is untouched.', travel: 'c-n4', token: 'write', patches: [{ nodeId: 'n4', badge: 'score 0.94 ✓', highlight: true }], state: { 'moved on add': 'optimal 1/N' } },
      { id: '6', caption: 'Remove a node and only its keys redistribute — proportionally, across all survivors.', patches: [{ nodeId: 'n3', badge: '✗ removed', highlight: true }, { nodeId: 'n1', badge: 'takes a share' }] },
      { id: '7', caption: 'The cost: O(N) hashes per lookup. Fine for 20 nodes, prohibitive for 2,000 — then use jump hash.', codeLine: 6, patches: [{ nodeId: 'n2', badge: 'O(N) per lookup ⚠', highlight: true }], state: { algorithm: 'jump for large N' } },
    ],
  },
  deepDive: {
    readingMinutes: 8,
    intro: [
      'The hash ring is the answer everyone knows, and for many situations it is not the best one. Two lesser-known algorithms achieve **optimal key movement with better balance and less machinery** — they are simply less famous.',
      'Knowing them matters practically (they are often the better choice) and signals depth in interviews, because almost every candidate stops at the ring.',
    ],
    sections: [
      {
        id: 'rendezvous',
        heading: 'Rendezvous hashing (highest random weight)',
        blocks: [
          {
            kind: 'prose',
            body: [
              'For each key, compute `hash(key, node)` for **every** node and pick the node with the highest value. That is the entire algorithm. There is no ring, no virtual nodes, and no data structure to build, replicate or gossip.',
              'It has the properties the ring needs vnodes to approximate. Distribution is uniform because the scores are independent random draws. Adding a node moves only the keys for which it now scores highest — exactly `1/N` of them, and taken proportionally from every existing node rather than from one neighbour.',
            ],
          },
          {
            kind: 'table',
            columns: ['Property', 'Ring + vnodes', 'Rendezvous'],
            rows: [
              ['Lookup cost', 'O(log V) binary search', 'O(N) hashes'],
              ['Memory', 'V × N entries', 'None'],
              ['Balance', '±3–5% with 150 vnodes', 'Near-perfect'],
              ['Keys moved when adding a node', '~1/N', 'Exactly optimal'],
              ['Weighted capacity', 'More vnodes per node', 'Multiply the score'],
              ['Replica selection (top-K)', 'Walk clockwise, dedupe', 'Take the top K scores — trivially correct'],
              ['Membership change propagation', 'Rebuild and gossip the ring', 'Just the node list'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'The replica-selection row deserves emphasis. On a ring, choosing three replicas means walking clockwise and skipping duplicate physical nodes and failure domains — a classic source of bugs that silently reduces the replication factor. With rendezvous you take the **top three scores**, which cannot contain the same node twice, and filtering by zone is a simple predicate.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'rendezvous.py — the whole algorithm, with weights and replicas',
            lines: [
              'def pick(key, nodes):',
              '    return max(nodes, key=lambda n: score(key, n))',
              '',
              'def score(key, node):',
              '    h = mmh3.hash64(f"{key}:{node.id}")[0] / 2**63     # 0..1',
              '    # Weighted rendezvous: capacity shifts the distribution correctly.',
              '    return -node.weight / math.log(h) if h > 0 else 0',
              '',
              'def pick_replicas(key, nodes, k=3, zone_aware=True):',
              '    ranked = sorted(nodes, key=lambda n: score(key, n), reverse=True)',
              '    if not zone_aware:',
              '        return ranked[:k]',
              '    chosen, zones = [], set()',
              '    for n in ranked:                    # spread across failure domains',
              '        if n.zone not in zones:',
              '            chosen.append(n); zones.add(n.zone)',
              '        if len(chosen) == k:',
              '            break',
              '    return chosen',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'O(N) is not the objection people assume',
            body: [
              'For 20 nodes that is 20 fast hashes — a few hundred nanoseconds, comparable to the ring\'s binary search plus cache misses. Rendezvous only becomes impractical in the thousands of nodes, and even then a two-level scheme (rendezvous over racks, then over nodes) restores O(log N).',
            ],
          },
        ],
      },
      {
        id: 'jump',
        heading: 'Jump consistent hash',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Google\'s jump consistent hash is remarkable for what it does not need: **no memory, no data structure, and about five lines of code**. It maps a key to a bucket in `[0, N)` by simulating where the key would have jumped as bucket count grew, using a deterministic pseudo-random sequence.',
              'It gives perfectly uniform distribution and optimal movement — when N grows to N+1, exactly `1/(N+1)` of keys move, and they move only into the new bucket. Lookup is O(log N) with a tiny constant.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Memory required', value: '0 bytes' },
              { label: 'Lookup', value: 'O(ln N)', note: '~7 iterations at N=1000' },
              { label: 'Balance', value: 'Perfectly uniform' },
              { label: 'Keys moved, N → N+1', value: 'exactly 1/(N+1)' },
              { label: 'Arbitrary node removal', value: 'Not supported' },
              { label: 'Weighted nodes', value: 'Not supported' },
            ],
            result: 'Optimal on every axis except the one that matters for caches: arbitrary removal.',
          },
          {
            kind: 'prose',
            body: [
              'That limitation is fundamental rather than an implementation gap. Jump hash maps to bucket **numbers**, so it can only add or remove buckets at the **end** of the range. If node 3 of 10 dies, you cannot express "skip 3" — the mapping is a pure function of the bucket count.',
              'So it fits systems where the bucket count is a deliberate, stable configuration — shard counts, partition counts, a fixed number of storage groups — with node failure handled by replication *within* a bucket rather than by remapping keys. It does not fit a cache cluster where machines come and go.',
            ],
          },
        ],
      },
      {
        id: 'choosing',
        heading: 'Which to use',
        blocks: [
          {
            kind: 'table',
            columns: ['Situation', 'Best choice', 'Why'],
            rows: [
              ['Cache cluster, nodes come and go', 'Ring + vnodes or rendezvous', 'Arbitrary removal is required'],
              ['< 100 nodes, want simplicity', 'Rendezvous', 'No structure to maintain; better balance'],
              ['Heterogeneous node capacity', 'Rendezvous', 'Weighting is a multiplication'],
              ['Replica placement with zones', 'Rendezvous', 'Top-K cannot duplicate a node'],
              ['Fixed shard count, thousands of buckets', 'Jump hash', 'Zero memory, O(log N)'],
              ['Need explicit, resumable migration', 'Fixed slots + directory', 'Movement becomes an observable operation'],
              ['Load balancing with backend health', 'Maglev or ring', 'Designed for connection distribution'],
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'The differentiating sentence',
            body: [
              '"The ring is the famous answer, but for under a hundred nodes I would use rendezvous hashing — better balance, no ring to gossip, weighting is a multiplication, and picking the top K scores gives me replica selection without the duplicate-physical-node bug that ring walks have."',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Rendezvous with thousands of nodes on a hot path — the O(N) scan per lookup starts to matter; use a hierarchy or jump hash.',
      'Jump hash where individual nodes must be removed; it can only shrink from the end of the bucket range.',
      'Jump hash for heterogeneous capacity — it has no weighting mechanism.',
      'Any of these where placement must satisfy constraints a hash cannot express, such as residency; use a directory.',
    ],
    failureModes: [
      {
        name: 'Inconsistent node ordering',
        symptom: 'Different clients route the same key to different nodes.',
        cause: 'Node identifiers differing across clients (hostname vs IP), producing different scores.',
        fix: 'Use a stable canonical node id everywhere, and version the membership list.',
      },
      {
        name: 'Weak hash causing correlation',
        symptom: 'Distribution skews for structured keys such as sequential ids.',
        cause: 'A low-quality hash leaving correlation between key and node score.',
        fix: 'Use a well-distributed hash (MurmurHash, xxHash) over the combined key and node id.',
      },
      {
        name: 'Jump hash used with node removal',
        symptom: 'Removing a middle node reshuffles far more keys than expected.',
        cause: 'Jump hash only supports shrinking from the end of the bucket range.',
        fix: 'Keep bucket count fixed and handle failure by replication within a bucket, or switch algorithms.',
      },
      {
        name: 'O(N) lookup on a hot path',
        symptom: 'Routing CPU grows noticeably as the cluster grows.',
        cause: 'Rendezvous scoring every node for every request.',
        fix: 'Cache the mapping per key, or use a two-level hierarchy over racks then nodes.',
      },
    ],
    interview: [
      {
        q: 'Is a hash ring the only way to do consistent hashing?',
        a: [
          'No, and often not the best. Rendezvous hashing scores every node for a key and picks the highest — no ring, no virtual nodes, nothing to build or gossip. Distribution is near-perfect rather than approximate, weighting is a simple multiplication, and adding a node moves exactly the optimal fraction of keys.',
          'Its cost is O(N) hashes per lookup, which for twenty or fifty nodes is a few hundred nanoseconds and completely fine. It only becomes a problem in the thousands, where a two-level hierarchy or jump hash is better.',
        ],
        followUps: ['How does replica selection compare between the two?'],
      },
      {
        q: 'What is jump consistent hash and why is it not used for caches?',
        a: [
          'It maps a key to a bucket in a fixed range using about five lines of arithmetic — no memory at all, O(log N) lookup, perfectly uniform, and optimal key movement when the bucket count grows.',
          'The catch is that it maps to bucket numbers as a pure function of the count, so it can only add or remove buckets at the end of the range. You cannot express "node three died, skip it".',
          'That makes it excellent for a fixed number of shards or partitions, where failure is handled by replication inside a bucket, and unusable for a cache cluster where machines come and go arbitrarily.',
        ],
      },
      {
        q: 'Why is rendezvous better for choosing replicas?',
        a: [
          'Because taking the top K scores cannot select the same node twice, whereas walking a ring clockwise can hit several virtual nodes belonging to one physical machine — which silently reduces the replication factor and is a well-known source of bugs.',
          'Zone awareness is also simpler: I rank all nodes by score and take the highest-scoring node from each distinct failure domain, which is a straightforward filter rather than a careful walk with deduplication.',
        ],
      },
    ],
    references: [
      { label: 'Thaler & Ravishankar — Rendezvous (HRW) hashing', href: 'https://www.eecs.umich.edu/techreports/cse/96/CSE-TR-316-96.pdf' },
      { label: 'Lamping & Veach — A Fast, Minimal Memory, Consistent Hash Algorithm', href: 'https://arxiv.org/pdf/1406.2294.pdf' },
    ],
  },
}

export const consistentHashingTopic: Lesson[] = [
  consistentHashing,
  consistentHashingVnodes,
  rendezvous,
]
