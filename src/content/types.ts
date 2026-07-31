import type { Scene } from '../engine/scene'

export type Tier = 'free' | 'pro'

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
  /** Short tag shown by the title, e.g. "Concept" or "Case study". */
  concept?: string
  /** System design metadata chips shown in the top bar. */
  tags?: { label: string; value: string }[]
  scene: Scene
  /** Prose "key ideas" shown in the workspace. */
  notes?: string[]
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
