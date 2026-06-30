import { type ReactNode } from 'react'

/**
 * Shared semantic prop surface for the PUIInput family (Input/TextInput/EmailInput/PasswordInput),
 * identical on web and native. Each platform extends this with its host-element props
 * (`InputHTMLAttributes` web, `TextInputProps` native) and the `addonEnd` slot.
 */
export interface PUIInputOwnProps {
  /** ReactNode so a `<Trans>`/`t` label can be passed (i18n-agnostic). */
  label?: ReactNode
  /** Presence drives the error border + `role="alert"` + aria wiring. */
  error?: ReactNode
  disabled?: boolean
}
