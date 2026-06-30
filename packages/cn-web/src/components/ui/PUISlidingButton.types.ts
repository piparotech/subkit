import { type ReactNode } from 'react'

/** How far the thumb must travel before a release commits the action. */
export type PUISlidingButtonThreshold = 'easy' | 'hard'

export interface PUISlidingButtonProps {
  /** Base label centered on the track, e.g. "Slide to confirm". i18n-agnostic ReactNode. */
  label: ReactNode
  /** Fired exactly once when the thumb is released past the threshold (or via the keyboard activation). */
  onConfirm: () => void
  /**
   * Commit distance. `'easy'` confirms past 20% of travel (motor/older-user audiences); `'hard'`
   * (default) past 80% to add friction to a high-intent action. Defaults to `'hard'`.
   */
  threshold?: PUISlidingButtonThreshold
  /** Optional label swapped in after a successful confirm (e.g. "Confirmed"). Falls back to `label`. */
  confirmedLabel?: ReactNode
  /** Dims the control to 50% and disables the pointer drag + keyboard activation. */
  disabled?: boolean
  /**
   * Post-confirm pending state: the thumb stays parked at the end and shows a spinner. Implies
   * confirmed (the control is locked). Defaults to false.
   */
  loading?: boolean
  /**
   * Accessible name for the draggable thumb when `label` is not a plain string. Defaults to the
   * string form of `label`, falling back to "Slide to confirm".
   */
  thumbLabel?: string
  /** Extra classes for the outer track (layout/spacing). */
  className?: string
}
