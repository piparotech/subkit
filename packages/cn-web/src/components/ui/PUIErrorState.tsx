import * as React from 'react'

import { PUIStateBlock } from './PUIStateBlock'
import { type PUIStateBlockSlots } from './PUIStateBlock.types'

/**
 * `title` stays in the default foreground tone (not danger); `action` is a
 * neutral/primary retry CTA provided by the consumer, never destructive.
 */
export interface PUIErrorStateProps extends PUIStateBlockSlots {
  /**
   * Announce assertively (`role="alert"`, interrupts the screen reader) instead of
   * politely (`role="status"`). Default false: a render-on-load error reads as a
   * polite status; set true for errors that genuinely demand immediate attention.
   */
  assertive?: boolean
  className?: string
}

/**
 * Error state. Renders the shared block with a polite status live region by
 * default (`assertive` opts into an interrupting alert).
 *
 * @scope both
 */
export const PUIErrorState = React.forwardRef<HTMLDivElement, PUIErrorStateProps>(
  (
    {
      icon,
      title,
      description,
      action,
      assertive = false,
      titleClassName,
      descriptionClassName,
      className,
    },
    ref,
  ) => (
    <PUIStateBlock
      ref={ref}
      action={action}
      className={className}
      description={description}
      descriptionClassName={descriptionClassName}
      icon={icon}
      role={assertive ? 'alert' : 'status'}
      title={title}
      titleClassName={titleClassName}
    />
  ),
)
PUIErrorState.displayName = 'PUIErrorState'
