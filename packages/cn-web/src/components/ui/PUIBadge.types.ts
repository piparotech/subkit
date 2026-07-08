import { type ReactNode } from 'react'

export type PUIBadgeVariant =
  'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' | 'outline'

export interface PUIBadgeBaseProps {
  children: ReactNode
  variant?: PUIBadgeVariant
  /** Leading status dot tinted to the variant's foreground. */
  dot?: boolean
  /** Compact mono badge variant for counters, scores, and code-like labels. */
  mono?: boolean
  icon?: ReactNode
  className?: string
  /** Extra classes for the inner text label (e.g. feature-theme color overrides). */
  textClassName?: string
}
