import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getLesson } from '../../content'
import { nodeStatesAtStep, stateAtStep } from '../../engine/scene'
import { useStepPlayer } from '../../engine/useStepPlayer'
import { SceneRenderer } from '../../engine/SceneRenderer'
import { useEntitlement } from '../../store/useEntitlement'
import { track } from '../../lib/analytics'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { CodePanel } from './CodePanel'
import { StatePanel } from './StatePanel'
import { PlayerControls } from './PlayerControls'
import { LessonPaywall } from './LessonPaywall'
import { DeepDivePanel } from './DeepDivePanel'

export function LessonWorkspace() {
  const { slug = '' } = useParams()
  const lesson = getLesson(slug)
  const isPro = useEntitlement((s) => s.plan === 'pro')

  if (!lesson) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="text-4xl">Lesson not found</h1>
          <Link to="/tracks" className="btn-ghost mt-6">
            Back to lessons
          </Link>
        </div>
      </div>
    )
  }

  const locked = lesson.tier === 'pro' && !isPro

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar activeSlug={slug} />
      {locked ? (
        <LessonPaywall lesson={lesson} />
      ) : (
        <Workspace key={lesson.slug} lesson={lesson} />
      )}
    </div>
  )
}

function Workspace({ lesson }: { lesson: NonNullable<ReturnType<typeof getLesson>> }) {
  const player = useStepPlayer(lesson.scene)
  const { index, total } = player
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'deep-dive' ? 'deep-dive' : 'visualize')

  // Deep-link to a step via ?step=N.
  useEffect(() => {
    const s = Number(params.get('step'))
    if (s > 0) player.seek(s - 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.slug])

  const nodeStates = nodeStatesAtStep(lesson.scene, index)
  const state = stateAtStep(lesson.scene, index)
  const step = lesson.scene.steps[index]

  // Analytics: lesson start + per-step + completion.
  useEffect(() => {
    track('lesson_started', { slug: lesson.slug, tier: lesson.tier })
  }, [lesson.slug, lesson.tier])

  useEffect(() => {
    track('step_played', { slug: lesson.slug, step: index })
    if (index === total - 1) track('lesson_completed', { slug: lesson.slug })
  }, [index, total, lesson.slug])

  function selectTab(next: Tab) {
    setTab(next)
    if (next === 'deep-dive') {
      player.pause()
      track('deep_dive_opened', { slug: lesson.slug })
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <TopBar lesson={lesson} step={index} total={total} />

      {lesson.deepDive && (
        <TabBar tab={tab} onSelect={selectTab} readingMinutes={lesson.deepDive.readingMinutes} />
      )}

      {tab === 'deep-dive' && lesson.deepDive ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <DeepDivePanel deepDive={lesson.deepDive} />
        </div>
      ) : (
        <>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[1fr_340px]">
            {/* Center: animated scene */}
            <div className="flex min-w-0 flex-col gap-4">
              <div className="card relative h-[clamp(320px,52vh,560px)] shrink-0 overflow-hidden p-2">
                <SceneRenderer
                  scene={lesson.scene}
                  index={index}
                  nodeStates={nodeStates}
                  speed={player.speed}
                />
              </div>
              {lesson.notes && lesson.notes.length > 0 && <KeyIdeas notes={lesson.notes} />}
            </div>

            {/* Right: code + state */}
            <div className="flex flex-col gap-4">
              {lesson.scene.code && (
                <CodePanel code={lesson.scene.code} activeLine={step?.codeLine} title={lesson.concept} />
              )}
              <StatePanel state={state} />
            </div>
          </div>

          {/* Narration + player */}
          <div className="border-t border-border px-4 py-3">
            <div className="card mb-3 flex items-start gap-3 px-4 py-3">
              <span className="chip shrink-0">step {index + 1}</span>
              <p className="text-sm text-text">{step?.caption}</p>
            </div>
            <PlayerControls player={player} />
          </div>
        </>
      )}
    </div>
  )
}

type Tab = 'visualize' | 'deep-dive'

function TabBar({
  tab,
  onSelect,
  readingMinutes,
}: {
  tab: Tab
  onSelect: (t: Tab) => void
  readingMinutes: number
}) {
  const tabs: { id: Tab; label: string; hint: string }[] = [
    { id: 'visualize', label: 'Visualize', hint: 'animated' },
    { id: 'deep-dive', label: 'Deep dive', hint: `${readingMinutes} min read` },
  ]

  return (
    <div className="flex items-center gap-1 border-b border-border px-4">
      {tabs.map((t) => {
        const active = t.id === tab
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`-mb-px flex items-baseline gap-2 border-b-2 px-3 py-2.5 font-display text-sm font-bold transition-colors ${active
              ? 'border-accent-500 text-text'
              : 'border-transparent text-faint hover:text-muted'
              }`}
          >
            {t.label}
            <span className="font-mono text-[10px] font-normal uppercase tracking-widest text-faint">
              {t.hint}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** The lesson's takeaways, shown under the diagram so they're read, not skipped. */
function KeyIdeas({ notes }: { notes: string[] }) {
  return (
    <div className="card px-4 py-3">
      <p className="font-mono text-xs uppercase tracking-widest text-faint">Key ideas</p>
      <ul className="mt-2 space-y-1.5">
        {notes.map((n, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-muted">
            <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
            <span>{n}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
