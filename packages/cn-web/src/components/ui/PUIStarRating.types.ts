import { type ReactNode } from 'react'

export type PUIStarRatingVariant = 'interactive' | 'descriptive'
export type PUIStarRatingSize = 'sm' | 'md' | 'lg'

export interface PUIStarRatingOwnProps {
  /** Current rating on a 0–`max` scale (0 = unrated). Supports halves (e.g. 4.5). */
  value: number
  /**
   * Called with the next rating when the user picks a star (keyboard or click).
   * Its presence makes the control interactive; omit it to render a read-only display.
   */
  onChange?: (value: number) => void
  /** Number of stars / top of the scale. Defaults to 5. Never add or hide stars to fake a different scale. */
  max?: number
  /**
   * Force the presentation. Defaults to inferred: `interactive` when `onChange` is present,
   * otherwise `descriptive`.
   */
  variant?: PUIStarRatingVariant
  /**
   * Star size: `lg` = interactive large targets, `md` = descriptive medium (full row of stars),
   * `sm` = descriptive small (single star flanked by value + count labels). Defaults to `md`.
   */
  size?: PUIStarRatingSize
  /**
   * Allow half-star granularity. Each star then exposes a leading half and a trailing whole
   * step (Arrow keys step by 0.5). Defaults to false (whole stars only).
   */
  half?: boolean
  /** Value label rendered BEFORE the star in the `sm` descriptive form (e.g. "4.5"). */
  leadingLabel?: ReactNode
  /** Trailing label after the star in the `sm` descriptive form, typically a review count (e.g. "(6311)"). */
  trailingLabel?: ReactNode
  /** Dims the control and blocks input. Defaults to false. */
  disabled?: boolean
  /**
   * Accessible name for the whole control (the radiogroup label), e.g. "Rate this product".
   * Falls back to "Rating".
   */
  label?: ReactNode
  /**
   * Builds the accessible name for a single star value, e.g. `(v) => `${v} of ${max} stars``.
   * Defaults to "{value} {star|stars}".
   */
  starLabel?: (value: number, max: number) => string
  /** Extra classes for the outer row (layout/spacing). */
  className?: string
}
