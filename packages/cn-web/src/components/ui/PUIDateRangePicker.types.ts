/** A from–to date range. Either bound may be `null` while the range is being picked. */
export interface PUIDateRange {
  /** Range start (inclusive), or `null` when nothing is chosen yet. */
  start: Date | null
  /** Range end (inclusive), or `null` while awaiting the end after a start is set. */
  end: Date | null
}

/**
 * Shared semantic props for PUIDateRangePicker, kept in parity with the cn-native twin
 * (`packages/cn-native/src/components/PUIDateRangePicker.types.ts`) per ADR 0023 (Tier-1 parity).
 */
export interface PUIDateRangePickerProps {
  /** Controlled selected range. Pass `{ start: null, end: null }` for the empty state. */
  value: PUIDateRange
  /**
   * Fires on Done with the committed range. Cancel discards the draft. Clear only empties the
   * in-progress draft (the empty range commits only if the user then activates Done).
   */
  onChange?: (range: PUIDateRange) => void
  /** Earliest selectable day. Out-of-range days are disabled and can never enter the range. */
  minimumDate?: Date
  /** Latest selectable day. Out-of-range days are disabled and can never enter the range. */
  maximumDate?: Date
  /** Disables the trigger; the field reads as non-interactive and dims. */
  disabled?: boolean
  /**
   * Flips the trigger to the destructive border (same precedence as PUIInput: error > default).
   * The error MESSAGE is owned by the wrapping PUIField, not this control. When wrapped, PUIField
   * passes its `invalid` flag down as this prop, so the control surfaces the error on the border.
   */
  error?: boolean
  /**
   * Trigger width. `true` (default) stretches the field to fill its parent (range left, icon right).
   * `false` hugs the content — a compact inline range field sized to its value.
   * @default true
   */
  fullWidth?: boolean
  /**
   * Accessible name for the control. The formatted range is wired via `aria-describedby` so screen
   * readers announce both the label and the current value.
   */
  accessibilityLabel?: string
  /** Id for the underlying trigger button; auto-generated when omitted. */
  id?: string
  /** Extra classes for the trigger (layout/spacing). */
  className?: string
  /**
   * Forwarded to the trigger for PUIField error/hint wiring. A wrapping PUIField passes its
   * `describedby` id(s) here so the field's `role="alert"` error message (and hint) associate with
   * the control; merged with the internal value id so the formatted range stays announced too.
   */
  'aria-describedby'?: string
}
