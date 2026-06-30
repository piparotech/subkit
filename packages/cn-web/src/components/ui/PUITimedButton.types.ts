import { type ReactNode } from 'react'

import { type PUIButtonVariant } from './PUIButton.types'

/**
 * How the timed button confirms.
 * - `auto`: a finite countdown drives a depleting ring; when it reaches 0, `onConfirm` fires on its
 *   own (a recommended default that happens unless the user intervenes). A proactive click also fires
 *   it immediately. Pausing freezes both ring and counter.
 * - `hold`: nothing happens on its own. The user presses and holds; the ring fills over `duration`
 *   and `onConfirm` fires only once it completes. Releasing (or leaving) before completion cancels
 *   and the ring rewinds — a deliberate-intent gesture for a destructive or irreversible action.
 */
export type PUITimedButtonMode = 'auto' | 'hold'

/**
 * PUITimedButton — a single confirm button whose progress ring carries time-to-action. In `auto`
 * mode a countdown depletes the ring and auto-confirms at 0 (a recommended default the user may let
 * happen); in `hold` mode the user holds to fill the ring and confirms only on completion (releasing
 * early cancels). The numeric remaining time is non-negotiable and always rendered: the ring is a
 * progressive enhancement, never the sole carrier of how long is left.
 *
 * Web twin of native `@piparo/cn-native` PUITimedButton (auto countdown); the hold-to-confirm gesture
 * and the SVG ring are the web expression of the same "time drives the action" idea.
 *
 * @scope both
 * ADR-0023: Tier 3 (Composite) — parity optional; web SVG ring + pointer-hold gesture vs native
 * reanimated fill overlay.
 */
export interface PUITimedButtonProps {
  /** Primary action label content (i18n-agnostic ReactNode: a string, the `t` macro, or `<Trans>`). */
  label: ReactNode
  /**
   * Stable accessible name for the button. Provide when `label` is a non-string ReactNode (the `t`
   * macro or `<Trans>`), which cannot be coerced to a meaningful string. Defaults to `label` when it
   * is a plain string. The remaining seconds are folded into the button's `aria-label` (spoken on
   * focus); state transitions (coarse countdown ticks and the confirm) are additionally surfaced
   * through a visually-hidden polite live region so an unfocused screen-reader user still hears them.
   */
  accessibilityLabel?: string
  /** Fired on a proactive confirm, when an `auto` countdown reaches 0, or when a `hold` completes. */
  onConfirm: () => void
  /**
   * How confirmation happens (default `auto`). See {@link PUITimedButtonMode}.
   */
  mode?: PUITimedButtonMode
  /**
   * Duration in seconds — the `auto` countdown length, or the `hold` fill time (default 5). A hard
   * floor of 1 second is enforced so the ring stays perceivable.
   */
  duration?: number
  /**
   * `auto` only. Drives the countdown (default `true`). Controlled, so the host can pause/resume —
   * when `false` both the ring and the counter freeze at their current position. Ignored in `hold`
   * mode, where progress is driven entirely by the pointer.
   */
  running?: boolean
  /**
   * `auto` only. A rising value restarts the countdown from `duration` (e.g. the host bumps it to
   * re-arm after the surrounding context changes). Compared by value, not identity.
   */
  restartSignal?: number
  /** Emits the remaining whole seconds on every `auto` tick (for live announcements / telemetry). */
  onTick?: (secondsLeft: number) => void
  /**
   * Render a pause/resume toggle in `auto` mode (default `true`). Reflects `running`: a Pause glyph +
   * "Pause" while counting, a Play glyph + "Resume" while paused. Clicking asks the host to toggle via
   * `onPauseToggle`.
   */
  pausable?: boolean
  /**
   * Fired when the pause/resume toggle is clicked with the next intended `running` value — the host
   * flips `running` (set `running={false}` to pause, `running={true}` to resume).
   */
  onPauseToggle?: (running: boolean) => void
  /** Button variant driving box + foreground tokens (default `default`). */
  variant?: PUIButtonVariant
  /** Disable the control entirely (no countdown, no hold). */
  disabled?: boolean
  /** Extra classes for the outer box (layout/spacing). */
  className?: string
}
