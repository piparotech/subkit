import { type ReactNode } from 'react'

import { type LucideIcon } from 'lucide-react'

/** A single button in the attached row. */
export interface PUIButtonGroupItem {
  /** Stable identity compared against `value` to resolve selection and reported by `onValueChange`/`onAction`. */
  value: string
  /**
   * Visible label. Accepts any ReactNode (a string, the `t` macro, `<Trans>`, or a `<span>`) so i18n
   * and rich labels pass straight through. A string/number is also used as the accessible name.
   */
  label: ReactNode
  /** Optional leading lucide glyph; rendered ahead of the label and tinted by `currentColor`. */
  leadingIcon?: LucideIcon
  /** Disables this single button while leaving the rest of the group interactive. */
  disabled?: boolean
}

/**
 * `'select'` (default) toggles `pressed` state on the buttons and reports via `onValueChange`;
 * `'action'` keeps no persistent selection and fires `onAction(value)` on each click.
 */
export type PUIButtonGroupMode = 'select' | 'action'

/**
 * `'single'` (default) is radio-like — at most one button pressed, `value` is a string;
 * `'multiple'` is checkbox-like — any number pressed, `value` is a string array.
 */
export type PUIButtonGroupSelection = 'single' | 'multiple'

/**
 * Shared size for every button (one height + radius across the row). Differentiates by
 * padding/type DENSITY, never below the 44px touch floor. `'md'` (default) is roomier; `'sm'`
 * is denser but still meets the ≥44px hit target.
 */
export type PUIButtonGroupSize = 'sm' | 'md'

export interface PUIButtonGroupProps {
  /** The 2+ related buttons combined into the attached row. Each needs a stable `value` and a `label`. */
  items: PUIButtonGroupItem[]
  /**
   * `'select'` (default) — buttons toggle their pressed state and report via `onValueChange`.
   * `'action'` — buttons carry no persistent selection and fire `onAction(value)`.
   */
  mode?: PUIButtonGroupMode
  /**
   * `'single'` (default) is radio-like (one pressed `value`, a string); `'multiple'` is
   * checkbox-like (a `value[]` toggled in/out). Only meaningful for `mode='select'`.
   */
  selection?: PUIButtonGroupSelection
  /**
   * Controlled selection. A string for `selection='single'`, a string array for `'multiple'`.
   * Ignored for `mode='action'`.
   */
  value?: string | string[]
  /**
   * Called with the next selection after a toggle — a string for `'single'`, a string array for
   * `'multiple'`. Used in `mode='select'`.
   */
  onValueChange?: (value: string | string[]) => void
  /** Called with the clicked button's `value` in `mode='action'` (no selection is tracked). */
  onAction?: (value: string) => void
  /**
   * Shared button size for every item (same height + corner radius across the row). Differentiates
   * by padding/type DENSITY, not height — both meet the ≥44px touch floor. `'md'` (default) is
   * roomier; `'sm'` is denser.
   */
  size?: PUIButtonGroupSize
  /** Dims the whole group to 50% and blocks every button + its handlers. */
  disabled?: boolean
  /** Accessible name for the group container (`role='group'`). */
  'aria-label'?: string
  /** Extra classes for the outer container (layout/spacing). */
  className?: string
}
