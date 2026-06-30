import * as React from 'react'

import { Star, StarHalf } from 'lucide-react'

import { cn } from '../../lib/utils'
import {
  type PUIStarRatingOwnProps,
  type PUIStarRatingSize,
  type PUIStarRatingVariant,
} from './PUIStarRating.types'

export type {
  PUIStarRatingOwnProps,
  PUIStarRatingSize,
  PUIStarRatingVariant,
} from './PUIStarRating.types'

export type PUIStarRatingProps = PUIStarRatingOwnProps

const STAR_SIZE: Record<PUIStarRatingSize, string> = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

type StarFill = 'full' | 'half' | 'empty'

const fillFor = (index: number, value: number): StarFill => {
  if (value >= index) return 'full'
  if (value >= index - 0.5) return 'half'
  return 'empty'
}

const defaultStarLabel = (value: number, max: number) =>
  `${value} of ${max} ${value === 1 ? 'star' : 'stars'}`

/**
 * One rendered star. Filled stars use a SOLID glyph (`fill-primary text-primary` so stroke matches
 * fill); empty stars are a muted outline (`text-muted-foreground`) with the same visual weight, so a
 * filled/empty pair never relies on hue alone. Half overlays a clipped `StarHalf` on the muted base.
 */
function StarGlyph({ fill, sizeClass }: { fill: StarFill; sizeClass: string }) {
  if (fill === 'half') {
    return (
      <span className={cn('relative inline-flex', sizeClass)}>
        <Star aria-hidden className={cn('text-muted-foreground absolute inset-0', sizeClass)} />
        <StarHalf aria-hidden className={cn('fill-primary text-primary', sizeClass)} />
      </span>
    )
  }
  const filled = fill === 'full'
  return (
    <Star
      aria-hidden
      className={cn(sizeClass, filled ? 'fill-primary text-primary' : 'text-muted-foreground')}
    />
  )
}

/**
 * Star rating on a 0–`max` scale (default 5). Two presentations: INTERACTIVE input (pick a star,
 * keyboard-navigable; an `onChange` handler makes it interactive) and DESCRIPTIVE static display.
 * Descriptive comes `md`/`lg` (a full star row) and `sm` (a single star flanked by a leading value
 * label and an optional trailing count, reading "4.5 stars (6311)"). Supports half values. Filled
 * stars are a solid `fill-primary` glyph; empty stars are a muted outline of equal weight, so the
 * difference is never hue-only. Pass `variant` to force a presentation regardless of `onChange`.
 *
 * Interactive a11y: a `role="radiogroup"` whose stars are `role="radio"` with `aria-checked`, a
 * roving tabindex (only the selected star is tabbable), and Arrow/Home/End keys that move the
 * selection (stepping by 0.5 when `half`). ArrowLeft/Down/Home can reach 0, and Backspace/Delete
 * clears to 0, so keyboard users can un-rate just like pointer users. Each radio carries an
 * accessible name via `starLabel`. Descriptive renders an `img` with the "{value} of {max} stars"
 * label. Hit targets stay ≥44px.
 *
 * @scope both
 */
export function PUIStarRating({
  value,
  onChange,
  max = 5,
  variant,
  size = 'md',
  half = false,
  leadingLabel,
  trailingLabel,
  disabled = false,
  label,
  starLabel = defaultStarLabel,
  className,
}: PUIStarRatingProps) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])
  const labelId = React.useId()
  const sizeClass = STAR_SIZE[size]
  const current = clamp(value, 0, max)
  const indices = Array.from({ length: max }, (_, i) => i + 1)
  const step = half ? 0.5 : 1

  const resolved: PUIStarRatingVariant =
    variant ?? (!disabled && typeof onChange === 'function' ? 'interactive' : 'descriptive')

  // ---- Descriptive small (single star + leading value + optional trailing count) ----
  if (resolved === 'descriptive' && size === 'sm') {
    return (
      <span
        aria-label={defaultStarLabel(current, max)}
        className={cn(
          'inline-flex flex-nowrap items-center gap-1',
          disabled && 'opacity-50',
          className,
        )}
        role="img"
      >
        {leadingLabel != null ? (
          <span aria-hidden className="text-muted-foreground text-xs">
            {leadingLabel}
          </span>
        ) : null}
        <StarGlyph fill={fillFor(1, current)} sizeClass={sizeClass} />
        {trailingLabel != null ? (
          <span aria-hidden className="text-muted-foreground text-xs">
            {trailingLabel}
          </span>
        ) : null}
      </span>
    )
  }

  // ---- Descriptive medium / large (static star row) ----
  if (resolved === 'descriptive') {
    return (
      <span
        aria-label={defaultStarLabel(current, max)}
        className={cn(
          'inline-flex flex-nowrap items-center gap-1',
          disabled && 'opacity-50',
          className,
        )}
        role="img"
      >
        {indices.map((i) => (
          <StarGlyph key={i} fill={fillFor(i, current)} sizeClass={sizeClass} />
        ))}
      </span>
    )
  }

  const set = (next: number) => {
    onChange?.(clamp(next, 0, max))
  }

  // The star that owns focus: the one matching the current value, else the first.
  const focusedIndex = Math.max(0, Math.ceil(current) - 1)

  const moveTo = (nextValue: number) => {
    const clamped = clamp(nextValue, 0, max)
    set(clamped)
    refs.current[Math.max(0, Math.ceil(clamped) - 1)]?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    let next: number | null = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = current + step
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = current - step
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = max
    else if (event.key === 'Backspace' || event.key === 'Delete') next = 0
    if (next === null) return
    event.preventDefault()
    moveTo(next)
  }

  const hasTextLabel = typeof label === 'string' || label == null
  const groupAriaLabel = typeof label === 'string' ? label : label == null ? 'Rating' : undefined

  return (
    <span
      aria-label={groupAriaLabel}
      aria-labelledby={hasTextLabel ? undefined : labelId}
      className={cn('inline-flex flex-nowrap items-center gap-1', className)}
      role="radiogroup"
    >
      {hasTextLabel ? null : (
        <span className="sr-only" id={labelId}>
          {label}
        </span>
      )}
      {indices.map((i, arrayIndex) => {
        const fill = fillFor(i, current)
        // A click on star N toggles: re-picking the current top star clears to 0.
        const onClick = () => set(current === i ? 0 : i)
        const checked = i === Math.ceil(current)
        return (
          <button
            aria-checked={checked}
            aria-label={starLabel(i, max)}
            className={cn(
              'inline-flex min-h-11 min-w-11 items-center justify-center rounded-md',
              'transition-colors motion-reduce:transition-none',
              'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
            )}
            key={i}
            onClick={onClick}
            onKeyDown={onKeyDown}
            ref={(node) => {
              refs.current[arrayIndex] = node
            }}
            role="radio"
            tabIndex={arrayIndex === focusedIndex ? 0 : -1}
            type="button"
          >
            <StarGlyph fill={fill} sizeClass={sizeClass} />
          </button>
        )
      })}
    </span>
  )
}
