import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GROUP_META, GROUP_ORDER, type Lesson } from '../../content/types'
import { LESSONS, lessonsByGroup } from '../../content'
import { useEntitlement } from '../../store/useEntitlement'

export function Sidebar({ activeSlug }: { activeSlug: string }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const activeLesson = LESSONS.find((l) => l.slug === activeSlug)
  const activeTopic = activeLesson?.topic ?? ''

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return LESSONS.filter(
      (l) => l.title.toLowerCase().includes(q) || l.summary.toLowerCase().includes(q),
    )
  }, [query])

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-bg">
      {/* Brand */}
      <div className="border-b border-border px-5 py-4">
        <Link to="/tracks" className="text-xs text-faint hover:text-text">
          ← all tracks
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-accent-500 font-display text-sm font-extrabold text-white">
            S
          </span>
          <h2 className="font-display text-lg font-extrabold">
            System Design <span className="text-accent-500">Visual</span>
          </h2>
        </div>
        <p className="mt-1 text-xs text-faint">step-by-step architecture animations</p>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-faint">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full bg-transparent text-sm text-text placeholder:text-faint focus:outline-none"
          />
        </div>
      </div>

      {/* Tree */}
      <nav className="flex-1 overflow-y-auto px-3 pb-6">
        {matches ? (
          <div className="space-y-1">
            {matches.length === 0 && (
              <p className="px-2 py-3 text-sm text-faint">No lessons match &quot;{query}&quot;.</p>
            )}
            {matches.map((l) => (
              <LessonRow key={l.slug} lesson={l} active={l.slug === activeSlug} indent={false} onNavigate={navigate} />
            ))}
          </div>
        ) : (
          GROUP_ORDER.map((group) => {
            const lessons = lessonsByGroup(group)
            if (lessons.length === 0) return null

            // Group lessons by topic within this section
            const topicMap = new Map<string, Lesson[]>()
            for (const l of lessons) {
              const t = l.topic
              if (!topicMap.has(t)) topicMap.set(t, [])
              topicMap.get(t)!.push(l)
            }

            return (
              <div key={group} className="mt-4 first:mt-1">
                <p className="px-2 pb-1 font-display text-sm font-bold text-text">
                  {GROUP_META[group].title}
                </p>
                <div className="space-y-0.5">
                  {Array.from(topicMap.entries()).map(([topic, topicLessons]) =>
                    topicLessons.length === 1 ? (
                      // Single lesson under topic — no accordion needed
                      <LessonRow
                        key={topicLessons[0].slug}
                        lesson={topicLessons[0]}
                        active={topicLessons[0].slug === activeSlug}
                        indent={false}
                        onNavigate={navigate}
                      />
                    ) : (
                      // Multiple lessons — collapsible topic group
                      <TopicGroup
                        key={topic}
                        topic={topic}
                        lessons={topicLessons}
                        activeSlug={activeSlug}
                        defaultOpen={topic === activeTopic}
                        onNavigate={navigate}
                      />
                    ),
                  )}
                </div>
              </div>
            )
          })
        )}
      </nav>
    </aside>
  )
}

function TopicGroup({
  topic,
  lessons,
  activeSlug,
  defaultOpen,
  onNavigate,
}: {
  topic: string
  lessons: Lesson[]
  activeSlug: string
  defaultOpen: boolean
  onNavigate: (to: string) => void
}) {
  const [open, setOpen] = useState(defaultOpen)
  const hasActive = lessons.some((l) => l.slug === activeSlug)
  const isPro = useEntitlement((s) => s.plan === 'pro')
  const allLocked = lessons.every((l) => l.tier === 'pro') && !isPro

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`group flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface ${
          hasActive && !open ? 'bg-surface' : ''
        }`}
      >
        {/* chevron */}
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          className={`shrink-0 text-faint transition-transform ${open ? 'rotate-90' : ''}`}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span className={`flex-1 truncate text-sm font-medium ${hasActive ? 'text-text' : 'text-muted group-hover:text-text'}`}>
          {topic}
        </span>
        {allLocked && <LockIcon />}
        <span className="font-mono text-[10px] text-faint">{lessons.length}</span>
      </button>

      {open && (
        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-2">
          {lessons.map((l) => (
            <LessonRow
              key={l.slug}
              lesson={l}
              active={l.slug === activeSlug}
              indent
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LessonRow({
  lesson,
  active,
  indent,
  onNavigate,
}: {
  lesson: Lesson
  active: boolean
  indent: boolean
  onNavigate: (to: string) => void
}) {
  const isPro = useEntitlement((s) => s.plan === 'pro')
  const locked = lesson.tier === 'pro' && !isPro

  return (
    <button
      onClick={() => onNavigate(`/learn/${lesson.slug}`)}
      className={`group flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors ${
        active ? 'bg-surface-2' : 'hover:bg-surface'
      }`}
    >
      {indent && (
        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${active ? 'bg-accent-500' : 'bg-border-strong group-hover:bg-muted'}`} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`truncate text-sm font-medium ${active ? 'text-text' : 'text-muted group-hover:text-text'}`}>
            {lesson.title}
          </span>
          {locked && <LockIcon />}
        </div>
        <p className="truncate text-xs text-faint">{lesson.summary}</p>
      </div>
    </button>
  )
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-accent-400">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}
