import { type ReactNode } from 'react'

/**
 * The leading (top-left) header control. `'close'` shows an X that exits the whole takeover (the
 * default for a single-step modal); `'back'` shows a back arrow for stepping back inside a
 * multi-step flow; pass a ReactNode to render a fully custom leading control.
 *
 * Kept in parity with the native twin's co-located types (duplicated per package, not a shared
 * import) so the prop surface stays in lockstep across platforms.
 */
export type PUIModalFullScreenLeadingAction = 'close' | 'back' | ReactNode

/**
 * How the full-screen takeover presents. `'immersive'` (the default on web) is an opaque full-bleed
 * surface that covers the whole viewport for a self-contained task. `'stacked'` echoes the native
 * iOS card by insetting the surface slightly and rounding its top so the previous context reads as
 * a layer behind it; web has no pull-down-to-dismiss affordance, so the difference is layering only,
 * never a decorative card chrome. The prop exists for API parity with the native twin.
 */
export type PUIModalFullScreenPresentation = 'stacked' | 'immersive'

/** Optional trailing tertiary header action. Never the final/primary action — that lives in `footer`. */
export interface PUIModalFullScreenHeaderAction {
  /** Action label. Kept short; rendered as tertiary `text-primary` text in the header. */
  label: ReactNode
  /** Fired when the trailing header action is pressed. */
  onPress: () => void
}

/** Confirm-on-close copy shown in the intercepting AlertDialog so the user does not lose work. */
export interface PUIModalFullScreenConfirmCopy {
  /** Dialog heading. */
  title: ReactNode
  /** Supporting message under the heading. */
  message: ReactNode
  /** Label for the destructive confirm (discard) action. */
  confirmLabel: ReactNode
  /** Label for the cancel (keep editing) action. */
  cancelLabel: ReactNode
}

export interface PUIModalFullScreenProps {
  /** Controlled open state. */
  open: boolean
  /**
   * Called with the next open state when the user requests dismissal — header close/back or the
   * Escape key. When `confirmOnClose` is set, this fires only after the user confirms in the
   * intercepting alert dialog.
   */
  onOpenChange: (open: boolean) => void
  /**
   * Required header title that sets the new context for everyone, especially screen readers. Echo
   * the trigger that opened the takeover. Rendered as the header heading and the dialog's a11y label.
   *
   * Radix moves focus into the takeover on open and restores it to the trigger on close, so the
   * caller does NOT need to manage focus return.
   */
  title: ReactNode
  /**
   * Presentation style. Defaults to `'immersive'` (full-bleed). `'stacked'` insets and rounds the
   * surface so the previous context reads as a layer behind it (API parity with the native twin).
   */
  presentation?: PUIModalFullScreenPresentation
  /**
   * Leading header control. `'close'` (default) shows an X that exits the takeover; `'back'` shows a
   * back arrow for multi-step flows; a ReactNode renders a custom control.
   */
  leadingAction?: PUIModalFullScreenLeadingAction
  /** Optional trailing tertiary header action. Never the final/primary action — use `footer` for that. */
  headerAction?: PUIModalFullScreenHeaderAction
  /**
   * Docked footer area pinned to the bottom, holding the PRIMARY final action ("Continue"/"Done"/
   * "Submit") — the recommended final-action placement, reachable and never header-only.
   */
  footer?: ReactNode
  /**
   * Intercept dismissal so the user does not lose work. `true` uses default discard copy; pass a copy
   * object to customise the confirm alert dialog's title/message/labels. When unset, dismissal is direct.
   */
  confirmOnClose?: boolean | PUIModalFullScreenConfirmCopy
  /** Whether the body scrolls. Defaults to `true`; set `false` for a fixed, non-scrolling task. */
  scrollable?: boolean
  /** The takeover body — the form or self-contained task. */
  children: ReactNode
  /** Extra classes for the body container (layout/spacing). */
  className?: string
}
