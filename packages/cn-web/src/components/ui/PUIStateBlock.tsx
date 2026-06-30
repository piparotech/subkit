import * as React from 'react'

import { cn } from '../../lib/utils'
import { PUIText } from './PUIText'
import { type PUIStateBlockSlots } from './PUIStateBlock.types'

export type { PUIStateBlockSlots } from './PUIStateBlock.types'

export interface PUIStateBlockProps extends PUIStateBlockSlots {
  role?: 'status' | 'alert'
  /** Semantic heading level for the title, so the block fits the page outline. Defaults to 2 (`<h2>`). */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
  className?: string
}

/**
 * Shared centered column primitive for empty/error states.
 *
 * @scope both
 */
export const PUIStateBlock = React.forwardRef<HTMLDivElement, PUIStateBlockProps>(
  (
    {
      icon,
      title,
      description,
      action,
      role,
      headingLevel = 2,
      className,
      titleClassName,
      descriptionClassName,
    },
    ref,
  ) => {
    const Heading = `h${headingLevel}` as const
    return (
      <div
        ref={ref}
        className={cn('flex flex-col items-center gap-md px-xxl py-xxxl text-center', className)}
        role={role}
      >
        {icon != null ? <div className="mb-xxs flex items-center justify-center">{icon}</div> : null}
        <Heading className={cn('text-title-3 font-semibold text-foreground', titleClassName)}>
          {title}
        </Heading>
        {description != null ? (
          <PUIText className={cn('block max-w-popover-lg', descriptionClassName)} tone="muted" variant="callout">
            {description}
          </PUIText>
        ) : null}
        {action != null ? <div className="mt-md">{action}</div> : null}
      </div>
    )
  },
)
PUIStateBlock.displayName = 'PUIStateBlock'
