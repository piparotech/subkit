import { type ReactNode } from 'react'

/**
 * Shared semantic props for PUISlider, kept in parity with the cn-native twin
 * (`packages/cn-native/src/components/PUISlider.types.ts`) per ADR 0023 (Tier-2 API parity).
 */
export interface PUISliderOwnProps {
  /** Current value, clamped to [min, max]. Controlled. */
  value: number
  onValueChange?: (value: number) => void
  /**
   * Optional glyph rendered inside the thumb. Web renders a native `<input type="range">`,
   * whose thumb is drawn by the browser/OS and cannot host a custom glyph, so this is a no-op
   * on web; the prop is kept for API parity with the native fallback slot.
   * Receives the current value and the token color.
   */
  thumbIcon?: (props: { value: number; color: string }) => ReactNode
  /** Defaults to 0. */
  min?: number
  /** Defaults to 100. */
  max?: number
  /** Optional step increment; continuous when omitted. */
  step?: number
  disabled?: boolean
  className?: string
}
