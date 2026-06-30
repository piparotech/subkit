import { type ReactNode } from 'react'

/**
 * Shared semantic props for PUISwitch — the Tier-2 API surface kept in parity with the
 * cn-native twin (ADR 0023). Platform-specific props (e.g. web DOM `id`) are composed on
 * top of this in the component's own Props type.
 */
export interface PUISwitchOwnProps {
  /** Controlled on/off state. */
  value: boolean
  /** Called with the next state when the user toggles the switch. */
  onValueChange?: (value: boolean) => void
  disabled?: boolean
  /** Optional inline label rendered in a >=44px row beside the switch. */
  label?: ReactNode
  /** Extra classes for layout/spacing. */
  className?: string
}
