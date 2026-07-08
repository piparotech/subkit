import * as React from 'react'

import { cn } from '../../lib/utils'

export interface PUISkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Shape + size utilities (e.g. `h-4 w-32 rounded-full`). Composed over the muted base. */
  className?: string
  /** Optional accessible label announcing what is loading (i18n-agnostic). */
  label?: string
}

/**
 * @scope both
 * Loading placeholder with a subtle pulse. The pulse is dropped under `prefers-reduced-motion`.
 */
export function PUISkeleton({ className, label, ...props }: PUISkeletonProps) {
  return (
    <div
      aria-busy
      aria-label={label}
      className={cn('bg-muted animate-pulse rounded-md motion-reduce:animate-none', className)}
      role="status"
      {...props}
    />
  )
}
