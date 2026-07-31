import type { StepPlayer } from '../../engine/useStepPlayer'

const SPEEDS = [0.5, 1, 1.5, 2]

export function PlayerControls({ player }: { player: StepPlayer }) {
  const { index, total, maxIndex, isPlaying, speed } = player

  return (
    <div className="flex items-center gap-3">
      <IconBtn label="Restart" onClick={player.restart}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </IconBtn>

      <IconBtn label="Previous step" onClick={player.prev} disabled={index === 0}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 5h2v14H6zM20 5 9 12l11 7z" />
        </svg>
      </IconBtn>

      <button
        onClick={player.toggle}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-ink shadow-[0_2px_0_0_rgba(0,0,0,0.25)] transition-transform hover:-translate-y-0.5"
      >
        {isPlaying ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 5v14l12-7z" />
          </svg>
        )}
      </button>

      <IconBtn label="Next step" onClick={player.next} disabled={index >= maxIndex}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 5h2v14h-2zM4 5l11 7L4 19z" />
        </svg>
      </IconBtn>

      {/* Scrubber */}
      <input
        type="range"
        min={0}
        max={Math.max(0, maxIndex)}
        value={index}
        onChange={(e) => player.seek(Number(e.target.value))}
        aria-label="Step position"
        className="accent-[var(--color-accent-500)] mx-1 h-1 flex-1 cursor-pointer"
      />

      <span className="w-14 shrink-0 text-right font-mono text-xs text-faint">
        {index + 1} / {total}
      </span>

      {/* Speed */}
      <button
        onClick={() => player.setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}
        className="rounded-lg border border-border px-2.5 py-1.5 font-mono text-xs text-muted hover:bg-surface-2 hover:text-text"
        aria-label="Playback speed"
      >
        {speed}×
      </button>
    </div>
  )
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="[&>svg]:h-4 [&>svg]:w-4">{children}</span>
    </button>
  )
}
