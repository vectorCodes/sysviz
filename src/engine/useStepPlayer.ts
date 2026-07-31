import { useCallback, useEffect, useRef, useState } from 'react'
import type { Scene } from './scene'

export type StepPlayer = {
  index: number
  total: number
  /** Highest reachable step (< total when a preview cap is applied). */
  maxIndex: number
  /** True when sitting on the preview cap with more (locked) steps beyond. */
  atCap: boolean
  isPlaying: boolean
  speed: number
  play: () => void
  pause: () => void
  toggle: () => void
  next: () => void
  prev: () => void
  restart: () => void
  seek: (i: number) => void
  setSpeed: (s: number) => void
}

export type StepPlayerOptions = {
  /** Cap navigation to the first N steps (used for locked Pro previews). */
  previewSteps?: number
}

/** Base time a single step is shown before auto-advancing, at 1× speed. */
const STEP_MS = 2200

/**
 * Drives step-by-step playback for a Scene. Deliberately step-based (not a
 * continuous scrub) so it maps cleanly to "step X / N" and every beat lands on
 * a caption, code line and state snapshot — like the ChaiCode player.
 */
export function useStepPlayer(scene: Scene, options: StepPlayerOptions = {}): StepPlayer {
  const total = scene.steps.length
  const maxIndex =
    options.previewSteps != null
      ? Math.max(0, Math.min(total - 1, options.previewSteps - 1))
      : total - 1
  const [index, setIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const pause = useCallback(() => {
    clear()
    setIsPlaying(false)
  }, [clear])

  const seek = useCallback(
    (i: number) => setIndex(Math.max(0, Math.min(maxIndex, i))),
    [maxIndex],
  )

  const next = useCallback(() => {
    setIndex((i) => Math.min(maxIndex, i + 1))
  }, [maxIndex])

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])

  const restart = useCallback(() => {
    setIndex(0)
    setIsPlaying(true)
  }, [])

  const play = useCallback(() => {
    if (total === 0) return
    // Replay from the start if sitting on the last reachable step.
    setIndex((i) => (i >= maxIndex ? 0 : i))
    setIsPlaying(true)
  }, [total, maxIndex])

  const toggle = useCallback(() => {
    if (isPlaying) pause()
    else play()
  }, [isPlaying, pause, play])

  // Auto-advance while playing; stop at the last reachable step.
  useEffect(() => {
    if (!isPlaying) return
    if (index >= maxIndex) {
      setIsPlaying(false)
      return
    }
    timer.current = setTimeout(() => setIndex((i) => i + 1), STEP_MS / speed)
    return clear
  }, [isPlaying, index, maxIndex, speed, clear])

  // Reset when the scene changes (navigating between lessons).
  useEffect(() => {
    clear()
    setIndex(0)
    setIsPlaying(false)
  }, [scene, clear])

  return {
    index,
    total,
    maxIndex,
    atCap: maxIndex < total - 1 && index >= maxIndex,
    isPlaying,
    speed,
    play,
    pause,
    toggle,
    next,
    prev,
    restart,
    seek,
    setSpeed,
  }
}
