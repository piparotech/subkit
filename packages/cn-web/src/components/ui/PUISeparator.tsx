import * as React from 'react'

import { cn } from '../../lib/utils'
import {
  type PUISeparatorBaseProps,
  type PUISeparatorOrientation,
} from './PUISeparator.types'

export type { PUISeparatorBaseProps, PUISeparatorOrientation } from './PUISeparator.types'

export interface PUISeparatorProps
  extends PUISeparatorBaseProps,
    Omit<React.HTMLAttributes<HTMLDivElement>, 'className'> {}

const ORIENTATION: Record<PUISeparatorOrientation, string> = {
  horizontal: 'h-px w-full',
  vertical: 'h-full w-px self-stretch',
}

const INSET: Record<PUISeparatorOrientation, string> = {
  horizontal: 'mx-5',
  vertical: 'my-5',
}

/** @scope both */
export const PUISeparator = React.forwardRef<HTMLDivElement, PUISeparatorProps>(
  ({ orientation = 'horizontal', inset = false, decorative = true, className, ...props }, ref) => (
    <div
      ref={ref}
      aria-orientation={decorative ? undefined : orientation}
      className={cn('shrink-0 bg-border', ORIENTATION[orientation], inset && INSET[orientation], className)}
      role={decorative ? 'none' : 'separator'}
      {...props}
    />
  ),
)
PUISeparator.displayName = 'PUISeparator'
