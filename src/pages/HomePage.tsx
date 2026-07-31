import { Link } from 'react-router-dom'
import { TRACKS, type TrackCard } from '../content/tracks'
import { useEntitlement } from '../store/useEntitlement'

const MARQUEE_ITEMS = [
  'Load Balancer', 'Caching Strategies', 'Message Queue', 'Rate Limiter',
  'API Gateway', 'Database Replication', 'Consistent Hashing', 'CAP Theorem',
  'Horizontal Scaling', 'Sharding', 'Design URL Shortener', 'CDN',
  'Circuit Breaker', 'Service Discovery', 'Distributed Tracing',
]

export function HomePage() {
  return (
    <div className="overflow-x-hidden">
      <style>{`
        @keyframes marquee { from { transform:translateX(0) } to { transform:translateX(-50%) } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
      `}</style>
      <HeroSection />
      <MarqueeStrip />
      <HowItWorks />
      <AnimationShowcase />
      <TracksSection />
      <FinalCta />
    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <div className="grid items-center gap-12 md:grid-cols-[1fr_1.15fr]">
        <div style={{ animation: 'fadeUp 0.6s ease both' }}>
          <span className="chip mb-5">System Design · Visual</span>
          <h1 className="text-5xl leading-[1.08] md:text-6xl">
            See system design,
            <br />
            <span className="text-accent-500">don&apos;t just read it.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted">
            Watch requests flow through load balancers, caches, queues and databases —
            one frame at a time. Learn by seeing, not memorizing.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/tracks" className="btn-cream">Start learning free →</Link>
            <Link to="/pricing" className="btn-ghost">See pricing</Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-faint">
            <span>✓ 20+ animated lessons</span>
            <span>✓ Free tier included</span>
            <span>✓ Interview-ready</span>
          </div>
        </div>

        <div className="card overflow-hidden p-5" style={{ animation: 'fadeUp 0.6s 0.15s ease both' }}>
          <div className="mb-3 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-500" />
            </span>
            <span className="font-mono text-[10px] tracking-wider text-faint">live · full request path</span>
          </div>
          <HeroAnimation />
          <div className="mt-3 flex justify-center gap-5 text-[10px] font-mono text-faint">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-accent-500" /> Request
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-[#22c55e]" /> Cache hit
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-[#60a5fa]" /> DB write
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Hero animation: Client → LB → [S1→Cache, S2→DB] ─────────────────────────

const HERO_CYCLE = 8  // seconds for one full animation loop

function HeroAnimation() {
  // Positions (viewBox 0 0 460 185):
  //   Client:  x=8,   y=72,  w=72, h=40  → right edge (80, 92)
  //   LB:      x=144, y=72,  w=72, h=40  → left (144,92) right (216,92)
  //   S1:      x=260, y=20,  w=68, h=36  → left (260,38) right (328,38)
  //   S2:      x=260, y=130, w=68, h=36  → left (260,148) right (328,148)
  //   Cache:   x=378, y=20,  w=72, h=36  → left (378,38)
  //   DB:      x=378, y=130, w=72, h=36  → left (378,148)
  return (
    <svg viewBox="0 0 460 185" className="w-full" aria-hidden>
      <defs>
        <marker id="h-arr" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
          <path d="M0,0 L5,3 L0,6 Z" fill="var(--color-border-strong)" />
        </marker>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Edges */}
      <line x1="80" y1="92" x2="144" y2="92" stroke="var(--color-border-strong)" strokeWidth="1.5" markerEnd="url(#h-arr)" />
      <line x1="216" y1="92" x2="260" y2="38" stroke="var(--color-border-strong)" strokeWidth="1.5" markerEnd="url(#h-arr)" />
      <line x1="216" y1="92" x2="260" y2="148" stroke="var(--color-border-strong)" strokeWidth="1.5" markerEnd="url(#h-arr)" />
      <line x1="328" y1="38" x2="378" y2="38" stroke="var(--color-border-strong)" strokeWidth="1.5" markerEnd="url(#h-arr)" />
      <line x1="328" y1="148" x2="378" y2="148" stroke="var(--color-border-strong)" strokeWidth="1.5" markerEnd="url(#h-arr)" />

      {/* Nodes */}
      <ArchBox x={8}   y={72}  w={72} h={40} label="Client"   accent="var(--color-accent-500)" />
      <ArchBox x={144} y={72}  w={72} h={40} label="LB"       accent="var(--color-accent-500)" />
      <ArchBox x={260} y={20}  w={68} h={36} label="Server 1" />
      <ArchBox x={260} y={130} w={68} h={36} label="Server 2" />
      <ArchBox x={378} y={20}  w={72} h={36} label="Cache"    accent="#22c55e" />
      <ArchBox x={378} y={130} w={72} h={36} label="Database" accent="#60a5fa" />

      {/* Path A: Client→LB→S1→Cache (top, cache-hit, orange→green) */}
      {/* A1: 0–12.5% of cycle */}
      <FlowToken path="M80,92 L144,92"   as={0}       ae={0.125} cycle={HERO_CYCLE} color="var(--color-accent-500)" />
      {/* A2: 12.5–25% */}
      <FlowToken path="M216,92 L260,38"  as={0.125}   ae={0.25}  cycle={HERO_CYCLE} color="var(--color-accent-500)" />
      {/* A3: 25–37.5% */}
      <FlowToken path="M328,38 L378,38"  as={0.25}    ae={0.375} cycle={HERO_CYCLE} color="#22c55e" />

      {/* Path B: Client→LB→S2→DB (bottom, db-write, orange→blue) */}
      {/* B1: 50–62.5% */}
      <FlowToken path="M80,92 L144,92"    as={0.5}    ae={0.625} cycle={HERO_CYCLE} color="var(--color-accent-500)" />
      {/* B2: 62.5–75% */}
      <FlowToken path="M216,92 L260,148"  as={0.625}  ae={0.75}  cycle={HERO_CYCLE} color="var(--color-accent-500)" />
      {/* B3: 75–87.5% */}
      <FlowToken path="M328,148 L378,148" as={0.75}   ae={0.875} cycle={HERO_CYCLE} color="#60a5fa" />

      {/* Small status labels */}
      <text x="414" y="13" textAnchor="middle" fontSize="8.5" fontFamily="var(--font-mono)" fill="#22c55e" opacity="0.65">HIT</text>
      <text x="414" y="125" textAnchor="middle" fontSize="8.5" fontFamily="var(--font-mono)" fill="#60a5fa" opacity="0.65">WRITE</text>
    </svg>
  )
}

function ArchBox({ x, y, w, h, label, accent }: {
  x: number; y: number; w: number; h: number; label: string; accent?: string
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8}
        fill="var(--color-surface-2)"
        stroke={accent ?? 'var(--color-border-strong)'}
        strokeWidth={accent ? 1.5 : 1}
      />
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle"
        fontSize="11" fontFamily="var(--font-mono)" fill="var(--color-text)">
        {label}
      </text>
    </g>
  )
}

/** Token that animates along `path` only during [as, ae] fraction of `cycle`. */
function FlowToken({ path, as: aStart, ae: aEnd, cycle, color }: {
  path: string; as: number; ae: number; cycle: number; color: string
}) {
  const f = 0.012  // fade window fraction
  const os = aStart
  const oe = aEnd
  const motKT = aStart === 0
    ? `0;${oe};1`
    : `0;${os};${oe};1`
  const motKP = aStart === 0 ? '0;1;1' : '0;0;1;1'
  const opKT  = `0;${os};${Math.min(os + f, (os + oe) / 2)};${Math.max(oe - f, (os + oe) / 2)};${oe};1`
  return (
    <circle r="5" fill={color} opacity="0" filter="url(#glow)">
      <animateMotion path={path} dur={`${cycle}s`} repeatCount="indefinite"
        keyPoints={motKP} keyTimes={motKT} calcMode="linear" />
      <animate attributeName="opacity" dur={`${cycle}s`} repeatCount="indefinite"
        values="0;0;1;1;0;0" keyTimes={opKT} />
    </circle>
  )
}

// ── Marquee strip ─────────────────────────────────────────────────────────────

function MarqueeStrip() {
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]
  return (
    <div className="border-y border-border py-4 overflow-hidden">
      <div
        className="flex gap-6 whitespace-nowrap"
        style={{ animation: 'marquee 28s linear infinite', width: 'max-content' }}
      >
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-3 text-sm text-faint">
            <span className="h-1 w-1 rounded-full bg-accent-500 opacity-60" />
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── How it works ──────────────────────────────────────────────────────────────

const HOW_STEPS = [
  {
    n: '01',
    title: 'Pick a concept',
    body: 'Choose from Building Blocks, Scaling Patterns, or full Case Studies. Free tier covers core fundamentals.',
  },
  {
    n: '02',
    title: 'Watch it animate',
    body: "Requests flow as tokens. Caches fill. Queues drain. Every step narrated — no guessing what's happening.",
  },
  {
    n: '03',
    title: 'Step, scrub, repeat',
    body: 'Go forward one frame at a time, scrub back, change speed. You control the pace until it clicks.',
  },
]

function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <h2 className="text-3xl">How it works</h2>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {HOW_STEPS.map((s) => (
          <div key={s.n} className="card p-7">
            <span className="font-mono text-xs font-bold text-accent-500">{s.n}</span>
            <h3 className="mt-3 text-xl">{s.title}</h3>
            <p className="mt-2 text-sm text-faint">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Animation showcase ────────────────────────────────────────────────────────

function AnimationShowcase() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-8">
      <h2 className="text-3xl">A taste of what you&apos;ll learn</h2>
      <p className="mt-2 text-muted">Every concept has its own animated diagram. Here are three.</p>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <ShowcaseCard title="Cache · Hit vs Miss" sub="When data is cached — and when it's not">
          <CacheAnimation />
        </ShowcaseCard>
        <ShowcaseCard title="Message Queue" sub="Producers write, workers consume at their own pace">
          <QueueAnimation />
        </ShowcaseCard>
        <ShowcaseCard title="DB Replication" sub="Writes go to primary, then sync to replicas">
          <ReplicationAnimation />
        </ShowcaseCard>
      </div>
    </section>
  )
}

function ShowcaseCard({ title, sub, children }: {
  title: string; sub: string; children: React.ReactNode
}) {
  return (
    <div className="card flex flex-col p-5">
      <h3 className="text-base font-semibold text-text">{title}</h3>
      <p className="mb-3 text-xs text-faint">{sub}</p>
      <div className="flex-1">{children}</div>
    </div>
  )
}

// Cache hit (top row) + cache miss (bottom row) — cycle = 6s
const CACHE_CYCLE = 6

function CacheAnimation() {
  return (
    <svg viewBox="0 0 300 145" className="w-full" aria-hidden>
      <defs>
        <marker id="c-arr" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
          <path d="M0,0 L5,3 L0,6 Z" fill="var(--color-border-strong)" />
        </marker>
        <filter id="cglow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ── Row 1: Hit ── */}
      <text x="4" y="16" fontSize="8" fontFamily="var(--font-mono)" fill="#22c55e">HIT</text>
      <line x1="56" y1="30" x2="110" y2="30" stroke="var(--color-border-strong)" strokeWidth="1.5" markerEnd="url(#c-arr)" />
      <ArchBox x={4}   y={15} w={52} h={30} label="Client" />
      <ArchBox x={110} y={15} w={60} h={30} label="Cache"  accent="#22c55e" />
      {/* HIT badge flash */}
      <text x="196" y="34" fontSize="10" fontFamily="var(--font-mono)" fill="#22c55e" opacity="0">
        ✓ HIT
        <animate attributeName="opacity" dur={`${CACHE_CYCLE}s`} repeatCount="indefinite"
          values="0;0;1;1;0" keyTimes="0;0.28;0.32;0.45;0.5" />
      </text>
      {/* token: Client→Cache */}
      <FlowToken path="M56,30 L110,30" as={0} ae={0.25} cycle={CACHE_CYCLE} color="#22c55e" />

      {/* ── Row 2: Miss ── */}
      <text x="4" y="92" fontSize="8" fontFamily="var(--font-mono)" fill="#f59e0b">MISS</text>
      <line x1="56" y1="108" x2="110" y2="108" stroke="var(--color-border-strong)" strokeWidth="1.5" markerEnd="url(#c-arr)" />
      <line x1="170" y1="108" x2="224" y2="108" stroke="var(--color-border-strong)" strokeWidth="1.5" markerEnd="url(#c-arr)" />
      <ArchBox x={4}   y={93}  w={52} h={30} label="Client" />
      <ArchBox x={110} y={93}  w={60} h={30} label="Cache"  accent="#f59e0b" />
      <ArchBox x={224} y={93}  w={68} h={30} label="Database" accent="#60a5fa" />
      {/* MISS badge flash */}
      <text x="112" y="90" fontSize="9" fontFamily="var(--font-mono)" fill="#f59e0b" opacity="0">
        ✗
        <animate attributeName="opacity" dur={`${CACHE_CYCLE}s`} repeatCount="indefinite"
          values="0;0;1;1;0" keyTimes="0;0.53;0.56;0.68;0.72" />
      </text>
      {/* token: Client→Cache (miss) */}
      <FlowToken path="M56,108 L110,108"  as={0.5}  ae={0.7}  cycle={CACHE_CYCLE} color="#f59e0b" />
      {/* token: Cache→DB (fallback) */}
      <FlowToken path="M170,108 L224,108" as={0.72} ae={0.88} cycle={CACHE_CYCLE} color="#60a5fa" />

      {/* Divider */}
      <line x1="0" y1="72" x2="300" y2="72" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4 4" />
    </svg>
  )
}

// Producer → Queue (fills up) → Worker 1, Worker 2
const QUEUE_CYCLE = 7

function QueueAnimation() {
  // Producer: (6, 65), 60x36
  // Queue box: (110, 45), 70x76  (tall, shows messages inside)
  // Worker1: (232, 25), 60x32
  // Worker2: (232, 110), 60x32
  const msgs = [0, 1, 2, 3]  // 4 message slots in queue visual
  return (
    <svg viewBox="0 0 310 155" className="w-full" aria-hidden>
      <defs>
        <marker id="q-arr" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
          <path d="M0,0 L5,3 L0,6 Z" fill="var(--color-border-strong)" />
        </marker>
        <filter id="qglow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Edges */}
      <line x1="66" y1="83" x2="110" y2="83" stroke="var(--color-border-strong)" strokeWidth="1.5" markerEnd="url(#q-arr)" />
      <line x1="180" y1="70" x2="232" y2="41" stroke="var(--color-border-strong)" strokeWidth="1.5" markerEnd="url(#q-arr)" />
      <line x1="180" y1="97" x2="232" y2="126" stroke="var(--color-border-strong)" strokeWidth="1.5" markerEnd="url(#q-arr)" />

      {/* Producer */}
      <ArchBox x={6} y={65} w={60} h={36} label="Producer" accent="var(--color-accent-500)" />
      <text x="36" y="57" textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fill="var(--color-faint)">Writes</text>

      {/* Queue visual — tall box with message slots */}
      <rect x={110} y={45} width={70} height={76} rx={8}
        fill="var(--color-surface-2)" stroke="var(--color-border-strong)" strokeWidth="1" />
      <text x={145} y={40} textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fill="var(--color-faint)">Queue</text>
      {msgs.map((i) => (
        <g key={i}>
          <rect x={117} y={51 + i * 16} width={56} height={12} rx={3}
            fill="var(--color-accent-500)" opacity="0">
            <animate attributeName="opacity"
              dur={`${QUEUE_CYCLE}s`} repeatCount="indefinite"
              values={`0;0;0.35;0.35;0;0`}
              keyTimes={`0;${0.05 + i * 0.06};${0.12 + i * 0.06};${0.45};${0.55 + i * 0.04};1`} />
          </rect>
        </g>
      ))}

      {/* Workers */}
      <ArchBox x={232} y={25}  w={70} h={32} label="Worker 1" />
      <ArchBox x={232} y={110} w={70} h={32} label="Worker 2" />
      <text x={267} y={18} textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fill="var(--color-faint)">Consumes</text>

      {/* Tokens: Producer→Queue */}
      <FlowToken path="M66,83 L110,83"   as={0}    ae={0.18} cycle={QUEUE_CYCLE} color="var(--color-accent-500)" />
      <FlowToken path="M66,83 L110,83"   as={0.22} ae={0.38} cycle={QUEUE_CYCLE} color="var(--color-accent-500)" />
      {/* Queue→Worker1 */}
      <FlowToken path="M180,70 L232,41"  as={0.48} ae={0.64} cycle={QUEUE_CYCLE} color="#22c55e" />
      {/* Queue→Worker2 */}
      <FlowToken path="M180,97 L232,126" as={0.66} ae={0.82} cycle={QUEUE_CYCLE} color="#22c55e" />
    </svg>
  )
}

// Primary → [Replica1, Replica2]  with write token + sync tokens
const REP_CYCLE = 5

function ReplicationAnimation() {
  return (
    <svg viewBox="0 0 300 145" className="w-full" aria-hidden>
      <defs>
        <marker id="r-arr" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
          <path d="M0,0 L5,3 L0,6 Z" fill="var(--color-border-strong)" />
        </marker>
        <filter id="rglow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Edges */}
      <line x1="62" y1="72" x2="100" y2="72" stroke="var(--color-border-strong)" strokeWidth="1.5" markerEnd="url(#r-arr)" />
      <line x1="172" y1="72" x2="210" y2="35" stroke="var(--color-border-strong)" strokeWidth="1.5" markerEnd="url(#r-arr)" />
      <line x1="172" y1="72" x2="210" y2="110" stroke="var(--color-border-strong)" strokeWidth="1.5" markerEnd="url(#r-arr)" />

      {/* Write trigger */}
      <text x="6" y="66" fontSize="8" fontFamily="var(--font-mono)" fill="var(--color-accent-500)">WRITE</text>
      <line x1="6" y1="72" x2="62" y2="72" stroke="var(--color-border-strong)" strokeWidth="1" strokeDasharray="3 2" />

      {/* Primary DB */}
      <ArchBox x={100} y={53} w={72} h={38} label="Primary" accent="var(--color-accent-500)" />
      <text x={136} y={48} textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fill="var(--color-faint)">DB</text>

      {/* Replicas */}
      <ArchBox x={210} y={18}  w={80} h={34} label="Replica 1" accent="#60a5fa" />
      <ArchBox x={210} y={103} w={80} h={34} label="Replica 2" accent="#60a5fa" />
      <text x={250} y={14} textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fill="#60a5fa" opacity="0.6">async sync</text>

      {/* Tokens: Write→Primary */}
      <FlowToken path="M6,72 L100,72"    as={0}    ae={0.2}  cycle={REP_CYCLE} color="var(--color-accent-500)" />
      {/* Primary→Replica1 */}
      <FlowToken path="M172,72 L210,35"  as={0.25} ae={0.5}  cycle={REP_CYCLE} color="#60a5fa" />
      {/* Primary→Replica2 */}
      <FlowToken path="M172,72 L210,110" as={0.32} ae={0.57} cycle={REP_CYCLE} color="#60a5fa" />
    </svg>
  )
}

// ── Tracks ────────────────────────────────────────────────────────────────────

function TracksSection() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <h2 className="text-3xl">Pick a track</h2>
      <p className="mt-2 text-muted">Each subject taught the same way — by animating it.</p>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {TRACKS.map((track) => (
          <TrackCardView key={track.title} track={track} />
        ))}
      </div>
    </section>
  )
}

function TrackCardView({ track }: { track: TrackCard }) {
  const live = track.status === 'live'
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl">{track.title}</h3>
          <p className="mt-1 text-sm text-faint">{track.subtitle}</p>
        </div>
        <span className={`chip shrink-0 ${live ? 'border-accent-500/50 text-accent-400' : 'text-faint'}`}>
          {track.badge}
        </span>
      </div>
      <p className="mt-4 text-sm text-muted">{track.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {track.chips.map((chip) => (
          <span key={chip} className="rounded-full border border-border px-3 py-1 text-xs text-muted">{chip}</span>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        <span className="font-mono text-xs text-faint">{track.meta}</span>
        <span className={`text-sm font-medium ${live ? 'text-accent-500' : 'text-faint'}`}>
          {live ? 'Enter →' : 'Coming soon'}
        </span>
      </div>
    </>
  )
  const base = 'card flex flex-col p-7 transition-colors'
  return live && track.to ? (
    <Link to={track.to} className={`${base} hover:border-border-strong`}>{inner}</Link>
  ) : (
    <div className={`${base} opacity-70`} aria-disabled>{inner}</div>
  )
}

// ── Final CTA ─────────────────────────────────────────────────────────────────

function FinalCta() {
  const isPro = useEntitlement((s) => s.hasActivePlan())
  const accessUntil = useEntitlement((s) => s.accessUntil)

  const expiry = accessUntil
    ? new Date(accessUntil).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  if (isPro) {
    return (
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="card p-10 text-center">
          <span className="chip mx-auto border-accent-500/50 text-accent-400">Pro · Active</span>
          <h2 className="mt-4 text-4xl">You&apos;re all set.</h2>
          <p className="mx-auto mt-4 max-w-md text-muted">
            Full access to every lesson, scaling pattern and case study is unlocked
            {expiry ? ` until ${expiry}` : ''}.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/tracks" className="btn-cream">Go to lessons →</Link>
            <Link to="/account" className="btn-ghost">My account</Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="card p-10 text-center">
        <h2 className="text-4xl">Ready to see it click?</h2>
        <p className="mx-auto mt-4 max-w-md text-muted">
          Start with free Building Block lessons. Upgrade to Pro when you&apos;re ready for scaling patterns and full case studies.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/tracks" className="btn-cream">Start for free →</Link>
          <Link to="/pricing" className="btn-ghost">View pricing</Link>
        </div>
      </div>
    </section>
  )
}
