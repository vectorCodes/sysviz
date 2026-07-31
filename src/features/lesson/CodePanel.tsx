/** Pseudocode / request-flow panel with the active line highlighted. */
export function CodePanel({
  code,
  activeLine,
  title = 'Pseudocode',
}: {
  code: string[]
  activeLine?: number
  title?: string
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h3 className="font-display text-sm font-bold">{title}</h3>
        <span className="chip">flow</span>
      </div>
      <pre className="overflow-x-auto py-2 text-sm leading-relaxed">
        {code.map((line, i) => {
          const n = i + 1
          const active = n === activeLine
          return (
            <div
              key={i}
              className={`flex gap-3 px-4 ${active ? 'bg-accent-500/15' : ''}`}
            >
              <span className="w-5 shrink-0 select-none text-right font-mono text-xs text-faint">
                {n}
              </span>
              <code
                className={`font-mono ${active ? 'text-text' : 'text-muted'}`}
              >
                {line || ' '}
              </code>
            </div>
          )
        })}
      </pre>
    </div>
  )
}
