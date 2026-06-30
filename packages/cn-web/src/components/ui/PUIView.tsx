import * as React from 'react'

import { cn } from '../../lib/utils'
import { type PUIViewVariant } from './PUIView.types'

export type { PUIViewVariant } from './PUIView.types'

const VARIANTS: Record<PUIViewVariant, string> = {
  none: '',
  default: 'bg-background',
  subtle: 'bg-accent',
  muted: 'bg-muted',
  card: 'bg-card',
}

export interface PUIViewProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: PUIViewVariant
}

/** @scope both */
export const PUIView = React.forwardRef<HTMLDivElement, PUIViewProps>(
  ({ className, variant = 'none', ...props }, ref) => (
    <div ref={ref} className={cn(VARIANTS[variant], className)} {...props} />
  ),
)
PUIView.displayName = 'PUIView'
