import * as React from 'react'

import { Minus, Plus } from 'lucide-react'

import { cn } from '../../lib/utils'
import { type PUIStepperOwnProps } from './PUIStepper.types'

export type { PUIStepperOwnProps } from './PUIStepper.types'

export type PUIStepperProps = PUIStepperOwnProps

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/**
 * Bounded numeric stepper (nudger / spin button): minus and plus buttons flank a centered value,
 * adjusting it by `step` within `[min, max]`. Whole numbers only, controlled via value/onValueChange.
 *
 * The value cell is the single `role="spinbutton"` exposing aria-valuenow/min/max and taking keyboard
 * focus: ArrowUp/ArrowRight step up, ArrowDown/ArrowLeft step down, PageUp/PageDown step by `step`,
 * Home/End jump to bounds. The minus/plus buttons are hidden from the accessibility tree
 * (`aria-hidden`, `tabIndex=-1`) so assistive tech announces the stepper as one adjustable unit.
 * Each button dims to muted and disables at its bound.
 *
 * The spinbutton's only on-screen text is the bare number, so without an accessible name a screen
 * reader announces "spin button, 3" with no context. Always pass `label` — it is the spinbutton's
 * accessible name (`aria-label`); omitting it leaves the control unnamed (WCAG 4.1.2). In dev a
 * warning is emitted when `label` is missing.
 *
 * Web-only: `label` is a web escape hatch absent from the native twin (which derives its accessible
 * name from the host platform), mirroring how PUIButton documents its `children`/`asChild` additions.
 *
 * @scope both
 */
export function PUIStepper({
  value,
  onValueChange,
  min = 0,
  max = 99,
  step = 1,
  disabled = false,
  fullWidth = false,
  label,
  className,
}: PUIStepperProps) {
  if (process.env.NODE_ENV !== 'production' && !label) {
    console.warn(
      'PUIStepper: `label` is missing — the spinbutton has no accessible name. Pass `label` so screen readers can announce what is being adjusted (WCAG 4.1.2).',
    )
  }

  const current = clamp(value, min, max)
  const atMin = current <= min
  const atMax = current >= max
  const minusDisabled = disabled || atMin
  const plusDisabled = disabled || atMax

  const commit = (next: number) => {
    const clamped = clamp(next, min, max)
    if (clamped !== current) onValueChange?.(clamped)
  }
  const decrement = () => {
    if (minusDisabled) return
    commit(current - step)
  }
  const increment = () => {
    if (plusDisabled) return
    commit(current + step)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        event.preventDefault()
        increment()
        break
      case 'ArrowDown':
      case 'ArrowLeft':
        event.preventDefault()
        decrement()
        break
      case 'PageUp':
        event.preventDefault()
        commit(current + step)
        break
      case 'PageDown':
        event.preventDefault()
        commit(current - step)
        break
      case 'Home':
        event.preventDefault()
        commit(min)
        break
      case 'End':
        event.preventDefault()
        commit(max)
        break
      default:
        break
    }
  }

  return (
    <div
      className={cn(
        'border-border bg-background inline-flex items-center rounded-lg border',
        fullWidth ? 'flex w-full' : 'w-auto',
        disabled && 'opacity-50',
        className,
      )}
    >
      <button
        aria-hidden
        className={cn(
          'duration-fast inline-flex min-h-11 min-w-11 items-center justify-center rounded-l-lg transition-colors motion-reduce:transition-none',
          'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          minusDisabled
            ? 'text-muted-foreground cursor-not-allowed'
            : 'text-foreground hover:bg-muted',
        )}
        disabled={minusDisabled}
        onClick={decrement}
        tabIndex={-1}
        type="button"
      >
        <Minus aria-hidden className="size-[18px]" />
      </button>

      <div
        aria-disabled={disabled || undefined}
        aria-label={label}
        aria-valuemax={max}
        aria-valuemin={min}
        aria-valuenow={current}
        className={cn(
          'text-callout text-foreground min-h-11 px-1 text-center leading-[44px] tabular-nums select-none',
          'focus-visible:ring-ring focus-visible:ring-offset-background rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          fullWidth ? 'flex-1' : 'min-w-12',
        )}
        onKeyDown={onKeyDown}
        role="spinbutton"
        tabIndex={disabled ? -1 : 0}
      >
        {current}
      </div>

      <button
        aria-hidden
        className={cn(
          'duration-fast inline-flex min-h-11 min-w-11 items-center justify-center rounded-r-lg transition-colors motion-reduce:transition-none',
          'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          plusDisabled
            ? 'text-muted-foreground cursor-not-allowed'
            : 'text-foreground hover:bg-muted',
        )}
        disabled={plusDisabled}
        onClick={increment}
        tabIndex={-1}
        type="button"
      >
        <Plus aria-hidden className="size-[18px]" />
      </button>
    </div>
  )
}
