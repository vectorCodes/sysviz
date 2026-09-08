import type { Lesson } from '../types'

/** Topic: Message Queue (group: building-blocks). */

const messageQueue: Lesson = {
  slug: 'message-queue',
  title: 'Producer–Consumer Queue',
  summary: 'Decouple producers from consumers so spikes don\'t topple the system.',
  group: 'building-blocks',
  topic: 'Message Queue',
  tier: 'free',
  minutes: 7,
  concept: 'Concept',
  tags: [
    { label: 'Pattern', value: 'Async / Decouple' },
    { label: 'Delivery', value: 'At-least-once' },
    { label: 'Scalability', value: 'Horizontal workers' },
  ],
  notes: [
    'Producers append messages; consumers process them at their own pace.',
    'A traffic spike fills the queue instead of overwhelming the worker.',
    'The backlog drains once load subsides — work is never lost.',
  ],
  scene: {
    code: [
      'producer:  queue.push(job)',
      'consumer:  while true:',
      '    job = queue.pop()      # blocks if empty',
      '    process(job)',
      '    ack(job)',
    ],
    initialState: { depth: 0, processed: 0, 'consumer rate': '1/s' },
    nodes: [
      { id: 'prod', kind: 'server', label: 'Producer', x: 12, y: 50 },
      { id: 'queue', kind: 'queue', label: 'Queue', x: 48, y: 50, badge: '0 jobs' },
      { id: 'cons', kind: 'server', label: 'Consumer', x: 86, y: 50 },
    ],
    edges: [
      { id: 'p-q', from: 'prod', to: 'queue' },
      { id: 'q-c', from: 'queue', to: 'cons' },
    ],
    steps: [
      { id: '1', caption: 'The producer pushes a job onto the queue.', travel: 'p-q', token: 'write', codeLine: 1, patches: [{ nodeId: 'queue', badge: '1 job', highlight: true }], state: { depth: 1 } },
      { id: '2', caption: 'A traffic spike — many jobs arrive at once. The queue absorbs them.', travel: 'p-q', token: 'write', codeLine: 1, patches: [{ nodeId: 'queue', badge: '5 jobs', highlight: true }], state: { depth: 5 } },
      { id: '3', caption: 'The consumer pulls one job and processes it at its own steady rate.', travel: 'q-c', token: 'request', codeLine: 3, patches: [{ nodeId: 'queue', badge: '4 jobs' }], state: { depth: 4, processed: 1 } },
      { id: '4', caption: 'It acks the job; the queue depth drops. The worker is never overwhelmed.', codeLine: 5, patches: [{ nodeId: 'cons', badge: 'ack ✓', highlight: true }], state: { processed: 2 } },
      { id: '5', caption: 'As the spike passes, the backlog drains to empty — no work lost.', travel: 'q-c', token: 'request', codeLine: 3, patches: [{ nodeId: 'queue', badge: '0 jobs', highlight: true }], state: { depth: 0, processed: 5 } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'A queue does one structural thing: it **decouples the rate at which work arrives from the rate at which it is done**. Everything else people like about queues — resilience, retries, buffering, fan-out — follows from that single property.',
      'The cost is that the operation is no longer synchronous, so the caller learns nothing about the outcome. Half of designing with queues is deciding what the user sees while the work is still pending.',
    ],
    sections: [
      {
        id: 'why',
        heading: 'What decoupling actually buys',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Absorb bursts.** Traffic that arrives at 10,000/s can be processed at 500/s; the queue holds the difference instead of the request path collapsing.',
              '**Fail independently.** If the email provider is down, orders still complete — the messages wait rather than the checkout failing.',
              '**Scale consumers separately.** The producing tier and the processing tier have unrelated capacity needs and can grow independently.',
              '**Retry safely.** A durable queue is a place a failed attempt can live until it succeeds, with no client holding a connection.',
              '**Smooth expensive work.** Video encoding, PDF generation, bulk imports — anything whose duration exceeds a request timeout.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Peak arrival rate', value: '10,000 /s' },
              { label: 'Consumer capacity', value: '500 /s' },
              { label: 'Burst duration', value: '60 s' },
              { label: 'Messages queued', value: '~570,000' },
              { label: 'Drain time after the burst', value: '~19 min', note: 'at 500/s' },
              { label: 'Consumers needed to drain in 2 min', value: '~10×' },
            ],
            result: 'A queue converts an overload into a latency budget you can choose to pay or scale away.',
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'The queue does not create capacity',
            body: [
              'It only reschedules work. If the *average* arrival rate exceeds consumer throughput, the queue grows without bound and you have converted a fast failure into a slow one. Queues absorb **bursts**, not sustained overload — and that distinction is what queue-depth alerting exists to detect.',
            ],
          },
        ],
      },
      {
        id: 'semantics',
        heading: 'Delivery semantics: what the broker promises',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Every queue conversation eventually reaches "exactly once", and the honest answer is that it does not exist as a delivery guarantee. The broker cannot know whether a consumer that stopped responding processed the message or died before it.',
            ],
          },
          {
            kind: 'table',
            columns: ['Semantic', 'How it happens', 'Risk', 'Used for'],
            rows: [
              ['At-most-once', 'Acknowledge before processing', 'Message loss on crash', 'Metrics, telemetry, anything replaceable'],
              ['At-least-once', 'Acknowledge after processing', 'Duplicates on retry', 'Almost everything — the default'],
              ['Effectively-once', 'At-least-once + idempotent consumer', 'None, if dedup is correct', 'Payments, orders, anything with side effects'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'So the real design decision is not which semantic to request from the broker, but **how the consumer deduplicates**. The two workable strategies are a natural idempotency key (an order id you upsert on) or a processed-message table keyed by message id, checked and written in the same transaction as the effect.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'consumer.py — at-least-once delivery, effectively-once processing',
            lines: [
              'def handle(message):',
              '    with db.transaction():',
              '        # Dedup and side effect commit together, or neither does.',
              '        inserted = db.execute(',
              '            "INSERT INTO processed_messages (id) VALUES (%s) "',
              '            "ON CONFLICT DO NOTHING RETURNING id", message.id)',
              '        if not inserted:',
              '            return ack(message)            # already handled; ack and move on',
              '',
              '        apply_effect(message.payload)      # the actual work',
              '',
              '    ack(message)   # only after commit — a crash before this redelivers',
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Acknowledge after the effect commits, never before',
            body: [
              'Acking first is how messages silently disappear: the consumer crashes mid-work, the broker considers the message delivered, and nothing retries it. The ordering is always process, commit, then ack — and accept that a crash between commit and ack causes a duplicate, which is what the dedup table is for.',
            ],
          },
        ],
      },
      {
        id: 'failure',
        heading: 'Poison messages and dead letter queues',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A message that always fails — malformed payload, a referenced row that was deleted, a bug — will be redelivered forever. Without a bound it blocks the partition (in ordered systems) or burns consumer capacity indefinitely, and it fills your logs with the same stack trace.',
              'A **dead letter queue** is the bound: after N delivery attempts, the broker moves the message aside. The main flow keeps running, and the DLQ becomes a work list a human can inspect, fix and replay.',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Set maxReceiveCount deliberately** — typically 3 to 5. Enough to survive transient failures, few enough that a genuinely broken message leaves quickly.',
              '**Alert on DLQ depth, not just size.** Any non-zero DLQ deserves attention; a growing one is an incident.',
              '**Store the failure reason** alongside the message. A DLQ of payloads with no error context is nearly useless during an incident.',
              '**Make replay a first-class tool.** Redriving a fixed batch back into the main queue should be a routine operation, not a hand-written script written under pressure.',
              '**Distinguish retryable from terminal.** A validation error should go to the DLQ on the first attempt; a network timeout deserves its retries.',
            ],
          },
        ],
      },
      {
        id: 'visibility',
        heading: 'Visibility timeouts and the duplicate you will get anyway',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Most brokers do not remove a message when it is delivered — they hide it for a **visibility timeout**. If the consumer acks within that window it is deleted; if not, it reappears for someone else. This is what makes a crashed consumer recoverable.',
              'The failure mode is a job that takes longer than the timeout: the message reappears while the first consumer is still working, a second consumer picks it up, and now the work runs twice concurrently. The fixes are to set the timeout above the p99 processing time, extend it with a heartbeat for long jobs, or split long work into smaller messages.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Visibility timeout', value: '30 s' },
              { label: 'p50 processing time', value: '2 s' },
              { label: 'p99 processing time', value: '45 s', note: 'exceeds the timeout' },
              { label: 'Fraction processed twice', value: '~1%' },
              { label: 'At 1 M messages/day', value: '~10,000 duplicates' },
            ],
            result: 'Set the visibility timeout from p99, not from the median.',
          },
        ],
      },
    ],
    whenNotToUse: [
      'When the caller needs the result to continue — a queue turns a synchronous answer into a polling problem.',
      'For sustained load beyond consumer capacity; the queue only delays the failure and makes it harder to see.',
      'When strict global ordering is required across all messages — that forces a single partition and caps throughput at one consumer.',
      'For trivial work where the operational cost of a broker exceeds the cost of just doing it inline.',
    ],
    failureModes: [
      {
        name: 'Unbounded queue growth',
        symptom: 'Consumer lag rises steadily; processing falls hours behind.',
        cause: 'Average arrival rate exceeds consumer throughput — the queue is not absorbing a burst, it is hiding a deficit.',
        fix: 'Autoscale consumers on oldest-message age, and shed or throttle producers when lag exceeds a threshold.',
      },
      {
        name: 'Poison message loop',
        symptom: 'The same message fails thousands of times; logs full of one stack trace.',
        cause: 'No delivery-attempt limit and no dead letter queue.',
        fix: 'Set maxReceiveCount, route to a DLQ with the error attached, and alert on DLQ depth.',
      },
      {
        name: 'Concurrent duplicate processing',
        symptom: 'Occasional double side effects with no crash involved.',
        cause: 'Processing time exceeds the visibility timeout, so the message is redelivered while still in progress.',
        fix: 'Raise the timeout above p99, heartbeat to extend it, or split the work into smaller units.',
      },
      {
        name: 'Silent message loss',
        symptom: 'Work vanishes with no error anywhere.',
        cause: 'Acknowledging before processing, or a non-durable queue losing messages on broker restart.',
        fix: 'Ack after commit; enable durability and replication on the broker.',
      },
    ],
    interview: [
      {
        q: 'Why put a queue between two services?',
        a: [
          'To decouple arrival rate from processing rate. The producer completes immediately regardless of how slow or unavailable the consumer is, so a downstream failure becomes a delay instead of an error the user sees.',
          'It also lets the two sides scale independently, absorbs bursts that the synchronous path could not, and gives retries somewhere durable to live.',
          'The cost is that the caller no longer learns the outcome, so I would design what the user sees while the work is pending — an optimistic UI, a status endpoint, or a notification on completion.',
        ],
        followUps: ['What happens if the consumer is permanently slower than the producer?'],
      },
      {
        q: 'How do you achieve exactly-once processing?',
        a: [
          'You do not get it from the broker — the broker cannot distinguish a consumer that processed and died from one that died before processing, so it must choose between possible loss and possible duplication.',
          'What works is at-least-once delivery plus an idempotent consumer: dedupe on a natural key, or record processed message ids in the same transaction as the side effect, so the effect and the dedup marker commit atomically.',
          'Then acknowledge only after that transaction commits. A crash between commit and ack causes a redelivery that the dedup check absorbs.',
        ],
      },
      {
        q: 'A message keeps failing. What should happen?',
        a: [
          'It should be retried a small number of times with backoff, then moved to a dead letter queue with the failure reason attached, so it stops consuming capacity and stops blocking anything behind it.',
          'The DLQ then needs to be operationally real: alerting on depth, enough context to diagnose, and a redrive path to replay messages once the bug is fixed. I would also separate terminal failures like validation errors, which should go straight to the DLQ rather than retrying.',
        ],
      },
    ],
    references: [
      { label: 'AWS — SQS visibility timeout and dead letter queues', href: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html' },
      { label: 'Enterprise Integration Patterns — Message Channel', href: 'https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageChannel.html' },
    ],
  },
}

const mqFanout: Lesson = {
  slug: 'message-queue-fanout',
  title: 'Fan-out / Pub-Sub Pattern',
  summary: 'One event, many consumers — publish once, every subscriber gets a copy.',
  group: 'building-blocks',
  topic: 'Message Queue',
  tier: 'free',
  minutes: 7,
  concept: 'Concept',
  tags: [
    { label: 'Pattern', value: 'Pub-Sub / Fan-out' },
    { label: 'Coupling', value: 'Loose' },
    { label: 'Delivery', value: 'At-least-once' },
  ],
  notes: [
    'A publisher sends one message to a topic. Every subscribed queue gets a copy.',
    'Services are fully decoupled — the publisher doesn\'t know how many consumers exist.',
    'Used everywhere: photo upload triggers email, thumbnail generation, and analytics independently.',
  ],
  scene: {
    code: [
      'topic.publish("photo-upload", { user_id, photo_id })',
      '',
      '# each subscriber receives its own copy:',
      'email_queue.subscribe(topic)',
      'thumb_queue.subscribe(topic)',
      'analytics_queue.subscribe(topic)',
    ],
    initialState: { 'event type': '—', consumers: 3 },
    nodes: [
      { id: 'pub', kind: 'client', label: 'Publisher', x: 10, y: 50 },
      { id: 'topic', kind: 'queue', label: 'Topic', x: 34, y: 50, badge: 'photo-upload' },
      { id: 'q1', kind: 'queue', label: 'Email Queue', x: 60, y: 20 },
      { id: 'q2', kind: 'queue', label: 'Thumb Queue', x: 60, y: 50 },
      { id: 'q3', kind: 'queue', label: 'Analytics Q', x: 60, y: 80 },
      { id: 'svc1', kind: 'server', label: 'Email Svc', x: 88, y: 20 },
      { id: 'svc2', kind: 'server', label: 'Thumb Svc', x: 88, y: 50 },
      { id: 'svc3', kind: 'server', label: 'Analytics', x: 88, y: 80 },
    ],
    edges: [
      { id: 'pub-topic', from: 'pub', to: 'topic' },
      { id: 'topic-q1', from: 'topic', to: 'q1', curve: -0.2 },
      { id: 'topic-q2', from: 'topic', to: 'q2' },
      { id: 'topic-q3', from: 'topic', to: 'q3', curve: 0.2 },
      { id: 'q1-svc1', from: 'q1', to: 'svc1' },
      { id: 'q2-svc2', from: 'q2', to: 'svc2' },
      { id: 'q3-svc3', from: 'q3', to: 'svc3' },
    ],
    steps: [
      { id: '1', caption: 'User uploads a photo. Publisher emits one event to the topic.', travel: 'pub-topic', token: 'write', codeLine: 1, patches: [{ nodeId: 'topic', badge: '1 msg', highlight: true }], state: { 'event type': 'photo-upload' } },
      { id: '2', caption: 'Topic fans the event out to the Email Queue.', travel: 'topic-q1', token: 'write', codeLine: 4, patches: [{ nodeId: 'q1', badge: '1 msg', highlight: true }] },
      { id: '3', caption: 'Same event goes to the Thumbnail Queue.', travel: 'topic-q2', token: 'write', codeLine: 5, patches: [{ nodeId: 'q2', badge: '1 msg', highlight: true }] },
      { id: '4', caption: 'And the Analytics Queue. Publisher doesn\'t know how many consumers exist.', travel: 'topic-q3', token: 'write', codeLine: 6, patches: [{ nodeId: 'q3', badge: '1 msg', highlight: true }] },
      { id: '5', caption: 'Email Service sends a confirmation email.', travel: 'q1-svc1', token: 'request', patches: [{ nodeId: 'svc1', badge: 'email sent ✓', highlight: true }] },
      { id: '6', caption: 'Thumbnail Service generates a resized image — completely independent.', travel: 'q2-svc2', token: 'request', patches: [{ nodeId: 'svc2', badge: 'thumb done ✓', highlight: true }] },
      { id: '7', caption: 'Analytics records the upload. All 3 run in parallel, at their own pace.', travel: 'q3-svc3', token: 'request', patches: [{ nodeId: 'svc3', badge: 'logged ✓', highlight: true }], state: { 'event type': 'photo-upload', consumers: 3 } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'Point-to-point queues deliver each message to exactly one consumer. **Publish/subscribe** delivers every message to every interested subscriber, which turns a message from an instruction into an announcement — and that shift is what makes event-driven architecture possible.',
      'The architectural payoff is that a publisher stops knowing who cares. Adding a fifth consumer of `OrderPlaced` requires no change to the ordering service, which is precisely the coupling that synchronous calls create and pub/sub removes.',
    ],
    sections: [
      {
        id: 'model',
        heading: 'Queue vs topic, and why the difference matters',
        blocks: [
          {
            kind: 'table',
            columns: ['', 'Queue (point-to-point)', 'Topic (pub/sub)'],
            rows: [
              ['Delivery', 'One consumer gets each message', 'Every subscriber gets a copy'],
              ['Adding a consumer', 'Increases parallelism', 'Adds a new copy of the stream'],
              ['Coupling', 'Producer knows the work is for someone', 'Producer knows nothing about consumers'],
              ['Message meaning', 'A command: "send this email"', 'An event: "an order was placed"'],
              ['Retry scope', 'Per message', 'Per subscriber, independently'],
              ['Typical systems', 'SQS, RabbitMQ queues', 'SNS, Kafka topics, Pub/Sub'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'The most useful discipline that comes with pub/sub is naming. A **command** is imperative and has exactly one correct handler (`SendWelcomeEmail`); an **event** is a past-tense fact with any number of interested parties (`UserRegistered`). Publishing commands to a topic and calling them events is how teams end up with implicit coupling that nobody documented.',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Consumer groups give you both at once',
            body: [
              'Kafka-style systems combine the models: each **consumer group** receives every message (pub/sub across groups), while within a group each message goes to one member (queue semantics for parallelism). That is why one topic can feed the email service, the analytics pipeline and the search indexer independently, each scaling to as many workers as it needs.',
            ],
          },
        ],
      },
      {
        id: 'independence',
        heading: 'Independent failure is the whole point',
        blocks: [
          {
            kind: 'prose',
            body: [
              'In a synchronous fan-out, the ordering service calls email, analytics and inventory in turn. Its availability is the product of theirs, and its latency is the sum — so a slow analytics service makes checkout slow, and a broken one makes checkout fail.',
              'With pub/sub, each subscriber has its own subscription, its own retry state and its own dead letter queue. Analytics can be down for an hour and catch up afterwards; nobody else notices.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Availability per downstream service', value: '99.9%' },
              { label: 'Synchronous fan-out to 4 services', value: '99.6%', note: '0.999⁴' },
              { label: 'Downtime per month, synchronous', value: '~3.5 h' },
              { label: 'With pub/sub (publish only)', value: '99.9%', note: 'depends on the broker alone' },
              { label: 'Latency, synchronous (sum)', value: '~180 ms' },
              { label: 'Latency, pub/sub (publish)', value: '~5 ms' },
            ],
            result: 'Fan-out through a broker replaces multiplied availability with the broker’s own.',
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'You have concentrated risk, not removed it',
            body: [
              'The broker is now on the critical path of every publish. It needs replication, monitored disk, and a decision about what the producer does when it is unavailable — fail the request, buffer locally, or write to an outbox table and publish asynchronously. The outbox is usually the right answer when the event must not be lost.',
            ],
          },
        ],
      },
      {
        id: 'outbox',
        heading: 'The dual-write problem and the outbox pattern',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The most common correctness bug in event-driven systems: a service commits to its database and then publishes an event. Those are two systems and there is no shared transaction, so a crash in between leaves the database updated and the event never sent — an order that exists but that nobody downstream ever hears about.',
              'The **transactional outbox** fixes it by making the publish part of the same transaction: the event is inserted into an `outbox` table alongside the business write, and a separate relay reads that table and publishes. Now either both happen or neither does.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'outbox.py — atomic write plus event, published by a relay',
            lines: [
              'def place_order(order):',
              '    with db.transaction():',
              '        db.insert("orders", order)',
              '        db.insert("outbox", {                 # same transaction',
              '            "id": uuid4(),',
              '            "topic": "orders.placed",',
              '            "payload": serialize(order),',
              '            "created_at": now(),',
              '        })',
              '    # No publish here. If the process dies now, nothing is lost.',
              '',
              'def relay():                                   # separate worker or CDC',
              '    for row in db.query("SELECT * FROM outbox WHERE published_at IS NULL "',
              '                        "ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED"):',
              '        broker.publish(row.topic, row.payload, key=row.id)   # at-least-once',
              '        db.execute("UPDATE outbox SET published_at = now() WHERE id = %s", row.id)',
            ],
          },
          {
            kind: 'prose',
            body: [
              'The relay publishes at least once — it may crash after publishing and before marking the row — so subscribers still need to be idempotent. That is fine: at-least-once plus idempotent consumers is the standard contract, and the outbox guarantees the harder half, which is that the event is never *lost*.',
            ],
          },
        ],
      },
      {
        id: 'design',
        heading: 'Designing events you will not regret',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Past tense, business meaning.** `OrderPlaced`, not `UpdateInventory`. The name should survive changes to who consumes it.',
              '**Include enough to act on, and a version.** Consumers that must call back for every detail recreate the coupling you removed — but a fat event ages badly. Include the ids plus the fields most consumers need, and version the schema from day one.',
              '**Never break a schema in place.** Add optional fields; never rename or repurpose. Old consumers must keep working, because you cannot deploy them all at once.',
              '**Carry a message id and a timestamp.** Consumers need them for deduplication and for detecting out-of-order arrival.',
              '**Assume duplicates and reordering.** A subscriber that only works when messages arrive exactly once, in order, is a subscriber that works in staging.',
              '**Keep the topic granularity meaningful.** One topic per aggregate (`orders`, `users`) is usually right; a single `events` topic forces every consumer to filter everything.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'The question behind the question',
            body: [
              'When an interviewer asks about fan-out, they are usually probing whether you understand that the publisher must not know its subscribers. If your answer includes "then the order service calls the email service", the coupling never went away — the broker just moved it.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'When the publisher needs a result or a confirmation — that is a request, not an event.',
      'When exactly one handler must act and correctness depends on it; a queue with a single consumer group is clearer than a topic.',
      'For very high fan-out of large payloads — publish an id and let consumers fetch, rather than copying megabytes N times.',
      'When strict cross-entity ordering is required; per-partition ordering is all a topic gives you.',
    ],
    failureModes: [
      {
        name: 'Lost events from dual writes',
        symptom: 'Downstream systems are missing records that exist in the primary database.',
        cause: 'The database commit and the publish are separate operations; the process died in between.',
        fix: 'Transactional outbox, or change-data-capture from the database log.',
      },
      {
        name: 'One slow subscriber blocks a partition',
        symptom: 'Lag grows for one consumer group while others are fine.',
        cause: 'A single slow or failing handler holds up its partition; ordering prevents skipping ahead.',
        fix: 'Route failures to a DLQ quickly, increase partitions for parallelism, and isolate slow work into its own topic.',
      },
      {
        name: 'Schema change breaks consumers',
        symptom: 'Deserialisation errors across several services after a producer deploy.',
        cause: 'A field was renamed or its type changed in place.',
        fix: 'A schema registry with compatibility enforcement; additive-only changes and explicit versioning.',
      },
      {
        name: 'Fan-out storm on a hot entity',
        symptom: 'One event causes millions of downstream messages and saturates the broker.',
        cause: 'Fan-out proportional to followers or subscribers of a single entity.',
        fix: 'Hybrid fan-out — push for normal entities, pull on read for very high-fan-out ones.',
      },
    ],
    interview: [
      {
        q: 'When would you use pub/sub instead of a queue?',
        a: [
          'When more than one independent thing must happen in response to a fact, and the publisher should not know about any of them. An order being placed needs to reach email, analytics, inventory and search — and adding a fifth consumer should not require touching the ordering service.',
          'A queue is the right choice when exactly one handler should act, because it gives me competing consumers for parallelism without duplicate processing.',
        ],
        followUps: ['How does a Kafka consumer group give you both models?'],
      },
      {
        q: 'You write to the database and then publish an event. What can go wrong?',
        a: [
          'The two are separate systems with no shared transaction, so a crash in between leaves the row committed and the event never published. Downstream systems then permanently disagree with the source of truth, and nothing detects it.',
          'The fix is the transactional outbox: insert the event into an outbox table inside the same transaction as the business write, and have a relay publish from that table. Either both are durable or neither is.',
          'The relay publishes at least once, so consumers still deduplicate — but the event can no longer be lost, which is the failure that has no recovery.',
        ],
      },
      {
        q: 'How do you evolve an event schema without breaking consumers?',
        a: [
          'Only additive changes: new fields are optional with defaults, and nothing is ever renamed, removed or repurposed in place. Consumers must ignore fields they do not recognise.',
          'I would enforce that with a schema registry configured for backward compatibility, so an incompatible producer change fails at publish time rather than at 3 a.m. in a consumer. For a genuinely breaking change, publish a new topic version and migrate consumers before retiring the old one.',
        ],
      },
    ],
    references: [
      { label: 'microservices.io — Transactional Outbox pattern', href: 'https://microservices.io/patterns/data/transactional-outbox.html' },
      { label: 'Kafka — Consumer groups and rebalancing', href: 'https://kafka.apache.org/documentation/#intro_consumers' },
    ],
  },
}

// ── 3. Ordering & partitioning ───────────────────────────────────────────────

const ordering: Lesson = {
  slug: 'message-queue-ordering',
  title: 'Ordering, Partitions & Consumer Lag',
  summary: 'Parallelism and ordering are opposites — partitions are how you buy some of both.',
  group: 'building-blocks',
  topic: 'Message Queue',
  tier: 'pro',
  minutes: 8,
  concept: 'Concept',
  tags: [
    { label: 'Ordering', value: 'Per partition only' },
    { label: 'Parallelism', value: '= partition count' },
    { label: 'Alarm on', value: 'Oldest message age' },
  ],
  notes: [
    'Global ordering means one consumer — which caps throughput at one machine.',
    'Partitioning by key gives ordering where it matters: all events for one entity land on one partition.',
    'Consumer parallelism can never exceed partition count, so the key choice decides your ceiling.',
  ],
  scene: {
    code: [
      'partition = hash(key) % num_partitions',
      '',
      '# same key -> same partition -> ordered',
      'publish("orders", key=order_id, event)',
      '',
      '# consumers: one per partition, at most',
      'assert consumers <= num_partitions',
      '',
      '# lag = how far behind the newest offset',
      'lag = latest_offset - committed_offset',
    ],
    initialState: { partitions: 3, consumers: 3, 'max lag': '0 s', ordering: 'per key' },
    nodes: [
      { id: 'producer', kind: 'client', label: 'Producer', x: 10, y: 50 },
      { id: 'p0', kind: 'queue', label: 'Partition 0', x: 44, y: 20, badge: 'key A, D' },
      { id: 'p1', kind: 'queue', label: 'Partition 1', x: 44, y: 50, badge: 'key B' },
      { id: 'p2', kind: 'queue', label: 'Partition 2', x: 44, y: 80, badge: 'key C' },
      { id: 'c0', kind: 'server', label: 'Consumer 0', x: 82, y: 20 },
      { id: 'c1', kind: 'server', label: 'Consumer 1', x: 82, y: 50 },
      { id: 'c2', kind: 'server', label: 'Consumer 2', x: 82, y: 80 },
    ],
    edges: [
      { id: 'pr-p0', from: 'producer', to: 'p0', curve: -0.3 },
      { id: 'pr-p1', from: 'producer', to: 'p1' },
      { id: 'pr-p2', from: 'producer', to: 'p2', curve: 0.3 },
      { id: 'p0-c0', from: 'p0', to: 'c0' },
      { id: 'p1-c1', from: 'p1', to: 'c1' },
      { id: 'p2-c2', from: 'p2', to: 'c2' },
    ],
    steps: [
      { id: '1', caption: 'The producer hashes each message key to choose a partition.', travel: 'pr-p1', token: 'write', codeLine: 1, patches: [{ nodeId: 'p1', badge: 'key B · offset 1', highlight: true }], state: { ordering: 'per key' } },
      { id: '2', caption: 'Every event for order B lands on partition 1, in publish order — created, paid, shipped.', travel: 'pr-p1', token: 'write', codeLine: 4, patches: [{ nodeId: 'p1', badge: 'B: 3 events ordered', highlight: true }] },
      { id: '3', caption: 'Order C hashes elsewhere. Its events are ordered too, but not relative to B.', travel: 'pr-p2', token: 'write', codeLine: 1, patches: [{ nodeId: 'p2', badge: 'C: ordered', highlight: true }] },
      { id: '4', caption: 'One consumer owns each partition, so three run in parallel with ordering intact.', travel: 'p1-c1', token: 'request', codeLine: 6, patches: [{ nodeId: 'c1', badge: 'owns p1', highlight: true }], state: { consumers: 3 } },
      { id: '5', caption: 'Adding a 4th consumer does nothing — there is no free partition to assign it.', patches: [{ nodeId: 'c2', badge: 'idle 4th ✗', highlight: true }], state: { consumers: '4 (1 idle)' } },
      { id: '6', caption: 'Consumer 1 slows down. Its partition backs up while the others stay current.', travel: 'p1-c1', token: 'miss', codeLine: 9, patches: [{ nodeId: 'p1', badge: 'lag 40k ⚠', highlight: true }], state: { 'max lag': '4 min' } },
      { id: '7', caption: 'Head-of-line blocking: nothing behind the stuck message can be processed, even for other keys.', patches: [{ nodeId: 'p1', badge: 'blocked', highlight: true }, { nodeId: 'c1', badge: 'stuck on 1 msg' }], state: { 'max lag': 'growing' } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'Ordering and parallelism pull in opposite directions. Strict global ordering requires a single sequential consumer, which caps throughput at one machine; unlimited parallelism gives no ordering at all. **Partitioning is the compromise** — you get ordering within a partition and parallelism across partitions.',
      'Which means the entire design reduces to one decision: **what goes in the partition key**. That choice fixes your ordering guarantees, your parallelism ceiling and your hot-partition risk, and it is very hard to change later.',
    ],
    sections: [
      {
        id: 'guarantee',
        heading: 'What ordering you actually get',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The guarantee brokers offer is narrow and worth stating precisely: **messages with the same key, published by the same producer, are delivered to a consumer in the order they were written to the partition.** Everything outside that is unordered.',
              'So `OrderCreated` and `OrderShipped` for order 42 arrive in order. `OrderCreated` for order 42 and `OrderCreated` for order 99 have no defined relative order at all, even if one was published a full second earlier.',
            ],
          },
          {
            kind: 'table',
            columns: ['Scope', 'Ordered?', 'Cost'],
            rows: [
              ['Single partition', 'Yes', 'Throughput of one consumer'],
              ['Same key across partitions', 'Yes — a key maps to one partition', 'None; this is the sweet spot'],
              ['Across keys in one partition', 'Yes, incidentally', 'Do not rely on it — repartitioning breaks it'],
              ['Across partitions', 'No', 'Would require global coordination'],
              ['Across topics', 'No', 'Never assume it'],
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Design for out-of-order rather than fighting it',
            body: [
              'The robust pattern is to make handlers order-insensitive: include a version or timestamp in the event and ignore anything older than what you have already applied. A consumer that upserts "set status to shipped if version > current" is correct regardless of arrival order — and survives replays, duplicates and repartitioning.',
            ],
          },
        ],
      },
      {
        id: 'key',
        heading: 'Choosing the partition key',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The key must satisfy three things simultaneously: it groups everything that needs relative ordering, it produces enough distinct values for the parallelism you need, and it distributes traffic evenly. Those goals conflict, and the conflict is the design work.',
            ],
          },
          {
            kind: 'table',
            columns: ['Key choice', 'Ordering', 'Parallelism', 'Skew risk'],
            rows: [
              ['`order_id`', 'Per order — usually exactly right', 'Very high', 'Low'],
              ['`user_id`', 'All of a user’s events', 'High', 'Moderate — power users'],
              ['`tenant_id`', 'Per tenant', 'Limited by tenant count', 'High — one large customer dominates'],
              ['`country`', 'Per country', 'Very low', 'Severe'],
              ['None (round-robin)', 'None', 'Maximum', 'None'],
            ],
            caption: 'Prefer the narrowest key that still groups what must stay ordered.',
          },
          {
            kind: 'math',
            rows: [
              { label: 'Partitions', value: '12' },
              { label: 'Max useful consumers', value: '12', note: 'extra ones idle' },
              { label: 'Per-consumer throughput', value: '500 msg/s' },
              { label: 'Topic ceiling', value: '6,000 msg/s' },
              { label: 'Adding partitions later', value: 'Rehashes keys', note: 'ordering breaks across the change' },
            ],
            result: 'Partition count is a throughput ceiling — overprovision it early, because raising it later is disruptive.',
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Adding partitions breaks key affinity',
            body: [
              'Since the partition is `hash(key) % N`, changing N sends existing keys somewhere new. Messages for a key can then be in two partitions at once, and their relative order is lost during the transition. Plan partition count for future load — a few times current need — rather than resizing under pressure.',
            ],
          },
        ],
      },
      {
        id: 'hol',
        heading: 'Head-of-line blocking',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Ordering has a hard consequence: a consumer cannot skip a message it has not finished. One slow or repeatedly-failing message stalls **everything behind it in that partition**, including messages for entirely unrelated keys.',
              'This is the most common way an event-driven system degrades. Throughput looks fine in aggregate because eleven partitions are healthy, while one partition falls hours behind and the users whose keys hash there see nothing happening.',
            ],
          },
          {
            kind: 'list',
            items: [
              '**Bound processing time.** A per-message timeout converts an infinite stall into a failure you can route to a DLQ.',
              '**Fail fast to a DLQ.** After a small number of attempts, move the message aside and continue — availability of the stream usually matters more than that one message.',
              '**Isolate slow work.** If some messages take a hundred times longer than others, put them on a separate topic so they cannot block the fast path.',
              '**Parallelise within a partition where ordering permits.** Some frameworks process non-conflicting keys concurrently while preserving per-key order.',
              '**Alert on per-partition lag**, never only on the total. Aggregate lag hides a single stuck partition completely.',
            ],
          },
        ],
      },
      {
        id: 'lag',
        heading: 'Lag is the metric that matters',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Consumer lag — the distance between the newest offset and the committed one — is the health signal for any streaming system. But measured in messages it is ambiguous: 100,000 messages is nothing if you process 50,000 a second and an incident if you process 100.',
              '**Measure lag in time**: the age of the oldest unprocessed message. That number is directly comparable to your SLO, is the right autoscaling signal, and needs no knowledge of throughput to interpret.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Lag in messages', value: '600,000' },
              { label: 'Consumer throughput', value: '5,000 /s' },
              { label: 'Time to drain, if input stopped', value: '2 min' },
              { label: 'Actual input rate', value: '4,500 /s' },
              { label: 'Net drain rate', value: '500 /s' },
              { label: 'Real time to drain', value: '~20 min' },
            ],
            result: 'Drain time depends on the gap between throughput and arrival, not on lag alone.',
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Scale on oldest-message age',
            body: [
              'Asked how to autoscale consumers, "on queue depth" is the common answer and the weaker one. Depth conflates a healthy burst with a genuine deficit. Age of the oldest unprocessed message answers the only question that matters — are we falling behind — and maps directly onto a freshness SLO.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Do not demand global ordering unless the domain truly requires it — it forces a single consumer and caps throughput at one machine.',
      'Do not partition by a low-cardinality field such as country or region; parallelism collapses and skew is severe.',
      'Do not rely on ordering across topics or across keys — no broker promises it, and repartitioning will expose the assumption.',
      'Do not use a strictly-ordered stream for work with wildly variable processing times; head-of-line blocking will dominate.',
    ],
    failureModes: [
      {
        name: 'Hot partition',
        symptom: 'One partition lags badly while the rest are current.',
        cause: 'A high-volume key — a large tenant or a celebrity user — concentrated on one partition.',
        fix: 'Add a salt or sub-key for hot entities (accepting weaker ordering for them), or split them onto a dedicated topic.',
      },
      {
        name: 'Head-of-line blocking',
        symptom: 'A partition stops advancing; users on those keys see no progress.',
        cause: 'One message failing or hanging repeatedly with no timeout or attempt limit.',
        fix: 'Per-message timeouts, a low retry limit, and a dead letter queue so the stream continues.',
      },
      {
        name: 'Idle consumers',
        symptom: 'Adding consumers does not reduce lag.',
        cause: 'Consumer count already equals partition count; extra members get no assignment.',
        fix: 'Increase partitions (accepting a one-time reshuffle), or increase per-consumer concurrency.',
      },
      {
        name: 'Rebalance storm',
        symptom: 'Consumers repeatedly stop processing while the group reassigns partitions.',
        cause: 'Slow processing exceeding the poll interval, so members are considered dead and trigger rebalances.',
        fix: 'Raise the poll timeout, reduce batch size, use cooperative rebalancing, and keep heartbeats off the processing thread.',
      },
    ],
    interview: [
      {
        q: 'How do you guarantee events for a single order are processed in order?',
        a: [
          'Partition by order id. All events for that order hash to the same partition, one consumer owns each partition, and within a partition delivery follows publish order — so per-order ordering holds without any global coordination.',
          'What I would not promise is ordering across orders, since different keys live on different partitions. If a downstream requirement needed that, it would force a single partition and cap throughput at one consumer, which is almost never worth it.',
        ],
        followUps: ['What happens to ordering when you add partitions?'],
      },
      {
        q: 'One partition is lagging badly. What is happening?',
        a: [
          'Either a hot key concentrating disproportionate volume on that partition, or head-of-line blocking where one message keeps failing or hanging and nothing behind it can proceed.',
          'I would check whether the partition is receiving more messages than its peers, which points to skew, or processing them slower, which points to a stuck message. Skew is fixed by salting the hot key or isolating it; blocking is fixed by a processing timeout, a retry limit and a dead letter queue.',
          'Either way I would alert on per-partition lag, because an aggregate number hides this completely.',
        ],
      },
      {
        q: 'How many partitions would you create?',
        a: [
          'Enough to exceed the peak parallelism I expect, because consumer count can never usefully exceed partition count and increasing partitions later rehashes keys and disrupts ordering during the change.',
          'I would estimate peak throughput divided by per-consumer throughput, then multiply by a few times for growth — so a topic needing 6,000 messages a second at 500 per consumer gets well over the twelve partitions strictly required.',
          'The counterweight is that partitions are not free: each adds files, memory and rebalance time on the broker, so thousands per topic is its own problem.',
        ],
      },
    ],
    references: [
      { label: 'Kafka — Topics, partitions and ordering guarantees', href: 'https://kafka.apache.org/documentation/#intro_topics' },
      { label: 'Confluent — How to choose the number of partitions', href: 'https://www.confluent.io/blog/how-choose-number-topics-partitions-kafka-cluster/' },
    ],
  },
}

// ── 4. Queues vs logs ────────────────────────────────────────────────────────

const queuesVsLogs: Lesson = {
  slug: 'message-queue-vs-log',
  title: 'Queues vs Logs (SQS vs Kafka)',
  summary: 'Delete on read, or keep everything and let each consumer track its own position.',
  group: 'building-blocks',
  topic: 'Message Queue',
  tier: 'pro',
  minutes: 8,
  concept: 'Architecture',
  tags: [
    { label: 'Queue', value: 'Message deleted on ack' },
    { label: 'Log', value: 'Retained; offsets per consumer' },
    { label: 'Log superpower', value: 'Replay' },
  ],
  notes: [
    'A queue destroys a message once someone processes it — the work is gone, and so is the evidence.',
    'A log keeps messages for a retention period; consumers are just a cursor over an immutable sequence.',
    'Replay is the capability that makes logs the backbone of event-driven systems.',
  ],
  scene: {
    code: [
      '# queue: consume destroys',
      'msg = queue.receive(); process(msg)',
      'queue.delete(msg)          # gone forever',
      '',
      '# log: consume advances a cursor',
      'for msg in log.read(from=offset):',
      '    process(msg); offset += 1',
      'log.seek(offset=0)         # replay everything',
    ],
    initialState: { model: 'queue', retained: 'until acked', consumers: 1, replay: 'impossible' },
    nodes: [
      { id: 'prod', kind: 'client', label: 'Producer', x: 10, y: 50 },
      { id: 'q', kind: 'queue', label: 'Queue / Log', x: 42, y: 50, badge: '3 messages' },
      { id: 'c1', kind: 'server', label: 'Billing', x: 78, y: 18, badge: 'offset 0' },
      { id: 'c2', kind: 'server', label: 'Search index', x: 78, y: 50, badge: 'offset 0' },
      { id: 'c3', kind: 'server', label: 'Analytics (new)', x: 78, y: 82, badge: 'offset —' },
    ],
    edges: [
      { id: 'p-q', from: 'prod', to: 'q' },
      { id: 'q-c1', from: 'q', to: 'c1', curve: -0.25 },
      { id: 'q-c2', from: 'q', to: 'c2' },
      { id: 'q-c3', from: 'q', to: 'c3', curve: 0.25 },
    ],
    steps: [
      { id: '1', caption: 'Queue semantics: billing receives a message and acks it. The broker deletes it.', travel: 'q-c1', token: 'request', codeLine: 3, patches: [{ nodeId: 'q', badge: '2 messages', highlight: true }, { nodeId: 'c1', badge: 'processed' }], state: { model: 'queue', replay: 'impossible' } },
      { id: '2', caption: 'A bug is found in billing. The messages are gone — there is nothing to reprocess.', travel: 'q-c1', token: 'miss', patches: [{ nodeId: 'c1', badge: 'bug ✗ · no replay', highlight: true }] },
      { id: '3', caption: 'Log semantics instead: messages are retained for days and consumers hold offsets.', codeLine: 6, patches: [{ nodeId: 'q', badge: '3 retained · 7d', highlight: true }], state: { model: 'log', retained: '7 days' } },
      { id: '4', caption: 'Billing and search read the same stream independently, each at its own position.', travel: 'q-c2', token: 'hit', patches: [{ nodeId: 'c1', badge: 'offset 3' }, { nodeId: 'c2', badge: 'offset 2', highlight: true }], state: { consumers: 2 } },
      { id: '5', caption: 'After fixing the billing bug, rewind its offset to zero and reprocess everything.', travel: 'q-c1', token: 'write', codeLine: 8, patches: [{ nodeId: 'c1', badge: 'offset 0 · replaying', highlight: true }], state: { replay: 'yes' } },
      { id: '6', caption: 'A brand-new analytics consumer starts from the beginning of retention — history it never saw.', travel: 'q-c3', token: 'hit', patches: [{ nodeId: 'c3', badge: 'offset 0 → 3 ✓', highlight: true }], state: { consumers: 3 } },
      { id: '7', caption: 'The trade: you now store every message for the retention window, and offsets are your problem.', patches: [{ nodeId: 'q', badge: '7d of storage', highlight: true }], state: { retained: '7 days', model: 'log' } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'Two systems are both called "message brokers" and they have fundamentally different data models. A **queue** treats a message as work to be done and destroys it once done. A **log** treats a message as a fact to be recorded and keeps it, letting each consumer track where it has read.',
      'Almost every practical difference — replay, multiple independent consumers, ordering, throughput, operational cost — follows from that one distinction.',
    ],
    sections: [
      {
        id: 'model',
        heading: 'The core difference',
        blocks: [
          {
            kind: 'table',
            columns: ['', 'Queue (SQS, RabbitMQ)', 'Log (Kafka, Kinesis, Pulsar)'],
            rows: [
              ['Message lifetime', 'Until acknowledged', 'A fixed retention window'],
              ['Position tracking', 'The broker knows what is outstanding', 'The consumer stores an offset'],
              ['Multiple consumers', 'Compete for messages', 'Each group reads everything'],
              ['Replay', 'Impossible', 'Seek to any offset'],
              ['Ordering', 'Best-effort, or FIFO with limits', 'Strict within a partition'],
              ['Per-message operations', 'Delete, delay, change visibility', 'None — the log is immutable'],
              ['Throughput ceiling', 'High', 'Very high (sequential disk writes)'],
              ['Operational cost', 'Low; often fully managed', 'Higher; partitions, retention, offsets'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'The most consequential row is **replay**. In a queue, processing destroys the evidence — if a consumer has a bug and writes wrong data for six hours, the inputs are gone and reconstructing them is archaeology. In a log, you fix the code, rewind the offset, and reprocess. That single capability is why logs underpin most modern data platforms.',
              'The second is **independent consumers**. Adding a fifth consumer to a queue means it competes with the other four for the same messages. Adding a fifth consumer group to a log means it reads the whole stream on its own, changing nothing for anyone else — which is what lets teams build on each other\'s events without coordination.',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'A log makes the consumer stateful, deliberately',
            body: [
              'The offset moves the bookkeeping from broker to consumer. That is what makes the broker so fast — it is appending to a file and serving byte ranges, with no per-message state to track — and it is also why consumers must handle rebalancing, offset commits and duplicate processing themselves.',
            ],
          },
        ],
      },
      {
        id: 'performance',
        heading: 'Why logs are so fast',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A log broker\'s performance comes from doing almost nothing clever. Writes are **sequential appends** to a file, which even on spinning disks is orders of magnitude faster than random I/O; reads are served from the OS page cache; and delivery uses zero-copy transfer straight from page cache to socket, never passing through application memory.',
              'A queue broker must track per-message state — delivered, in-flight, acknowledged, its visibility deadline — which is real work per message and the reason its ceiling is lower.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Sequential disk write', value: '~500 MB/s+' },
              { label: 'Random disk write', value: '~1–100 MB/s' },
              { label: 'Kafka per-broker throughput', value: '~100k–1M msg/s' },
              { label: 'SQS per-queue (standard)', value: 'Effectively unlimited, higher per-message cost' },
              { label: 'Retention storage, 100k msg/s × 1 KB × 7 days', value: '~60 TB' },
              { label: 'Same in a queue', value: '~0', note: 'deleted on ack' },
            ],
            result: 'Logs trade storage for throughput and replay; queues trade throughput for simplicity.',
          },
        ],
      },
      {
        id: 'choosing',
        heading: 'Choosing between them',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Use a queue for task distribution.** Send an email, resize an image, generate a PDF — one consumer should do the work, per-message retry and delay are useful, and nobody will ever want to reprocess yesterday\'s emails.',
              '**Use a log for events other systems care about.** An order was placed, a user signed up — several independent consumers want it, new consumers will appear later, and replay is valuable.',
              '**Use a queue when you need per-message control**: delayed delivery, priority, individual retry schedules, dead-lettering a single message. A log has none of these because it is immutable.',
              '**Use a log when order matters** within a key, or when you need to rebuild derived state from scratch.',
              '**Use a queue when operational simplicity wins.** A managed queue is close to zero operations; a log cluster is partitions, retention, rebalancing and offset management.',
            ],
          },
          {
            kind: 'code',
            language: 'text',
            caption: 'A system that uses both, for different jobs',
            lines: [
              'Order placed',
              '  └─> Kafka topic "orders"          (log: the durable fact)',
              '        ├─> billing consumer group    -> charges card',
              '        ├─> search consumer group     -> indexes the order',
              '        ├─> analytics consumer group  -> warehouse',
              '        └─> notification consumer',
              '              └─> SQS "send-email"    (queue: a unit of work)',
              '                    └─> worker sends, retries, DLQs on failure',
              '',
              '# The log records what happened; the queue distributes what to do.',
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'A log is not a database',
            body: [
              'Retention is finite, so a log is not a source of truth for state — only for recent events. Compacted topics (keeping the latest value per key indefinitely) narrow the gap but still do not give you queries, indexes or point lookups. Materialise state into a database and use the log to build it.',
            ],
          },
        ],
      },
      {
        id: 'operating',
        heading: 'What operating a log actually costs',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Retention is a capacity decision.** Seven days at 100k messages per second is tens of terabytes; too short and you lose the replay you adopted it for, too long and storage dominates cost.',
              '**Partition count is a ceiling you set early.** Consumer parallelism cannot exceed it, and increasing it later rehashes keys and disrupts per-key ordering.',
              '**Offset commits are a correctness decision.** Commit before processing and a crash loses messages; commit after and a crash reprocesses them. At-least-once plus idempotent consumers is the standard answer.',
              '**Rebalancing pauses consumption.** Adding, removing or timing out a consumer reassigns partitions and briefly stops the group; frequent rebalances look like intermittent lag.',
              '**Consumer lag is the health metric** — measured in time, not messages — and it needs alerting per partition, since an aggregate hides one stuck partition entirely.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Answer with the data model, not the product',
            body: [
              '"Kafka or SQS?" is best answered as "does this message get destroyed when someone handles it, or is it a fact that several systems will want and that I may need to replay?" That framing gets you the right answer even for products you have never used.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'A log for simple task distribution — you take on partitions, offsets and retention for capabilities you do not need.',
      'A queue for events several independent systems consume; competing consumers will each see only a fraction.',
      'A log where per-message delay, priority or individual retry scheduling is required — the log is immutable.',
      'A log as a source of truth for state; retention is finite and it offers no queries.',
    ],
    failureModes: [
      {
        name: 'Retention expired before replay',
        symptom: 'A bug is found after the window and the source events are gone.',
        cause: 'Retention set for storage cost rather than for recovery needs.',
        fix: 'Size retention from the realistic detection-to-fix window; archive to object storage for longer horizons.',
      },
      {
        name: 'Competing consumers on a shared event',
        symptom: 'Each consumer sees only some events; downstream state is incomplete.',
        cause: 'A queue used where fan-out was needed, so consumers split the messages.',
        fix: 'Use a topic with independent consumer groups, or one queue per consumer fed by a fan-out.',
      },
      {
        name: 'Message loss from early offset commit',
        symptom: 'Occasional missing records after consumer restarts.',
        cause: 'Offsets committed before processing completed.',
        fix: 'Commit after the side effect commits, and make processing idempotent to absorb duplicates.',
      },
      {
        name: 'Rebalance storms',
        symptom: 'Consumption repeatedly pauses; lag oscillates.',
        cause: 'Slow processing exceeding the poll interval, so members are considered dead.',
        fix: 'Smaller batches, longer poll timeouts, cooperative rebalancing, heartbeats off the processing thread.',
      },
    ],
    interview: [
      {
        q: 'Kafka or SQS for this system?',
        a: [
          'I would ask whether the message is a unit of work that disappears once handled, or a fact that several systems care about. A queue deletes on acknowledgement, so it suits task distribution — send an email, resize an image — where one consumer should act and nobody will ever want to reprocess.',
          'A log retains messages and lets each consumer group track its own offset, so several independent consumers read everything, new consumers can appear later and read history, and I can rewind after fixing a bug.',
          'Most real systems use both: a log for the durable events, and queues fed from it for the actual work items where per-message retry and delay matter.',
        ],
        followUps: ['Why is replay so valuable?'],
      },
      {
        q: 'Why is replay worth the extra operational cost?',
        a: [
          'Because consumer bugs are inevitable and, with a queue, the inputs are destroyed as they are processed. If a consumer wrote wrong data for six hours, reconstructing what it should have done is archaeology.',
          'With a log I fix the code, rewind the offset and reprocess — the events are still there. That also lets me bootstrap entirely new consumers from history, so a new search index or analytics pipeline can be built without asking producers to resend anything.',
          'The cost is storing every message for the retention window and managing offsets, partitions and rebalancing yourself.',
        ],
      },
      {
        q: 'Should you commit the offset before or after processing?',
        a: [
          'After, and specifically after the side effect has durably committed. Committing first means a crash mid-processing silently loses the message, since the broker believes it was handled.',
          'Committing after means a crash between the effect and the commit reprocesses the message, which is why consumers must be idempotent — dedupe on a natural key, or record processed message ids in the same transaction as the effect.',
          'That combination is at-least-once delivery with effectively-once processing, which is the practical standard.',
        ],
      },
    ],
    references: [
      { label: 'Kafka — Design and persistence', href: 'https://kafka.apache.org/documentation/#design' },
      { label: 'Kleppmann — The Log: What every software engineer should know', href: 'https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying' },
    ],
  },
}

export const messageQueueTopic: Lesson[] = [messageQueue, mqFanout, ordering, queuesVsLogs]
