import * as React from 'react'

import { PUIStateBlock } from './PUIStateBlock'
import { type PUIStateBlockSlots } from './PUIStateBlock.types'

export interface PUIEmptyStateProps extends PUIStateBlockSlots {
  className?: string
}

/**
 * Empty/placeholder state. Renders the shared block with status semantics.
 *
 * @scope both
 */
export const PUIEmptyState = React.forwardRef<HTMLDivElement, PUIEmptyStateProps>(
  ({ icon, title, description, action, titleClassName, descriptionClassName, className }, ref) => (
    <PUIStateBlock
      ref={ref}
      action={action}
      className={className}
      description={description}
      descriptionClassName={descriptionClassName}
      icon={icon}
      role="status"
      title={title}
      titleClassName={titleClassName}
    />
  ),
)
PUIEmptyState.displayName = 'PUIEmptyState'
