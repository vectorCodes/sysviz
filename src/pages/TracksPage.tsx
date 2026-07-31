import { Link } from 'react-router-dom'
import { GROUP_META, GROUP_ORDER, type Lesson } from '../content/types'
import { lessonsByGroup } from '../content'
import { useEntitlement } from '../store/useEntitlement'

export function TracksPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <span className="chip mb-4">System Design · Visual</span>
      <h1 className="text-5xl">Learn</h1>
      <p className="mt-3 max-w-xl text-lg text-muted">
        Start with the fundamentals, master each building block, then design full
        systems end to end.
      </p>

      {GROUP_ORDER.map((group) => {
        const lessons = lessonsByGroup(group)
        if (lessons.length === 0) return null
        const meta = GROUP_META[group]
        return (
          <section key={group} className="mt-12">
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl">{meta.title}</h2>
              <span className="text-sm text-faint">{meta.blurb}</span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lessons.map((lesson) => (
                <LessonCard key={lesson.slug} lesson={lesson} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function LessonCard({ lesson }: { lesson: Lesson }) {
  const isPro = useEntitlement((s) => s.plan === 'pro')
  const locked = lesson.tier === 'pro' && !isPro

  return (
    <Link
      to={`/learn/${lesson.slug}`}
      className="card group flex flex-col p-6 transition-colors hover:border-border-strong"
    >
      <div className="flex items-center justify-between">
        {lesson.tier === 'pro' ? (
          <span className="chip border-accent-500/50 text-accent-400">Pro</span>
        ) : (
          <span className="chip">Free</span>
        )}
        <span className="text-xs text-faint">{lesson.minutes} min</span>
      </div>
      <h3 className="mt-4 text-xl group-hover:text-text">{lesson.title}</h3>
      <p className="mt-2 flex-1 text-sm text-faint">{lesson.summary}</p>
      <span className="mt-4 text-sm font-medium text-accent-400">
        {locked ? 'Preview & unlock →' : 'Watch it move →'}
      </span>
    </Link>
  )
}
