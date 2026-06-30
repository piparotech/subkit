import * as React from 'react'

import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react'

import { cn } from '../../lib/utils'
import { type PUIBannerOwnProps, type PUIBannerTone } from './PUIBanner.types'
import { PUIText } from './PUIText'

export type { PUIBannerOwnProps, PUIBannerTone, PUIBannerVariant } from './PUIBanner.types'

export interface PUIBannerProps
  extends PUIBannerOwnProps, Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'role'> {}

// Soft full-surface tint per tone (DESIGN TOKENS ONLY — never a raw color, never a side-stripe).
// A low-alpha tonal wash reads as a calm plane, not a loud status fill.
const TINT_SURFACE: Record<PUIBannerTone, string> = {
  info: 'bg-info/10',
  success: 'bg-success/10',
  warning: 'bg-warning/10',
  error: 'bg-destructive/10',
  neutral: 'bg-muted',
}

// `outline` variant: neutral surface, tone carried on the full perimeter border (never a stripe).
const OUTLINE_BORDER: Record<PUIBannerTone, string> = {
  info: 'border-info/40',
  success: 'border-success/40',
  warning: 'border-warning/40',
  error: 'border-destructive/40',
  neutral: 'border-border',
}

// Leading status-icon hue per tone. The title stays foreground ink (Weight-Not-Color Rule).
const ICON_TONE: Record<PUIBannerTone, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
  neutral: 'text-muted-foreground',
}

// Default leading status icon per tone; overridable via the `icon` prop (pass `null` to suppress).
const DEFAULT_ICON: Record<PUIBannerTone, React.ReactNode> = {
  info: <Info aria-hidden className="size-5" />,
  success: <CircleCheck aria-hidden className="size-5" />,
  warning: <TriangleAlert aria-hidden className="size-5" />,
  error: <CircleX aria-hidden className="size-5" />,
  neutral: <Info aria-hidden className="size-5" />,
}

// Only `error` interrupts (role=alert, assertive live region); every other tone is non-urgent
// (role=status, polite) — a warning informs but must not rudely barge in on the screen reader.
const URGENT: Record<PUIBannerTone, boolean> = {
  info: false,
  success: false,
  warning: false,
  error: true,
  neutral: false,
}

/**
 * Inline page banner: a persistent, in-flow status surface that scrolls with content — the calm
 * replacement for a modal alert (modal-as-first-thought ban) and not transient like a toast. The
 * tone picks a leading status icon plus either a soft full-surface `tint` or a full `outline`
 * (NEVER a side-stripe). Carries an optional structured actions slot and an optional dismiss X.
 * `error` announces assertively as `role="alert"`; every other tone announces politely as
 * `role="status"`. Token classes only (re-brand by swapping the token set); full a11y.
 *
 * Richer superset of {@link PUIAlert}: adds the `neutral` tone, the `outline` variant and a
 * structured actions slot. PUIAlert remains the leaner inline-status primitive — neither replaces
 * the other.
 *
 * @scope both
 * ADR-0023 tier: Composite (Tier 3). Scope: both.
 */
export const PUIBanner = React.forwardRef<HTMLDivElement, PUIBannerProps>(function PUIBanner(
  {
    tone = 'info',
    variant = 'tint',
    title,
    children,
    icon,
    actions,
    onDismiss,
    dismissLabel,
    className,
    ...props
  },
  ref,
) {
  const urgent = URGENT[tone]
  const isTint = variant === 'tint'
  const closeLabel = typeof dismissLabel === 'string' ? dismissLabel : 'Dismiss'
  const leadingIcon = icon === undefined ? DEFAULT_ICON[tone] : icon

  return (
    <div
      ref={ref}
      aria-live={urgent ? 'assertive' : 'polite'}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4',
        isTint ? cn('border-transparent', TINT_SURFACE[tone]) : cn('bg-card', OUTLINE_BORDER[tone]),
        className,
      )}
      role={urgent ? 'alert' : 'status'}
      {...props}
    >
      {leadingIcon != null ? (
        <span aria-hidden className={cn('mt-0.5 flex shrink-0 items-center', ICON_TONE[tone])}>
          {leadingIcon}
        </span>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title != null ? (
          <PUIText className="font-semibold" variant="callout">
            {title}
          </PUIText>
        ) : null}
        {children != null ? (
          <PUIText tone="muted" variant="footnote">
            {children}
          </PUIText>
        ) : null}
        {actions != null ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">{actions}</div>
        ) : null}
      </div>

      {onDismiss != null ? (
        <button
          aria-label={closeLabel}
          className={cn(
            '-m-1.5 flex min-h-11 min-w-11 shrink-0 items-center justify-center self-start rounded-md',
            'text-muted-foreground duration-fast opacity-70 transition-opacity hover:opacity-100',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
            'motion-reduce:transition-none',
          )}
          onClick={onDismiss}
          type="button"
        >
          <X aria-hidden className="size-4" />
        </button>
      ) : null}
    </div>
  )
})
PUIBanner.displayName = 'PUIBanner'
