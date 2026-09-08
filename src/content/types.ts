import type { Scene } from '../engine/scene'

export type Tier = 'free' | 'pro'

// ── Deep dive ────────────────────────────────────────────────────────────────
// The reading layer that sits beside the animation. A lesson's `Scene` shows
// *what happens*; the `DeepDive` explains *why*, what it costs, and what breaks.

/** A block of teaching content inside a deep-dive section. */
export type DeepDiveBlock =
  /** Paragraphs of explanation. `**bold**` and `` `code` `` are rendered. */
  | { kind: 'prose'; body: string[] }
  /** A bulleted or numbered list of points. */
  | { kind: 'list'; items: string[]; ordered?: boolean }
  /** A comparison table — the workhorse for trade-offs. */
  | { kind: 'table'; columns: string[]; rows: string[][]; caption?: string }
  /** A pulled-out aside: a rule of thumb, a warning, or an interview signal. */
  | { kind: 'callout'; tone: CalloutTone; title: string; body: string[] }
  /** Real code (not the animation's pseudocode) with an optional caption. */
  | { kind: 'code'; language?: string; lines: string[]; caption?: string }
  /** Back-of-the-envelope arithmetic, rendered as a worked ladder. */
  | { kind: 'math'; rows: { label: string; value: string; note?: string }[]; result?: string }

export type CalloutTone = 'insight' | 'warning' | 'pitfall' | 'interview'

export type DeepDiveSection = {
  /** Anchor id, used by the in-page contents rail. */
  id: string
  heading: string
  blocks: DeepDiveBlock[]
}

/** Something that breaks in production, and how you'd notice and fix it. */
export type FailureMode = {
  name: string
  symptom: string
  cause: string
  fix: string
}

/** An interview question with a model answer and optional follow-ups. */
export type InterviewQA = {
  q: string
  /** Model answer, one entry per paragraph. */
  a: string[]
  followUps?: string[]
}

/** The full reading companion for a lesson. */
export type DeepDive = {
  /** Framing paragraphs shown above the first section. */
  intro: string[]
  /** Rough read time in minutes, shown next to the tab. */
  readingMinutes: number
  sections: DeepDiveSection[]
  /** When this technique is the wrong tool. */
  whenNotToUse?: string[]
  failureModes?: FailureMode[]
  interview?: InterviewQA[]
  /** Further reading — papers, docs, engineering blogs. */
  references?: { label: string; href: string }[]
}


/** Sidebar groups for the System Design track (mirrors ChaiCode's patterns). */
export type Group =
  | 'fundamentals'
  | 'building-blocks'
  | 'scaling-patterns'
  | 'case-studies'
  | 'interview-prep'

export type Lesson = {
  slug: string
  title: string
  summary: string
  group: Group
  tier: Tier
  /** Rough watch time in minutes, shown in the catalog. */
  minutes: number
  /** Groups this lesson under a collapsible topic in the sidebar. */
  topic: string
  /** Short tag shown by the title, e.g. "Concept" or "Case study". */
  concept?: string
  /** System design metadata chips shown in the top bar. */
  tags?: { label: string; value: string }[]
  scene: Scene
  /** Prose "key ideas" shown in the workspace. */
  notes?: string[]
  /** In-depth reading companion shown in the lesson's "Deep dive" tab. */
  deepDive?: DeepDive
}

export const GROUP_META: Record<Group, { title: string; blurb: string }> = {
  fundamentals: {
    title: 'Fundamentals',
    blurb: 'The mental models everything else builds on.',
  },
  'building-blocks': {
    title: 'Building Blocks',
    blurb: 'The core components every system is assembled from.',
  },
  'scaling-patterns': {
    title: 'Scaling Patterns',
    blurb: 'How the blocks combine to handle real-world load.',
  },
  'case-studies': {
    title: 'Case Studies',
    blurb: 'Design full systems end to end, one frame at a time.',
  },
  'interview-prep': {
    title: 'Interview Prep',
    blurb: 'Guided study plans for the real thing.',
  },
}

export const GROUP_ORDER: Group[] = [
  'fundamentals',
  'building-blocks',
  'scaling-patterns',
  'case-studies',
  'interview-prep',
]
