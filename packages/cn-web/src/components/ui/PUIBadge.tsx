import { cva } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '../../lib/utils'
import { type PUIBadgeBaseProps, type PUIBadgeVariant } from './PUIBadge.types'

export type { PUIBadgeBaseProps, PUIBadgeVariant } from './PUIBadge.types'

const badgeVariants = cva(
  'inline-flex items-center gap-xs px-control py-xxs text-caption-1 font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        success: 'bg-success text-success-foreground',
        warning: 'bg-warning text-warning-foreground',
        info: 'bg-info text-info-foreground',
        outline: 'border-token border-border bg-transparent text-foreground',
      } satisfies Record<PUIBadgeVariant, string>,
    },
    defaultVariants: { variant: 'default' },
  },
)

const dotVariants = cva('h-sm w-sm rounded-pill', {
  variants: {
    variant: {
      default: 'bg-primary-foreground',
      secondary: 'bg-secondary-foreground',
      destructive: 'bg-destructive-foreground',
      success: 'bg-success-foreground',
      warning: 'bg-warning-foreground',
      info: 'bg-info-foreground',
      outline: 'bg-foreground',
    } satisfies Record<PUIBadgeVariant, string>,
  },
  defaultVariants: { variant: 'default' },
})

export interface PUIBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>,
    PUIBadgeBaseProps {}

/** @scope both */
export const PUIBadge = React.forwardRef<HTMLSpanElement, PUIBadgeProps>(
  ({ className, variant, dot = false, mono = false, icon, children, textClassName, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant }), mono ? 'rounded-sm' : 'rounded-pill', className)}
      {...props}
    >
      {dot ? <span aria-hidden className={dotVariants({ variant })} /> : null}
      {icon}
      <span className={cn(mono && 'font-mono tracking-wide', textClassName)}>{children}</span>
    </span>
  ),
)
PUIBadge.displayName = 'PUIBadge'
