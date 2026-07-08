import * as React from 'react'

import { cn } from '../../lib/utils'
import { type PUIStateBlockSlots } from './PUIStateBlock.types'
import { PUIText } from './PUIText'

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
        className={cn('gap-md px-xxl py-xxxl flex flex-col items-center text-center', className)}
        role={role}
      >
        {icon != null ? (
          <div className="mb-xxs flex items-center justify-center">{icon}</div>
        ) : null}
        <Heading className={cn('text-title-3 text-foreground font-semibold', titleClassName)}>
          {title}
        </Heading>
        {description != null ? (
          <PUIText
            className={cn('max-w-popover-lg block', descriptionClassName)}
            tone="muted"
            variant="callout"
          >
            {description}
          </PUIText>
        ) : null}
        {action != null ? <div className="mt-md">{action}</div> : null}
      </div>
    )
  },
)
PUIStateBlock.displayName = 'PUIStateBlock'
