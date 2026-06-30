import * as React from 'react'

import { Check, ChevronRight, Loader2 } from 'lucide-react'

import { cn } from '../../lib/utils'
import {
  type PUISlidingButtonProps,
  type PUISlidingButtonThreshold,
} from './PUISlidingButton.types'

export type { PUISlidingButtonProps, PUISlidingButtonThreshold }

const THRESHOLD_RATIO: Record<PUISlidingButtonThreshold, number> = {
  easy: 0.2,
  hard: 0.8,
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

const coerce = (node: PUISlidingButtonProps['label']): string | undefined =>
  typeof node === 'string' || typeof node === 'number' ? String(node) : undefined

type Phase = 'idle' | 'dragging' | 'confirmed'

/**
 * Slide-to-confirm primary action (the web adaptation of the native PUISlidingButton): the action is
 * committed by DRAGGING a thumb across a high-contrast primary track rather than tapping, so the
 * deliberate gesture reduces accidental triggers and reinforces intent. Use as the last step of a
 * flow or to add friction to a high-intent action. A brighter `bg-primary` fill follows the thumb
 * over the quieter `bg-primary/80` track and the centered label fades as the thumb travels. Release
 * past the threshold (20% easy / 80% hard) snaps to the end and fires `onConfirm` once; otherwise it
 * springs back. After a confirm the control parks briefly, then re-arms, unless the host parks it
 * via `loading`.
 *
 * Web adaptation (touch + keyboard): the drag uses POINTER events (`pointerdown`/`move`/`up` with
 * `setPointerCapture`) so it works identically with mouse, touch and pen. Because a pointer drag is
 * not operable by keyboard or screen reader, the thumb is also a real `<button>`: focus it and press
 * Enter, Space, or ArrowRight-to-the-end to confirm. It carries `aria-label` so it has an accessible
 * name without a pointer. Settle/spring animations run as CSS transitions and collapse under
 * `prefers-reduced-motion` while the gesture + threshold still work.
 *
 * @scope web-only (ADR 0023 Tier 2 native-controls; native twin is `@piparo/cn-native` PUISlidingButton)
 */
export function PUISlidingButton({
  label,
  onConfirm,
  threshold = 'hard',
  confirmedLabel,
  disabled = false,
  loading = false,
  thumbLabel,
  className,
}: PUISlidingButtonProps) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const dragRef = React.useRef<{ pointerId: number; max: number; startX: number } | null>(null)

  // `progress` is the thumb travel 0..1. While dragging it tracks the pointer; otherwise it animates
  // to the target via a CSS transition (so we never setState in an effect or read a ref in render).
  const [progress, setProgress] = React.useState(0)
  const [phase, setPhase] = React.useState<Phase>('idle')

  // Track geometry measured in real pixels (mirrors native's onLayout `maxX`). A CSS `translateX`
  // percentage resolves against the THUMB's own box, not the track, so we must travel in pixels:
  // `maxX` is the usable travel (track width minus the square thumb) and `thumb` the thumb diameter
  // including its inset, used to grow the fill from the left edge through the thumb centre.
  const [geometry, setGeometry] = React.useState({ maxX: 0, thumb: 0 })
  React.useLayoutEffect(() => {
    const el = trackRef.current
    if (!el) return
    const measure = () =>
      setGeometry((prev) => {
        const maxX = Math.max(0, el.clientWidth - el.clientHeight)
        const thumb = el.clientHeight - 2
        return prev.maxX === maxX && prev.thumb === thumb ? prev : { maxX, thumb }
      })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Re-arm when the host stops the pending state (loading high -> low). Adjust-state-during-render
  // with a STATE previous value, never a ref-in-render and never setState-in-effect.
  const [prevLoading, setPrevLoading] = React.useState(loading)
  if (loading !== prevLoading) {
    setPrevLoading(loading)
    if (loading) {
      setPhase('confirmed')
      setProgress(1)
    } else {
      setPhase('idle')
      setProgress(0)
    }
  }

  const locked = loading
  const dragging = phase === 'dragging'

  // After a local confirm, park at the end, then spring home so the control can be slid again
  // unless the host parks it via `loading`. Timer lives in an effect with cleanup; the callback (not
  // the effect body) updates state, so the React Compiler rule is satisfied.
  React.useEffect(() => {
    if (phase !== 'confirmed' || loading) return
    const id = window.setTimeout(() => {
      setPhase('idle')
      setProgress(0)
    }, 600)
    return () => window.clearTimeout(id)
  }, [phase, loading])

  const measure = () => {
    const el = trackRef.current
    if (!el) return geometry.maxX
    return Math.max(0, el.clientWidth - el.clientHeight)
  }

  const commit = () => {
    setPhase('confirmed')
    setProgress(1)
    onConfirm()
  }

  const settleBack = () => {
    setPhase('idle')
    setProgress(0)
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || locked || e.button !== 0) return
    const max = measure()
    if (max <= 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { pointerId: e.pointerId, max, startX: e.clientX }
    setPhase('dragging')
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || e.pointerId !== drag.pointerId) return
    const next = clamp((e.clientX - drag.startX) / drag.max, 0, 1)
    setProgress(next)
  }

  const finishDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || e.pointerId !== drag.pointerId) return
    e.currentTarget.releasePointerCapture(drag.pointerId)
    const released = clamp((e.clientX - drag.startX) / drag.max, 0, 1)
    dragRef.current = null
    if (released >= THRESHOLD_RATIO[threshold]) {
      commit()
    } else {
      settleBack()
    }
  }

  const nudge = (delta: number) => {
    const next = clamp(progress + delta, 0, 1)
    if (next >= THRESHOLD_RATIO[threshold]) {
      commit()
    } else {
      setProgress(next)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || locked) return
    switch (e.key) {
      case 'Enter':
      case ' ':
      case 'Spacebar':
        e.preventDefault()
        commit()
        break
      case 'ArrowRight':
        e.preventDefault()
        nudge(0.25)
        break
      case 'ArrowLeft':
        e.preventDefault()
        setProgress((p) => clamp(p - 0.25, 0, 1))
        break
      case 'Home':
        e.preventDefault()
        setProgress(0)
        break
      case 'End':
        e.preventDefault()
        commit()
        break
    }
  }

  const name = thumbLabel ?? coerce(label) ?? 'Slide to confirm'
  const confirmedText = coerce(confirmedLabel) ?? coerce(label)
  const settling = !dragging
  // While locked the thumb is parked at the end; otherwise it tracks `progress`. Travel is in real
  // pixels against the measured `maxX` (a percentage translateX would resolve against the thumb's own
  // box, not the track, and barely move). The fill grows from the left edge through the thumb centre.
  const travel = locked ? geometry.maxX : progress * geometry.maxX
  const fillStyle: React.CSSProperties = { width: `${travel + geometry.thumb}px` }
  const thumbStyle: React.CSSProperties = { transform: `translateX(${travel}px)` }
  // Native swaps the visible track label to `confirmedLabel` while locked/confirmed; mirror that and
  // keep the layer painted (the percentage-faded label only applies during an active drag).
  const showConfirmed = locked || phase === 'confirmed'
  const activeLabel = showConfirmed ? (confirmedLabel ?? label) : label
  const transitionClass = settling
    ? 'transition-[width,transform,opacity] duration-normal ease-standard motion-reduce:transition-none'
    : ''

  return (
    <div
      ref={trackRef}
      className={cn(
        'bg-primary/80 relative h-12 w-full overflow-hidden rounded-full select-none',
        disabled && 'opacity-50',
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          'bg-primary pointer-events-none absolute inset-y-0 left-0 rounded-full',
          transitionClass,
        )}
        style={locked ? { width: '100%' } : fillStyle}
      />

      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 flex items-center justify-center px-14',
          transitionClass,
        )}
        style={{ opacity: showConfirmed ? 1 : 1 - progress }}
      >
        <span className="text-primary-foreground text-callout truncate text-center font-semibold">
          {activeLabel}
        </span>
      </div>

      <div aria-live="polite" className="sr-only">
        {showConfirmed ? confirmedText : null}
      </div>

      <button
        type="button"
        aria-label={name}
        aria-disabled={disabled || locked || undefined}
        aria-busy={locked || undefined}
        disabled={disabled || locked}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onKeyDown={handleKeyDown}
        className={cn(
          'bg-background absolute top-0.5 left-0.5 flex h-11 w-11 touch-none items-center justify-center rounded-full shadow-md',
          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
          dragging ? 'cursor-grabbing' : 'cursor-grab',
          (disabled || locked) && 'cursor-default',
          transitionClass,
        )}
        style={thumbStyle}
      >
        {loading ? (
          <Loader2
            aria-hidden
            className="text-primary size-5 animate-spin motion-reduce:animate-none"
          />
        ) : phase === 'confirmed' ? (
          <Check aria-hidden className="text-primary size-5" />
        ) : (
          <ChevronRight aria-hidden className="text-primary size-5" />
        )}
      </button>
    </div>
  )
}
