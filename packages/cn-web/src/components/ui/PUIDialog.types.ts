import { type ReactNode } from 'react'

/**
 * Dialog semantics. `dialog` (default) for routine single-step tasks; `alertdialog` for alerts,
 * errors and irreversible confirmations — maps to the W3C `role="alertdialog"` on the panel, blocks
 * backdrop/Escape dismissal and hides the close affordance so the choice is made through the actions.
 * Kept in sync with the native twin `@piparo/cn-native`.
 */
export type PUIDialogRole = 'dialog' | 'alertdialog'

/**
 * How the optional artwork is laid out.
 * - `inline` (default): kept within the panel padding, centered above the title (badge/spot art).
 * - `hero`: bled to the panel edges with rounded top corners (`overflow-hidden`), fixed above the body.
 */
export type PUIDialogArtworkVariant = 'inline' | 'hero'

/**
 * Intentional web omissions vs the native twin (ADR-0023 Tier 3 — parity optional):
 * - `placement` (auto/center/bottom) and `width` (xs/sm/md/lg) are native-only. The web panel is
 *   centered-only at a fixed `max-w-md`; bottom-docking + width knobs are a touch-ergonomic idiom
 *   with no web equivalent, so they are deliberately not exposed here.
 * - `errorSignal` IS carried over (see below) — its rejected-submit nudge has a clean web analog.
 */
export interface PUIDialogProps {
  /** Controlled open state. */
  open: boolean
  /** Called with the next open state when the user opens/closes the dialog (backdrop, Escape, close). */
  onOpenChange: (open: boolean) => void
  /** Accessible title, rendered as the dialog heading and used to label the dialog. */
  title?: ReactNode
  /** Supporting description shown under the title; also describes the dialog for assistive tech. */
  description?: ReactNode
  /**
   * Optional artwork rendered above the title — a badge/spot illustration or, with
   * `artworkVariant="hero"`, a full-bleed banner. For a small icon-only slot, `icon` is an alias.
   * Mirrors the native artwork slot.
   */
  artwork?: ReactNode
  /** Alias for {@link artwork}, expressing intent for a small icon-only slot above the title. */
  icon?: ReactNode
  /**
   * How the artwork is laid out. `inline` (default) keeps it within the panel padding and centered
   * above the title; `hero` bleeds it to the panel edges (rounded top corners, `overflow-hidden`).
   * @see PUIDialogArtworkVariant
   */
  artworkVariant?: PUIDialogArtworkVariant
  /** Dialog body content. */
  children?: ReactNode
  /** Footer node, typically the confirm/cancel buttons. */
  actions?: ReactNode
  /**
   * Dialog semantics. Defaults to `dialog`. Use `alertdialog` for alerts, errors and irreversible
   * confirmations — sets `role="alertdialog"` on the panel, blocks backdrop/Escape dismissal and
   * hides the close button so the user must answer through the actions. @see PUIDialogRole
   */
  role?: PUIDialogRole
  /**
   * Convenience shorthand for `role="alertdialog"`. When `true`, the dialog gets alertdialog
   * semantics (blocking, no close X). Ignored when `role` is set explicitly.
   */
  alert?: boolean
  /**
   * Counter that triggers the error-shake choreography when it increments while the dialog is open
   * and `role="alertdialog"` (e.g. bump it on a rejected submit). The panel nudges x and springs
   * back; honors `prefers-reduced-motion` (no movement when reduced). No-op for `role="dialog"`.
   * Web analog of the native twin's `errorSignal`.
   */
  errorSignal?: number
  /**
   * Allow dismissing via backdrop click / Escape and show the close button. Defaults to `true`.
   * Forced to `false` in alert mode (`role="alertdialog"` / `alert`).
   */
  dismissible?: boolean
  /** Extra classes for the panel (layout/spacing). */
  className?: string
}
