import { type ReactNode } from 'react'

import { type LucideIcon } from 'lucide-react'

/** Status/category hue. Mirrors the web Badge palette (`destructive`, not native's `danger`). */
export type PUITagIntent = 'neutral' | 'primary' | 'success' | 'warning' | 'destructive'

/**
 * Visual weight. `soft` = low-contrast tinted fill with matching ink (the Tag idiom); `solid` =
 * high-contrast filled pill with on-color text (the Badge idiom). The web parity of the native
 * `emphasis` axis collapsed to its two meaningful planes (web has no `tertiary` step).
 */
export type PUITagEmphasis = 'soft' | 'solid'

/** Container height + leading/trailing icon size scale. */
export type PUITagSize = 'sm' | 'md' | 'lg'

export interface PUITagProps {
  /** The tag text. Hugs its content, never wraps, truncates at the layout edge. */
  label: ReactNode
  /**
   * Status/category hue. Defaults to `neutral`. Tints the fill (`soft`) or the whole pill
   * (`solid`) via design tokens only.
   */
  intent?: PUITagIntent
  /**
   * Visual weight. Defaults to `soft` (the quiet tinted Tag look). `solid` is a high-contrast
   * filled treatment (use sparingly, the Badge look).
   */
  emphasis?: PUITagEmphasis
  /** Container height + icon size. Defaults to `md`. */
  size?: PUITagSize
  /** Optional leading Lucide icon; size scales with `size`. */
  leadingIcon?: LucideIcon
  /**
   * When set, renders a trailing X dismiss button that removes the tag. The button has its own
   * accessible `Remove <label>` name and a min hit area; it does not nest inside another control.
   */
  onRemove?: () => void
  /** Dims the tag to 50% and blocks the remove button. */
  disabled?: boolean
  /** Extra classes for the outer container (layout/spacing). */
  className?: string
}
