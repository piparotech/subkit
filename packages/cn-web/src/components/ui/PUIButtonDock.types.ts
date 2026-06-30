import { type ReactNode } from 'react'

export type PUIButtonDockLayout = 'stack' | 'split'

export type PUIButtonDockPosition = 'sticky' | 'fixed' | 'static'

/**
 * PUIButtonDock contract (web twin). A bottom action bar holding 1 to 4 large action slots with an
 * optional top accessory, kept above the fold while content scrolls beneath. The host composes the
 * actions (PUIButton at a single consistent `size='lg'`) and pins the dock to the viewport bottom.
 *
 * API-mirrors native PUIButtonDock (`children` / `accessory` / `layout` / `topSpacing` / `elevated`).
 * The pinning mechanism differs by design: native uses safe-area insets + an absolute bottom-pin,
 * web uses CSS `position: sticky | fixed` plus `padding-bottom: env(safe-area-inset-bottom)` for the
 * home-indicator gap on mobile browsers. Layout helper, no implicit container role.
 */
export interface PUIButtonDockProps {
  /**
   * The dock's actions — 1 to 4 large action slots (the host passes PUIButton at one consistent
   * `size='lg'`). The host arranges them in priority order top to bottom; the dock does not reorder
   * or resize them. Stacking guidance (host-controlled): a destructive non-primary action sits at the
   * TOP (farthest from the thumb, intentional), a dismissive "Cancel" at the BOTTOM (closest, safest),
   * and the primary closest to the thumb when no cancel is present.
   */
  children: ReactNode
  /**
   * Optional content rendered above the buttons (e.g. a price summary or fine print). Any ReactNode;
   * the dock only provides the slot and the gap below it.
   */
  accessory?: ReactNode
  /**
   * Button arrangement. `stack` (default) lays the actions out vertically full-width — the
   * localization-safe choice and preferred on narrow screens. `split` places two actions side-by-side
   * and should only be used on wide layouts (labels do not localize reliably side-by-side).
   */
  layout?: PUIButtonDockLayout
  /**
   * How the dock pins to the viewport. `sticky` (default) pins to the bottom of the scroll container
   * while remaining in flow. `fixed` pins to the bottom of the viewport regardless of scroll. `static`
   * removes pinning entirely (the host owns placement). All variants keep the safe-area bottom inset.
   */
  position?: PUIButtonDockPosition
  /**
   * Adds top breathing room above the dock content. Defaults to `true`; turn it off to conserve space
   * when the content directly above the dock already provides visual separation.
   */
  topSpacing?: boolean
  /**
   * Renders the scrolled/overflow state — a top hairline plus a soft separation shadow — so the dock
   * reads as floating above content that scrolls behind it. Defaults to `true`; drop it when the dock
   * sits flat on a solid edge with nothing scrolling underneath.
   */
  elevated?: boolean
  /** Accessible label for the dock's action group (`role="group"`). */
  'aria-label'?: string
  /** Extra classes for layout/spacing on the outer pinned container. */
  className?: string
}
