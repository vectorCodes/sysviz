import { useEffect, useState } from 'react'
import type {
  CalloutTone,
  DeepDive,
  DeepDiveBlock,
  FailureMode,
  InterviewQA,
} from '../../content/types'
import { RichText } from './RichText'

/**
 * The reading companion for a lesson: prose, trade-off tables, capacity math,
 * failure modes and interview questions, with a sticky contents rail.
 */
export function DeepDivePanel({ deepDive }: { deepDive: DeepDive }) {
  const anchors = [
    ...deepDive.sections.map((s) => ({ id: s.id, heading: s.heading })),
    ...(deepDive.whenNotToUse?.length ? [{ id: 'when-not', heading: 'When not to use it' }] : []),
    ...(deepDive.failureModes?.length ? [{ id: 'failures', heading: 'Failure modes' }] : []),
    ...(deepDive.interview?.length ? [{ id: 'interview', heading: 'Interview questions' }] : []),
    ...(deepDive.references?.length ? [{ id: 'refs', heading: 'Further reading' }] : []),
  ]

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[1fr_220px]">
      <article className="min-w-0">
        <div className="space-y-4">
          {deepDive.intro.map((p, i) => (
            <p
              key={i}
              className={
                i === 0
                  ? 'text-lg leading-relaxed text-text'
                  : 'leading-relaxed text-muted'
              }
            >
              <RichText text={p} />
            </p>
          ))}
        </div>

        {deepDive.sections.map((section) => (
          <section key={section.id} id={section.id} className="mt-12 scroll-mt-6">
            <h2 className="text-2xl">{section.heading}</h2>
            <div className="mt-4 space-y-5">
              {section.blocks.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </div>
          </section>
        ))}

        {deepDive.whenNotToUse && deepDive.whenNotToUse.length > 0 && (
          <section id="when-not" className="mt-12 scroll-mt-6">
            <h2 className="text-2xl">When not to use it</h2>
            <ul className="mt-4 space-y-2.5">
              {deepDive.whenNotToUse.map((item, i) => (
                <li key={i} className="flex gap-3 leading-relaxed text-muted">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-miss" />
                  <span><RichText text={item} /></span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {deepDive.failureModes && deepDive.failureModes.length > 0 && (
          <section id="failures" className="mt-12 scroll-mt-6">
            <h2 className="text-2xl">Failure modes</h2>
            <p className="mt-2 text-sm text-faint">
              What actually breaks in production, and how you would spot it.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {deepDive.failureModes.map((f) => (
                <FailureCard key={f.name} failure={f} />
              ))}
            </div>
          </section>
        )}

        {deepDive.interview && deepDive.interview.length > 0 && (
          <section id="interview" className="mt-12 scroll-mt-6">
            <h2 className="text-2xl">Interview questions</h2>
            <div className="mt-4 space-y-2.5">
              {deepDive.interview.map((qa, i) => (
                <QaCard key={i} qa={qa} />
              ))}
            </div>
          </section>
        )}

        {deepDive.references && deepDive.references.length > 0 && (
          <section id="refs" className="mt-12 scroll-mt-6">
            <h2 className="text-2xl">Further reading</h2>
            <ul className="mt-4 space-y-2">
              {deepDive.references.map((r) => (
                <li key={r.href}>
                  <a
                    href={r.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent-400 underline underline-offset-4 hover:text-accent-500"
                  >
                    {r.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="h-16" />
      </article>

      <ContentsRail anchors={anchors} readingMinutes={deepDive.readingMinutes} />
    </div>
  )
}

// ── Contents rail ────────────────────────────────────────────────────────────

function ContentsRail({
  anchors,
  readingMinutes,
}: {
  anchors: { id: string; heading: string }[]
  readingMinutes: number
}) {
  const [active, setActive] = useState(anchors[0]?.id ?? '')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 },
    )
    for (const a of anchors) {
      const el = document.getElementById(a.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [anchors.map((a) => a.id).join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-6">
        <p className="font-mono text-xs uppercase tracking-widest text-faint">
          Contents · {readingMinutes} min read
        </p>
        <nav className="mt-3 space-y-1 border-l border-border">
          {anchors.map((a) => (
            <a
              key={a.id}
              href={`#${a.id}`}
              className={`-ml-px block border-l-2 py-1 pl-3 text-sm transition-colors ${
                active === a.id
                  ? 'border-accent-500 text-text'
                  : 'border-transparent text-faint hover:text-muted'
              }`}
            >
              {a.heading}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  )
}

// ── Blocks ───────────────────────────────────────────────────────────────────

function Block({ block }: { block: DeepDiveBlock }) {
  switch (block.kind) {
    case 'prose':
      return (
        <div className="space-y-4">
          {block.body.map((p, i) => (
            <p key={i} className="leading-relaxed text-muted">
              <RichText text={p} />
            </p>
          ))}
        </div>
      )

    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul'
      return (
        <Tag className="space-y-2.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 leading-relaxed text-muted">
              {block.ordered ? (
                <span className="mt-0.5 w-5 shrink-0 font-mono text-xs text-accent-400">
                  {String(i + 1).padStart(2, '0')}
                </span>
              ) : (
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-border-strong" />
              )}
              <span><RichText text={item} /></span>
            </li>
          ))}
        </Tag>
      )
    }

    case 'table':
      return (
        <figure className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  {block.columns.map((c) => (
                    <th
                      key={c}
                      className="px-4 py-2.5 font-mono text-xs font-medium uppercase tracking-wider text-faint"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {block.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className={`px-4 py-3 align-top leading-relaxed ${
                          j === 0 ? 'font-medium text-text' : 'text-muted'
                        }`}
                      >
                        <RichText text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {block.caption && (
            <figcaption className="border-t border-border px-4 py-2 text-xs text-faint">
              <RichText text={block.caption} />
            </figcaption>
          )}
        </figure>
      )

    case 'callout':
      return <Callout tone={block.tone} title={block.title} body={block.body} />

    case 'code':
      return (
        <figure className="card overflow-hidden">
          {block.caption && (
            <figcaption className="border-b border-border px-4 py-2 font-mono text-xs text-faint">
              {block.caption}
            </figcaption>
          )}
          <pre className="overflow-x-auto px-4 py-3 text-sm leading-relaxed">
            <code className="font-mono text-muted">{block.lines.join('\n')}</code>
          </pre>
        </figure>
      )

    case 'math':
      return (
        <figure className="card overflow-hidden">
          <dl className="divide-y divide-border">
            {block.rows.map((r) => (
              <div key={r.label} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
                <dt className="text-sm text-muted">
                  <RichText text={r.label} />
                  {r.note && <span className="ml-2 text-xs text-faint">{r.note}</span>}
                </dt>
                <dd className="shrink-0 font-mono text-sm font-medium text-text">{r.value}</dd>
              </div>
            ))}
          </dl>
          {block.result && (
            <p className="border-t border-border bg-surface-2 px-4 py-2.5 font-mono text-sm text-accent-400">
              {block.result}
            </p>
          )}
        </figure>
      )
  }
}

const TONE: Record<CalloutTone, { label: string; accent: string; icon: string }> = {
  insight: { label: 'Key insight', accent: 'border-l-accent-500', icon: '◆' },
  warning: { label: 'Watch out', accent: 'border-l-signal-queue', icon: '▲' },
  pitfall: { label: 'Common pitfall', accent: 'border-l-signal-miss', icon: '✕' },
  interview: { label: 'Interview signal', accent: 'border-l-signal-hit', icon: '★' },
}

function Callout({ tone, title, body }: { tone: CalloutTone; title: string; body: string[] }) {
  const meta = TONE[tone]
  return (
    <aside className={`card border-l-4 ${meta.accent} px-4 py-3.5`}>
      <p className="font-mono text-xs uppercase tracking-widest text-faint">
        <span aria-hidden className="mr-1.5">{meta.icon}</span>
        {meta.label}
      </p>
      <p className="mt-1.5 font-display font-bold text-text">{title}</p>
      <div className="mt-1.5 space-y-2">
        {body.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-muted">
            <RichText text={p} />
          </p>
        ))}
      </div>
    </aside>
  )
}

function FailureCard({ failure }: { failure: FailureMode }) {
  return (
    <div className="card p-4">
      <p className="font-display font-bold text-text">{failure.name}</p>
      <dl className="mt-3 space-y-2 text-sm">
        {(
          [
            ['Symptom', failure.symptom],
            ['Cause', failure.cause],
            ['Fix', failure.fix],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-faint">{label}</dt>
            <dd className="leading-relaxed text-muted"><RichText text={value} /></dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function QaCard({ qa }: { qa: InterviewQA }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
      >
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5"
          className={`shrink-0 text-faint transition-transform ${open ? 'rotate-90' : ''}`}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span className="font-medium text-text">{qa.q}</span>
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3 pl-10">
          <div className="space-y-3">
            {qa.a.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-muted">
                <RichText text={p} />
              </p>
            ))}
          </div>
          {qa.followUps && qa.followUps.length > 0 && (
            <div className="mt-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-faint">
                Likely follow-ups
              </p>
              <ul className="mt-1.5 space-y-1">
                {qa.followUps.map((f, i) => (
                  <li key={i} className="text-sm text-faint">— <RichText text={f} /></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
