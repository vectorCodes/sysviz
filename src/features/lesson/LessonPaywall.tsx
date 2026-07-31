import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Lesson } from '../../content/types'
import { track } from '../../lib/analytics'

/** Shown in place of the workspace when a Pro lesson is opened on the Free plan. */
export function LessonPaywall({ lesson }: { lesson: Lesson }) {
  useEffect(() => {
    track('paywall_viewed', { slug: lesson.slug })
  }, [lesson.slug])

  return (
    <div className="grid min-w-0 flex-1 place-items-center p-6">
      <div className="card max-w-md p-8 text-center">
        <span className="chip mx-auto border-accent-500/50 text-accent-400">Pro lesson</span>
        <h1 className="mt-4 text-3xl">{lesson.title}</h1>
        <p className="mt-2 text-muted">{lesson.summary}</p>
        <p className="mt-4 text-sm text-faint">
          This lesson is part of Pro. Unlock every scaling pattern and full system-design
          case study with one-time access.
        </p>
        <Link
          to="/pricing"
          onClick={() => track('buy_access_clicked', { slug: lesson.slug, from: 'lesson_paywall' })}
          className="btn-cream mt-6 w-full"
        >
          Unlock Pro
        </Link>
        <Link to="/tracks" className="mt-3 block text-sm text-faint hover:text-text">
          Back to all lessons
        </Link>
      </div>
    </div>
  )
}
