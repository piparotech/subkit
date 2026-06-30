/**
 * Semantic prop surface for the PIN / OTP entry field. Mirrors the native twin
 * (`@piparo/cn-native` PUIPinInput): the code is a SINGLE controlled digit string and
 * `error` styles the WHOLE field, never an individual cell.
 */
export interface PUIPinInputProps {
  /** The full code as a SINGLE string (controlled). Only the first `length` digits are rendered. */
  value: string
  /** Fires with the sanitized (digits-only, clamped to `length`) string on every edit. */
  onChange?: (value: string) => void
  /** Number of slot cells. Defaults to 6 and is clamped to the 4-8 range. */
  length?: number
  /** Masks each filled cell with a bullet (`•`) instead of the digit. Defaults to false. */
  mask?: boolean
  /** Disables input: every cell becomes non-editable and the row dims to 50%. */
  disabled?: boolean
  /**
   * Flips every cell border to the destructive token and sets `aria-invalid`. Error is on the
   * WHOLE field, never per-slot. The error MESSAGE is owned by the wrapping PUIField, not this control.
   */
  error?: boolean
  /** Focuses the first empty cell on mount so the keyboard opens immediately. */
  autoFocus?: boolean
  /** Fires once the code reaches `length` digits, with the completed string. */
  onComplete?: (value: string) => void
  /** Extra classes merged onto the outer cell row (layout/spacing). */
  className?: string
}
