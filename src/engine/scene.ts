/**
 * The data model for an animated lesson. A `Scene` is fully declarative — the
 * engine (SceneRenderer + useStepPlayer) turns it into an animated diagram.
 * Authoring a new lesson means writing one of these, not writing new code.
 */

export type NodeKind =
  | 'client'
  | 'server'
  | 'loadBalancer'
  | 'cache'
  | 'database'
  | 'queue'
  | 'cdn'
  | 'apiGateway'
  | 'rateLimiter'

/** A box in the architecture diagram, positioned on a 0–100 relative grid. */
export type SceneNode = {
  id: string
  kind: NodeKind
  label: string
  /** Position as percentages of the canvas (0–100), so scenes are responsive. */
  x: number
  y: number
  /** Optional starting badge text (e.g. "0 hits"). */
  badge?: string
}

/** A directed connection between two nodes; tokens travel along it. */
export type SceneEdge = {
  id: string
  from: string
  to: string
  /** Curve the path upward/downward for readability (-1..1, default 0). */
  curve?: number
}

/** State mutation applied to a node when a step plays. */
export type NodePatch = {
  nodeId: string
  badge?: string
  /** Visual emphasis while this step is active. */
  highlight?: boolean
}

export type TokenKind = 'request' | 'response' | 'hit' | 'miss' | 'write'

/**
 * One beat of the animation. The player advances step-by-step; each step can
 * send a token along an edge, patch node badges, patch the state panel and
 * highlight a line of pseudocode — all with a narration caption.
 */
export type SceneStep = {
  id: string
  caption: string
  /** Edge id a request token animates along during this step. */
  travel?: string
  /** Which signal the traveling token represents (drives its color). */
  token?: TokenKind
  /** Node badge/highlight updates applied when the step becomes active. */
  patches?: NodePatch[]
  /** State-panel keys to set/overwrite at this step (merged cumulatively). */
  state?: Record<string, string | number>
  /** 1-based pseudocode line to highlight while this step is active. */
  codeLine?: number
}

export type Scene = {
  nodes: SceneNode[]
  edges: SceneEdge[]
  steps: SceneStep[]
  /** Optional pseudocode / request-flow shown in the right panel. */
  code?: string[]
  /** Initial state-panel values before any step runs. */
  initialState?: Record<string, string | number>
}

/** Merge the cumulative state from step 0..activeIndex into one snapshot. */
export function stateAtStep(scene: Scene, activeIndex: number): Record<string, string | number> {
  const snapshot = { ...(scene.initialState ?? {}) }
  for (let i = 0; i <= activeIndex && i < scene.steps.length; i++) {
    Object.assign(snapshot, scene.steps[i].state ?? {})
  }
  return snapshot
}

/** Merge cumulative node badge/highlight patches up to activeIndex. */
export function nodeStatesAtStep(
  scene: Scene,
  activeIndex: number,
): Record<string, { badge?: string; highlight?: boolean }> {
  const result: Record<string, { badge?: string; highlight?: boolean }> = {}
  for (const node of scene.nodes) {
    if (node.badge !== undefined) result[node.id] = { badge: node.badge }
  }
  for (let i = 0; i <= activeIndex && i < scene.steps.length; i++) {
    for (const patch of scene.steps[i].patches ?? []) {
      result[patch.nodeId] = {
        badge: patch.badge ?? result[patch.nodeId]?.badge,
        // highlight only the node touched on the *active* step
        highlight: i === activeIndex ? patch.highlight : false,
      }
    }
  }
  return result
}
