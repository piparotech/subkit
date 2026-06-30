export interface PUISelectOption {
  label: string
  value: string
}

/** Shared semantic props — kept in lockstep with the cn-native twin (ADR 0023, Tier-2 API parity). */
export interface PUISelectOwnProps {
  options: PUISelectOption[]
  value: string | null
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}
