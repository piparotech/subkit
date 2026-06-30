import { type ReactNode } from 'react'

export interface PUITabItem {
  /** Stable identifier; ties a tab to its panel and is the `value` reported on change. */
  value: string
  /** Tab label, rendered inside the trigger. i18n-agnostic ReactNode. */
  label: ReactNode
  /** Panel body shown when this tab is active. */
  content: ReactNode
  /** Optional leading glyph slot rendered before the label (Lucide icon node). */
  icon?: ReactNode
  /** Disable just this tab (not selectable, dimmed). */
  disabled?: boolean
}

export interface PUITabsProps {
  /** The tabs and their panels, in display order. */
  items: PUITabItem[]
  /** Controlled active tab value. Pair with `onValueChange`. */
  value?: string
  /** Uncontrolled initial active tab value. Defaults to the first non-disabled item. */
  defaultValue?: string
  /** Called with the next value when the active tab changes. */
  onValueChange?: (value: string) => void
  /** Disable the whole tab set (every tab non-selectable, dimmed). */
  disabled?: boolean
  /** Extra classes for the root element (layout/spacing). */
  className?: string
}
