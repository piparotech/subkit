import { type ReactNode } from 'react'

/**
 * Semantic status the banner communicates. Picks the default leading status icon, the
 * tonal surface (full background tint or full border, NEVER a side-stripe), the icon tint
 * and the announced ARIA role. NEVER a raw color prop — every tone resolves to design
 * tokens that flip correctly in dark mode.
 */
export type PUIBannerTone = 'info' | 'success' | 'warning' | 'error' | 'neutral'

/**
 * How the banner draws its tonal plane. `tint` paints a soft full-surface background wash
 * (the calm default); `outline` keeps a neutral surface and carries the tone on a full
 * border + icon only. Both are full-perimeter treatments — never a side-stripe accent.
 */
export type PUIBannerVariant = 'tint' | 'outline'

/**
 * Semantic prop surface for the web PUIBanner. The shared semantic core matches the native
 * twin (the inline, non-modal, scroll-with-content status surface; the same five tones; an
 * optional leading icon, title, body and dismiss control), but each platform extends and
 * names that core to fit its host. The web surface is the deliberately richer one, with a
 * few intentional drifts from native (`PUIBannerProps` in PUIBanner.types.ts on cn-native):
 *  - `tone` here is the native `intent` (web rename; same five values).
 *  - body content is `children` here vs the native `body` prop.
 *  - `actions?: ReactNode` is an open slot for any number of controls, vs the native single
 *    `action?: PUIBannerAction` (Uber: at most one action per banner).
 *  - `variant` (`tint` | `outline`) is web-only and has no native equivalent.
 *  - native-only ergonomics (`nested`, `numberOfLines`) are not modeled here.
 * A banner is a contextual inline page-level message about a feature- or page-specific state:
 * it sits INLINE (non-modal), scrolls with content, and persists until dismissed or the state
 * resolves. The richer superset of PUIAlert (adds the `neutral` tone, the `outline` variant
 * and a structured actions slot). Inset with rounded corners — never stretched edge-to-edge,
 * never a side-stripe.
 */
export interface PUIBannerOwnProps {
  /** Status tone. Defaults to `'info'`. Drives the icon, surface, role and live-region politeness. */
  tone?: PUIBannerTone
  /** Surface treatment: soft full background `tint` (default) or neutral surface + full `outline`. */
  variant?: PUIBannerVariant
  /** Headline line. Rendered semibold in foreground ink. Optional: a body-only banner is allowed. */
  title?: ReactNode
  /** Supporting body content rendered under the title (i18n-agnostic ReactNode, muted footnote). */
  children?: ReactNode
  /**
   * Leading status icon slot (Lucide). Auto-tinted to the tone. Omit to fall back to the
   * per-tone default icon; pass `null` to suppress the icon entirely.
   */
  icon?: ReactNode
  /**
   * Trailing actions slot — typically one or two `PUIButton`/`PUILinkText` controls.
   * Rendered under the message; the host composes the buttons so urgency stays the caller's call.
   */
  actions?: ReactNode
  /** When provided, a 44px dismiss control (X) is rendered top-right and invokes this on press. */
  onDismiss?: () => void
  /** Accessible label for the dismiss control. Defaults to `'Dismiss'`. */
  dismissLabel?: ReactNode
}
