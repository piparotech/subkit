import { type ReactNode } from 'react'

/**
 * Status hue of the leading glyph only — the gray (`bg-card`) container never changes. `loading`
 * shows a spinner and persists (`duration: 0`) until replaced; the rest map to a calm status icon,
 * like PUIAlert. Mirrors the native twin (`@piparo/cn-native`) for API parity.
 */
export type PUISnackbarState = 'default' | 'loading' | 'success' | 'warning' | 'failure'

/** Viewport edge the snackbar flushes to. Defaults to `'bottom'` (the web/desktop convention). */
export type PUISnackbarPosition = 'top' | 'bottom'

/** Single tertiary text button (undo / retry / cancel-loading / "view all"); never secondary. */
export interface PUISnackbarAction {
  /** Short label — intrinsic width can break the narrow layout, so keep it terse. */
  label: ReactNode
  /** Invoked on press. The snackbar dismisses itself after the handler runs. */
  onPress: () => void
}

export interface PUISnackbarOptions {
  /** The line(s); 1–3 lines. The rendered line count drives the default `duration` (3s/5s/7s). */
  message: ReactNode
  /**
   * Leading-glyph hue (never a full color fill — the container stays gray). `'loading'` shows a
   * spinner and persists. Defaults to `'default'`.
   */
  state?: PUISnackbarState
  /** Leading slot — an icon/spinner node. Overrides the `state` glyph when set. */
  leading?: ReactNode
  /** Optional single tertiary action button. */
  action?: PUISnackbarAction
  /**
   * Auto-dismiss delay in ms. Omit to derive from the line count (1L→3000, 2L→5000, 3L→7000 on
   * native; the web twin uses a flat default since it does not measure rendered lines). Pass `0`
   * to persist (use for `'loading'`).
   */
  duration?: number
}

export interface PUISnackbar extends PUISnackbarOptions {
  /** Stable id assigned by the provider; used to dismiss a specific snackbar. */
  id: string
}

export interface PUISnackbarContextValue {
  /** Enqueue a snackbar; returns its id so it can be dismissed programmatically. */
  show: (options: PUISnackbarOptions) => string
  /** Dismiss a snackbar by id (the active one, or one still queued). */
  dismiss: (id: string) => void
}

export interface PUISnackbarProviderProps {
  children: ReactNode
  /** Viewport edge. Defaults to `'bottom'` (the web/desktop convention). */
  position?: PUISnackbarPosition
  /** Default auto-dismiss delay in ms applied when a snackbar omits `duration`. Defaults to `4000`. */
  duration?: number
  /** Extra classes for the overlay viewport (gutters/alignment). */
  className?: string
}
