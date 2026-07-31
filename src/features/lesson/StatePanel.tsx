/** Live key/value state that updates as the animation steps forward. */
export function StatePanel({ state }: { state: Record<string, string | number> }) {
  const entries = Object.entries(state)
  if (entries.length === 0) return null

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border px-4 py-2.5">
        <h3 className="font-display text-sm font-bold">State</h3>
      </div>
      <dl className="divide-y divide-border">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between px-4 py-2.5">
            <dt className="font-mono text-xs text-faint">{key}</dt>
            <dd className="font-mono text-sm font-medium text-text">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
