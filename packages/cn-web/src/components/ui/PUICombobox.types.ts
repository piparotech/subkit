export interface PUIComboboxOption {
  label: string
  value: string
}

export interface PUIComboboxProps {
  options: PUIComboboxOption[]
  value: string | null
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  /** Extra classes for the root element (layout/spacing). */
  className?: string
  /** Web-only: base id for the input/listbox/option ARIA wiring. No native twin (RN has no DOM ids). */
  id?: string
}
