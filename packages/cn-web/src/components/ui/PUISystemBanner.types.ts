import { type ReactNode } from 'react'

/**
 * Semantic intent of the system banner. Always rendered as the HIGHEST-contrast token pair
 * (full status fill + on-color foreground) — system banners are global and high-priority, never a
 * low-contrast tint (that restrained idiom is PUIAlert's job). Drives the background, the text
 * color and the on-color icon hue.
 */
export type PUISystemBannerIntent = 'info' | 'warning' | 'error' | 'success'

/** A single trailing tertiary action rendered as an on-color underlined text button (>=44px hit area). */
export interface PUISystemBannerAction {
  /** Visible button label. String (matching the canonical native twin) so the button always has an accessible name. */
  label: string
  /** Fired when the action is pressed. */
  onPress: () => void
}

/**
 * Shared semantic prop surface for PUISystemBanner. The native twin (`@piparo/cn-native`) drives
 * the same intents and the same FILL/INK token pairs; look/behaviour are platform-native by design
 * (this is a Tier-3 composite, parity optional). PUISystemBanner is the app shell's global, full-width,
 * high-emphasis strip — it is NOT inline like PUIAlert nor transient like PUIToast.
 */
export interface PUISystemBannerProps {
  /** Single message (i18n-agnostic ReactNode). Recommended <=2 lines; wraps by default. */
  message: ReactNode
  /**
   * Semantic intent. Defaults to `'info'`. Always resolves to the highest-contrast token pair
   * (`bg-primary`/`bg-warning`/`bg-destructive`/`bg-success` + the matching `-foreground`).
   */
  intent?: PUISystemBannerIntent
  /**
   * Leading icon slot (Lucide). Inherits the on-color foreground hue via `currentColor`; size it
   * with a className (e.g. `className="size-5"`). Omit for no icon.
   */
  icon?: ReactNode
  /** Up to 2 trailing tertiary actions. Each enforces a >=44px tap target. */
  actions?: PUISystemBannerAction[]
  /** When provided, renders a trailing dismiss (X) control that calls this on press. */
  onDismiss?: () => void
  /** Accessible label for the dismiss control (i18n-agnostic). Defaults to `'Dismiss'`. */
  dismissLabel?: ReactNode
  /**
   * When `false`, the banner unmounts (returns `null`). Defaults to `true`. Mirrors the native
   * twin's `visible`; the web strip has no enter/exit translate, so it simply mounts/unmounts.
   */
  visible?: boolean
  /**
   * Extra classes for the banner container — the host's placement lever. Pass `sticky top-0` or
   * `fixed inset-x-0 top-0` here to pin the strip to the top of the app shell.
   */
  className?: string
}
