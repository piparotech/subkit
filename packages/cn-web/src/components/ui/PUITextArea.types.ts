import { type ReactNode } from 'react'

/**
 * Shared semantic prop surface for PUITextArea (the multiline member of the input family),
 * identical on web and native. Each platform extends this with its host-element props
 * (`TextareaHTMLAttributes` web, multiline `TextInputProps` native).
 */
export interface PUITextAreaOwnProps {
  /** ReactNode so a `<Trans>`/`t` label can be passed (i18n-agnostic). */
  label?: ReactNode
  /** Helper text under the field, rendered muted; suppressed while an error shows. */
  hint?: ReactNode
  /** Presence drives the error border + `role="alert"` / assertive live region + aria wiring. */
  error?: ReactNode
  disabled?: boolean
}
