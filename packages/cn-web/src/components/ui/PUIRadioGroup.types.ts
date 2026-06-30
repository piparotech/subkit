import { type ReactNode } from 'react'

/**
 * The visual layout of a radio group. `inline` is the compact default (a dot + label
 * per row); `tile` renders each option as a large bordered selection card (dot + label
 * + optional description), styled like {@link PUITile} selections.
 */
export type PUIRadioVariant = 'inline' | 'tile'

/**
 * A single selectable option in a PUIRadioGroup.
 * `value` is the unique key compared against the group's `value`; `label` is an
 * i18n-agnostic ReactNode; an option can be disabled independently of the group.
 */
export interface PUIRadioOption {
  value: string
  label: ReactNode
  /** Secondary footnote line under the label — especially useful in the `tile` variant. */
  description?: ReactNode
  /** Optional leading icon/media shown at the start of the `tile` row (e.g. an icon or small image). */
  leading?: ReactNode
  disabled?: boolean
}

/**
 * Shared semantic prop surface for PUIRadioGroup, identical on web and native.
 * Each platform adds its own passthrough (`id` web, `className` native).
 */
export interface PUIRadioGroupOwnProps {
  /** The options rendered as rows, in order. */
  options: PUIRadioOption[]
  /** The currently selected option `value`, or undefined when nothing is selected. */
  value?: string
  /** Fired with the newly selected option `value`. Controlled. */
  onValueChange?: (value: string) => void
  /** Group label (i18n-agnostic), rendered above the rows in the default foreground tone. */
  label?: ReactNode
  /** Inline validation message, announced assertively. Flips the group to its error look. */
  error?: ReactNode
  /**
   * Layout of the options. `inline` (default) keeps the compact dot+label rows; `tile`
   * renders each option as a large bordered selection card with the optional description.
   */
  variant?: PUIRadioVariant
  /** Disable the whole group (individual options can also be disabled). */
  disabled?: boolean
}
