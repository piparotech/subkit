import type * as React from 'react'

import { type LucideIcon } from 'lucide-react'

/**
 * Side of the trigger the bubble appears on. Default `top`. Radix auto-FLIPS to the opposite side
 * (and nudges along the cross axis) when the preferred side would overflow the viewport, so this is a
 * preference, not a guarantee. Parity with cn-native's `PUITooltipSide`.
 */
export type PUITooltipSide = 'top' | 'bottom' | 'left' | 'right'

/** Cross-axis alignment of the bubble against the trigger edge. Default `center`. */
export type PUITooltipAlign = 'start' | 'center' | 'end'

/**
 * How the tooltip is revealed. `prompted` is the default (hover/focus on web, long-press on native;
 * transient). `unprompted` is a lightweight education/upsell nudge that opens on mount and times out
 * after `timeoutMs`. Parity with cn-native's `PUITooltipMode`.
 */
export type PUITooltipMode = 'prompted' | 'unprompted'

/** Bubble background tone. `inverse` = dark bubble (default), `card` = light bubble with a soft shadow. Parity with cn-native's `PUITooltipTone`. */
export type PUITooltipTone = 'inverse' | 'card'

/**
 * Trailing icon button slot inside the bubble (Uber: close or navigate). Tertiary emphasis only — a
 * tooltip is passive. When present, the bubble persists (controlled-open) until the action / timeout
 * fires rather than dismissing on hover-out. Parity with cn-native's `PUITooltipAction`.
 */
export interface PUITooltipAction {
  /** Icon to render. Defaults to `X` (Uber: only an X for dismissal — never a check, never a text button). */
  icon?: LucideIcon
  /** Fired on press. For `unprompted` dismissal supply a no-op or a navigation handler. */
  onPress: () => void
  /** Accessibility label for the icon button (required — the button has no visible text). */
  label: string
}

export interface PUITooltipProps {
  /**
   * Label shown in the bubble. Keep it NON-ESSENTIAL — on native the reveal is long-press only, so
   * anything the user needs to finish the task must live in the visible UI, not here.
   */
  content: React.ReactNode
  /**
   * Plain-text mirror of `content` used to give the trigger an accessible name when its visible
   * children carry no text (e.g. an icon-only button). REQUIRED when the trigger content is non-text,
   * otherwise the tooltip text is never announced. When the trigger already has an accessible name
   * (text child, `aria-label`) this is an optional override. Parity with cn-native.
   */
  accessibilityLabel?: string
  /** The trigger element. Hover or keyboard focus reveals the tooltip. */
  children: React.ReactNode
  /** Which side of the trigger the bubble appears on. Default `top`. Auto-flips on overflow. */
  side?: PUITooltipSide
  /** Cross-axis alignment against the trigger edge. Default `center`. */
  align?: PUITooltipAlign
  /**
   * How the tooltip is revealed. Default `prompted` (hover/focus, transient). `unprompted` opens on
   * mount and auto-dismisses after `timeoutMs`; use sparingly for education/upsell nudges, never for
   * critical info.
   */
  mode?: PUITooltipMode
  /**
   * Trailing icon button inside the bubble (close / navigate). When present the bubble persists
   * (controlled-open) until the action or timeout fires rather than dismissing on hover-out.
   */
  action?: PUITooltipAction
  /**
   * Auto-dismiss delay in ms for `unprompted` mode. Default `6000` (Uber's 5–7s window). Ignored in
   * `prompted` mode.
   */
  timeoutMs?: number
  /** Bubble background tone. Default `inverse` (dark). `card` = light bubble with `shadow-md`. */
  tone?: PUITooltipTone
  /** Hover open delay in ms. Default `400`. */
  delayMs?: number
  /** Distance in px kept from the viewport edges before Radix flips/shifts the bubble. Default `8`. */
  collisionPadding?: number
  /** Extra classes for the bubble (layout/spacing). */
  className?: string
}
