import { type ReactNode } from 'react'

/** The trailing affordance drawn on the right of a tile's top row. */
export type PUITileTrailing = 'check' | 'radio' | 'switch' | 'chevron' | ReactNode

/** Selection styling (radio/check/switch look) vs action styling (button/nav look). */
export type PUITileKind = 'selection' | 'action'

export interface PUITileProps {
  /** Primary label, rendered as a `callout`. The accessibility label derives from it (+ description). */
  label: ReactNode
  /** First supporting paragraph under the label, rendered as a muted `footnote`. */
  description?: ReactNode
  /** Optional second supporting paragraph. */
  description2?: ReactNode
  /**
   * Leading artwork on the top-left: a lucide icon (size 24), a larger vector, or media. Media should
   * be wrapped by the caller to `rounded-lg overflow-hidden` with `object-cover`.
   */
  leading?: ReactNode
  /**
   * Trailing affordance on the top-right. The string presets draw a built-in indicator
   * (`'check'`/`'radio'`/`'switch'` selection control, `'chevron'` nav arrow); any ReactNode renders
   * a custom control, badge, or label instead.
   */
  trailing?: PUITileTrailing
  /**
   * `selection` (default) = radio/check/switch styling with a selected state (focus-visible ring +
   * `bg-accent`); `action` = button/nav styling (`border-border` `bg-card`, no selected state).
   */
  kind?: PUITileKind
  /** Selected state, for the `selection` kind only. Drives the accent surface + filled control. */
  selected?: boolean
  /**
   * Selection semantics for the a11y role of the `selection` kind: `single` exposes `radio`
   * (one-of-many), `multiple` exposes `checkbox` (independent toggle). Threaded by
   * {@link PUITileGroupProps} from its `mode`; a standalone selection tile omits it and stays a plain
   * toggle button.
   */
  selectionMode?: PUITileGroupMode
  /** Fired on click (select/toggle for selection kind, navigate/act for action kind). */
  onPress?: () => void
  /** Dims the whole tile to 50% and blocks the press + a11y action. */
  disabled?: boolean
  /** Extra classes for the outer container (layout/spacing/width). */
  className?: string
}

/** A single option in a {@link PUITileGroupProps} group. */
export interface PUITileOption<T extends string = string> {
  /** Stable identity used for selection + as the React key. */
  value: T
  /** Primary label for the option's tile. */
  label: ReactNode
  /** Optional supporting paragraph under the label. */
  description?: ReactNode
  /** Optional leading artwork (icon/vector/media). */
  leading?: ReactNode
  /** Disables just this option's tile. */
  disabled?: boolean
}

/** `single` = radio behavior (one value); `multiple` = check/switch behavior (a set of values). */
export type PUITileGroupMode = 'single' | 'multiple'

/** How the group lays the tiles out: a wrapping grid, a vertical list, or a peeking horizontal row. */
export type PUITileGroupLayout = 'grid' | 'list' | 'hscroll'

export interface PUITileGroupProps<T extends string = string> {
  /** The tiles to render, one per option. Require 2+ (a lone tile should be a card instead). */
  options: PUITileOption<T>[]
  /**
   * `single` (default) = radio behavior: clicking selects one and deselects the rest; `multiple` =
   * check/switch behavior: each tile toggles independently.
   */
  mode?: PUITileGroupMode
  /** Selected value for `single` mode. Controlled. */
  value?: T
  /** Called with the next value when a tile is selected in `single` mode. */
  onValueChange?: (value: T) => void
  /** Selected values for `multiple` mode. Controlled. */
  values?: T[]
  /** Called with the next set of values when a tile is toggled in `multiple` mode. */
  onValuesChange?: (values: T[]) => void
  /** Tile layout. Defaults to `list`. */
  layout?: PUITileGroupLayout
  /**
   * Shown above the tiles in `multiple` mode to communicate a selection cap and set expectations
   * (e.g. "Select up to 4"). Has no effect in `single` mode, where radio behavior is self-evident.
   */
  selectionHint?: ReactNode
  /** Disables every tile in the group. */
  disabled?: boolean
  /** Accessible name for the group container (`role='radiogroup'` in single mode, `role='group'` in multiple). */
  'aria-label'?: string
  /** Extra classes for the group container (layout/spacing). */
  className?: string
}
