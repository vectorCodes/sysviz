import type { Lesson } from '../../content/types'
import { useEntitlement } from '../../store/useEntitlement'
import { ThemeToggle } from '../../components/layout/ThemeToggle'

export function TopBar({ lesson, step, total }: { lesson: Lesson; step: number; total: number }) {
  const plan = useEntitlement((s) => s.plan)

  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
      <div>
        {lesson.concept && (
          <p className="font-mono text-xs uppercase tracking-widest text-faint">
            {lesson.concept}
          </p>
        )}
        <h1 className="mt-0.5 text-3xl">{lesson.title}</h1>
        <p className="mt-1 max-w-xl text-sm text-muted">{lesson.summary}</p>
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <span className="chip">
            {plan === 'pro' ? 'Pro' : 'Free'}
          </span>
        </div>
        {lesson.tags && lesson.tags.length > 0 && (
          <div className="card flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2">
            {lesson.tags.map((t) => (
              <span key={t.label} className="font-mono text-xs text-faint">
                {t.label}{' '}
                <span className="text-text">{t.value}</span>
              </span>
            ))}
          </div>
        )}
        <span className="font-mono text-xs text-faint">
          step {step + 1} / {total}
        </span>
      </div>
    </div>
  )
}
