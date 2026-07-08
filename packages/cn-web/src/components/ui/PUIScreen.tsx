import * as React from 'react'

import { cn } from '../../lib/utils'

export type PUIScreenEdge = 'top' | 'right' | 'bottom' | 'left'

export interface PUIScreenProps extends React.HTMLAttributes<HTMLDivElement> {
  scroll?: boolean
  padded?: boolean
  // Accepted for native parity; insets are handled by the browser viewport on web.
  edges?: readonly PUIScreenEdge[]
}

/** @scope both */
export const PUIScreen = React.forwardRef<HTMLDivElement, PUIScreenProps>(
  (
    {
      className,
      scroll = false,
      padded = true,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      edges,
      children,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        'bg-background mx-auto w-full max-w-2xl',
        padded && 'px-4 py-4',
        scroll && 'overflow-y-auto',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
)
PUIScreen.displayName = 'PUIScreen'
