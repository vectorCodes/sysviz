import type { Lesson } from '../types'

/** Topic: API Gateway (group: building-blocks). */

const apiGateway: Lesson = {
  slug: 'api-gateway',
  title: 'API Gateway Routing',
  summary: 'One front door that authenticates, throttles and routes to microservices.',
  group: 'building-blocks',
  topic: 'API Gateway',
  tier: 'free',
  minutes: 6,
  concept: 'Concept',
  tags: [
    { label: 'Pattern', value: 'Façade / Proxy' },
    { label: 'Concerns', value: 'Auth · Rate limit · Routing' },
    { label: 'Coupling', value: 'Loose' },
  ],
  notes: [
    'Clients talk to one endpoint instead of many services.',
    'The gateway handles cross-cutting concerns: auth, rate limiting, logging.',
    'It then routes each request to the right internal service.',
  ],
  scene: {
    code: [
      'on request:',
      '    if not auth.valid(token): return 401',
      '    if rate.exceeded(user):  return 429',
      '    svc = route(request.path)',
      '    return svc.handle(request)',
    ],
    initialState: { authenticated: 'no', route: '—' },
    nodes: [
      { id: 'client', kind: 'client', label: 'Client', x: 10, y: 50 },
      { id: 'gw', kind: 'apiGateway', label: 'API Gateway', x: 40, y: 50 },
      { id: 'users', kind: 'server', label: 'Users Svc', x: 82, y: 22 },
      { id: 'orders', kind: 'server', label: 'Orders Svc', x: 82, y: 50 },
      { id: 'pay', kind: 'server', label: 'Payments', x: 82, y: 78 },
    ],
    edges: [
      { id: 'c-gw', from: 'client', to: 'gw' },
      { id: 'gw-users', from: 'gw', to: 'users', curve: -0.35 },
      { id: 'gw-orders', from: 'gw', to: 'orders' },
      { id: 'gw-pay', from: 'gw', to: 'pay', curve: 0.35 },
    ],
    steps: [
      { id: '1', caption: 'The client sends every request to the single gateway endpoint.', travel: 'c-gw', token: 'request', codeLine: 1 },
      { id: '2', caption: 'The gateway validates the auth token first.', codeLine: 2, patches: [{ nodeId: 'gw', badge: 'auth ✓', highlight: true }], state: { authenticated: 'yes' } },
      { id: '3', caption: 'Then checks the caller hasn\'t exceeded their rate limit.', codeLine: 3, patches: [{ nodeId: 'gw', badge: 'rate ok', highlight: true }] },
      { id: '4', caption: 'A GET /orders is routed to the Orders service.', travel: 'gw-orders', token: 'request', codeLine: 4, patches: [{ nodeId: 'orders', badge: 'handling', highlight: true }], state: { route: '/orders' } },
      { id: '5', caption: 'Different paths fan out to Users or Payments — the client never knows the internal map.', travel: 'gw-users', token: 'request', codeLine: 5, patches: [{ nodeId: 'users', badge: 'handling', highlight: true }] },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'An API gateway is the **single front door** to a set of services. Clients call one endpoint; the gateway authenticates, throttles, routes and often aggregates. Its real value is not routing — a load balancer routes. It is that **cross-cutting concerns stop being reimplemented in every service**.',
      'The danger is symmetrical: everything routed through one component means one component can take down everything, and a gateway that accumulates business logic becomes a distributed monolith with extra latency.',
    ],
    sections: [
      {
        id: 'concerns',
        heading: 'What belongs in the gateway',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The test is whether a concern is **identical for every service** and **independent of business meaning**. If yes, it belongs at the edge; if it needs to know what a resource *is*, it belongs in the service.',
            ],
          },
          {
            kind: 'table',
            columns: ['Concern', 'Gateway', 'Service', 'Why'],
            rows: [
              ['TLS termination', 'Yes', 'No', 'One certificate story, not N'],
              ['Authentication (is this a valid token?)', 'Yes', 'No', 'Identical everywhere; expensive to duplicate'],
              ['Authorization (may this user do this?)', 'Coarse only', 'Yes', 'Needs resource-level knowledge'],
              ['Rate limiting', 'Yes', 'Sometimes', 'Global budgets need a single view'],
              ['Request routing / versioning', 'Yes', 'No', 'Clients should not track service topology'],
              ['Response aggregation', 'Sometimes (BFF)', 'Sometimes', 'Cheap at the edge; risks coupling'],
              ['Business validation', 'No', 'Yes', 'Domain logic belongs with the domain'],
              ['Observability, tracing headers', 'Yes', 'Yes', 'Gateway starts the trace; services continue it'],
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Authentication at the edge is not authorization',
            body: [
              'A gateway can cheaply verify that a token is valid and un-expired. It cannot decide whether *this* user may read *that* order without knowing the order — which means either the gateway calls the service (defeating the point) or the service checks anyway.',
              'The workable split: the gateway proves identity and injects a trusted, signed identity header; each service enforces its own resource rules. Never let a service assume that "it came through the gateway" means "it is allowed".',
            ],
          },
        ],
      },
      {
        id: 'latency',
        heading: 'What the hop costs',
        blocks: [
          {
            kind: 'math',
            rows: [
              { label: 'TLS termination + parse', value: '~0.5 ms' },
              { label: 'JWT signature verification (RS256)', value: '~0.3 ms', note: 'cache the JWKS' },
              { label: 'Rate limit check (Redis)', value: '~0.5 ms', note: '0 if local + async sync' },
              { label: 'Routing + header rewrite', value: '~0.1 ms' },
              { label: 'Extra network hop to the service', value: '~0.5 ms' },
              { label: 'Total added', value: '~2 ms' },
            ],
            result: 'Two milliseconds is cheap for centralised auth — unless the gateway calls a remote auth service per request.',
          },
          {
            kind: 'prose',
            body: [
              'The version that hurts is a gateway that makes a **blocking call to an auth or session service on every request**. That converts a 2 ms hop into a 15 ms one and creates a hard dependency: when auth is down, every endpoint is down, including ones that need no authentication.',
              'Local JWT verification against a cached JWKS avoids it — the gateway checks a signature with a public key it already has, and only needs the auth service for key rotation and refresh.',
            ],
          },
        ],
      },
      {
        id: 'spof',
        heading: 'Not becoming a single point of failure',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Run it stateless and horizontally.** Any state — rate-limit counters, sessions — lives in Redis, so instances are interchangeable and failure costs one request.',
              '**Fail open or closed, deliberately per route.** If the rate limiter\'s Redis is unavailable, does traffic flow or stop? For rate limits, usually open; for authentication, always closed. Decide before the incident.',
              '**Isolate by tier.** Separate gateway deployments (or at least separate pools) for public traffic, partner traffic and internal traffic mean a partner\'s bad day is not everyone\'s.',
              '**Keep config deployment separate from binary deployment.** Route changes should not require a gateway rollout, and a bad route change must be revertible in seconds.',
              '**Bound everything.** Per-route timeouts, retry budgets, circuit breakers and concurrency limits — the gateway is where you can enforce them uniformly.',
            ],
          },
          {
            kind: 'code',
            language: 'yaml',
            caption: 'Per-route policy — the thing a gateway is genuinely good at',
            lines: [
              'routes:',
              '  - match: { prefix: "/api/orders" }',
              '    cluster: orders-v2',
              '    timeout: 3s',
              '    retry:',
              '      on: [5xx, reset]        # idempotent methods only',
              '      attempts: 2',
              '      budget_percent: 10      # cap retry amplification',
              '    rate_limit: { key: user_id, rps: 50, burst: 100 }',
              '    auth: { required: true, scopes: ["orders:read"] }',
              '',
              '  - match: { prefix: "/api/search" }',
              '    cluster: search',
              '    timeout: 800ms            # shed slow searches early',
              '    circuit_breaker: { max_pending: 100, max_retries: 3 }',
              '    auth: { required: false }',
            ],
          },
        ],
      },
      {
        id: 'versioning',
        heading: 'Routing, versioning and migration',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The gateway is where you decouple **client-visible API shape** from **internal service topology**. That decoupling is what makes it possible to split a service, rename it, or move it to a new datastore without a client ever noticing.',
            ],
          },
          {
            kind: 'list',
            ordered: true,
            items: [
              '**Route by prefix or header to a versioned cluster** — `/v1/orders` and `/v2/orders` can be entirely different services.',
              '**Shift traffic by weight** for a canary: 1%, then 10%, then 50%, watching error rate and latency at each step.',
              '**Mirror (shadow) traffic** to a new implementation without returning its responses, so you can compare behaviour under real load with zero user risk.',
              '**Use the strangler pattern**: route specific paths off a monolith to new services one at a time, with the gateway as the seam.',
              '**Rewrite at the edge** so legacy clients keep working against a modernised backend contract.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'The strangler seam is the strongest argument for a gateway',
            body: [
              'Interviewers asking "why add a gateway?" often expect "auth and rate limiting". A better answer adds: it gives you a seam at which the internal architecture can change without a client migration — which is what makes incremental decomposition of a monolith feasible at all.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'A single service with one client — the gateway adds a hop and an operational component for concerns you can handle in-process.',
      'Internal service-to-service traffic, where a service mesh gives the same policies without a central chokepoint.',
      'As a place for business logic or data transformation tied to a domain; that creates a distributed monolith with a shared deploy.',
      'As the only authorization check — services must still enforce their own resource-level rules.',
    ],
    failureModes: [
      {
        name: 'Gateway as a single point of failure',
        symptom: 'Every endpoint fails simultaneously though the services are healthy.',
        cause: 'A single gateway deployment with shared config, or a blocking dependency on an auth service.',
        fix: 'Run stateless replicas across zones, verify JWTs locally against a cached JWKS, and isolate traffic tiers.',
      },
      {
        name: 'Config change outage',
        symptom: 'A routing rule deploy breaks unrelated endpoints.',
        cause: 'Global config applied atomically with no staged rollout or validation.',
        fix: 'Validate config in CI, roll out progressively, and keep instant rollback separate from binary deploys.',
      },
      {
        name: 'Retry amplification at the edge',
        symptom: 'A partially failing backend gets more traffic and never recovers.',
        cause: 'Gateway retries plus client retries multiply during degradation.',
        fix: 'Retry budgets as a percentage of traffic, idempotent methods only, and circuit breaking per cluster.',
      },
      {
        name: 'Trusted headers spoofed',
        symptom: 'A caller impersonates another user by setting an identity header.',
        cause: 'Services trust `X-User-Id` from any source, and the header is not stripped at ingress.',
        fix: 'Strip inbound copies of trusted headers at the gateway, sign the identity it injects, and use mTLS between gateway and services.',
      },
    ],
    interview: [
      {
        q: 'Why put an API gateway in front of microservices?',
        a: [
          'To stop reimplementing the same cross-cutting concerns in every service — TLS, authentication, rate limiting, routing, tracing — and to give clients one stable endpoint instead of knowledge of the internal topology.',
          'The second reason matters more over time: it is a seam. Because clients address the gateway rather than services, you can split, rename, canary or replace services behind it without a client migration, which is what makes incremental decomposition possible.',
        ],
        followUps: ['What would you deliberately keep out of it?'],
      },
      {
        q: 'How do you stop the gateway being a single point of failure?',
        a: [
          'Keep it stateless so it can run as many interchangeable replicas across availability zones, with any shared state like rate-limit counters in Redis.',
          'Remove blocking dependencies from the request path — verify JWT signatures locally against a cached key set rather than calling an auth service per request, since that dependency would make every endpoint fail when auth is degraded.',
          'Then decide fail-open versus fail-closed per concern in advance: rate limiting usually fails open, authentication always fails closed.',
        ],
      },
      {
        q: 'Should the gateway do authorization?',
        a: [
          'It should do authentication and coarse-grained checks — a valid token, the right scope for a route. It cannot do resource-level authorization without knowing the resource, so asking whether this user owns this order requires the service.',
          'The pattern I would use is: the gateway verifies identity and injects a signed identity header, strips any inbound copy of that header, and each service enforces its own rules. Services must never assume that arriving via the gateway implies permission.',
        ],
      },
    ],
    references: [
      { label: 'Microsoft — Gateway routing and aggregation patterns', href: 'https://learn.microsoft.com/en-us/azure/architecture/patterns/gateway-routing' },
      { label: 'Envoy — HTTP routing and traffic shifting', href: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/http_routing' },
    ],
  },
}

// ── 2. Auth at the edge ──────────────────────────────────────────────────────

const edgeAuth: Lesson = {
  slug: 'api-gateway-auth',
  title: 'Authentication at the Edge',
  summary: 'Verify the token once at the door, then let services trust a signed identity.',
  group: 'building-blocks',
  topic: 'API Gateway',
  tier: 'pro',
  minutes: 7,
  concept: 'Security',
  tags: [
    { label: 'Verify', value: 'Locally, via JWKS' },
    { label: 'Propagate', value: 'Signed identity header' },
    { label: 'Enforce', value: 'Per-resource, in service' },
  ],
  notes: [
    'Verifying a JWT signature locally costs microseconds; calling an auth service costs milliseconds and a dependency.',
    'The gateway must strip inbound identity headers, or a caller can simply claim to be someone else.',
    'Authentication answers "who are you"; each service still answers "may you touch this".',
  ],
  scene: {
    code: [
      '# gateway',
      'strip(request, "X-User-Id")     # untrust client input',
      'claims = jwt.verify(token, jwks_cache)',
      'if expired(claims): return 401',
      'if not scope_ok(route, claims): return 403',
      'request.headers["X-User-Id"] = sign(claims.sub)',
      '',
      '# service',
      'if order.owner != request.user: return 403',
    ],
    initialState: { identity: 'unknown', 'jwks cache': 'warm', verified: 'no', 'auth calls': 0 },
    nodes: [
      { id: 'client', kind: 'client', label: 'Client', x: 10, y: 50 },
      { id: 'gw', kind: 'apiGateway', label: 'Gateway', x: 40, y: 50, badge: 'verifying' },
      { id: 'idp', kind: 'server', label: 'Identity provider', x: 40, y: 14, badge: 'JWKS' },
      { id: 'orders', kind: 'server', label: 'Orders svc', x: 76, y: 36 },
      { id: 'db', kind: 'database', label: 'Orders DB', x: 94, y: 74 },
    ],
    edges: [
      { id: 'c-gw', from: 'client', to: 'gw' },
      { id: 'gw-idp', from: 'gw', to: 'idp' },
      { id: 'gw-orders', from: 'gw', to: 'orders' },
      { id: 'orders-db', from: 'orders', to: 'db' },
      { id: 'gw-c', from: 'gw', to: 'client', curve: 0.5 },
    ],
    steps: [
      { id: '1', caption: 'A request arrives with a bearer token — and a forged X-User-Id header.', travel: 'c-gw', token: 'request', codeLine: 2, patches: [{ nodeId: 'gw', badge: 'stripping headers', highlight: true }], state: { identity: 'unknown' } },
      { id: '2', caption: 'The gateway strips any client-supplied identity header. Nothing from the client is trusted.', codeLine: 2, patches: [{ nodeId: 'gw', badge: 'X-User-Id removed' }] },
      { id: '3', caption: 'It fetched the identity provider\'s public keys once and cached them — no per-request call.', travel: 'gw-idp', token: 'hit', patches: [{ nodeId: 'idp', badge: 'JWKS cached 1h', highlight: true }], state: { 'jwks cache': 'warm', 'auth calls': 0 } },
      { id: '4', caption: 'Signature verified locally in microseconds; expiry and scope checked against the route.', codeLine: 3, patches: [{ nodeId: 'gw', badge: 'sub=u_42 ✓', highlight: true }], state: { verified: 'yes', identity: 'u_42' } },
      { id: '5', caption: 'An expired or unsigned token is rejected right here — the service never sees it.', travel: 'gw-c', token: 'miss', codeLine: 4, patches: [{ nodeId: 'gw', badge: '401 for bad tokens' }] },
      { id: '6', caption: 'The gateway injects its own signed identity header and forwards the request.', travel: 'gw-orders', token: 'request', codeLine: 6, patches: [{ nodeId: 'orders', badge: 'trusts X-User-Id', highlight: true }] },
      { id: '7', caption: 'The service still checks ownership: authentication is not authorization.', travel: 'orders-db', token: 'request', codeLine: 9, patches: [{ nodeId: 'db', badge: 'owner = u_42 ✓', highlight: true }] },
    ],
  },
  deepDive: {
    readingMinutes: 8,
    intro: [
      'Centralising authentication is one of the strongest arguments for a gateway — and one of the easiest things to implement in a way that is both slow and insecure. The two questions that decide both: **where is the token verified**, and **what does a service trust**.',
      'Get them right and you add microseconds and remove duplicated code. Get them wrong and you add a synchronous dependency in front of every endpoint plus a header-spoofing vulnerability.',
    ],
    sections: [
      {
        id: 'local',
        heading: 'Verify locally, not remotely',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A signed JWT is self-contained: the claims are in the token and a signature proves the identity provider issued them. Verifying means checking that signature with a **public key** — an asymmetric operation the gateway can do entirely on its own, given the key.',
              'That key comes from the provider\'s JWKS endpoint and is cached, typically for an hour, with a refresh on encountering an unknown key id. So the auth service is contacted on key rotation, not per request.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Local RS256 verification', value: '~0.2–0.5 ms' },
              { label: 'Local EdDSA verification', value: '~0.05 ms', note: 'much cheaper' },
              { label: 'Remote token introspection call', value: '~5–20 ms' },
              { label: 'At 50k RPS, remote introspection', value: '50k extra QPS on auth' },
              { label: 'Availability with remote check', value: 'min(gateway, auth)' },
              { label: 'Availability with local check', value: 'gateway only' },
            ],
            result: 'Remote introspection makes the auth service a hard dependency of every endpoint.',
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Pin the algorithm',
            body: [
              'Accepting whatever `alg` the token declares is the classic JWT vulnerability: a token with `alg: none`, or an RS256 public key used as an HS256 shared secret, can forge identities. Configure the allowed algorithm explicitly and reject anything else — never let the attacker choose the verification method.',
            ],
          },
        ],
      },
      {
        id: 'propagation',
        heading: 'Propagating identity without creating a hole',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Once verified, the gateway must tell downstream services who the caller is. The naive approach — set `X-User-Id` and let services read it — is a privilege escalation waiting to happen, because a caller who reaches a service directly (or whose header is not stripped at ingress) can claim any identity.',
            ],
          },
          {
            kind: 'list',
            ordered: true,
            items: [
              '**Strip inbound copies** of every trusted header at the very edge, unconditionally, before any routing logic runs.',
              '**Make the network the boundary too.** Services should only accept connections from the gateway or mesh, enforced with mTLS or network policy — never rely on the header alone.',
              '**Forward a verifiable credential**, not a bare id: either the original JWT, or a short-lived internal token the gateway signs. Then a service can verify rather than trust.',
              '**Keep the audience narrow.** An internal token minted for the orders service should not be replayable against the payments service; set `aud` and check it.',
              '**Log the identity path** so an incident can distinguish "the gateway asserted this" from "the service inferred it".',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'gateway_auth.py — strip, verify, mint',
            lines: [
              'TRUSTED_HEADERS = ("x-user-id", "x-user-scopes", "x-internal-token")',
              '',
              'def handle(request, route):',
              '    for h in TRUSTED_HEADERS:',
              '        request.headers.pop(h, None)        # 1. never trust the client',
              '',
              '    token = bearer(request)',
              '    if token is None:',
              '        return 401 if route.auth_required else forward(request)',
              '',
              '    try:',
              '        claims = jwt.decode(',
              '            token, jwks.key_for(token), algorithms=["RS256"],  # 2. pinned alg',
              '            audience=API_AUDIENCE, options={"require": ["exp", "sub"]})',
              '    except JWTError:',
              '        return 401',
              '',
              '    if not route.scopes <= set(claims.get("scope", "").split()):',
              '        return 403                          # 3. coarse check only',
              '',
              '    internal = mint_internal_token(sub=claims["sub"], aud=route.service, ttl=30)',
              '    request.headers["x-internal-token"] = internal   # 4. verifiable, scoped, short',
              '    return forward(request)',
            ],
          },
        ],
      },
      {
        id: 'revocation',
        heading: 'The revocation gap',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Local verification has one real cost: a token stays valid until it expires, because nothing checks a central store. Logging out, banning a user, or revoking a scope does not take effect immediately.',
              'The standard resolution is **short access tokens plus long refresh tokens**. Access tokens live 5–15 minutes and are verified locally; refresh tokens are checked against a database whenever a new access token is minted. Revocation then takes effect within one access-token lifetime, and the expensive stateful check happens at refresh frequency instead of request frequency.',
            ],
          },
          {
            kind: 'table',
            columns: ['Approach', 'Revocation delay', 'Per-request cost', 'Complexity'],
            rows: [
              ['Long-lived JWT only', 'Until expiry — hours', 'Microseconds', 'Lowest, and usually unacceptable'],
              ['Short JWT + refresh token', '≤ access token TTL', 'Microseconds', 'Standard practice'],
              ['JWT + deny list of revoked ids', 'Immediate', 'One cache lookup', 'Extra store; small if scoped to revocations'],
              ['Opaque token + introspection', 'Immediate', 'A network call', 'Auth becomes a hard dependency'],
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Name the number',
            body: [
              '"We accept a revocation window equal to the access token TTL — fifteen minutes — and for high-risk actions like changing a password we additionally check a deny list" is a complete answer. "We use JWTs" is not.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Do not verify tokens remotely per request; it makes the auth service a hard dependency of every endpoint.',
      'Do not rely on a plain identity header for trust unless the network path is also restricted — headers are trivially forged.',
      'Do not do resource-level authorization at the gateway; it would need the resource, which means calling the service anyway.',
      'Do not use long-lived access tokens where revocation matters — admin sessions, payment scopes, anything privileged.',
    ],
    failureModes: [
      {
        name: 'Header spoofing',
        symptom: 'A user reads another user\'s data by setting a header.',
        cause: 'Inbound `X-User-Id` not stripped, and services trusting it unconditionally.',
        fix: 'Strip trusted headers at ingress, forward a signed token instead, and enforce mTLS between gateway and services.',
      },
      {
        name: 'Algorithm confusion',
        symptom: 'Forged tokens accepted as valid.',
        cause: 'The verifier honours the token\'s own `alg` header, allowing `none` or key-type confusion.',
        fix: 'Pin the accepted algorithm and key type in configuration; reject anything else.',
      },
      {
        name: 'JWKS fetch on the request path',
        symptom: 'Latency spikes and 401 storms when the identity provider is slow.',
        cause: 'Keys fetched per request, or cache stampede on rotation.',
        fix: 'Cache keys with a long TTL, refresh in the background, single-flight the refresh, and keep the previous key during rotation.',
      },
      {
        name: 'Revoked user still active',
        symptom: 'A banned account keeps making requests for an hour.',
        cause: 'Long-lived access tokens with no deny list.',
        fix: 'Short access tokens with refresh, plus an immediate deny list for high-risk revocations.',
      },
    ],
    interview: [
      {
        q: 'Where do you verify the token, and why?',
        a: [
          'At the gateway, locally, by checking the signature against public keys cached from the identity provider\'s JWKS endpoint. That costs a fraction of a millisecond and requires no network call.',
          'The alternative — calling an introspection endpoint per request — adds five to twenty milliseconds and, more importantly, makes the auth service a hard dependency of every single endpoint, so its availability multiplies into everything.',
        ],
        followUps: ['How do you handle key rotation without an outage?'],
      },
      {
        q: 'How does a downstream service know who the caller is, safely?',
        a: [
          'Not from a header the client could have set. The gateway strips all inbound identity headers unconditionally, then injects its own — ideally a short-lived internal token it signs, scoped to the target service via an audience claim, so the service can verify rather than trust.',
          'That is paired with a network boundary: services accept traffic only from the gateway or mesh, enforced with mTLS. Header stripping alone is not enough if a service is directly reachable.',
        ],
      },
      {
        q: 'A user is banned. How quickly does that take effect?',
        a: [
          'With locally-verified JWTs, not until the token expires — which is exactly why access tokens should be short, typically five to fifteen minutes, with a refresh token that is checked against the database when a new access token is issued.',
          'That bounds the window to one token lifetime while keeping the stateful check off the hot path. For high-risk cases I would add a deny list of revoked token or user ids in the cache, checked per request, which makes revocation immediate at the cost of one lookup.',
        ],
      },
    ],
    references: [
      { label: 'OWASP — JSON Web Token cheat sheet', href: 'https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html' },
      { label: 'RFC 8725 — JWT Best Current Practices', href: 'https://datatracker.ietf.org/doc/html/rfc8725' },
    ],
  },
}

// ── 3. Aggregation & BFF ─────────────────────────────────────────────────────

const aggregation: Lesson = {
  slug: 'api-gateway-aggregation',
  title: 'Aggregation & the BFF Pattern',
  summary: 'One client call, six service calls — and a tail latency problem you must design for.',
  group: 'building-blocks',
  topic: 'API Gateway',
  tier: 'pro',
  minutes: 7,
  concept: 'Pattern',
  tags: [
    { label: 'Saves', value: 'Client round trips' },
    { label: 'Costs', value: 'Tail latency' },
    { label: 'Shape', value: 'One BFF per client' },
  ],
  notes: [
    'A mobile client on a 150 ms link cannot afford six sequential round trips — aggregate server-side.',
    'Fan out in parallel, bound each call with a deadline, and return partial results rather than failing.',
    'A BFF is a gateway owned by one client team, shaped for one client — not a shared aggregation layer.',
  ],
  scene: {
    code: [
      'async def home(user):',
      '    profile, feed, notifs = await gather(',
      '        svc.profile(user,  timeout=200ms),',
      '        svc.feed(user,     timeout=400ms),',
      '        svc.notifs(user,   timeout=150ms),',
      '    )',
      '    # a failed optional call degrades, not fails',
      '    return render(profile, feed, notifs or [])',
    ],
    initialState: { 'client calls': 6, latency: '900 ms', 'failed parts': 0, mode: 'chatty' },
    nodes: [
      { id: 'mobile', kind: 'client', label: 'Mobile', x: 10, y: 50 },
      { id: 'bff', kind: 'apiGateway', label: 'BFF', x: 40, y: 50, badge: 'idle' },
      { id: 'profile', kind: 'server', label: 'Profile', x: 78, y: 16 },
      { id: 'feed', kind: 'server', label: 'Feed', x: 84, y: 50 },
      { id: 'notifs', kind: 'server', label: 'Notifications', x: 78, y: 84 },
    ],
    edges: [
      { id: 'm-bff', from: 'mobile', to: 'bff' },
      { id: 'bff-p', from: 'bff', to: 'profile', curve: -0.25 },
      { id: 'bff-f', from: 'bff', to: 'feed' },
      { id: 'bff-n', from: 'bff', to: 'notifs', curve: 0.25 },
      { id: 'bff-m', from: 'bff', to: 'mobile', curve: 0.5 },
    ],
    steps: [
      { id: '1', caption: 'Without a BFF the phone makes six calls, each paying a 150 ms mobile round trip.', travel: 'm-bff', token: 'request', patches: [{ nodeId: 'mobile', badge: '6 × 150 ms', highlight: true }], state: { 'client calls': 6, latency: '900 ms', mode: 'chatty' } },
      { id: '2', caption: 'With a BFF the client makes one call. The expensive link is crossed once.', travel: 'm-bff', token: 'request', codeLine: 1, patches: [{ nodeId: 'bff', badge: 'fanning out', highlight: true }], state: { 'client calls': 1, mode: 'aggregated' } },
      { id: '3', caption: 'The BFF fans out in parallel — datacentre-local calls, a few milliseconds each.', travel: 'bff-p', token: 'request', codeLine: 3, patches: [{ nodeId: 'profile', badge: '12 ms ✓', highlight: true }] },
      { id: '4', caption: 'Total latency is the slowest call, not the sum — provided they truly run concurrently.', travel: 'bff-f', token: 'request', codeLine: 4, patches: [{ nodeId: 'feed', badge: '180 ms ✓', highlight: true }], state: { latency: '~180 ms' } },
      { id: '5', caption: 'Notifications time out at 150 ms. The deadline is what stops one service stalling the page.', travel: 'bff-n', token: 'miss', codeLine: 5, patches: [{ nodeId: 'notifs', badge: '✗ timeout', highlight: true }], state: { 'failed parts': 1 } },
      { id: '6', caption: 'It is an optional section, so the BFF returns the page without it rather than failing.', codeLine: 8, patches: [{ nodeId: 'bff', badge: 'partial ✓', highlight: true }] },
      { id: '7', caption: 'One round trip, 180 ms, a degraded section instead of an error screen.', travel: 'bff-m', token: 'response', codeLine: 8, state: { latency: '~180 ms', 'client calls': 1, mode: 'degraded ok' } },
    ],
  },
  deepDive: {
    readingMinutes: 8,
    intro: [
      'Microservices give each team a clean, narrow API. Clients then need six of them to render one screen — and on a mobile network each of those calls costs 100–200 ms of round trip before any work happens. Aggregation moves that fan-out to the server, where the calls are local and cheap.',
      'The **Backend for Frontend** takes it further: rather than one shared aggregation layer serving everyone badly, each client type gets its own gateway, owned by the team that builds that client and shaped exactly for its screens.',
    ],
    sections: [
      {
        id: 'why',
        heading: 'The arithmetic that justifies it',
        blocks: [
          {
            kind: 'math',
            rows: [
              { label: 'Mobile RTT (4G)', value: '~100–200 ms' },
              { label: 'Datacentre-internal RTT', value: '~0.5 ms' },
              { label: '6 sequential client calls', value: '~900 ms', note: 'before any server work' },
              { label: '1 client call + 6 parallel server calls', value: '~180 ms' },
              { label: 'Improvement', value: '5×' },
              { label: 'Bytes saved (headers, TLS, cookies × 5)', value: '~10 KB' },
            ],
            result: 'The win is removing round trips over the slow link, not reducing total work.',
          },
          {
            kind: 'prose',
            body: [
              'The critical detail is **parallel, not sequential**. Aggregating six calls that run one after another gives you the same latency as before plus an extra hop. Fan-out must be concurrent, and any dependency between calls (fetch the user, then their orders) becomes a serialised stage that you should try to remove by denormalising.',
            ],
          },
        ],
      },
      {
        id: 'tail',
        heading: 'Aggregation imports every dependency’s tail',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A parallel fan-out is only as fast as its slowest member, so the aggregate p99 is the **maximum** of six distributions — much worse than any individual one. This is tail amplification, and it is the cost that pays for the round trips you saved.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Per-service chance of exceeding p99', value: '1%' },
              { label: 'Calls in the fan-out', value: '6' },
              { label: 'Chance at least one is slow', value: '~5.9%' },
              { label: 'With 20 calls', value: '~18%' },
              { label: 'Aggregate p99 with 6 calls', value: '≈ each service’s p99.8' },
            ],
            result: 'Your users experience the tail of every service you call, combined.',
          },
          {
            kind: 'list',
            items: [
              '**Per-call deadlines, derived from a request budget.** If the page must render in 500 ms, allocate each call a slice and cancel anything that exceeds it.',
              '**Classify calls as required or optional.** A missing profile is fatal; missing notifications is a hidden section. Optional calls must never fail the response.',
              '**Propagate the deadline downstream** so services can abandon work nobody will wait for, rather than completing it after the caller gave up.',
              '**Cache aggressively per fragment.** The profile changes rarely; caching it removes it from the fan-out entirely most of the time.',
              '**Hedge the slow ones.** For read-only calls, issue a second request after the p95 and take whichever returns first.',
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'A required call with no timeout makes the BFF a liability',
            body: [
              'Without deadlines, the aggregator holds a client connection and a worker for as long as the slowest dependency takes. One degraded service then exhausts the BFF, which fails every screen — including those that did not need it. The BFF concentrates risk unless every call is bounded.',
            ],
          },
        ],
      },
      {
        id: 'bff',
        heading: 'Why one BFF per client, not one for all',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A single shared aggregation layer accumulates every client\'s requirements. Mobile wants a small payload, web wants richer data, the smart TV wants a different shape entirely — and the shared layer grows conditionals, versions and a queue of competing change requests owned by a team that builds none of those clients.',
              'A BFF inverts the ownership: the mobile team owns the mobile BFF and can change it in the same pull request as the app. The API is allowed to be **exactly** what one client needs, because nobody else uses it.',
            ],
          },
          {
            kind: 'table',
            columns: ['', 'Shared aggregation gateway', 'BFF per client'],
            rows: [
              ['Ownership', 'Platform team — a bottleneck', 'Client team — ships with the client'],
              ['API shape', 'Compromise across clients', 'Tailored, no conditionals'],
              ['Change velocity', 'Cross-team coordination', 'One team, one deploy'],
              ['Duplication', 'None', 'Some logic repeated per BFF'],
              ['Operational surface', 'One service', 'One per client type'],
            ],
            caption: 'BFFs trade some duplication for the removal of a cross-team dependency — usually a good trade.',
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'GraphQL is a BFF with a query language',
            body: [
              'GraphQL solves the same problem differently: instead of the server defining the aggregate shape, the client asks for exactly the fields it needs. The trade is that you inherit query cost control, caching difficulty and the N+1 resolver problem — dataloader-style batching is not optional at scale.',
            ],
          },
        ],
      },
      {
        id: 'boundaries',
        heading: 'Keeping the BFF from becoming a monolith',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Orchestration, not business logic.** Call services, shape responses, handle partial failure. The moment it applies pricing rules or validates a domain invariant, it has become a service that must be deployed with the others.',
              '**No direct database access.** A BFF that queries a service\'s database bypasses that service\'s invariants and couples deployments permanently.',
              '**No shared BFF code that encodes domain rules.** Sharing HTTP clients and tracing is fine; sharing "how to compute an order total" is not.',
              '**Own the client contract, not the service contracts.** When a downstream service changes, the BFF absorbs it so the client does not have to.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'A single client on a low-latency network — the extra hop and service buy little.',
      'When downstream calls are inherently sequential; aggregation then adds a hop without removing round trips.',
      'As a shared layer across very different clients, which recreates the coordination bottleneck it was meant to remove.',
      'For business logic or data ownership — that belongs in the services.',
    ],
    failureModes: [
      {
        name: 'Sequential fan-out',
        symptom: 'Aggregation made things slower, not faster.',
        cause: 'Calls awaited one at a time instead of concurrently.',
        fix: 'Gather all independent calls in parallel; remove artificial dependencies by denormalising.',
      },
      {
        name: 'One slow dependency fails every screen',
        symptom: 'An unrelated service degrades and the whole app errors.',
        cause: 'No per-call deadline, and optional data treated as required.',
        fix: 'Per-call timeouts from a request budget, optional-call degradation, and circuit breaking.',
      },
      {
        name: 'BFF becomes a distributed monolith',
        symptom: 'Every service change requires a BFF change and coordinated deploy.',
        cause: 'Business logic and domain rules accumulated in the aggregation layer.',
        fix: 'Restrict it to orchestration and shaping; push rules back into services.',
      },
      {
        name: 'Tail amplification',
        symptom: 'Aggregate p99 far worse than any single service’s p99.',
        cause: 'Fan-out latency is the maximum across calls.',
        fix: 'Reduce fan-out, cache fragments, hedge read-only calls, and enforce deadlines.',
      },
    ],
    interview: [
      {
        q: 'Your mobile app needs six services to render the home screen. What do you do?',
        a: [
          'Aggregate server-side. Each client call on a mobile network costs a hundred to two hundred milliseconds of round trip, so six of them is close to a second before any work happens; the same six calls made inside the datacentre cost a fraction of a millisecond each.',
          'I would fan them out concurrently so total latency is the slowest call rather than the sum, and give each a deadline drawn from an overall request budget.',
          'Critically, I would classify calls as required or optional, so a slow notifications service degrades one section instead of failing the whole screen.',
        ],
        followUps: ['What happens to your p99 when you fan out to six services?'],
      },
      {
        q: 'What is a BFF and why not one shared gateway?',
        a: [
          'A Backend for Frontend is an aggregation layer owned by the team that builds a specific client and shaped for that client\'s screens. Mobile gets one, web gets another.',
          'A single shared layer accumulates every client\'s requirements and becomes a compromise API full of conditionals, owned by a platform team that becomes a bottleneck for every client change.',
          'The cost is some duplicated orchestration across BFFs, which is usually much cheaper than the cross-team coordination it removes.',
        ],
      },
      {
        q: 'How do you stop aggregation from making tail latency worse?',
        a: [
          'By accepting that it will, and bounding it. A parallel fan-out is as slow as its slowest member, so the aggregate p99 approximates each service\'s p99.8 with six calls.',
          'I would cut fan-out where possible by caching stable fragments, enforce per-call deadlines propagated downstream so services abandon abandoned work, and hedge read-only calls — issue a duplicate after the p95 and take the first response.',
          'Then I would render partial results, because a page missing one section beats a page that arrives late or not at all.',
        ],
      },
    ],
    references: [
      { label: 'Sam Newman — Backends For Frontends', href: 'https://samnewman.io/patterns/architectural/bff/' },
      { label: 'Microsoft — Gateway Aggregation pattern', href: 'https://learn.microsoft.com/en-us/azure/architecture/patterns/gateway-aggregation' },
    ],
  },
}

// ── 4. Resilience at the edge ────────────────────────────────────────────────

const resilience: Lesson = {
  slug: 'api-gateway-resilience',
  title: 'Timeouts, Retries & Circuit Breaking',
  summary: 'Stop a failing service from consuming every thread you own.',
  group: 'building-blocks',
  topic: 'API Gateway',
  tier: 'pro',
  minutes: 8,
  concept: 'Resilience',
  tags: [
    { label: 'Bound', value: 'Every call has a deadline' },
    { label: 'Isolate', value: 'Pool per dependency' },
    { label: 'Stop', value: 'Open the circuit' },
  ],
  notes: [
    'A slow dependency is more dangerous than a dead one — it holds your resources instead of releasing them.',
    'Timeouts bound the damage, bulkheads contain it, circuit breakers stop feeding it.',
    'Retries without a budget turn a partial failure into a total one.',
  ],
  scene: {
    code: [
      'circuit = CircuitBreaker(',
      '    failure_threshold=0.5,   # 50% errors',
      '    volume=20,               # min requests',
      '    open_for=30s,',
      ')',
      '',
      'if circuit.open: return fallback()   # fail fast',
      'with pool(svc, max=20), deadline(300ms):',
      '    return svc.call(request)',
    ],
    initialState: { state: 'closed', 'error rate': '0%', 'threads held': 12, latency: '40 ms' },
    nodes: [
      { id: 'client', kind: 'client', label: 'Clients', x: 10, y: 50 },
      { id: 'gw', kind: 'apiGateway', label: 'Gateway', x: 38, y: 50, badge: '200 threads' },
      { id: 'breaker', kind: 'rateLimiter', label: 'Circuit', x: 64, y: 50, badge: 'closed' },
      { id: 'svc', kind: 'server', label: 'Recommendations', x: 90, y: 26, badge: 'healthy' },
      { id: 'core', kind: 'server', label: 'Orders', x: 90, y: 76, badge: 'healthy' },
    ],
    edges: [
      { id: 'c-gw', from: 'client', to: 'gw' },
      { id: 'gw-b', from: 'gw', to: 'breaker' },
      { id: 'b-svc', from: 'breaker', to: 'svc', curve: -0.25 },
      { id: 'gw-core', from: 'gw', to: 'core', curve: 0.35 },
      { id: 'gw-c', from: 'gw', to: 'client', curve: 0.5 },
    ],
    steps: [
      { id: '1', caption: 'Normal operation: recommendations answer in 40 ms and threads are released quickly.', travel: 'b-svc', token: 'request', patches: [{ nodeId: 'svc', badge: '40 ms ✓', highlight: true }], state: { latency: '40 ms', 'threads held': 12 } },
      { id: '2', caption: 'The service degrades to 30 seconds per call. It is not down — it is worse than down.', travel: 'b-svc', token: 'miss', patches: [{ nodeId: 'svc', badge: '30 s ⚠', highlight: true }], state: { latency: '30 s' } },
      { id: '3', caption: "By Little's Law, in-flight requests explode at the same traffic. Threads fill up.", patches: [{ nodeId: 'gw', badge: '200/200 threads ✗', highlight: true }], state: { 'threads held': 200 } },
      { id: '4', caption: 'Orders is perfectly healthy but cannot get a thread. One slow dependency broke everything.', travel: 'gw-core', token: 'miss', patches: [{ nodeId: 'core', badge: 'starved ✗', highlight: true }] },
      { id: '5', caption: 'Fix 1 — a 300 ms deadline. Requests fail fast and release their thread.', travel: 'b-svc', token: 'miss', codeLine: 8, patches: [{ nodeId: 'gw', badge: '20 threads held', highlight: true }], state: { 'threads held': 20, latency: '300 ms cap' } },
      { id: '6', caption: 'Fix 2 — a bulkhead: at most 20 threads may ever wait on this one dependency.', codeLine: 8, patches: [{ nodeId: 'core', badge: 'unaffected ✓', highlight: true }] },
      { id: '7', caption: 'Fix 3 — errors pass 50%, so the circuit opens and calls fail instantly with a fallback.', travel: 'gw-c', token: 'hit', codeLine: 7, patches: [{ nodeId: 'breaker', badge: 'OPEN', highlight: true }, { nodeId: 'svc', badge: 'no traffic' }], state: { state: 'open', 'error rate': '52%', 'threads held': 12 } },
    ],
  },
  deepDive: {
    readingMinutes: 9,
    intro: [
      'The gateway sits in front of everything, which makes it the best place to contain failure and the worst place to let it spread. The governing insight is that **a slow dependency is more dangerous than a dead one**: a dead service returns instantly and releases your resources, while a slow one holds them.',
      'Three mechanisms, applied together, turn "a downstream service degraded" into "one feature degraded": bound each call, isolate each dependency, and stop calling something that is already failing.',
    ],
    sections: [
      {
        id: 'timeouts',
        heading: 'Timeouts: the bound that makes everything else possible',
        blocks: [
          {
            kind: 'prose',
            body: [
              "Little's Law explains the mechanism precisely. Concurrency equals arrival rate times latency, so if latency rises from 40 ms to 30 seconds at constant traffic, in-flight requests rise by the same factor — 750×. Your thread pool, connection pool and memory were sized for the first number.",
              'A timeout caps latency, and therefore caps concurrency. It is the single highest-value line of configuration in a distributed system, and the most commonly missing one because most HTTP client libraries default to no timeout at all.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Request rate', value: '400 /s' },
              { label: 'Normal latency', value: '40 ms' },
              { label: 'Concurrency (normal)', value: '16' },
              { label: 'Degraded latency', value: '30,000 ms' },
              { label: 'Concurrency (degraded)', value: '12,000' },
              { label: 'Available threads', value: '200' },
              { label: 'With a 300 ms timeout', value: '120 concurrent', note: 'survivable' },
            ],
            result: 'The timeout, not the dependency, decides whether you stay up.',
          },
          {
            kind: 'list',
            items: [
              '**Set connect and read timeouts separately.** A connect timeout should be small (100–500 ms); a read timeout matches the operation\'s realistic p99.',
              '**Derive from a budget, not from a guess.** If the client expects a response in 1 s, the gateway budget might be 900 ms, split across calls with a margin.',
              '**Inner timeouts must be shorter than outer ones.** If the gateway waits 5 s and the client gives up at 2 s, you are doing three seconds of work nobody will read.',
              '**Propagate the deadline** as a header so downstream services can abandon work whose caller has already timed out.',
            ],
          },
        ],
      },
      {
        id: 'bulkheads',
        heading: 'Bulkheads: contain the damage to one feature',
        blocks: [
          {
            kind: 'prose',
            body: [
              'A timeout limits how long one call holds a resource; a **bulkhead** limits how many can hold it at once. Named after ship compartments, it means giving each dependency its own bounded pool of connections or permits, so exhausting one cannot starve the others.',
              'Without bulkheads, a shared thread pool means the least important dependency can consume every thread and take down the most important path. That is the exact shape of the outage in the animation: recommendations, an optional feature, starving orders.',
            ],
          },
          {
            kind: 'code',
            language: 'python',
            caption: 'bulkhead.py — per-dependency permits, with a fast rejection',
            lines: [
              'POOLS = {',
              '    "orders":          Semaphore(80),   # critical: generous',
              '    "recommendations": Semaphore(20),   # optional: capped',
              '    "search":          Semaphore(40),',
              '}',
              '',
              'def call(service, request, deadline_ms):',
              '    pool = POOLS[service]',
              '    # Do not queue forever for a permit — that is the exhaustion again.',
              '    if not pool.acquire(timeout=0.05):',
              '        raise Overloaded(service)          # shed immediately',
              '    try:',
              '        return http.request(service, request, timeout=deadline_ms / 1000)',
              '    finally:',
              '        pool.release()',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Size bulkheads by importance, not by traffic',
            body: [
              'An optional feature should get a small pool precisely because it is optional — you are deciding in advance how much of your capacity it may consume when it misbehaves. Sizing pools proportionally to normal traffic gives the noisiest dependency the biggest share of your failure budget.',
            ],
          },
        ],
      },
      {
        id: 'breakers',
        heading: 'Circuit breakers: stop calling what is already broken',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Timeouts and bulkheads still pay the full timeout on every request. A circuit breaker removes even that: after enough failures, it stops calling the dependency entirely and fails instantly, which both protects you and gives the struggling service room to recover.',
              'It is a three-state machine. **Closed**: calls flow, failures are counted. **Open**: calls fail immediately with a fallback. **Half-open**: after a cooldown, a few probe requests are allowed; success closes the circuit, failure re-opens it.',
            ],
          },
          {
            kind: 'table',
            columns: ['Parameter', 'Typical value', 'Getting it wrong'],
            rows: [
              ['Failure threshold', '50% error rate', 'Too low: trips on normal noise'],
              ['Minimum volume', '20 requests', 'Unset: 1 failure out of 1 trips the circuit'],
              ['Open duration', '30 s', 'Too long: outage extends past recovery'],
              ['Half-open probes', '1–5 requests', 'Too many: re-floods a recovering service'],
              ['What counts as failure', '5xx, timeouts, rejections', 'Counting 4xx: client bugs open the circuit'],
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'A minimum request volume is not optional',
            body: [
              'Without it, a single failed request on a low-traffic endpoint is a 100% error rate and trips the breaker, cutting off a healthy service. Every production circuit breaker needs both a rate threshold and a minimum sample size before it may act.',
            ],
          },
        ],
      },
      {
        id: 'retries',
        heading: 'Retries: the mechanism that makes it worse',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Retries are the one resilience tool that **increases** load precisely when the system is least able to take it. Used carefully they hide transient failures; used carelessly they convert a 50% failure rate into several times normal traffic and prevent recovery.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Normal traffic', value: '10,000 /s' },
              { label: 'Failure rate during incident', value: '50%' },
              { label: 'Gateway retries', value: '3' },
              { label: 'Client also retries', value: '3' },
              { label: 'Effective load', value: '~55,000 /s', note: 'multiplicative' },
              { label: 'With a 10% retry budget', value: '~11,000 /s' },
            ],
            result: 'Nested retries are the classic amplifier; a budget is the classic fix.',
          },
          {
            kind: 'list',
            items: [
              '**Retry only idempotent operations** — or non-idempotent ones carrying an idempotency key.',
              '**Cap retries as a percentage of traffic** (a retry budget), so a broad failure cannot multiply load.',
              '**Full jitter backoff**, never fixed intervals — synchronised retries are a self-inflicted thundering herd.',
              '**Retry at one layer only.** Pick the layer closest to the user that can act on the result.',
              '**Never retry when the circuit is open**; that is the entire point of the circuit.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'The three mechanisms answer three different questions',
            body: [
              'Timeout: how long may one call hold a resource? Bulkhead: how many may hold it at once? Circuit breaker: should we call at all? Presenting them that way shows you understand why all three are needed rather than reciting a list of patterns.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Circuit breakers on very low-traffic endpoints, where the sample size is too small for a meaningful error rate.',
      'Retries on non-idempotent operations without an idempotency key — you are choosing duplicates over an error.',
      'Aggressive timeouts on genuinely long operations; make those asynchronous instead of failing them repeatedly.',
      'Bulkheads so small they reject during normal peaks — that is a self-imposed outage.',
    ],
    failureModes: [
      {
        name: 'Thread pool exhaustion from a slow dependency',
        symptom: 'Unrelated endpoints fail while CPU is idle.',
        cause: 'No timeout, so in-flight requests grow with latency until the pool is consumed.',
        fix: 'Read timeouts derived from a request budget, plus per-dependency bulkheads.',
      },
      {
        name: 'Circuit flapping',
        symptom: 'The breaker opens and closes repeatedly, causing erratic errors.',
        cause: 'Threshold too sensitive, no minimum volume, or too many half-open probes.',
        fix: 'Add a minimum request volume, widen the window, and allow only a few probes.',
      },
      {
        name: 'Retry storm',
        symptom: 'Load climbs after a failure begins and does not fall when the cause clears.',
        cause: 'Retries at multiple layers, unjittered, with no budget.',
        fix: 'One retry layer, full jitter, a retry budget, and no retries while the circuit is open.',
      },
      {
        name: 'Timeout longer than the caller’s',
        symptom: 'Work completes for requests the client abandoned long ago.',
        cause: 'Inner timeouts exceeding outer ones; no deadline propagation.',
        fix: 'Budget deadlines top-down and pass them downstream so services can cancel.',
      },
    ],
    interview: [
      {
        q: 'A downstream service slows from 40 ms to 30 seconds. What happens to your gateway?',
        a: [
          "By Little's Law, concurrency is arrival rate times latency, so at constant traffic a 750× latency increase means 750× more in-flight requests. The thread and connection pools were sized for the fast case, so they fill and the gateway stops serving everything — including endpoints that never touch that service.",
          'That is why a slow dependency is more dangerous than a dead one: a dead one returns instantly and releases resources.',
          'The fix is layered: a timeout to cap how long a call holds a thread, a bulkhead so this dependency can never consume more than a fixed share, and a circuit breaker so we stop calling it at all once it is clearly failing.',
        ],
        followUps: ['How would you size the bulkhead for an optional feature?'],
      },
      {
        q: 'How do you configure a circuit breaker?',
        a: [
          'An error-rate threshold around 50%, but crucially with a minimum request volume — something like twenty requests in the window — otherwise one failure on a quiet endpoint is a 100% error rate and cuts off a healthy service.',
          'Then an open duration long enough for the dependency to recover, perhaps thirty seconds, followed by half-open with only a handful of probe requests so we do not re-flood something that is still fragile.',
          'I would count timeouts, 5xx and rejections as failures but not 4xx, since client errors say nothing about the dependency\'s health.',
        ],
      },
      {
        q: 'When are retries harmful?',
        a: [
          'When the failure is not transient. During a broad degradation, retries multiply load exactly when the system can least absorb it, and if several layers each retry, the multiplication compounds — three layers retrying three times is twenty-seven requests for one.',
          'I would keep retries at a single layer, cap them as a small percentage of overall traffic with a retry budget, use full-jitter backoff so clients do not synchronise, and never retry while the circuit is open.',
          'And only for idempotent operations, or ones carrying an idempotency key.',
        ],
      },
    ],
    references: [
      { label: 'Release It! — Stability patterns (Nygard)', href: 'https://pragprog.com/titles/mnee2/release-it-second-edition/' },
      { label: 'Envoy — Circuit breaking and outlier detection', href: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking' },
    ],
  },
}

// ── 5. Versioning & traffic shifting ─────────────────────────────────────────

const versioning: Lesson = {
  slug: 'api-gateway-versioning',
  title: 'Versioning, Canaries & the Strangler',
  summary: 'Change the backend without a client migration — the gateway is the seam.',
  group: 'building-blocks',
  topic: 'API Gateway',
  tier: 'pro',
  minutes: 7,
  concept: 'Migration',
  tags: [
    { label: 'Shift', value: 'By weight or header' },
    { label: 'Verify', value: 'Shadow traffic' },
    { label: 'Pattern', value: 'Strangler fig' },
  ],
  notes: [
    'Clients you do not control can never be migrated on your schedule — the gateway absorbs the difference.',
    'Shadow traffic lets you run a new implementation against real load with zero user risk.',
    'Canary by weight, watch error rate and latency at each step, and keep rollback one config change away.',
  ],
  scene: {
    code: [
      'routes:',
      '  - match: /api/orders',
      '    split:',
      '      - cluster: orders-v1   weight: 99',
      '      - cluster: orders-v2   weight: 1',
      '    mirror:',
      '      cluster: orders-v2     # shadow, response discarded',
    ],
    initialState: { v1: '100%', v2: '0%', 'v2 errors': '—', mode: 'steady' },
    nodes: [
      { id: 'clients', kind: 'client', label: 'Clients', x: 10, y: 50 },
      { id: 'gw', kind: 'apiGateway', label: 'Gateway', x: 40, y: 50, badge: 'v1 100%' },
      { id: 'v1', kind: 'server', label: 'orders v1', x: 78, y: 24, badge: 'stable' },
      { id: 'v2', kind: 'server', label: 'orders v2', x: 78, y: 76, badge: 'new' },
      { id: 'db', kind: 'database', label: 'Orders DB', x: 96, y: 50 },
    ],
    edges: [
      { id: 'c-gw', from: 'clients', to: 'gw' },
      { id: 'gw-v1', from: 'gw', to: 'v1', curve: -0.25 },
      { id: 'gw-v2', from: 'gw', to: 'v2', curve: 0.25 },
      { id: 'v1-db', from: 'v1', to: 'db', curve: -0.2 },
      { id: 'v2-db', from: 'v2', to: 'db', curve: 0.2 },
    ],
    steps: [
      { id: '1', caption: 'All traffic goes to v1. Clients address the gateway, not the service — that is the seam.', travel: 'gw-v1', token: 'request', codeLine: 2, patches: [{ nodeId: 'v1', badge: '100%', highlight: true }], state: { v1: '100%', v2: '0%' } },
      { id: '2', caption: 'First, mirror traffic to v2: real requests, real load, responses thrown away.', travel: 'gw-v2', token: 'write', codeLine: 7, patches: [{ nodeId: 'v2', badge: 'shadow', highlight: true }], state: { mode: 'shadow' } },
      { id: '3', caption: 'Compare v2 responses against v1 offline. Users are unaffected by anything it gets wrong.', patches: [{ nodeId: 'v2', badge: 'diff: 0.02%', highlight: true }], state: { 'v2 errors': '0.02%' } },
      { id: '4', caption: 'Now send 1% of real traffic. One config change, no deploy, instant rollback.', travel: 'gw-v2', token: 'request', codeLine: 5, patches: [{ nodeId: 'gw', badge: 'v1 99% · v2 1%', highlight: true }], state: { v1: '99%', v2: '1%', mode: 'canary' } },
      { id: '5', caption: 'Error rate on v2 spikes. The gateway shifts it straight back to zero.', travel: 'gw-v2', token: 'miss', patches: [{ nodeId: 'v2', badge: '✗ 4% errors', highlight: true }], state: { 'v2 errors': '4%', v2: '0%', v1: '100%' } },
      { id: '6', caption: 'After a fix, ramp again: 1%, 10%, 50%. Each step is watched before the next.', travel: 'gw-v2', token: 'hit', patches: [{ nodeId: 'v2', badge: '50% ✓', highlight: true }], state: { v1: '50%', v2: '50%', 'v2 errors': '0.01%' } },
      { id: '7', caption: 'v2 takes 100%. v1 stays deployed for a soak period, still one config change away.', patches: [{ nodeId: 'v2', badge: '100% ✓', highlight: true }, { nodeId: 'v1', badge: 'standby' }], state: { v1: '0%', v2: '100%', mode: 'migrated' } },
    ],
  },
  deepDive: {
    readingMinutes: 8,
    intro: [
      'The most durable argument for a gateway is not authentication or rate limiting — it is that **clients address the gateway rather than your services**. That indirection is a seam, and a seam is what lets you split, rewrite, rename or replace a backend without asking anyone to update their client.',
      'This matters most where you have the least control: mobile apps that users may never update, partner integrations, and public APIs whose consumers you cannot even enumerate.',
    ],
    sections: [
      {
        id: 'versioning',
        heading: 'Where the version lives',
        blocks: [
          {
            kind: 'table',
            columns: ['Scheme', 'Example', 'Pros', 'Cons'],
            rows: [
              ['URL path', '`/v2/orders`', 'Obvious, cacheable, easy to route', 'Version leaks into every URL; hard to retire'],
              ['Header', '`Accept: application/vnd.api.v2+json`', 'Clean URLs, content negotiation', 'Invisible in logs and browsers; easy to forget'],
              ['Query parameter', '`/orders?version=2`', 'Trivial to add', 'Fragments caches; often stripped by proxies'],
              ['Date-based', '`API-Version: 2026-03-01`', 'Precise, used by Stripe', 'Requires per-version transformation layers'],
            ],
          },
          {
            kind: 'prose',
            body: [
              'The scheme matters less than the discipline: **never change behaviour within a version**. Additive changes — new optional fields, new endpoints — are safe. Renaming a field, tightening validation, or changing a default is a breaking change even when the code compiles, because a client somewhere depends on it.',
              'Stripe\'s date-based approach is worth knowing as the gold standard: each account is pinned to the version it integrated against, and the gateway applies a chain of transformations to translate current responses back to that version. New customers get the newest API; nobody is ever forced to migrate. The cost is maintaining every transformation forever.',
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'Version the contract, not the service',
            body: [
              '`/v1/orders` and `/v2/orders` do not need to be two versions of one codebase — they can be two entirely different services, or the same service with a translation layer at the edge. Keeping the version at the gateway means internal architecture is free to change without touching the client-facing version at all.',
            ],
          },
        ],
      },
      {
        id: 'shifting',
        heading: 'Shifting traffic safely',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Because the gateway decides per request where traffic goes, deployment and release become separable. Code can be deployed to production and receive no traffic; releasing it is then a configuration change measured in seconds, not a deploy measured in minutes.',
            ],
          },
          {
            kind: 'list',
            ordered: true,
            items: [
              '**Shadow (mirror) first.** Send a copy of real traffic to the new version and discard its responses. You get real load, real data shapes and real edge cases with zero user risk. Compare responses offline to find behavioural differences before anyone experiences them.',
              '**Canary by weight.** 1%, then 10%, then 50%, watching error rate, latency and business metrics at each step. Hold at each level long enough for slow-burning problems to appear.',
              '**Sticky the canary.** Route a user consistently to one version for their session, or they will see inconsistent behaviour across requests.',
              '**Define rollback triggers in advance.** "Error rate above 1% or p99 above 400 ms rolls back automatically" beats a judgement call made at 2 a.m.',
              '**Soak before retiring the old path.** Keep v1 deployed and reachable for days after the shift; the config to return is one line.',
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'Mirrored traffic still writes',
            body: [
              'Shadowing a read-only endpoint is safe. Shadowing anything that writes will double every side effect — duplicate orders, duplicate emails, duplicate charges. Either mirror only reads, or run the shadow against an isolated datastore and accept that you are testing less.',
            ],
          },
        ],
      },
      {
        id: 'strangler',
        heading: 'The strangler fig pattern',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Named after a vine that grows around a tree and eventually replaces it, the strangler pattern decomposes a monolith **one route at a time**. The gateway sits in front of the monolith and initially forwards everything to it. Then, endpoint by endpoint, routes are redirected to new services.',
              'The advantage over a rewrite is that every step is small, independently verifiable and independently revertible. There is no big-bang cutover, and the migration can pause indefinitely without leaving the system in a broken state.',
            ],
          },
          {
            kind: 'code',
            language: 'yaml',
            caption: 'A strangler migration in progress — the route table is the record of it',
            lines: [
              'routes:',
              '  - match: { prefix: "/api/orders" }',
              '    cluster: orders-service        # extracted ✓',
              '',
              '  - match: { prefix: "/api/payments" }',
              '    split:',
              '      - { cluster: monolith,          weight: 90 }',
              '      - { cluster: payments-service,  weight: 10 }   # extracting…',
              '',
              '  - match: { prefix: "/api/" }',
              '    cluster: monolith              # everything not yet extracted',
              '',
              '# The catch-all last rule is what makes this incremental:',
              '# extracting a route is adding a more specific rule above it.',
            ],
          },
          {
            kind: 'prose',
            body: [
              'The hard part is rarely the routing — it is the **data**. A route can move in a config change; the tables behind it usually cannot. The common sequence is to extract the service while it still reads the monolith\'s database, then migrate the data with dual-writes and verification, then cut the read path. Trying to do both at once is how strangler migrations stall.',
            ],
          },
        ],
      },
      {
        id: 'deprecation',
        heading: 'Retiring a version without breaking people',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Measure who is still using it.** Per-version, per-client traffic metrics turn "can we retire v1?" from a debate into a query.',
              '**Announce with a `Deprecation` and `Sunset` header**, so tooling and diligent clients see it automatically rather than relying on an email nobody read.',
              '**Brownouts before blackouts.** Deliberately fail the old version for short windows on a schedule — an hour, then a day — so remaining users discover the dependency while you are watching, not during your holiday.',
              '**Keep the last few percent in mind.** There is always a long tail of clients that cannot update. Decide early whether you will support them forever, force them off, or offer a paid legacy tier.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Separate deploy from release',
            body: [
              'The sentence that lands well: "with the gateway owning routing, deploying is not releasing — code can be in production taking zero traffic, and releasing it is a weighted config change I can revert in seconds." It reframes risk in a way most candidates never articulate.',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Internal APIs where you control every client and can coordinate a change — versioning overhead buys little.',
      'Shadow traffic on write endpoints without an isolated datastore; you will duplicate side effects.',
      'Canary releases without per-version observability — shifting traffic you cannot measure is guessing.',
      'Maintaining many concurrent versions indefinitely; each one is permanent cost in code and testing.',
    ],
    failureModes: [
      {
        name: 'Duplicated side effects from mirroring',
        symptom: 'Double orders or duplicate emails appear after enabling shadow traffic.',
        cause: 'Write endpoints mirrored to a service sharing the production datastore.',
        fix: 'Mirror reads only, or point the shadow at an isolated database.',
      },
      {
        name: 'Inconsistent canary experience',
        symptom: 'Users see features appear and disappear between requests.',
        cause: 'Weighted routing applied per request rather than per session.',
        fix: 'Hash a stable identifier so a user sticks to one version for the session.',
      },
      {
        name: 'Silent breaking change within a version',
        symptom: 'Client integrations break without any version bump.',
        cause: 'A field renamed, a default changed, or validation tightened in place.',
        fix: 'Additive-only changes within a version; contract tests in CI against recorded client expectations.',
      },
      {
        name: 'Strangler migration stalls',
        symptom: 'Half the routes are extracted and the monolith never shrinks.',
        cause: 'Data was never migrated, so new services still depend on the monolith\'s database.',
        fix: 'Treat data extraction as the real work — dual-write, verify, then cut over, one aggregate at a time.',
      },
    ],
    interview: [
      {
        q: 'How would you roll out a rewritten service safely?',
        a: [
          'I would start with shadow traffic: mirror real requests to the new service and discard the responses, then compare them against the old service offline. That exercises real load and real data shapes with zero user risk — provided the endpoints are reads, or the shadow has its own datastore.',
          'Then canary by weight through the gateway — one percent, ten, fifty — with automatic rollback triggers defined in advance on error rate and latency, and sticky routing so a user does not bounce between versions.',
          'Finally I would keep the old version deployed through a soak period, because rollback then remains a config change rather than a redeploy.',
        ],
        followUps: ['What breaks if you shadow a POST endpoint?'],
      },
      {
        q: 'How do you version a public API?',
        a: [
          'Whatever the scheme — path, header or date — the discipline matters more: never change behaviour within a version. Additive changes are safe; renaming a field or tightening validation is breaking even if nothing fails to compile.',
          'For a public API with clients I cannot enumerate, I like Stripe\'s date-based approach: pin each account to the version it integrated against and apply transformation layers to translate current responses backwards. Nobody is forced to migrate, at the cost of maintaining those transformations.',
          'I would also instrument per-version usage, because retiring a version is a data question, not an opinion.',
        ],
      },
      {
        q: 'How would you break up a monolith?',
        a: [
          'With a strangler pattern anchored at the gateway. Put the gateway in front with a catch-all route to the monolith, then extract one endpoint at a time by adding a more specific route above it.',
          'Every step is small, independently verifiable and revertible, and the migration can pause indefinitely without leaving anything half-broken — unlike a rewrite.',
          'The real work is data rather than routing: I would extract the service while it still reads the monolith\'s database, then dual-write and verify before cutting the read path. Attempting code and data extraction simultaneously is how these migrations stall.',
        ],
      },
    ],
    references: [
      { label: 'Martin Fowler — StranglerFigApplication', href: 'https://martinfowler.com/bliki/StranglerFigApplication.html' },
      { label: 'Stripe — API versioning', href: 'https://stripe.com/blog/api-versioning' },
    ],
  },
}

// ── 6. Gateway vs service mesh ───────────────────────────────────────────────

const serviceMesh: Lesson = {
  slug: 'api-gateway-service-mesh',
  title: 'Gateway vs Service Mesh',
  summary: 'North-south traffic at the door, east-west traffic between every pair of services.',
  group: 'building-blocks',
  topic: 'API Gateway',
  tier: 'pro',
  minutes: 7,
  concept: 'Architecture',
  tags: [
    { label: 'Gateway', value: 'North-south' },
    { label: 'Mesh', value: 'East-west' },
    { label: 'Mesh cost', value: 'A proxy per pod' },
  ],
  notes: [
    'A gateway governs traffic entering the system; a mesh governs traffic between services inside it.',
    'The mesh moves retries, mTLS, timeouts and tracing out of application code into a sidecar proxy.',
    'It is not free: two extra hops per call, a proxy per pod, and a control plane to operate.',
  ],
  scene: {
    code: [
      '# gateway: one policy at the edge',
      'ingress: auth, rate-limit, route',
      '',
      '# mesh: policy on every hop',
      'sidecar:',
      '  mtls: STRICT',
      '  retry: { attempts: 2, budget: 10% }',
      '  outlier_detection: { errors: 5 }',
    ],
    initialState: { edge: 'gateway', internal: 'direct', mtls: 'off', hops: 1 },
    nodes: [
      { id: 'client', kind: 'client', label: 'Internet', x: 8, y: 50 },
      { id: 'gw', kind: 'apiGateway', label: 'Gateway', x: 30, y: 50, badge: 'north-south' },
      { id: 'orders', kind: 'server', label: 'Orders + sidecar', x: 58, y: 26, badge: 'no proxy' },
      { id: 'pay', kind: 'server', label: 'Payments + sidecar', x: 86, y: 26, badge: 'no proxy' },
      { id: 'inv', kind: 'server', label: 'Inventory + sidecar', x: 72, y: 78, badge: 'no proxy' },
    ],
    edges: [
      { id: 'c-gw', from: 'client', to: 'gw' },
      { id: 'gw-o', from: 'gw', to: 'orders' },
      { id: 'o-p', from: 'orders', to: 'pay' },
      { id: 'o-i', from: 'orders', to: 'inv', curve: 0.3 },
      { id: 'p-i', from: 'pay', to: 'inv', curve: -0.3 },
    ],
    steps: [
      { id: '1', caption: 'The gateway handles traffic entering the system: auth, rate limits, routing. North-south.', travel: 'c-gw', token: 'request', codeLine: 2, patches: [{ nodeId: 'gw', badge: 'auth + limit ✓', highlight: true }], state: { edge: 'gateway' } },
      { id: '2', caption: 'Past the door, services call each other directly — the gateway sees none of it. East-west.', travel: 'o-p', token: 'request', patches: [{ nodeId: 'pay', badge: 'plaintext ⚠', highlight: true }], state: { internal: 'direct', mtls: 'off' } },
      { id: '3', caption: 'So each service re-implements retries, timeouts and tracing — in three languages, three ways.', travel: 'o-i', token: 'request', patches: [{ nodeId: 'inv', badge: 'own retry code', highlight: true }] },
      { id: '4', caption: 'A mesh injects a sidecar proxy next to every service. All traffic flows through it.', codeLine: 5, patches: [{ nodeId: 'orders', badge: 'sidecar ✓', highlight: true }, { nodeId: 'pay', badge: 'sidecar ✓' }, { nodeId: 'inv', badge: 'sidecar ✓' }], state: { internal: 'mesh', hops: 3 } },
      { id: '5', caption: 'The sidecars negotiate mTLS automatically — every internal call is encrypted and identified.', travel: 'o-p', token: 'hit', codeLine: 6, patches: [{ nodeId: 'pay', badge: 'mTLS ✓', highlight: true }], state: { mtls: 'strict' } },
      { id: '6', caption: 'Retries, outlier ejection and per-request balancing move out of app code into config.', travel: 'p-i', token: 'hit', codeLine: 7, patches: [{ nodeId: 'inv', badge: 'retried ✓', highlight: true }] },
      { id: '7', caption: 'The cost: two extra proxy hops per call, a proxy per pod, and a control plane to run.', patches: [{ nodeId: 'orders', badge: '+0.5 ms/hop', highlight: true }], state: { hops: 3, internal: 'mesh (+latency)' } },
    ],
  },
  deepDive: {
    readingMinutes: 8,
    intro: [
      'A gateway and a service mesh solve the same class of problem — routing, security, resilience, observability — in two different places. The gateway governs **north-south** traffic entering your system from outside. A mesh governs **east-west** traffic between services inside it.',
      'The distinction matters because in a microservice system, east-west traffic vastly outnumbers north-south. One user request can trigger dozens of internal calls, and every one of them needs the same treatment the gateway gives the first hop.',
    ],
    sections: [
      {
        id: 'problem',
        heading: 'The problem a mesh solves',
        blocks: [
          {
            kind: 'prose',
            body: [
              'Without a mesh, every service implements retries, timeouts, circuit breaking, mTLS, tracing propagation and load balancing **itself**. In a polyglot estate that means the same policy expressed in a Go library, a Java library and a Python library — each with different defaults, different bugs and its own upgrade schedule.',
              'The result is that a change like "retry budgets must be capped at 10%" becomes a coordinated migration across every service and language, and nobody can state with confidence what the current behaviour actually is.',
            ],
          },
          {
            kind: 'table',
            columns: ['Concern', 'Without a mesh', 'With a mesh'],
            rows: [
              ['mTLS between services', 'Per-service TLS config and cert rotation', 'Automatic, certificates rotated by the control plane'],
              ['Retries and timeouts', 'A library per language', 'Declarative policy, uniform'],
              ['Load balancing', 'Client-side, per language', 'Per-request in the sidecar'],
              ['Tracing propagation', 'Every service must forward headers', 'Sidecar propagates and reports'],
              ['Traffic shifting', 'Deploy-time or DNS', 'Config change, per route'],
              ['Policy change', 'Redeploy every service', 'Control plane push'],
            ],
          },
          {
            kind: 'callout',
            tone: 'insight',
            title: 'A mesh is a gateway per service',
            body: [
              'The sidecar is the same class of proxy — Envoy in most cases — that runs at your edge. What changes is placement and quantity: one at the door versus one beside every workload. Recognising them as the same technology deployed differently makes the trade-offs much easier to reason about.',
            ],
          },
        ],
      },
      {
        id: 'cost',
        heading: 'What it costs',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The sidecar model is genuinely expensive, and the honest version of this topic includes the numbers. Every call now traverses two extra proxies — one outbound, one inbound — and every pod carries an extra container with its own CPU and memory.',
            ],
          },
          {
            kind: 'math',
            rows: [
              { label: 'Added latency per proxy hop', value: '~0.3–0.8 ms' },
              { label: 'Per call (two sidecars)', value: '~0.6–1.6 ms' },
              { label: 'A request touching 10 services', value: '~6–16 ms added' },
              { label: 'Sidecar memory per pod', value: '~50–150 MB' },
              { label: 'At 1,000 pods', value: '~50–150 GB', note: 'pure overhead' },
              { label: 'Sidecar CPU at moderate traffic', value: '~0.1–0.5 core/pod' },
            ],
            result: 'A mesh trades real latency and resources for uniform policy — worth it only at sufficient scale.',
          },
          {
            kind: 'prose',
            body: [
              'This cost is why **ambient** or sidecar-less modes exist: a shared per-node proxy handles L4 and mTLS, and an optional L7 proxy handles the richer policies only where needed. It reduces the per-pod overhead substantially at the cost of weaker isolation between workloads on a node.',
            ],
          },
          {
            kind: 'callout',
            tone: 'pitfall',
            title: 'The control plane is now a critical dependency',
            body: [
              'Sidecars are configured by a control plane. If it fails, existing proxies usually keep running with their last known config — but new pods cannot start correctly, deploys stall, and certificate rotation eventually fails. A mesh does not remove the single point of failure; it moves it to something most teams monitor less carefully than their gateway.',
            ],
          },
        ],
      },
      {
        id: 'decide',
        heading: 'When you actually need one',
        blocks: [
          {
            kind: 'list',
            ordered: true,
            items: [
              '**Do you have many services in several languages?** With three services in one language, a shared library is far cheaper and simpler.',
              '**Is mTLS between services a compliance requirement?** This is the most common genuine trigger — doing it per service is painful, and a mesh makes it a checkbox.',
              '**Do you need uniform, centrally-changeable policy?** If retry and timeout behaviour differing per service is causing incidents, that is a real signal.',
              '**Can you afford the latency?** A 10-service request path costs an extra 6–16 ms. For a latency-critical product that may be disqualifying.',
              '**Do you have the operational capacity?** A mesh is a distributed system in its own right. Running one badly is worse than not running one.',
            ],
          },
          {
            kind: 'table',
            columns: ['Situation', 'Recommendation'],
            rows: [
              ['< 10 services, one language', 'Shared library plus a gateway'],
              ['Many services, polyglot, mTLS required', 'Mesh — the strongest case'],
              ['Latency-critical hot path', 'Gateway plus libraries; keep the hop count down'],
              ['Kubernetes with a platform team', 'Mesh is realistic to operate'],
              ['Small team, no platform function', 'Avoid — the operational cost dominates'],
            ],
          },
        ],
      },
      {
        id: 'together',
        heading: 'How they compose',
        blocks: [
          {
            kind: 'prose',
            body: [
              'The two are complementary, not alternatives, and modern deployments run both with a clear division of responsibility. Increasingly the gateway *is* the mesh\'s ingress, sharing one control plane and one policy language — Gateway API is the standard converging on this.',
            ],
          },
          {
            kind: 'code',
            language: 'text',
            caption: 'Division of responsibility',
            lines: [
              'Gateway (north-south)              Mesh (east-west)',
              '---------------------              -----------------',
              'End-user authentication            Service identity (mTLS)',
              'Per-user rate limiting             Per-service concurrency limits',
              'Public API versioning              Internal retries and timeouts',
              'TLS termination for the internet   Encryption between every pair',
              'Client-facing routing              Per-request load balancing',
              'WAF, bot defence                   Outlier ejection, circuit breaking',
              '',
              '# Both start traces; the gateway begins the span, the mesh continues it.',
            ],
          },
          {
            kind: 'callout',
            tone: 'interview',
            title: 'Answer with the traffic direction',
            body: [
              'Asked "gateway or mesh?", the strong answer rejects the either/or: "they handle different traffic — the gateway governs what enters the system, the mesh governs what happens between services. I would always have a gateway, and add a mesh when polyglot services and internal mTLS make per-service libraries untenable."',
            ],
          },
        ],
      },
    ],
    whenNotToUse: [
      'Small service counts in a single language — a shared library gives the same policies at a fraction of the cost.',
      'Latency-critical paths where several extra milliseconds per request path are unacceptable.',
      'Teams without platform capacity; an unmaintained mesh is a liability, not a safety net.',
      'As a substitute for a gateway — a mesh does not do end-user authentication or public API management.',
    ],
    failureModes: [
      {
        name: 'Control plane outage blocks deploys',
        symptom: 'Existing traffic is fine but new pods fail to become ready.',
        cause: 'Sidecars cannot fetch configuration or certificates.',
        fix: 'Run the control plane highly available, monitor it as tier-1, and ensure proxies fail static on last-known config.',
      },
      {
        name: 'Latency budget consumed by proxies',
        symptom: 'p99 rises noticeably after mesh adoption.',
        cause: 'Two proxy hops per call multiplied across a deep call graph.',
        fix: 'Reduce call-graph depth, use ambient/L4-only mode where L7 policy is not needed, and tune proxy concurrency.',
      },
      {
        name: 'Sidecar startup race',
        symptom: 'Application containers fail on boot with connection errors.',
        cause: 'The app starts and calls out before the sidecar proxy is ready.',
        fix: 'Startup ordering (native sidecars or holdApplicationUntilProxyStarts) and retry on initial connections.',
      },
      {
        name: 'Duplicated retry policy',
        symptom: 'A failure produces far more attempts than configured anywhere.',
        cause: 'Application libraries retrying *and* the sidecar retrying, multiplying attempts.',
        fix: 'Pick one layer — usually the mesh — and remove retries from application code.',
      },
    ],
    interview: [
      {
        q: 'What is the difference between an API gateway and a service mesh?',
        a: [
          'Traffic direction. The gateway governs north-south traffic entering the system from outside — end-user authentication, public rate limiting, API versioning, TLS termination. A mesh governs east-west traffic between services inside — mutual TLS, retries, timeouts, per-request balancing, tracing.',
          'They are the same class of proxy deployed differently: one at the door, one beside every workload. Most real systems run both, increasingly with a shared control plane.',
        ],
        followUps: ['When is a mesh not worth it?'],
      },
      {
        q: 'When would you not adopt a service mesh?',
        a: [
          'When the cost outweighs the uniformity it buys. With a handful of services in one language, a shared client library gives the same retries and timeouts with none of the operational burden.',
          'The concrete costs are real: two proxy hops per call, so a request touching ten services picks up perhaps ten milliseconds, plus fifty to a hundred and fifty megabytes per pod, which at a thousand pods is substantial pure overhead.',
          'And the control plane becomes a critical dependency — if it fails, new pods cannot start and certificate rotation eventually breaks. A mesh run without platform capacity is worse than no mesh.',
        ],
      },
      {
        q: 'Why is mTLS the most common reason teams adopt one?',
        a: [
          'Because doing it per service is genuinely painful: every service needs certificates, rotation, and verification logic, in every language, and getting one wrong leaves plaintext traffic nobody notices.',
          'A mesh makes it a control-plane concern — sidecars negotiate mTLS automatically and certificates rotate without application involvement, so service identity becomes something you configure rather than something each team implements.',
          'That single capability often justifies the mesh in regulated environments where the alternative is a long, error-prone per-service project.',
        ],
      },
    ],
    references: [
      { label: 'Istio — What is a service mesh?', href: 'https://istio.io/latest/about/service-mesh/' },
      { label: 'Kubernetes — Gateway API', href: 'https://gateway-api.sigs.k8s.io/' },
    ],
  },
}

export const apiGatewayTopic: Lesson[] = [
  apiGateway,
  edgeAuth,
  aggregation,
  resilience,
  versioning,
  serviceMesh,
]
