import type { Lesson } from '../types'

/** Topic: CAP Theorem (group: scaling-patterns). */

const capTheorem: Lesson = {
  slug: 'cap-theorem',
  title: 'CAP Theorem',
  summary: 'During a network partition you must choose: consistency or availability.',
  group: 'scaling-patterns',
  topic: 'CAP Theorem',
  tier: 'pro',
  minutes: 8,
  concept: 'Concept',
  tags: [
    { label: 'Trade-off', value: 'Consistency vs Availability' },
    { label: 'Guarantee', value: 'Pick 2 of 3' },
    { label: 'Partition', value: 'Always present' },
  ],
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
  deepDive: {
    readingMinutes: 9,
    intro: [
      'CAP is the most cited and most misused result in distributed systems. The correct statement is narrow: **when a network partition occurs, a distributed system must choose between consistency and availability.** It says nothing about the other 99.9% of the time, and "pick two of three" is a misreading — you never get to choose whether partitions happen.',
      'The practical version, and the one worth reasoning with, is **PACELC**: if there is a **P**artition, choose **A**vailability or **C**onsistency; **E**lse, choose **L**atency or **C**onsistency. That second clause describes the trade you make every single day.',
    ],
    sections: [
      {
        id: 'precise',
        heading: 'What the theorem actually says',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The terms have technical meanings that differ from their everyday ones, and most confusion comes from that gap.',
            ],
          },
          {
            kind: 'table',
            columns: ['Term', 'Formal meaning', 'What people wrongly assume'],
            rows: [
              ['Consistency', 'Linearizability — every read sees the most recent write', 'ACID consistency (constraints holding)'],
              ['Availability', 'Every request to a non-failing node gets a non-error response', 'Uptime, or "the site works"'],
              ['Partition tolerance', 'The system keeps operating despite dropped messages between nodes', 'Something you can choose to skip'],
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'You cannot opt out of P',
            body: [
              'Networks partition — cables fail, switches reboot, a rack loses connectivity, a cloud AZ becomes unreachable. Since partition tolerance is not optional for any system spanning more than one machine, the real choice is only ever **CP or AP**, and only during the partition.',
              '"We chose CA" means "we have not thought about partitions", not "we avoided them".',
            ],
          },
        ],
      },
      {
        id: 'choice',
        heading: 'What each choice looks like in practice',
        blocks: [
          {
            kind: 'prose',
            body: [
              'During a partition, a node that cannot reach a quorum faces exactly one decision: **answer with possibly-stale data, or refuse to answer.** That is the entire theorem, and it is a product decision far more than a technical one.',
            ],
          },
          {
            kind: 'table',
            columns: ['Choice', 'During a partition', 'Correct for', 'Systems'],
            rows: [
              ['CP', 'Minority side returns errors', 'Balances, inventory, locks, config', 'etcd, ZooKeeper, Spanner, HBase'],
              ['AP', 'All sides accept reads and writes; reconcile later', 'Feeds, carts, sessions, analytics', 'Cassandra, Dynamo, Riak'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'The Amazon shopping cart is the canonical AP example and worth understanding as a business argument rather than a technical one: refusing an "add to cart" during a partition costs a sale for certain, whereas accepting concurrent writes on both sides risks a resurrected item the customer can remove. Chosen deliberately, the second is much cheaper.',
              'Inventory decrement at checkout is the opposite: overselling has real financial and reputational cost, so refusing the write during a partition is correct.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'CAP is a per-operation decision, not a per-database one',
            body: [
              'The strongest answer rejects the premise of "is your system CP or AP?" — one application typically wants CP for payments and AP for browsing. Modern databases expose this per query: DynamoDB offers eventually or strongly consistent reads; Cassandra sets consistency levels per statement.',
            ],
          },
        ],
      },
      {
        id: 'pacelc',
        heading: 'PACELC: the trade you make every day',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Partitions are rare. The `else` branch of PACELC is not: even in perfect health, strong consistency requires coordination, and coordination costs round trips. That cost is unavoidable and easy to quantify.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Local read from a replica', value: '~1 ms' },
              { label: 'Quorum read across 3 same-region nodes', value: '~3 ms' },
              { label: 'Quorum write, same region', value: '~5 ms' },
              { label: 'Quorum write across 3 regions', value: '~150 ms' },
              { label: 'Spanner commit (TrueTime wait)', value: '~10–100 ms' },
              { label: 'Eventually consistent local write', value: '~2 ms' },
            ],
            result: 'Strong consistency is priced in round trips — and geography sets the price.',
          },
          {
            kind: 'table',
            columns: ['System', 'On partition', 'Else', 'Classification'],
            rows: [
              ['Spanner', 'Consistency', 'Consistency (pays latency)', 'PC/EC'],
              ['DynamoDB (default)', 'Availability', 'Latency', 'PA/EL'],
              ['Cassandra', 'Availability', 'Latency (tunable)', 'PA/EL'],
              ['etcd, ZooKeeper', 'Consistency', 'Consistency', 'PC/EC'],
              ['MongoDB (default)', 'Consistency', 'Latency', 'PC/EL'],
            ],
          },
        ],
      },
      {
        id: 'spectrum',
        heading: 'The consistency spectrum between the extremes',
        blocks: [
          {
            kind: 'prose',
            body: [
              'CAP presents a binary, but real systems live on a spectrum, and naming the model you need is far more useful than saying "strong" or "eventual".',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Linearizable** — reads always see the latest committed write; the system behaves as if there were one copy. The strongest and most expensive.',
              '**Sequential** — all nodes see operations in the same order, though not necessarily in real time.',
              '**Causal** — operations that are causally related are seen in order everywhere; concurrent ones may differ. Enough for most social and collaborative features, and far cheaper than linearizable.',
              '**Read-your-writes / monotonic reads** — session guarantees that eliminate the anomalies users actually notice, without global coordination.',
              '**Eventual** — replicas converge if writes stop. Says nothing about when, and permits arbitrary anomalies in the meantime.',
            ],
          },
          {
            kind: 'prose',
            body: [
              'Most "we need strong consistency" requirements turn out to be **read-your-writes plus monotonic reads** — a user should see their own change and should never see time run backwards. Those are session-scoped guarantees achievable with sticky routing and write tokens, at a tiny fraction of the cost of linearizability.',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Quorums let you tune the trade per operation',
            body: [
              'With N replicas, reading from R and writing to W, you get strong consistency whenever `R + W > N` — the read and write sets must overlap. `N=3, W=2, R=2` is strongly consistent and tolerates one node failing; `W=1, R=1` is fast and eventual. The same cluster serves both, chosen per query.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Do not use CAP to classify an entire system — the choice belongs to individual operations.',
      'Do not invoke it for single-node databases; with no partition to tolerate, it does not apply.',
      'Do not treat "AP" as licence to ignore consistency — it means you owe a conflict resolution strategy.',
      'Do not choose CP for everything by default; refusing writes during a partition is a real, sometimes larger, business cost.',
    ],
    failureModes: [
      {
        name: 'Split brain in an AP system',
        symptom: 'Both sides of a partition accept conflicting writes; data diverges.',
        cause: 'Availability chosen with no conflict resolution designed.',
        fix: 'Version vectors, CRDTs, or an explicit merge policy — and never plain last-write-wins on unsynchronised clocks.',
      },
      {
        name: 'Minority-side outage',
        symptom: 'A subset of users see total failure during a network event.',
        cause: 'CP behaviour: nodes without quorum correctly refuse to serve.',
        fix: 'Expected, not a bug — but reduce blast radius with regional quorums and serve degraded read-only where safe.',
      },
      {
        name: 'Last-write-wins data loss',
        symptom: 'Updates silently disappear after a partition heals.',
        cause: 'Conflict resolution by timestamp with clock skew between nodes.',
        fix: 'Logical clocks or version vectors; keep siblings and resolve at the application layer.',
      },
      {
        name: 'Unnecessary global consistency',
        symptom: 'Writes take hundreds of milliseconds worldwide for data nobody reads across regions.',
        cause: 'Strong consistency applied globally when the requirement was per-session.',
        fix: 'Regional primaries with session guarantees; reserve global consensus for genuinely global invariants.',
      },
    ],
    interview: [
      {
        q: 'Explain CAP, and what it means for your design.',
        a: [
          'It says that when a network partition occurs, a distributed system must choose between linearizable consistency and availability. Partition tolerance is not optional for anything spanning multiple machines, so the real choice is CP or AP, and only during a partition.',
          'The more useful framing is PACELC, because partitions are rare and the everyday trade is latency versus consistency: strong consistency requires coordination, and coordination costs round trips — a few milliseconds within a region and over a hundred across regions.',
          'I would make the choice per operation rather than per system: refuse writes during a partition for inventory and payments, accept them for carts and feeds.',
        ],
        followUps: ['What conflict resolution would you use on the AP side?'],
      },
      {
        q: 'A user adds an item to their cart during a network partition. What should happen?',
        a: [
          'Accept the write. Refusing costs a sale with certainty, while accepting risks a duplicate or resurrected item the customer can remove — the classic Amazon Dynamo argument, and a business decision more than a technical one.',
          'That commits me to conflict resolution when the partition heals. A cart merges well as a set union with explicit removal tombstones, so concurrent adds combine rather than one overwriting the other.',
          'Checkout is the opposite: inventory decrement should be strongly consistent, because overselling has a real cost that an apology does not cover.',
        ],
      },
      {
        q: 'When do you actually need linearizability?',
        a: [
          'For invariants that must hold globally at all times — a unique username, a lock or leader election, an account balance that cannot go negative, inventory that cannot oversell.',
          'Most requirements described as "strong consistency" are really read-your-writes plus monotonic reads: the user should see their own change and should never see data go backwards. Those are session guarantees achievable with sticky routing or write tokens, at a small fraction of the cost.',
          'So I would ask what specific anomaly is unacceptable, then pick the weakest model that rules it out.',
        ],
      },
    ],
    references: [
      { label: 'Brewer — CAP Twelve Years Later: How the Rules Have Changed', href: 'https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/' },
      { label: 'Abadi — Consistency Tradeoffs in Modern Distributed Database Design (PACELC)', href: 'https://www.cs.umd.edu/~abadi/papers/abadi-pacelc.pdf' },
    ],
  },
}

// ── 2. Quorums & consensus ───────────────────────────────────────────────────

const quorums: Lesson = {
  slug: 'cap-quorums-consensus',
  title: 'Quorums, Leader Election & Consensus',
  summary: 'How a majority agrees on one truth — and why a minority must refuse to answer.',
  group: 'scaling-patterns',
  topic: 'CAP Theorem',
  tier: 'pro',
  minutes: 8,
  concept: 'Concept',
  tags: [
    { label: 'Rule', value: 'R + W > N' },
    { label: 'Tolerates', value: 'floor((N−1)/2) failures' },
    { label: 'Protocols', value: 'Raft · Paxos' },
  ],
  notes: [
    'A quorum is any set large enough that two of them must overlap — which is why a majority works.',
    'R + W > N guarantees a read set intersects the last write set, giving strong consistency on tunable stores.',
    'Consensus gets slower as you add members: never grow a Raft group for throughput.',
  ],
  scene: {
    code: [
      'N = 5 replicas',
      'quorum = floor(N/2) + 1 = 3',
      '',
      '# tunable consistency',
      'W = 3, R = 3   ->  R + W > N  (strong)',
      'W = 1, R = 1   ->  fast, eventual',
      '',
      '# a minority cannot elect a leader',
      'if reachable < quorum: refuse_writes()',
    ],
    initialState: { nodes: 5, quorum: 3, leader: 'n1', writes: 'accepted', partition: 'none' },
    nodes: [
      { id: 'client', kind: 'client', label: 'Client', x: 10, y: 50 },
      { id: 'n1', kind: 'database', label: 'n1 · leader', x: 42, y: 18, badge: 'leader' },
      { id: 'n2', kind: 'database', label: 'n2', x: 42, y: 50, badge: 'follower' },
      { id: 'n3', kind: 'database', label: 'n3', x: 42, y: 82, badge: 'follower' },
      { id: 'n4', kind: 'database', label: 'n4', x: 80, y: 32, badge: 'follower' },
      { id: 'n5', kind: 'database', label: 'n5', x: 80, y: 68, badge: 'follower' },
    ],
    edges: [
      { id: 'c-n1', from: 'client', to: 'n1' },
      { id: 'n1-n2', from: 'n1', to: 'n2' },
      { id: 'n1-n3', from: 'n1', to: 'n3' },
      { id: 'n1-n4', from: 'n1', to: 'n4', curve: -0.25 },
      { id: 'n1-n5', from: 'n1', to: 'n5', curve: 0.25 },
    ],
    steps: [
      { id: '1', caption: 'Five replicas. A quorum is three — any two quorums must share a node.', codeLine: 2, state: { nodes: 5, quorum: 3 } },
      { id: '2', caption: 'The client writes to the leader, which appends to its log and replicates.', travel: 'c-n1', token: 'write', codeLine: 5, patches: [{ nodeId: 'n1', badge: 'log[7] pending', highlight: true }] },
      { id: '3', caption: 'Two followers acknowledge. With the leader that is three — a majority.', travel: 'n1-n2', token: 'write', patches: [{ nodeId: 'n2', badge: 'acked' }, { nodeId: 'n3', badge: 'acked', highlight: true }], state: { writes: 'committed' } },
      { id: '4', caption: 'The write commits without waiting for n4 and n5 — slow nodes cannot block progress.', travel: 'n1-n4', token: 'write', patches: [{ nodeId: 'n1', badge: 'committed ✓', highlight: true }] },
      { id: '5', caption: 'A partition splits the cluster: n1 and n2 on one side, n3, n4, n5 on the other.', patches: [{ nodeId: 'n1', badge: 'sees 2 ✗', highlight: true }, { nodeId: 'n2', badge: 'isolated' }], state: { partition: '2 | 3' } },
      { id: '6', caption: 'The old leader can only reach one follower — below quorum, so it must stop accepting writes.', travel: 'c-n1', token: 'miss', codeLine: 9, patches: [{ nodeId: 'n1', badge: 'stepped down', highlight: true }], state: { writes: 'refused (minority)', leader: 'none' } },
      { id: '7', caption: 'The majority side elects n3 and keeps serving. One cluster, one leader — no split brain.', patches: [{ nodeId: 'n3', badge: 'leader ✓', highlight: true }, { nodeId: 'n4', badge: 'follower' }, { nodeId: 'n5', badge: 'follower' }], state: { leader: 'n3', writes: 'accepted', partition: 'tolerated' } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'CAP tells you a choice exists. **Quorums are the mechanism that implements it.** The entire idea rests on one property: if every operation must contact a majority, then any two operations contacted at least one node in common — so they cannot both proceed in ignorance of each other.',
      'That single overlap property is what prevents split brain, what makes `R + W > N` give strong reads, and what forces a minority partition to refuse service.',
    ],
    sections: [
      {
        id: 'overlap',
        heading: 'Why a majority, specifically',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A quorum is any subset large enough that two of them must intersect. For a cluster of N, the smallest such size is `floor(N/2) + 1` — a majority. Two majorities of a five-node cluster are each three nodes, and three plus three exceeds five, so they must share at least one member.',
              'That shared member is the mechanism: it has seen the previous decision and can reject or inform the new one. Without overlap, two partitions could each elect a leader and each believe itself authoritative — split brain, with divergent histories that cannot be merged.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'N = 3', value: 'quorum 2, tolerates 1 failure' },
              { label: 'N = 4', value: 'quorum 3, tolerates 1 failure', note: 'no better than 3' },
              { label: 'N = 5', value: 'quorum 3, tolerates 2 failures' },
              { label: 'N = 6', value: 'quorum 4, tolerates 2 failures', note: 'no better than 5' },
              { label: 'N = 7', value: 'quorum 4, tolerates 3 failures' },
            ],
            result: 'Even cluster sizes buy nothing — always use an odd number.',
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Even numbers waste a node',
            body: [
              'Four nodes tolerate exactly as many failures as three while costing more and making writes slower. The only reason to run an even count is a transient state during a membership change — and tools that support it usually offer a witness or arbiter node instead: a voting member that stores no data.',
            ],
          },
        ],
      },
      {
        id: 'rwn',
        heading: 'R + W > N: tunable consistency',
        blocks: [
          {
            kind: 'prose',
            body: [
              'In leaderless (Dynamo-style) systems, the quorum is not fixed — you choose how many replicas must acknowledge a write (**W**) and how many must respond to a read (**R**) out of N. When `R + W > N`, the read set and the last write set must overlap, so the read observes the latest write.',
              'This turns consistency into a per-query dial rather than a database-wide property, which is why the same Cassandra cluster can serve a strongly-consistent balance check and a fast eventual feed read.',
            ],
          },
          {
            kind: 'table',
            columns: ['N', 'W', 'R', 'Consistency', 'Trade'],
            rows: [
              ['3', '3', '1', 'Strong', 'Fast reads; any node down blocks writes'],
              ['3', '2', '2', 'Strong', 'Balanced; tolerates one node down — the usual default'],
              ['3', '1', '3', 'Strong', 'Fast writes; any node down blocks reads'],
              ['3', '1', '1', 'Eventual', 'Fastest, highest availability, stale reads possible'],
              ['5', '3', '3', 'Strong', 'Tolerates two failures; more coordination'],
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Sloppy quorums break the guarantee',
            body: [
              'Some systems, when the proper replicas are unreachable, accept a write on *any* W nodes and hand it off later. That preserves availability but means the W nodes may not overlap the R nodes at all — so `R + W > N` no longer guarantees anything. Read the fine print of your datastore before relying on the arithmetic.',
            ],
          },
        ],
      },
      {
        id: 'raft',
        heading: 'Consensus: agreeing on an order, not just a value',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Quorum reads and writes give you consistency for individual values. **Consensus** — Raft, Paxos, Zab — gives you something stronger: agreement on a total *order* of operations, which is what you need for a replicated state machine, a lock service, or leader election.',
              'Raft achieves it with a leader per term. The leader appends entries to its log and replicates them; an entry commits once a majority has stored it. If the leader fails, a follower whose log is at least as up to date campaigns for the next term, and a majority must vote for it. The two majorities — the one that committed the entry and the one that elected the new leader — necessarily overlap, so no committed entry can be lost.',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Terms are logical clocks.** Every message carries a term; anything from an older term is rejected, which is how a returning stale leader is neutralised.',
              '**Randomised election timeouts** stop every follower campaigning simultaneously and deadlocking the vote.',
              '**Log matching** means a follower only accepts entries that continue its own log, so histories cannot diverge silently.',
              '**Reads need care too.** A leader that has been partitioned may not know it lost leadership, so linearizable reads need either a quorum round trip or a lease with bounded clock drift.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Raft write, 3 nodes same AZ', value: '~2–5 ms' },
              { label: 'Raft write, 3 AZs', value: '~5–10 ms' },
              { label: 'Raft write, 3 regions', value: '~100–200 ms' },
              { label: 'Throughput, 3 nodes', value: 'baseline' },
              { label: 'Throughput, 7 nodes', value: 'lower', note: 'more acks per commit' },
              { label: 'Failover time (election timeout)', value: '~150–500 ms' },
            ],
            result: 'Consensus groups get slower as they grow — size them for fault tolerance, never for throughput.',
          },
        ],
      },
      {
        id: 'practice',
        heading: 'Using consensus without paying for it everywhere',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Because consensus is expensive and does not scale by adding members, the standard architecture uses it for **metadata and coordination**, not for bulk data. A small Raft group decides who the leader is, which shard lives where, and what the configuration is; the data plane then runs at full speed against that decision.',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Coordination services** — etcd, ZooKeeper, Consul: leader election, service discovery, distributed locks, feature configuration.',
              '**Shard placement** — the mapping of key ranges to nodes lives in a consensus group; data operations do not.',
              '**Replicated logs per shard** — systems like Spanner and CockroachDB run a separate Raft group per range, so consensus scales horizontally by having many small groups rather than one large one.',
              '**Distributed locks need fencing.** A lock holder can pause (GC, VM migration) past its lease, so the lock must issue a monotonically increasing token that the protected resource checks — otherwise two holders can act at once.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'The scaling answer is more groups, not bigger groups',
            body: [
              'Asked how to scale a consensus-backed system, the wrong answer is "add nodes to the Raft group" — that makes every commit slower. The right answer is to partition the keyspace and run an independent consensus group per partition, which is exactly what Spanner and CockroachDB do.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'For high-throughput data paths — consensus per operation is far too expensive; use it for metadata and leadership only.',
      'Across regions for latency-sensitive writes; a cross-region commit costs 100 ms or more per operation.',
      'When eventual consistency suffices — quorum coordination buys a guarantee you may not need.',
      'Growing a consensus group to increase throughput; it decreases it.',
    ],
    failureModes: [
      {
        name: 'Split brain from a missing quorum rule',
        symptom: 'Two leaders accept writes; histories diverge irreparably.',
        cause: 'Leadership granted without majority agreement, or a demoted leader still accepting writes.',
        fix: 'Majority-only elections, term numbers on every message, and fencing tokens checked by the resource.',
      },
      {
        name: 'Stale leader serving reads',
        symptom: 'A read returns old data even though a newer write committed elsewhere.',
        cause: 'A partitioned leader answering reads locally without confirming it is still leader.',
        fix: 'Quorum reads, or leader leases with bounded clock drift and read-index checks.',
      },
      {
        name: 'Even-sized cluster deadlock',
        symptom: 'A partition splits the cluster in half and neither side can elect a leader.',
        cause: 'An even number of voting members means no majority exists in a 2–2 split.',
        fix: 'Use an odd number of voters, or add a witness/arbiter that votes but stores no data.',
      },
      {
        name: 'Lock expiry without fencing',
        symptom: 'Two processes both believe they hold a lock and corrupt shared state.',
        cause: 'The holder paused past its lease; the lock was granted to another.',
        fix: 'Monotonic fencing tokens validated by the protected resource on every write.',
      },
    ],
    interview: [
      {
        q: 'Why does a quorum have to be a majority?',
        a: [
          'Because a majority is the smallest set with the property that any two of them overlap. That overlap means a new operation always contacts at least one node that participated in the previous one, so it cannot proceed in ignorance of it.',
          'Without overlap, both sides of a partition could elect leaders and accept writes, and the resulting histories cannot be merged correctly. The overlap is the whole mechanism that prevents split brain.',
        ],
        followUps: ['Why is a five-node cluster better than a four-node one?'],
      },
      {
        q: 'What does R + W > N give you?',
        a: [
          'It guarantees that the set of replicas a read contacts overlaps the set the last write contacted, so the read sees at least one replica holding the newest value and can return it.',
          'It makes consistency a per-query choice: N=3 with W=2 and R=2 is strongly consistent and tolerates one node down, while W=1 and R=1 is fast and eventual on the same cluster.',
          'The caveat is sloppy quorums — if the system accepts a write on any available nodes rather than the designated replicas, the overlap no longer holds and the arithmetic stops guaranteeing anything.',
        ],
      },
      {
        q: 'How would you scale a system built on Raft?',
        a: [
          'Not by adding members to the group — every commit needs a majority acknowledgement, so a larger group means more coordination and lower throughput. Group size should be chosen for fault tolerance, typically three or five.',
          'Instead I would partition the keyspace and run an independent Raft group per partition, which is how Spanner and CockroachDB scale: many small consensus groups rather than one large one.',
          'I would also keep consensus off the bulk data path entirely where possible, using it for leadership, membership and shard placement while data operations run against the decision it produced.',
        ],
      },
    ],
    references: [
      { label: 'Ongaro & Ousterhout — In Search of an Understandable Consensus Algorithm (Raft)', href: 'https://raft.github.io/raft.pdf' },
      { label: 'Kleppmann — How to do distributed locking (fencing tokens)', href: 'https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html' },
    ],
  },
}

// ── 3. Consistency models ────────────────────────────────────────────────────

const consistencyModels: Lesson = {
  slug: 'cap-consistency-models',
  title: 'The Consistency Spectrum',
  summary: 'Between linearizable and eventual there are five models — and you probably need one in the middle.',
  group: 'scaling-patterns',
  topic: 'CAP Theorem',
  tier: 'pro',
  minutes: 8,
  concept: 'Concept',
  tags: [
    { label: 'Strongest', value: 'Linearizable' },
    { label: 'Usually enough', value: 'Causal + session' },
    { label: 'Cost', value: 'Coordination round trips' },
  ],
  notes: [
    '"Strong" and "eventual" are the two ends of a spectrum with useful, much cheaper models in between.',
    'Most requirements described as strong consistency are really read-your-writes plus monotonic reads.',
    'Session guarantees are achievable with routing tricks — no global coordination required.',
  ],
  scene: {
    code: [
      '# linearizable: one copy, real-time order',
      'read() == last committed write   # quorum',
      '',
      '# causal: related ops ordered everywhere',
      'if post -> reply, everyone sees post first',
      '',
      '# session: my own view is sane',
      'read_your_writes(); monotonic_reads()',
    ],
    initialState: { model: 'eventual', anomaly: 'none', 'read cost': '1 ms', 'write cost': '2 ms' },
    nodes: [
      { id: 'alice', kind: 'client', label: 'Alice', x: 10, y: 26 },
      { id: 'bob', kind: 'client', label: 'Bob', x: 10, y: 74 },
      { id: 'r1', kind: 'database', label: 'Replica 1', x: 48, y: 26, badge: 'v1' },
      { id: 'r2', kind: 'database', label: 'Replica 2', x: 48, y: 74, badge: 'v1' },
      { id: 'r3', kind: 'database', label: 'Replica 3', x: 82, y: 50, badge: 'v1' },
    ],
    edges: [
      { id: 'a-r1', from: 'alice', to: 'r1' },
      { id: 'b-r2', from: 'bob', to: 'r2' },
      { id: 'r1-r2', from: 'r1', to: 'r2', curve: 0.3 },
      { id: 'r1-r3', from: 'r1', to: 'r3', curve: -0.25 },
      { id: 'r2-r3', from: 'r2', to: 'r3', curve: 0.25 },
    ],
    steps: [
      { id: '1', caption: 'Alice writes v2 to replica 1. Replication is asynchronous.', travel: 'a-r1', token: 'write', patches: [{ nodeId: 'r1', badge: 'v2', highlight: true }], state: { model: 'eventual' } },
      { id: '2', caption: 'Alice reads again — but lands on replica 2, which still has v1. Her own write vanished.', travel: 'r1-r2', token: 'miss', patches: [{ nodeId: 'r2', badge: 'v1 ✗', highlight: true }], state: { anomaly: 'read-your-writes ✗' } },
      { id: '3', caption: 'Fix with a session guarantee: pin Alice to a replica that has her write. No coordination needed.', travel: 'a-r1', token: 'hit', codeLine: 8, patches: [{ nodeId: 'r1', badge: 'v2 · pinned', highlight: true }], state: { model: 'session', anomaly: 'none' } },
      { id: '4', caption: 'Bob posts a reply to Alice\'s message. The reply is causally after the post.', travel: 'b-r2', token: 'write', patches: [{ nodeId: 'r2', badge: 'reply', highlight: true }], state: { model: 'session' } },
      { id: '5', caption: 'Replica 3 receives the reply before the post — a reply to a message nobody can see.', travel: 'r2-r3', token: 'miss', codeLine: 5, patches: [{ nodeId: 'r3', badge: 'reply only ✗', highlight: true }], state: { anomaly: 'causal ✗' } },
      { id: '6', caption: 'Causal consistency carries a dependency token, so the reply waits for the post to arrive.', travel: 'r1-r3', token: 'write', patches: [{ nodeId: 'r3', badge: 'post → reply ✓', highlight: true }], state: { model: 'causal', anomaly: 'none' } },
      { id: '7', caption: 'Linearizable would need a quorum on every read and write — correct everywhere, and far more expensive.', patches: [{ nodeId: 'r3', badge: 'quorum read', highlight: true }], state: { model: 'linearizable', 'read cost': '3 ms', 'write cost': '5 ms' } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'Consistency is usually discussed as a binary — "strong" or "eventual" — which hides the fact that there are several well-defined models between them, and that the useful ones are mostly in the middle.',
      'The practical skill is not knowing the definitions. It is being able to ask **which specific anomaly is unacceptable** and then choosing the weakest model that rules it out, because every step up the ladder costs coordination that shows up as latency on every operation.',
    ],
    sections: [
      {
        id: 'ladder',
        heading: 'The models, strongest first',
        blocks: [
          {
            kind: 'table',
            columns: ['Model', 'Guarantee', 'Typical cost', 'Example use'],
            rows: [
              ['Linearizable', 'Every read sees the latest committed write, in real time', 'Quorum per operation', 'Locks, leader election, balances'],
              ['Sequential', 'All nodes see operations in the same order (not necessarily real-time)', 'Total order broadcast', 'Replicated state machines'],
              ['Causal', 'Causally-related operations ordered everywhere; concurrent ones may differ', 'Dependency tracking', 'Comments, chat, collaboration'],
              ['Session (RYW, monotonic)', 'Your own view is coherent', 'Routing / tokens only', 'Most user-facing apps'],
              ['Eventual', 'Replicas converge if writes stop', 'None', 'Analytics, feeds, counters'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'The gap between **linearizable** and **sequential** is subtle and worth being precise about: sequential consistency requires everyone to agree on an order, but that order need not match real time. If Alice writes at 10:00 and Bob writes at 10:01, a sequential system may order Bob first as long as *every* node agrees. Linearizability forbids that — it requires the order to respect real-time completion.',
              'That extra requirement is what makes linearizability expensive: it needs coordination on **reads** too, not just writes, because a read must be certain no newer write has committed elsewhere.',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Consistency is about anomalies, not adjectives',
            body: [
              'Rather than asking "do we need strong consistency?", ask "is it acceptable for a user to see their own edit disappear? for two users to disagree about ordering? for a counter to be briefly low?" Each answer eliminates specific models, and you take the cheapest one left.',
            ],
          },
        ],
      },
      {
        id: 'session',
        heading: 'Session guarantees: 90% of the benefit, almost none of the cost',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Most complaints attributed to "eventual consistency" are actually violations of two narrow, session-scoped properties — and both are achievable with routing rather than coordination.',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Read-your-writes:** a user always sees their own updates. Implemented by routing that user\'s reads to the primary for a short window after a write, or by returning a log position the replica must have applied.',
              '**Monotonic reads:** a user never sees data go backwards. Implemented by pinning a session to one replica, so successive reads cannot hop to a laggier one.',
              '**Monotonic writes:** a user\'s own writes are applied in the order they issued them. Usually free with a single primary; needs care in multi-primary setups.',
              '**Writes-follow-reads:** if you read a value and then write based on it, your write is ordered after what you read. This is what prevents replying to a message that then appears after the reply.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'session_consistency.py — guarantees without global coordination',
            lines: [
              'def read(user, key):',
              '    # Read-your-writes: within the staleness window, use the primary.',
              '    if user.last_write_at and now() - user.last_write_at < LAG_P99:',
              '        return primary.get(key)',
              '',
              '    # Monotonic reads: same session, same replica.',
              '    replica = pick_replica(hash(user.session_id))',
              '',
              '    # Or precisely: wait until the replica has applied our position.',
              '    if user.last_lsn:',
              '        replica.wait_for_lsn(user.last_lsn, timeout=50)',
              '    return replica.get(key)',
              '',
              'def write(user, key, value):',
              '    lsn = primary.put(key, value)',
              '    user.last_lsn = lsn            # carried in a cookie or token',
              '    user.last_write_at = now()',
              '    return lsn',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'The reframe that lands',
            body: [
              'When a requirement is stated as "we need strong consistency", the strong response is: "for which operation? Most of what people mean is read-your-writes and monotonic reads, which are session guarantees I can implement with sticky routing and a write token — nothing like the cost of linearizability."',
            ],
          },
        ],
      },
      {
        id: 'causal',
        heading: 'Causal consistency: the sweet spot for social systems',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Causal consistency guarantees that if operation A **happened before** B — same client in sequence, or B read the result of A — then every node applies A before B. Genuinely concurrent operations may be applied in different orders on different nodes, and that is fine because nobody can tell.',
              'It is dramatically cheaper than linearizability because it requires no global agreement, only tracking of dependencies. And it eliminates the anomalies users actually notice: a reply appearing before its message, a photo tagged before it is visible, a "deleted" comment reappearing under an edit.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Linearizable read (quorum, 3 nodes)', value: '~3–5 ms' },
              { label: 'Linearizable read, cross-region', value: '~150 ms' },
              { label: 'Causal read (local + dependency check)', value: '~1–2 ms' },
              { label: 'Session read (pinned replica)', value: '~1 ms' },
              { label: 'Eventual read (any replica)', value: '~1 ms' },
              { label: 'Metadata overhead for causality', value: 'a version vector per key' },
            ],
            result: 'Causal gets most of the user-visible correctness at near-eventual cost.',
          },
          {
            kind: 'prose',
            body: [
              'The cost is bookkeeping: each write carries the versions it depends on, and a replica must delay applying a write until its dependencies have arrived. That metadata grows with the number of writers, which is why practical systems bound it — tracking causality per session or per partition rather than globally.',
            ],
          },
        ],
      },
      {
        id: 'choosing',
        heading: 'Choosing per operation, not per system',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A single application almost always needs different models for different operations, and modern datastores expose this per query rather than per database.',
            ],
          },
          {
            kind: 'table',
            columns: ['Operation', 'Model needed', 'Why'],
            rows: [
              ['Account balance before a transfer', 'Linearizable', 'A stale read permits an overdraft'],
              ['Inventory decrement at checkout', 'Linearizable', 'Overselling has real cost'],
              ['Username availability', 'Linearizable', 'A global uniqueness invariant'],
              ['User edits their own profile', 'Session (RYW)', 'They must see their change; others can lag'],
              ['Comment thread', 'Causal', 'Replies must not precede their parent'],
              ['Follower count', 'Eventual', 'Nobody notices a few seconds'],
              ['Analytics dashboard', 'Eventual', 'Minutes of lag are acceptable'],
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Applying one model everywhere is the actual mistake',
            body: [
              'Choosing linearizable globally makes every read pay coordination it does not need, and cross-region it makes the product feel broken. Choosing eventual globally produces the disappearing-edit bug users report constantly. Neither is a defensible default — the model belongs to the operation.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Linearizability for reads that no invariant depends on — you pay coordination on your highest-volume path for nothing.',
      'Eventual consistency on a user\'s own data without session guarantees; the disappearing-edit bug is guaranteed.',
      'Global causal tracking in a large system — the metadata grows unboundedly; scope it per session or partition.',
      'Session pinning where a replica may become badly lagged; combine it with a lag threshold that ejects the replica.',
    ],
    failureModes: [
      {
        name: 'Disappearing edit',
        symptom: 'A user saves a change, refreshes, and sees the old value.',
        cause: 'Read routed to a replica that has not applied the user\'s write.',
        fix: 'Read-your-writes: primary affinity briefly after writes, or wait-for-position reads.',
      },
      {
        name: 'Time-travelling reads',
        symptom: 'Content appears, disappears, then reappears across refreshes.',
        cause: 'Successive reads hitting replicas with different lag.',
        fix: 'Pin the session to one replica for monotonic reads.',
      },
      {
        name: 'Reply before message',
        symptom: 'A comment thread shows a response to something not yet visible.',
        cause: 'No causal ordering between related writes on different replicas.',
        fix: 'Carry dependency versions and delay application until dependencies arrive, or co-locate the thread.',
      },
      {
        name: 'Coordination on every read',
        symptom: 'Read latency dominated by quorum round trips, worse cross-region.',
        cause: 'Linearizability applied globally rather than to the operations that need it.',
        fix: 'Classify operations; reserve linearizable reads for genuine invariants.',
      },
    ],
    interview: [
      {
        q: 'Do you need strong consistency for this feature?',
        a: [
          'I would ask which anomaly is unacceptable rather than answering yes or no. Linearizability is only required when a global invariant must hold at every instant — a balance that cannot go negative, unique usernames, a lock.',
          'Most requirements described as strong consistency turn out to be read-your-writes and monotonic reads: the user must see their own change, and must never see data go backwards. Those are session guarantees I can get with sticky routing or a write-position token, at a tiny fraction of the cost.',
          'For social features, causal consistency is usually the right level — it prevents a reply appearing before its parent without any global agreement.',
        ],
        followUps: ['How would you implement read-your-writes across regions?'],
      },
      {
        q: 'What is the difference between linearizable and sequential consistency?',
        a: [
          'Both require every node to agree on an order of operations. Linearizability additionally requires that order to respect real time — if a write completes before another begins, every read must reflect it.',
          'Sequential consistency allows the agreed order to differ from wall-clock order, as long as everyone sees the same one. That is cheaper because reads need not coordinate, but it means an operation that finished earlier can appear later.',
          'The practical consequence is that linearizability forces coordination on reads, which is where most of the cost lives.',
        ],
      },
      {
        q: 'What is causal consistency and why is it enough for a social feed?',
        a: [
          'It guarantees that operations with a cause-and-effect relationship are applied in that order everywhere — a reply after its post, an edit after the creation — while genuinely concurrent operations may be ordered differently on different replicas.',
          'That matches how users perceive correctness. Nobody can detect that two unrelated posts were applied in different orders on different replicas, but everybody notices a reply to a message they cannot see.',
          'And it requires no global agreement, only dependency tracking, so reads stay local and fast — which is why it is the practical sweet spot for social and collaborative systems.',
        ],
      },
    ],
    references: [
      { label: 'Jepsen — Consistency models', href: 'https://jepsen.io/consistency' },
      { label: 'Terry et al. — Session Guarantees for Weakly Consistent Replicated Data', href: 'https://www.cs.cmu.edu/~15-749/READINGS/optional/terry94.pdf' },
    ],
  },
}

// ── 4. Conflict resolution ───────────────────────────────────────────────────

const conflicts: Lesson = {
  slug: 'cap-conflict-resolution',
  title: 'Conflict Resolution & CRDTs',
  summary: 'Two writers, one row, no coordination — last-write-wins silently deletes data.',
  group: 'scaling-patterns',
  topic: 'CAP Theorem',
  tier: 'pro',
  minutes: 8,
  concept: 'Concept',
  tags: [
    { label: 'Detect', value: 'Version vectors' },
    { label: 'Avoid', value: 'Last-write-wins' },
    { label: 'Design', value: 'Commutative types' },
  ],
  notes: [
    'Last-write-wins needs synchronised clocks you do not have, and discards a real user\'s work silently.',
    'Version vectors distinguish "newer than" from "concurrent with", which is what makes safe merging possible.',
    'CRDTs make conflicts impossible by construction — the operations commute, so order stops mattering.',
  ],
  scene: {
    code: [
      '# LWW: whoever has the later clock wins',
      'if incoming.ts > current.ts: overwrite()',
      '',
      '# version vector: detect concurrency',
      'if vv_a > vv_b:      keep a',
      'elif vv_b > vv_a:    keep b',
      'else:                merge(a, b)   # concurrent',
      '',
      '# CRDT set: union, always converges',
      'merged = a.union(b) - tombstones',
    ],
    initialState: { strategy: 'LWW', 'items lost': 0, cart: '{book}', converged: 'yes' },
    nodes: [
      { id: 'phone', kind: 'client', label: 'Phone (EU)', x: 10, y: 26 },
      { id: 'laptop', kind: 'client', label: 'Laptop (US)', x: 10, y: 74 },
      { id: 'eu', kind: 'database', label: 'EU replica', x: 48, y: 26, badge: '{book}' },
      { id: 'us', kind: 'database', label: 'US replica', x: 48, y: 74, badge: '{book}' },
      { id: 'merged', kind: 'database', label: 'After healing', x: 86, y: 50, badge: '—' },
    ],
    edges: [
      { id: 'p-eu', from: 'phone', to: 'eu' },
      { id: 'l-us', from: 'laptop', to: 'us' },
      { id: 'eu-m', from: 'eu', to: 'merged', curve: -0.25 },
      { id: 'us-m', from: 'us', to: 'merged', curve: 0.25 },
    ],
    steps: [
      { id: '1', caption: 'A partition splits the regions. Both replicas hold a cart containing one book.', patches: [{ nodeId: 'eu', badge: '{book}' }, { nodeId: 'us', badge: '{book}', highlight: true }], state: { cart: '{book}' } },
      { id: '2', caption: 'On her phone, the user adds a lamp. The EU replica accepts it.', travel: 'p-eu', token: 'write', patches: [{ nodeId: 'eu', badge: '{book, lamp}', highlight: true }] },
      { id: '3', caption: 'On her laptop, she adds a chair. The US replica accepts that. Neither knows about the other.', travel: 'l-us', token: 'write', patches: [{ nodeId: 'us', badge: '{book, chair}', highlight: true }] },
      { id: '4', caption: 'The partition heals. Last-write-wins compares timestamps and keeps one whole value.', travel: 'us-m', token: 'write', codeLine: 2, patches: [{ nodeId: 'merged', badge: '{book, chair}', highlight: true }], state: { strategy: 'LWW', 'items lost': 1, cart: '{book, chair}' } },
      { id: '5', caption: 'The lamp is gone. No error, no warning — the user simply finds it missing at checkout.', patches: [{ nodeId: 'merged', badge: 'lamp lost ✗', highlight: true }] },
      { id: '6', caption: 'Version vectors detect that the two writes were concurrent, not ordered — so neither may overwrite.', codeLine: 6, patches: [{ nodeId: 'merged', badge: 'concurrent!', highlight: true }], state: { strategy: 'version vector' } },
      { id: '7', caption: 'Model the cart as a CRDT set and the merge is a union. Both items survive, always.', travel: 'eu-m', token: 'hit', codeLine: 9, patches: [{ nodeId: 'merged', badge: '{book, lamp, chair} ✓', highlight: true }], state: { strategy: 'CRDT', 'items lost': 0, cart: '{book, lamp, chair}', converged: 'yes' } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'Choosing availability during a partition means accepting writes on both sides. That is only half a decision — the other half is what happens when the partition heals and two divergent histories must become one.',
      'Most systems answer this by accident, with a default of last-write-wins, and then quietly lose customer data for years. Conflict resolution deserves to be a deliberate design step in any AP system.',
    ],
    sections: [
      {
        id: 'lww',
        heading: 'Why last-write-wins is worse than it sounds',
        blocks: [
          {
            kind: 'prose',
            body: [
              'LWW compares timestamps and keeps the later value. It is simple, requires no metadata beyond a clock, and converges — every replica reaches the same answer. It also has two failure modes serious enough to disqualify it for most data.',
              'First, it depends on **synchronised clocks**. Physical clocks on different machines drift by milliseconds to seconds even with NTP, so "later" can be wrong. A write that genuinely happened second can lose to one that happened first because that machine\'s clock ran fast.',
              'Second, and more fundamentally: it discards a **whole value**. The two writes were not competing for the same field — one added a lamp, the other a chair — but LWW throws away one user\'s entire update because it can only choose between complete versions.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Typical NTP sync accuracy', value: '~1–50 ms' },
              { label: 'Clock drift without NTP', value: '~1 s/day' },
              { label: 'Cross-region replication delay', value: '~100 ms' },
              { label: 'Window where LWW can invert order', value: 'up to clock skew' },
              { label: 'Data loss signal to the user', value: 'none' },
            ],
            result: 'LWW is silent, order-inverting data loss whose rate you cannot measure.',
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Cassandra defaults to LWW, and people forget',
            body: [
              'Cassandra resolves conflicts by cell timestamp, so concurrent updates to different columns of the same row do merge per column — but concurrent updates to the *same* column silently drop one. Teams discover this when a customer insists they saved something that is not there, and there is no log entry to disagree with them.',
            ],
          },
        ],
      },
      {
        id: 'vectors',
        heading: 'Version vectors: telling "newer" from "concurrent"',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The prerequisite for safe merging is being able to distinguish two situations that a timestamp cannot: **B happened after A** (so B supersedes it) versus **A and B happened concurrently** (so neither may overwrite the other).',
              'A version vector gives each replica a counter, and a value carries the vector it was written with. Comparing two vectors yields one of three answers — A dominates, B dominates, or they are concurrent — and only the third case is a real conflict.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'version_vector.py — three-way comparison, then merge',
            lines: [
              'def compare(a, b):',
              '    """Returns "a", "b", or "concurrent"."""',
              '    a_greater = any(a.get(n, 0) > b.get(n, 0) for n in a | b)',
              '    b_greater = any(b.get(n, 0) > a.get(n, 0) for n in a | b)',
              '',
              '    if a_greater and not b_greater: return "a"          # a supersedes b',
              '    if b_greater and not a_greater: return "b"          # b supersedes a',
              '    return "concurrent"                                 # a real conflict',
              '',
              'def write(replica_id, value, vv):',
              '    vv = dict(vv)',
              '    vv[replica_id] = vv.get(replica_id, 0) + 1          # bump own counter',
              '    return Version(value, vv)',
              '',
              'def resolve(a, b, merge_fn):',
              '    result = compare(a.vv, b.vv)',
              '    if result == "a": return a',
              '    if result == "b": return b',
              '    return merge_fn(a, b)      # semantic merge — the only safe option',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Detection is not resolution.** Version vectors tell you a conflict exists; something still has to decide what the merged value means.',
              '**Siblings push the decision upward.** Dynamo-style stores can return both versions and let the application (or the user) merge — correct, but every read path must handle it.',
              '**Vectors grow with writers.** One entry per replica is fine; one per client is not. Bound the size by pruning or by tracking per replica rather than per actor.',
              '**Deletes need tombstones.** Removing a value must be represented explicitly, or a concurrent write will resurrect it. Tombstones then need their own expiry policy.',
            ],
          },
        ],
      },
      {
        id: 'crdts',
        heading: 'CRDTs: making conflicts impossible',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The most elegant answer is to design data types whose operations **commute**, so applying them in any order produces the same result. Then there is no conflict to resolve — replicas converge automatically, and merging is a mathematical property rather than a business decision.',
              'A CRDT must supply a merge function that is commutative, associative and idempotent. Those three properties are exactly what makes concurrent application, duplicate delivery and reordering all harmless.',
            ],
          },
          {
            kind: 'table',
            columns: ['CRDT', 'Merge rule', 'Use for', 'Limitation'],
            rows: [
              ['G-Counter', 'Per-replica counts, summed', 'Views, likes', 'Increment only'],
              ['PN-Counter', 'Two G-Counters, subtracted', 'Votes, inventory deltas', 'Can go negative'],
              ['G-Set', 'Union', 'Append-only collections', 'No removal'],
              ['OR-Set', 'Union with unique tags per add', 'Shopping carts, tags', 'Tombstone growth'],
              ['LWW-Register', 'Latest timestamp', 'Single scalar fields', 'Same clock problem'],
              ['RGA / sequence', 'Position identifiers', 'Collaborative text', 'Complex; metadata heavy'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'The **OR-Set** is worth understanding as the practical shopping-cart type: each add attaches a unique tag, and a remove deletes only the tags it observed. So an add concurrent with a remove survives — which matches the intuition that a deliberate add should not be erased by a remove that never saw it.',
              'The cost of CRDTs is metadata. An OR-Set carries tags for every add and tombstones for every remove, and those must be garbage-collected carefully or the structure grows without bound. Collaborative text CRDTs can carry more metadata than text.',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Reshape the operation, not just the merge',
            body: [
              'The most valuable trick is not implementing a CRDT library — it is noticing that `set balance = 90` is unmergeable while `decrement balance by 10` commutes. Modelling writes as **operations rather than states** turns many "conflicts" into arithmetic that needs no resolution at all.',
            ],
          },
        ],
      },
      {
        id: 'choosing',
        heading: 'Choosing a strategy per data type',
        blocks: [
          {
            kind: 'table',
            columns: ['Data', 'Strategy', 'Why'],
            rows: [
              ['Shopping cart', 'OR-Set union', 'Adds should never be lost; removes are explicit'],
              ['View counter', 'G-Counter', 'Commutative by nature'],
              ['User profile fields', 'Per-field LWW', 'Independent fields rarely conflict genuinely'],
              ['Document text', 'Sequence CRDT or OT', 'Character-level merging is the product'],
              ['Account balance', 'Do not replicate — single writer', 'No merge is correct; use consensus'],
              ['Inventory count', 'Single writer, or reservations', 'Overselling is not recoverable by merging'],
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Name what LWW costs before proposing it',
            body: [
              '"Last-write-wins converges, but it depends on synchronised clocks and it silently discards an entire concurrent update — so for a cart I would use an OR-Set where the merge is a union, and for a balance I would not replicate writes at all." That sequence shows you know why the easy answer is dangerous.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'LWW for user-authored content or collections — it destroys work with no signal.',
      'CRDTs for data with hard invariants like balances or stock; convergence is not the same as correctness.',
      'Exposing siblings to users unless the product genuinely benefits from a merge UI.',
      'Unbounded version vectors or tombstones without a garbage-collection policy.',
    ],
    failureModes: [
      {
        name: 'Silent update loss',
        symptom: 'Users insist they saved something that is not there.',
        cause: 'LWW discarded a concurrent write whose clock read earlier.',
        fix: 'Version vectors to detect concurrency, plus a semantic merge or CRDT for that data type.',
      },
      {
        name: 'Resurrected deletes',
        symptom: 'A removed item reappears after replicas sync.',
        cause: 'Delete represented as absence, so a concurrent write reintroduces the value.',
        fix: 'Explicit tombstones with a defined expiry longer than the maximum partition duration.',
      },
      {
        name: 'Metadata growth',
        symptom: 'A small logical value occupies megabytes.',
        cause: 'CRDT tags and tombstones accumulating without garbage collection.',
        fix: 'Bound actors, compact tombstones once causally stable, and prune version vectors.',
      },
      {
        name: 'Convergent but wrong',
        symptom: 'All replicas agree on a value that violates a business rule.',
        cause: 'CRDT merge applied to data with an invariant, such as non-negative stock.',
        fix: 'Use consensus or a single writer for invariant-bearing data; CRDTs guarantee convergence, not correctness.',
      },
    ],
    interview: [
      {
        q: 'Two regions accept a write to the same row during a partition. What happens when it heals?',
        a: [
          'Something has to reconcile two divergent histories, and the default in most systems is last-write-wins by timestamp. That converges but has two real problems: it depends on clocks synchronised across machines, which drift, so "later" can be wrong; and it discards an entire concurrent update rather than merging the parts that actually differ.',
          'A better foundation is version vectors, which distinguish "B supersedes A" from "A and B were concurrent". Only the concurrent case is a genuine conflict, and it needs a semantic merge.',
          'Best of all, where the data allows it, I would use a type whose operations commute — then there is no conflict to resolve at all.',
        ],
        followUps: ['What would you use for a shopping cart specifically?'],
      },
      {
        q: 'What is a CRDT and when would you use one?',
        a: [
          'A data type whose merge function is commutative, associative and idempotent, so replicas converge regardless of the order operations arrive in and duplicates are harmless.',
          'For a shopping cart I would use an OR-Set: each add carries a unique tag and a remove deletes only the tags it observed, so a concurrent add survives a remove that never saw it — which matches what a user would expect.',
          'The cost is metadata: tags and tombstones accumulate and need garbage collection, and for something like collaborative text the metadata can exceed the content.',
        ],
      },
      {
        q: 'Would you use a CRDT for an account balance?',
        a: [
          'No. CRDTs guarantee convergence, not correctness against an invariant. A PN-Counter will happily converge to a negative balance because nothing in the merge rule knows that overdrafts are forbidden.',
          'For anything with a hard invariant — balances, inventory, seat allocation — I would use a single writer or consensus so there is one authority ordering the operations, and accept the availability cost during a partition.',
          'The useful reframing is that CRDTs solve merging, and invariants are not a merging problem.',
        ],
      },
    ],
    references: [
      { label: 'Shapiro et al. — A comprehensive study of CRDTs', href: 'https://inria.hal.science/inria-00555588/document' },
      { label: 'Riak — Conflict resolution and siblings', href: 'https://docs.riak.com/riak/kv/latest/developing/usage/conflict-resolution/index.html' },
    ],
  },
}

export const capTopic: Lesson[] = [capTheorem, quorums, consistencyModels, conflicts]
