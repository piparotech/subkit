import { type ReactNode } from 'react'

export type PUILinkTextTone = 'brand' | 'default'

export interface PUILinkTextBaseProps {
  children: ReactNode
  /** Navigation target. Opened via Linking (native) / rendered as an `<a>` (web) when set and not disabled. */
  href?: string
  tone?: PUILinkTextTone
  disabled?: boolean
  className?: string
}
