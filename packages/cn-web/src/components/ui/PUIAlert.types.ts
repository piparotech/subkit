import { type ReactNode } from 'react'

/**
 * Semantic status tone of the alert. Drives the leading-icon tint, the live-region
 * politeness and the announced role. NEVER a raw color prop. The surface stays a
 * restrained neutral plane for every tone (tonal layering, not a loud status fill).
 */
export type PUIAlertTone = 'default' | 'info' | 'success' | 'warning' | 'danger'

/**
 * Shared semantic prop surface for PUIAlert, identical on web and native. Each platform
 * extends this with its host-element props (`HTMLAttributes<HTMLDivElement>` web,
 * `ViewProps` native). PUIAlert is a persistent inline status banner: not transient like
 * a toast, not an overlay like a dialog.
 */
export interface PUIAlertOwnProps {
  /** Status tone. Defaults to `'default'`. */
  tone?: PUIAlertTone
  /** Bold heading line. Optional: a body-only alert is allowed. */
  title?: ReactNode
  /** Supporting body content rendered under the title (i18n-agnostic ReactNode). */
  children?: ReactNode
  /** Leading icon slot (Lucide). Auto-tinted to the tone; omit for no icon. */
  icon?: ReactNode
  /** Trailing action slot, e.g. an inline button or link. */
  action?: ReactNode
  /** When provided, a 44px dismiss control is rendered and invokes this on press. */
  onClose?: () => void
  /** Accessible label for the dismiss control. Defaults to `'Dismiss'`. */
  closeLabel?: ReactNode
}
