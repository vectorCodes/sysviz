import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import type { Scene, SceneNode, TokenKind } from './scene'

gsap.registerPlugin(MotionPathPlugin)

type NodeState = { badge?: string; highlight?: boolean }

type Props = {
  scene: Scene
  index: number
  nodeStates: Record<string, NodeState>
  speed: number
}

const BOX_W = 22
const BOX_H = 13

const TOKEN_COLOR: Record<TokenKind, string> = {
  request: 'var(--color-accent-500)',
  response: 'var(--color-text)',
  hit: 'var(--color-signal-hit)',
  miss: 'var(--color-signal-miss)',
  write: 'var(--color-signal-queue)',
}

/** Short accent stripe color per node kind, for at-a-glance identification. */
const KIND_COLOR: Record<string, string> = {
  client: 'var(--color-faint)',
  server: 'var(--color-signal-hit)',
  loadBalancer: 'var(--color-accent-500)',
  cache: 'var(--color-signal-queue)',
  database: '#5b8def',
  queue: 'var(--color-signal-queue)',
  cdn: '#9b7ede',
  apiGateway: 'var(--color-accent-400)',
  rateLimiter: 'var(--color-signal-miss)',
}

type Pt = { x: number; y: number }

/** Trim a segment so it starts/ends at the box edges, not the centers. */
function trim(a: Pt, b: Pt): { x1: number; y1: number; x2: number; y2: number } {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const padA = BOX_W / 2 + 1
  const padB = BOX_W / 2 + 3 // extra room for the arrowhead
  return { x1: a.x + ux * padA, y1: a.y + uy * padA, x2: b.x - ux * padB, y2: b.y - uy * padB }
}

/** SVG path for an edge — straight, or a quadratic bow when `curve` is set. */
function edgePath(a: Pt, b: Pt, curve = 0): string {
  const { x1, y1, x2, y2 } = trim(a, b)
  if (!curve) return `M${x1},${y1} L${x2},${y2}`
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  // perpendicular offset for the control point
  const cx = mx + (-dy / len) * curve * len
  const cy = my + (dx / len) * curve * len
  return `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`
}

export function SceneRenderer({ scene, index, nodeStates, speed }: Props) {
  const tokenRef = useRef<SVGCircleElement>(null)
  const centers = Object.fromEntries(scene.nodes.map((n) => [n.id, { x: n.x, y: n.y }])) as Record<
    string,
    Pt
  >

  const step = scene.steps[index]

  // Animate the token along the active step's edge whenever the step changes.
  useEffect(() => {
    const token = tokenRef.current
    if (!token) return
    const edge = step?.travel ? scene.edges.find((e) => e.id === step.travel) : undefined
    gsap.killTweensOf(token)

    if (!edge) {
      gsap.set(token, { opacity: 0 })
      return
    }
    const a = centers[edge.from]
    const b = centers[edge.to]
    if (!a || !b) return

    const path = edgePath(a, b, edge.curve)
    const duration = Math.min(1.3, 2.2 * 0.7) / speed
    gsap.set(token, { opacity: 1 })
    gsap.fromTo(
      token,
      { motionPath: { path, start: 0, end: 0 } },
      {
        motionPath: { path, start: 0, end: 1 },
        duration,
        ease: 'power1.inOut',
        onComplete: () => gsap.to(token, { opacity: 0, duration: 0.25, delay: 0.15 }),
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, scene])

  const tokenColor = step?.token ? TOKEN_COLOR[step.token] : 'var(--color-accent-500)'

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
      role="img"
      aria-label="Architecture animation"
    >
      <defs>
        <marker id="edge-arrow" markerWidth="6" markerHeight="6" refX="4.5" refY="3" orient="auto">
          <path d="M0,0 L5,3 L0,6 Z" fill="var(--color-faint)" />
        </marker>
      </defs>

      {/* Edges */}
      {scene.edges.map((e) => {
        const a = centers[e.from]
        const b = centers[e.to]
        if (!a || !b) return null
        return (
          <path
            key={e.id}
            d={edgePath(a, b, e.curve)}
            fill="none"
            stroke="var(--color-border-strong)"
            strokeWidth="0.7"
            markerEnd="url(#edge-arrow)"
          />
        )
      })}

      {/* Nodes */}
      {scene.nodes.map((n) => (
        <NodeBox key={n.id} node={n} state={nodeStates[n.id]} />
      ))}

      {/* Traveling token */}
      <circle ref={tokenRef} r="2.2" fill={tokenColor} opacity="0" />
    </svg>
  )
}

function NodeBox({ node, state }: { node: SceneNode; state?: NodeState }) {
  const x = node.x - BOX_W / 2
  const y = node.y - BOX_H / 2
  const stripe = KIND_COLOR[node.kind] ?? 'var(--color-faint)'
  const badge = state?.badge ?? node.badge

  return (
    <g>
      {state?.highlight && (
        <rect
          x={x - 1.5}
          y={y - 1.5}
          width={BOX_W + 3}
          height={BOX_H + 3}
          rx={3.5}
          fill="none"
          stroke="var(--color-accent-500)"
          strokeWidth="0.8"
          opacity="0.9"
        />
      )}
      <rect
        x={x}
        y={y}
        width={BOX_W}
        height={BOX_H}
        rx={2.5}
        fill="var(--color-surface-2)"
        stroke="var(--color-border-strong)"
        strokeWidth="0.5"
      />
      {/* Kind stripe */}
      <rect x={x} y={y} width={BOX_W} height={1.6} rx={0.8} fill={stripe} />
      <text
        x={node.x}
        y={node.y + 1.4}
        textAnchor="middle"
        fontSize="3.4"
        fontFamily="var(--font-sans)"
        fontWeight="600"
        fill="var(--color-text)"
      >
        {node.label}
      </text>
      {badge && (
        <text
          x={node.x}
          y={y + BOX_H + 4}
          textAnchor="middle"
          fontSize="2.8"
          fontFamily="var(--font-mono)"
          fill="var(--color-faint)"
        >
          {badge}
        </text>
      )}
    </g>
  )
}
