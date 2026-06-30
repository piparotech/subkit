/**
 * Shared semantic prop surface for the typed masked date field, identical on web and native. The
 * web twin extends this with `id` for the underlying `<input>`; the native twin uses its own host
 * props. Keep in parity with `@piparo/cn-native`'s `PUIDateInputProps`.
 */
export interface PUIDateInputOwnProps {
  /** Controlled date value. `null` renders the empty field (placeholder pattern). */
  value: Date | null
  /**
   * Fires with a valid `Date` once the field holds a complete, in-range, real date (round-trip
   * validated, so 31.02 is rejected). Fires `null` when the field is cleared or becomes
   * incomplete / unparseable / out-of-range. De-duplicated: the same result (both `null`, or the
   * same calendar day) is never emitted twice in a row.
   */
  onChange?: (date: Date | null) => void
  /** Earliest accepted date. A typed date before this is treated as invalid (internal error). */
  minimumDate?: Date
  /** Latest accepted date. A typed date after this is treated as invalid (internal error). */
  maximumDate?: Date
  /** Disables editing and dims the field. */
  disabled?: boolean
  /**
   * External error flag. The component ALSO raises its own internal error for an unparseable /
   * out-of-range entry; either source flips the destructive border.
   */
  error?: boolean
  /**
   * Optional inline error message for standalone use. When set it renders a token-styled
   * destructive line under the field with `role="alert"` and is wired via `aria-describedby` /
   * `aria-invalid`. When omitted, an internally-detected invalid entry still announces a concise
   * generic reason via the field's description, so the destructive border is never silent.
   */
  errorMessage?: string
  /**
   * Field width. `true` (default) stretches the field to fill its parent. `false` hugs the content
   * for a compact inline date field.
   * @default true
   */
  fullWidth?: boolean
  /**
   * Accessible name for the field (its identity). The locale format hint (e.g. "Format Tag Monat
   * Jahr") is exposed separately as the field's description, not folded into this name.
   */
  accessibilityLabel?: string
  /** Extra classes merged onto the field row. */
  className?: string
}
