import type { Group, Lesson } from './types'
import { fundamentals } from './lessons/fundamentals'
import { buildingBlocks } from './lessons/building-blocks'
import { scalingPatterns } from './lessons/scaling-patterns'
import { caseStudies } from './lessons/case-studies'

/**
 * Central lesson registry. Each group file exports an array of lessons; the
 * rest of the app (sidebar, catalog, routing) derives everything from LESSONS.
 * Adding a lesson = appending to one of the group files.
 */
export const LESSONS: Lesson[] = [
  ...fundamentals,
  ...buildingBlocks,
  ...scalingPatterns,
  ...caseStudies,
]

export function getLesson(slug: string): Lesson | undefined {
  return LESSONS.find((l) => l.slug === slug)
}

export function lessonsByGroup(group: Group): Lesson[] {
  return LESSONS.filter((l) => l.group === group)
}
