export type PUIDatePickerMode = 'date' | 'time' | 'datetime'

/**
 * Shared semantic props for PUIDatePicker, kept in parity with the cn-native twin
 * (`packages/cn-native/src/components/PUIDatePicker.types.ts`) per ADR 0023 (Tier-2 API parity).
 */
export interface PUIDatePickerOwnProps {
  /** Controlled selected date/time. */
  value: Date
  onChange?: (date: Date) => void
  /** Which components the picker edits. @default 'date' */
  mode?: PUIDatePickerMode
  /** Earliest selectable date. Out-of-range days are disabled and cannot be committed. */
  minimumDate?: Date
  /** Latest selectable date. Out-of-range days are disabled and cannot be committed. */
  maximumDate?: Date
  disabled?: boolean
  /**
   * Flips the trigger to the destructive border (same precedence as PUIInput: error > open > default)
   * and sets `aria-invalid`. The error MESSAGE is owned by the wrapping PUIField, not this control.
   * When wrapped, PUIField passes its `invalid` flag down as this prop.
   */
  error?: boolean
  /**
   * Accessible name for the control. Web maps it onto `aria-label` (text only, per ARIA); native
   * appends the current value automatically (accessibilityValue) so screen readers announce both.
   */
  accessibilityLabel?: string
  /**
   * Extra classes for the control. Web styles the trigger button (and the `time` native input)
   * directly; on native this targets the RN/NativeWind fallback trigger.
   */
  className?: string
  /**
   * Trigger width. `true` (default) stretches the field to fill its parent (value left, icon right).
   * `false` hugs the content — a compact inline date field sized to its value, alongside the
   * full-width variant.
   * @default true
   */
  fullWidth?: boolean
}
