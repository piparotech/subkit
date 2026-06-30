import { type ReactNode } from 'react'

import { type LucideIcon } from 'lucide-react'

export interface PUIAccordionItem {
  value: string
  title: ReactNode
  content: ReactNode
  /** Optional leading lucide icon (size 24, `text-foreground`) rendered before the title. */
  leadingIcon?: LucideIcon
  /** Optional secondary heading line under the title (footnote, `text-muted-foreground`). */
  supportingText?: string
  /** Optional trailing label shown before the chevron (footnote, `text-muted-foreground`). */
  trailingLabel?: string
  /**
   * Web-only: extra spoken hint appended to the trigger's accessible description via
   * `aria-describedby` (screen readers only). The native twin has no item-level equivalent.
   */
  accessibilityHint?: string
  /** Disable this single item (not collapsible, dimmed). Useful for FAQ/settings rows. */
  disabled?: boolean
}

interface PUIAccordionBaseProps {
  items: PUIAccordionItem[]
  className?: string
  disabled?: boolean
}

export interface PUIAccordionSingleProps extends PUIAccordionBaseProps {
  type: 'single'
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
}

export interface PUIAccordionMultipleProps extends PUIAccordionBaseProps {
  type: 'multiple'
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
}

export type PUIAccordionProps = PUIAccordionSingleProps | PUIAccordionMultipleProps
