import * as React from 'react'

import { Pause, Play } from 'lucide-react'

import { cn } from '../../lib/utils'
import { type PUIButtonVariant } from './PUIButton.types'
import { type PUITimedButtonMode, type PUITimedButtonProps } from './PUITimedButton.types'

export type { PUITimedButtonMode, PUITimedButtonProps } from './PUITimedButton.types'

// Mirror PUIButton's variant token maps so the timed button sits on the exact same surface grammar.
const BOX: Record<PUIButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
  destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
  outline: 'border border-border bg-background text-foreground hover:bg-muted',
  ghost: 'text-foreground hover:bg-muted',
  onBrand: 'bg-brand text-inverse-foreground hover:opacity-90',
}

const DEFAULT_DURATION = 5
const DURATION_FLOOR = 1

// SVG ring geometry. The ring inherits the foreground via `stroke="currentColor"` (token-driven,
// no hex); the track uses the same color at a low opacity so it reads on any variant surface.
const RING_SIZE = 24
const RING_STROKE = 3
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

/** Tracks `prefers-reduced-motion`. SSR-safe (returns `false` until the client subscribes). */
function useReducedMotion(): boolean {
  const subscribe = React.useCallback((onChange: () => void) => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  )
}

/** Best-effort accessible name from a ReactNode label: a plain string passes through; anything else
 * (the `t` macro / `<Trans>`) cannot be coerced, so the caller should pass `accessibilityLabel`. */
function labelToAccessibilityLabel(label: React.ReactNode): string | undefined {
  return typeof label === 'string' ? label : undefined
}

/**
 * The progress ring. `progress` is 0..1 of the run (depleting in `auto`, filling in `hold`). Always
 * hidden from assistive tech (`aria-hidden`) — the numeric time is the accessible carrier. Under
 * Reduce Motion the arc is QUANTIZED to whole-second steps so it never reads as a smooth animation
 * while the underlying countdown timing is unchanged.
 */
function ProgressRing({
  progress,
  mode,
  reducedMotion,
  steps,
}: {
  progress: number
  mode: PUITimedButtonMode
  reducedMotion: boolean
  steps: number
}) {
  // `auto` shows time remaining, so the visible arc is the inverse of elapsed; `hold` shows fill.
  const raw = mode === 'auto' ? 1 - progress : progress
  // Under Reduce Motion, snap the drawn fraction to the nearest whole-second step (no smooth sweep).
  const visible = reducedMotion && steps > 0 ? Math.round(raw * steps) / steps : raw
  const offset = RING_CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, visible)))
  return (
    <svg
      aria-hidden
      className="shrink-0"
      height={RING_SIZE}
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      width={RING_SIZE}
    >
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        fill="none"
        opacity={0.3}
        r={RING_RADIUS}
        stroke="currentColor"
        strokeWidth={RING_STROKE}
      />
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        fill="none"
        r={RING_RADIUS}
        stroke="currentColor"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={offset}
        strokeLinecap="round"
        strokeWidth={RING_STROKE}
        transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
      />
    </svg>
  )
}

/**
 * Auto-confirm / hold-to-confirm action button. In `auto` mode a countdown depletes a progress ring
 * and fires `onConfirm` at 0 (a recommended default the user may let happen); a proactive click fires
 * it immediately. In `hold` mode the user presses and holds to fill the ring, and `onConfirm` fires
 * only on completion — releasing early cancels and the ring rewinds. The remaining/elapsed time is
 * always rendered numerically; the ring is a progressive enhancement and never the sole carrier.
 *
 * Compiler-clean by construction: the rAF/timeout loops live inside effects with cleanup and update
 * via the functional setState form; the countdown restart-on-signal uses React's adjust-state-during-
 * render pattern with a previous-value held in STATE (never a ref read during render, never a
 * setState synchronously in an effect body). Confirmation fires from inside the rAF/timer callbacks.
 *
 * Reduce Motion (`prefers-reduced-motion`) is honored in JS: the ring stops animating (a static arc
 * is drawn) and the numeric time leads, so the control works without movement. Non-modal and fully
 * keyboard operable.
 *
 * @scope both
 * ADR-0023: Tier 3 (Composite) — parity optional; web SVG ring + pointer-hold vs native fill overlay.
 */
export function PUITimedButton({
  label,
  accessibilityLabel,
  onConfirm,
  mode = 'auto',
  duration = DEFAULT_DURATION,
  running = true,
  restartSignal = 0,
  onTick,
  pausable = true,
  onPauseToggle,
  variant = 'default',
  disabled = false,
  className,
}: PUITimedButtonProps) {
  const reducedMotion = useReducedMotion()
  const totalMs = Math.max(DURATION_FLOOR, duration) * 1000

  // Latest callbacks read inside rAF loops without re-arming them every render. The refs are written
  // in an effect (never during render — the React Compiler rule bans render-phase ref writes) and
  // read only from inside frame/effect callbacks.
  const onConfirmRef = React.useRef(onConfirm)
  const onTickRef = React.useRef(onTick)
  React.useEffect(() => {
    onConfirmRef.current = onConfirm
    onTickRef.current = onTick
  })

  // 0..1 of the run. In `auto` it grows toward 1 as time elapses (ring depletes); in `hold` it grows
  // toward 1 as the user holds (ring fills). `confirmed` latches a completed run so it fires once.
  const [progress, setProgress] = React.useState(0)
  const [confirmed, setConfirmed] = React.useState(false)
  // `hold` only: whether the pointer is currently held down driving the fill.
  const [holding, setHolding] = React.useState(false)

  // --- auto restart-on-signal: adjust state during render (previous value kept in STATE, not a ref).
  // A rising restartSignal (or a duration change) re-arms the countdown from the start. setState
  // during render is allowed and converges via these guards; no ref is read or written during render.
  const [prevRestartSignal, setPrevRestartSignal] = React.useState(restartSignal)
  const [prevTotalMs, setPrevTotalMs] = React.useState(totalMs)
  if (mode === 'auto' && (restartSignal !== prevRestartSignal || totalMs !== prevTotalMs)) {
    setPrevRestartSignal(restartSignal)
    setPrevTotalMs(totalMs)
    setProgress(0)
    setConfirmed(false)
  }

  const fireConfirm = React.useCallback(() => {
    setConfirmed((already) => {
      if (already) return already
      onConfirmRef.current()
      return true
    })
  }, [])

  // --- auto countdown: a single rAF loop, armed only while running and not yet confirmed. It updates
  // `progress` via the functional setter and fires confirm from inside the frame callback at 1.0 — no
  // synchronous setState in the effect body, and the loop self-cleans on pause/unmount.
  React.useEffect(() => {
    if (mode !== 'auto' || disabled || !running || confirmed) return
    let raf = 0
    let last = 0
    let lastWholeSecond = -1
    // Real wall-clock time always drives the countdown, including under Reduce Motion — the time must
    // still elapse so the user can intervene before auto-confirm. Reduce Motion only affects how the
    // ring is DRAWN (quantized to whole seconds in ProgressRing), not how fast time passes.
    const step = (now: number) => {
      if (last === 0) last = now
      const delta = now - last
      last = now
      setProgress((current) => {
        const next = Math.min(1, current + delta / totalMs)
        const secondsLeft = Math.max(0, Math.ceil((1 - next) * (totalMs / 1000)))
        if (secondsLeft !== lastWholeSecond) {
          lastWholeSecond = secondsLeft
          onTickRef.current?.(secondsLeft)
        }
        if (next >= 1) fireConfirm()
        return next
      })
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [mode, disabled, running, confirmed, totalMs, fireConfirm])

  // --- hold fill: a single rAF loop armed only while the pointer is held. Fills `progress` toward 1
  // and fires confirm at completion; releasing clears `holding`, which tears the loop down and the
  // separate rewind effect takes over.
  React.useEffect(() => {
    if (mode !== 'hold' || disabled || !holding || confirmed) return
    // Real elapsed time drives the fill so holding for `duration` actually takes `duration`. Reduce
    // Motion only quantizes the drawn ring (in ProgressRing), not the gesture timing.
    let raf = 0
    let last = 0
    const step = (now: number) => {
      if (last === 0) last = now
      const delta = now - last
      last = now
      setProgress((current) => {
        const next = Math.min(1, current + delta / totalMs)
        if (next >= 1) fireConfirm()
        return next
      })
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [mode, disabled, holding, confirmed, totalMs, fireConfirm])

  // --- hold rewind: when not holding and not yet complete, ease the fill back to 0 so an early
  // release visibly cancels. Armed on the release transition (deps exclude `progress` so the loop is
  // not re-created every frame); it self-terminates once it reaches 0. Reduce Motion snaps to 0 in
  // the first frame (a full-magnitude step), so there is no rewind animation.
  React.useEffect(() => {
    if (mode !== 'hold' || holding || confirmed) return
    let raf = 0
    let last = 0
    const step = (now: number) => {
      if (last === 0) last = now
      const delta = reducedMotion ? totalMs : now - last
      last = now
      let reachedZero = false
      setProgress((current) => {
        const next = Math.max(0, current - delta / (totalMs / 2))
        if (next === 0) reachedZero = true
        return next
      })
      if (!reachedZero) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [mode, holding, confirmed, totalMs, reducedMotion])

  const secondsLeft = Math.max(0, Math.ceil((1 - progress) * (totalMs / 1000)))

  const handleClick = () => {
    if (disabled || mode !== 'auto') return
    fireConfirm()
  }

  const startHold = () => {
    if (disabled || mode !== 'hold' || confirmed) return
    setHolding(true)
  }
  const endHold = () => {
    if (mode !== 'hold') return
    setHolding(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled || mode !== 'hold') return
    if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
      event.preventDefault()
      setHolding(true)
    }
  }
  const handleKeyUp = (event: React.KeyboardEvent) => {
    if (mode !== 'hold') return
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      setHolding(false)
    }
  }

  const handlePauseToggle = () => {
    onPauseToggle?.(!running)
  }

  const resolvedLabel = accessibilityLabel ?? labelToAccessibilityLabel(label)
  // Fold the per-second remaining time into the accessible name so a screen reader hears it on focus
  // (the live region below stays coarse to avoid chatter). The visible counter carries it for sighted
  // users.
  const timeSuffix =
    mode === 'auto'
      ? `, ${secondsLeft} seconds remaining`
      : confirmed
        ? ', confirmed'
        : `, press and hold ${secondsLeft} seconds to confirm`
  const composedLabel = resolvedLabel != null ? `${resolvedLabel}${timeSuffix}` : undefined
  const counter = mode === 'hold' && confirmed ? '' : `${secondsLeft}s`

  // Polite live region. The composed `aria-label` is spoken only on focus, so an unfocused screen
  // reader misses both the ticking and the self-firing `auto` confirm. A live region only re-speaks
  // when its text CHANGES, so the message is derived from render state at COARSE granularity: the
  // confirm transition, and `auto` ticks bucketed (every 10s, then each of the final 5s) — never a
  // per-frame string. Fully derived in render (no extra state/effect/ref), so the React Compiler
  // rules hold. The name carried by `resolvedLabel` keeps "X confirmed" self-describing.
  const announcement = (() => {
    if (confirmed) return resolvedLabel != null ? `${resolvedLabel} confirmed` : 'Confirmed'
    if (mode !== 'auto' || !running) return ''
    if (secondsLeft > 5 && secondsLeft % 10 !== 0) return ''
    if (secondsLeft <= 0) return ''
    return `${secondsLeft} seconds remaining`
  })()

  // Shared button chrome: PUIButton's box look, plus min hit target and focus ring (AGENTS.md).
  const boxClasses = cn(
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-4 text-callout font-semibold',
    'transition-colors duration-fast motion-reduce:transition-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'disabled:pointer-events-none disabled:opacity-50 select-none',
    BOX[variant],
    className,
  )

  const showPause = mode === 'auto' && pausable

  return (
    // Inline wrapper so the pause toggle is a SIBLING of the confirm button, never nested inside it
    // (nesting interactive elements is invalid). Both stay independently keyboard operable. `group`
    // + the action name tie the confirm and pause buttons together so several instances on one
    // screen stay distinguishable to a screen reader.
    <span aria-label={resolvedLabel} className="inline-flex items-center gap-1" role="group">
      {/* Visually-hidden polite live region: announces coarse state changes (countdown buckets and
          the self-firing confirm) to an unfocused screen reader; sighted users read the counter. */}
      <span aria-live="polite" className="sr-only" role="status">
        {announcement}
      </span>
      <button
        aria-keyshortcuts={mode === 'hold' ? 'Space Enter' : undefined}
        aria-label={composedLabel}
        className={boxClasses}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onPointerDown={startHold}
        onPointerLeave={endHold}
        onPointerUp={endHold}
        type="button"
      >
        <ProgressRing
          mode={mode}
          progress={progress}
          reducedMotion={reducedMotion}
          steps={Math.round(totalMs / 1000)}
        />
        <span className="shrink">{label}</span>
        {counter !== '' ? (
          <span aria-hidden className="tabular-nums opacity-80">
            {counter}
          </span>
        ) : null}
      </button>

      {showPause ? (
        <button
          aria-label={
            resolvedLabel != null
              ? `${running ? 'Pause' : 'Resume'} ${resolvedLabel}`
              : running
                ? 'Pause'
                : 'Resume'
          }
          className={cn(
            'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md',
            'text-foreground duration-fast transition-opacity hover:opacity-80 motion-reduce:transition-none',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
          disabled={disabled}
          onClick={handlePauseToggle}
          type="button"
        >
          {running ? (
            <Pause aria-hidden className="size-4" />
          ) : (
            <Play aria-hidden className="size-4" />
          )}
        </button>
      ) : null}
    </span>
  )
}
PUITimedButton.displayName = 'PUITimedButton'
