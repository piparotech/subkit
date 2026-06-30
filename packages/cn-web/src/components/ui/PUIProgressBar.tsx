import * as React from 'react'

import { cn } from '../../lib/utils'

export type PUIProgressBarTone = 'brand' | 'success' | 'danger' | 'warning'

export interface PUIProgressBarProps {
  value: number
  min?: number
  max?: number
  tone?: PUIProgressBarTone
  /** ReactNode label rendered above the track (i18n-agnostic). */
  label?: React.ReactNode
  indeterminate?: boolean
}

const clamp = (n: number) => Math.min(1, Math.max(0, n))

const TONE_FILL: Record<PUIProgressBarTone, string> = {
  brand: 'bg-primary',
  danger: 'bg-destructive',
  success: 'bg-success',
  warning: 'bg-warning',
}

/**
 * Determinate progress. Fill is moved with transform (no layout thrash); tone drives the color.
 *
 * @scope both
 */
export function PUIProgressBar({
  value,
  min = 0,
  max = 100,
  tone = 'brand',
  label,
  indeterminate = false,
}: PUIProgressBarProps) {
  const pct = clamp((value - min) / (max - min))
  return (
    <div className="flex flex-col gap-1.5">
      {label != null ? <span className="text-footnote text-foreground">{label}</span> : null}
      <div
        aria-busy={indeterminate ? true : undefined}
        aria-valuemax={max}
        aria-valuemin={min}
        aria-valuenow={indeterminate ? undefined : value}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
      >
        <div
          className={cn(
            'h-full w-full rounded-full',
            TONE_FILL[tone],
            indeterminate && 'w-1/3 animate-indeterminate-progress motion-reduce:animate-none',
          )}
          style={indeterminate ? undefined : { transform: `translateX(-${100 - pct * 100}%)` }}
        />
      </div>
    </div>
  )
}
