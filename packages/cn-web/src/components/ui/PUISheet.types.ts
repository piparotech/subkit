import type * as React from 'react'

/** Edge the sheet docks to and slides in from. `bottom` is the classic bottom sheet (default). */
export type PUISheetSide = 'bottom' | 'left' | 'right'

/**
 * Detent / size step. For a `bottom` sheet it caps the panel height; for `left`/`right` it sets the
 * panel width. `full` spans the cross axis (height for bottom, width for side). The web twin maps the
 * native detents to discrete steps (ADR 0023, Tier-3 composite — parity optional).
 */
export type PUISheetSize = 'sm' | 'md' | 'lg' | 'full'

export interface PUISheetProps {
  /** Controlled open state. */
  open: boolean
  /** Called with the next open state when the user opens/closes the sheet (backdrop, Escape, close, drag-dismiss). */
  onOpenChange: (open: boolean) => void
  /** Sheet content. */
  children: React.ReactNode
  /** Accessible title, rendered as the dialog heading and used to label the dialog. */
  title?: React.ReactNode
  /**
   * Secondary heading rendered under the title. Wired to `aria-describedby` so it provides the
   * dialog's accessible description. Mirrors the native twin's `description`.
   */
  description?: React.ReactNode
  /** Edge the sheet docks to. Defaults to `bottom`. */
  side?: PUISheetSide
  /**
   * Size step (detent). Bottom: max panel height; left/right: panel width. Defaults to `md`.
   * `full` spans the cross axis.
   */
  size?: PUISheetSize
  /**
   * Show the grabber handle on a bottom sheet. Ignored for `left`/`right`. Defaults to `true`.
   */
  showGrabber?: boolean
  /**
   * Allow dragging the bottom sheet down to dismiss it (pointer/touch drag on the grabber).
   * Bottom side only; ignored otherwise. Defaults to `false` (backward compatible).
   */
  dismissibleByDrag?: boolean
  /** Extra classes for the sheet panel (layout/spacing). */
  className?: string
}
