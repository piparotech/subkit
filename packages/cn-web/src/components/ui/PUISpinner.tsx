import { Loader2 } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/utils'

export type PUISpinnerSize = 'sm' | 'md' | 'lg'
export type PUISpinnerTone = 'default' | 'muted' | 'brand' | 'inverse'

export interface PUISpinnerProps {
  size?: PUISpinnerSize
  tone?: PUISpinnerTone
  /** ReactNode accessibility label (i18n-agnostic). Announced via role="status" + sr-only text. */
  label?: React.ReactNode
}

const SIZES: Record<PUISpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
}

const TONES: Record<PUISpinnerTone, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  brand: 'text-primary',
  inverse: 'text-inverse-foreground',
}

/** @scope both */
export function PUISpinner({ size = 'md', tone = 'default', label }: PUISpinnerProps) {
  return (
    <span
      aria-hidden={label != null ? undefined : true}
      aria-label={typeof label === 'string' ? label : undefined}
      aria-busy={label != null ? true : undefined}
      role="status"
    >
      <Loader2 className={cn('animate-spin motion-reduce:animate-none', SIZES[size], TONES[tone])} />
      {label != null ? <span className="sr-only">{label}</span> : null}
    </span>
  )
}
