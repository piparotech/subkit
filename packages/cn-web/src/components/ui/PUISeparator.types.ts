export type PUISeparatorOrientation = 'horizontal' | 'vertical'

export interface PUISeparatorBaseProps {
  orientation?: PUISeparatorOrientation
  /** Inset both ends of a horizontal separator (or top/bottom of a vertical one). */
  inset?: boolean
  /** Purely visual by default (no a11y role). Set false to expose a separator role. */
  decorative?: boolean
  className?: string
}
