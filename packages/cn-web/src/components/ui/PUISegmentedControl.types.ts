import { type ReactNode } from 'react'

/** A single selectable segment on the track. */
export interface PUISegmentedOption {
  /**
   * Visible label. A string label also serves as the segment's accessibility name. When `label` is a
   * non-string node, or omitted entirely (icon-only segment), supply `ariaLabel` so the `role="tab"`
   * still has an accessible name (WCAG 4.1.2).
   */
  label?: ReactNode
  /** Stable identity compared against `value` to resolve selection. */
  value: string
  /**
   * Accessible name for the segment. Required for icon-only or non-string-label segments — without it
   * the tab would render unnamed. Ignored when `label` is a string (the string is used directly).
   */
  ariaLabel?: string
  /**
   * Optional glyph rendered with the label. Receives the resolved token `color` (selected →
   * foreground, else muted-foreground), a `size` in px, and the `selected` flag. When ANY option
   * carries an icon the control switches to a taller, stacked layout (icon above label, centered).
   */
  icon?: (props: { selected: boolean; color: string; size: number }) => ReactNode
}

export interface PUISegmentedControlOwnProps {
  /** 2–5 options laid out left-to-right on a connected track. */
  options: PUISegmentedOption[]
  /** Controlled selected value. */
  value: string
  /** Called with the next value when a segment is selected. */
  onValueChange?: (value: string) => void
  /**
   * `'fixed'` (default) stretches the track to its container and gives every segment equal width;
   * `'hug'` shrinks the track to its content and sizes each segment to its own label.
   */
  width?: 'fixed' | 'hug'
  disabled?: boolean
  className?: string
}
