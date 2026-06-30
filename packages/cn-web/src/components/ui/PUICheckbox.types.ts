import { type ReactNode } from 'react'

/**
 * Shared semantic prop surface for PUICheckbox, identical on web and native.
 * Each platform adds its own passthrough (`id` web, `className` native).
 */
export interface PUICheckboxOwnProps {
  checked: boolean
  onChange?: (checked: boolean) => void
  /** ReactNode label (i18n-agnostic), always rendered in the default foreground tone. */
  label?: ReactNode
  error?: ReactNode
  disabled?: boolean
}
