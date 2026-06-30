export interface PUIStepperOwnProps {
  /** Current value, always a whole number clamped to [min, max]. Controlled. */
  value: number
  /** Called with the next whole-number value after a minus/plus press or a keyboard step. */
  onValueChange?: (value: number) => void
  /** Lower bound (inclusive). Defaults to 0. The minus button dims + disables at this value. */
  min?: number
  /** Upper bound (inclusive). Defaults to 99. The plus button dims + disables at this value. */
  max?: number
  /** Whole-number increment applied per press or arrow key. Defaults to 1. */
  step?: number
  /** Dims the whole control to 50% and blocks both buttons + keyboard steps. */
  disabled?: boolean
  /**
   * Hug the content width when false, or stretch to the parent when true so the value cell
   * flexes and truncates. Defaults to false.
   */
  fullWidth?: boolean
  /**
   * Web-only escape hatch (absent from the native twin): the spinbutton's accessible name, wired to
   * `aria-label`. Effectively required — the value cell's only on-screen text is the bare number, so
   * omitting `label` leaves the control unnamed for screen readers (WCAG 4.1.2) and triggers a dev
   * warning.
   */
  label?: string
  /** Extra classes for the outer container (layout/spacing). */
  className?: string
}
