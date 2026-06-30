import * as React from 'react'

import { X } from 'lucide-react'

import { cn } from '../../lib/utils'
import { type PUISystemBannerIntent, type PUISystemBannerProps } from './PUISystemBanner.types'

export type {
  PUISystemBannerAction,
  PUISystemBannerIntent,
  PUISystemBannerProps,
} from './PUISystemBanner.types'

// Highest-contrast token pair per intent — a full status fill plus the matching on-color
// foreground. System banners are global/high-priority, so they never use a low-contrast tint
// (the restrained tonal surface is PUIAlert's job). `info` rides the primary brand fill.
const FILL: Record<PUISystemBannerIntent, string> = {
  info: 'bg-primary text-primary-foreground',
  warning: 'bg-warning text-warning-foreground',
  error: 'bg-destructive text-destructive-foreground',
  success: 'bg-success text-success-foreground',
}

/**
 * App-level system banner: a full-width, edge-to-edge, HIGH-EMPHASIS strip meant to be pinned to
 * the top of the app shell that announces a global, high-priority state affecting the whole app
 * (connection loss, maintenance, upgrade required, active order). It appears without user action
 * and persists until dismissed or the causal state resolves. Use sparingly.
 *
 * The strip carries no positioning of its own — the host places it via `className` (`sticky top-0`
 * or `fixed inset-x-0 top-0`) so the same component works inside a flow header or pinned over the
 * viewport. Token classes only; re-brand by swapping the token set.
 *
 * Announced as an assertive live region (`role="alert"`, `aria-live="assertive"`) to match the
 * canonical native twin: a global, high-priority state (connection loss, maintenance, upgrade
 * required) is alert-grade urgency, so it announces immediately rather than waiting for the user to
 * pause. The full status fill carries the urgency visually. The trailing actions and the dismiss
 * control each keep a >=44px hit target and a visible focus ring.
 *
 * Native twin: `@piparo/cn-native` adds a reanimated slide-in/out and consumes the top safe-area
 * inset; this web strip mounts/unmounts on `visible` and lets CSS handle reveal.
 *
 * @scope both
 * ADR-0023 tier: Tier 3 (composite) — parity optional, semantic intent + token-driven look shared.
 */
export const PUISystemBanner = React.forwardRef<HTMLDivElement, PUISystemBannerProps>(
  function PUISystemBanner(
    {
      message,
      intent = 'info',
      icon,
      actions,
      onDismiss,
      dismissLabel = 'Dismiss',
      visible = true,
      className,
    },
    ref,
  ) {
    if (!visible) return null

    const trailingActions = actions?.slice(0, 2) ?? []
    const resolvedDismissLabel = typeof dismissLabel === 'string' ? dismissLabel : 'Dismiss'

    return (
      <div
        ref={ref}
        aria-live="assertive"
        className={cn('flex w-full items-center gap-3 px-4 py-3', FILL[intent], className)}
        role="alert"
      >
        {icon != null ? (
          <span aria-hidden className="flex shrink-0 items-center">
            {icon}
          </span>
        ) : null}

        <p className="text-footnote min-w-0 flex-1">{message}</p>

        {trailingActions.map((action, index) => (
          <button
            aria-label={action.label}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center justify-center rounded-md px-2',
              'text-footnote font-semibold underline underline-offset-2',
              'duration-fast opacity-90 transition-opacity hover:opacity-100',
              'focus-visible:ring-2 focus-visible:ring-current focus-visible:outline-none',
              'motion-reduce:transition-none',
            )}
            key={index}
            onClick={action.onPress}
            type="button"
          >
            {action.label}
          </button>
        ))}

        {onDismiss != null ? (
          <button
            aria-label={resolvedDismissLabel}
            className={cn(
              '-mr-1.5 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md',
              'duration-fast opacity-90 transition-opacity hover:opacity-100',
              'focus-visible:ring-2 focus-visible:ring-current focus-visible:outline-none',
              'motion-reduce:transition-none',
            )}
            onClick={onDismiss}
            type="button"
          >
            <X aria-hidden className="size-5" />
          </button>
        ) : null}
      </div>
    )
  },
)
PUISystemBanner.displayName = 'PUISystemBanner'
