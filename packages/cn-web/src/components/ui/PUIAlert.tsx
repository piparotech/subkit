import { X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/utils'
import { PUIText } from './PUIText'
import { type PUIAlertOwnProps, type PUIAlertTone } from './PUIAlert.types'

export type { PUIAlertOwnProps, PUIAlertTone } from './PUIAlert.types'

export interface PUIAlertProps
  extends PUIAlertOwnProps,
    Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'role'> {}

// Restrained tonal scheme: the surface is a neutral subtle plane for every tone (tonal
// layering, not a loud status fill, per DESIGN.md). The tone reads through the leading-icon
// hue only; the title stays in foreground ink (Weight-Not-Color Rule).
const ICON_TONE: Record<PUIAlertTone, string> = {
  default: 'text-muted-foreground',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
}

// danger/warning interrupt (role=alert, assertive); info/success/default are non-urgent (role=status).
const URGENT: Record<PUIAlertTone, boolean> = {
  default: false,
  info: false,
  success: false,
  warning: true,
  danger: true,
}

/**
 * Persistent inline status banner. Scope: both. Fills the gap the modal-as-first-thought
 * ban pushes toward: a calm, in-flow status surface that is not transient like a toast and
 * not an overlay like a dialog. The status signal is tonal and restrained, never a loud fill.
 */
export const PUIAlert = React.forwardRef<HTMLDivElement, PUIAlertProps>(function PUIAlert(
  { tone = 'default', title, children, icon, action, onClose, closeLabel, className, ...props },
  ref,
) {
  const urgent = URGENT[tone]
  const dismissLabel = typeof closeLabel === 'string' ? closeLabel : 'Dismiss'
  return (
    <div
      ref={ref}
      aria-live={urgent ? 'assertive' : 'polite'}
      className={cn(
        'flex items-start gap-3 rounded-xl border border-border bg-muted p-4',
        className,
      )}
      role={urgent ? 'alert' : 'status'}
      {...props}
    >
      {icon != null ? (
        <span aria-hidden className={cn('mt-0.5 flex shrink-0 items-center', ICON_TONE[tone])}>
          {icon}
        </span>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title != null ? (
          <PUIText className="font-semibold" variant="subheadline">
            {title}
          </PUIText>
        ) : null}
        {children != null ? (
          <PUIText tone="muted" variant="footnote">
            {children}
          </PUIText>
        ) : null}
        {action != null ? <div className="mt-2">{action}</div> : null}
      </div>
      {onClose != null ? (
        <button
          aria-label={dismissLabel}
          className={cn(
            '-m-1.5 flex min-h-11 min-w-11 shrink-0 items-center justify-center self-start rounded-md',
            'text-muted-foreground opacity-70 transition-opacity duration-fast hover:opacity-100',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'motion-reduce:transition-none',
          )}
          onClick={onClose}
          type="button"
        >
          <X aria-hidden className="size-4" />
        </button>
      ) : null}
    </div>
  )
})
PUIAlert.displayName = 'PUIAlert'
