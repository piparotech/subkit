import * as React from 'react'

import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { X } from 'lucide-react'

import { cn } from '../../lib/utils'
import { type PUITooltipProps } from './PUITooltip.types'

export type {
  PUITooltipAction,
  PUITooltipAlign,
  PUITooltipMode,
  PUITooltipProps,
  PUITooltipSide,
  PUITooltipTone,
} from './PUITooltip.types'

const DEFAULT_DELAY_MS = 400
const DEFAULT_COLLISION_PADDING = 8
const DEFAULT_TIMEOUT_MS = 6000
const SIDE_OFFSET = 8

/**
 * Web tooltip: a small contextual label revealed on hover and keyboard focus of its trigger, built on
 * Radix Tooltip (`role="tooltip"` + `aria-describedby` wired to the trigger, focus/hover/Escape
 * handling, focus-scope-friendly). The trigger renders as `asChild`, so an already-interactive child
 * keeps a single focus target and no extra tab stop is added.
 *
 * Placement is collision-aware: Radix positions the bubble on the chosen `side` and AUTO-FLIPS it to
 * the opposite side (and shifts along the cross axis) when it would overflow the viewport, keeping a
 * `collisionPadding` margin from the edges. All four sides are supported via `side`, with `align`
 * (`start`/`center`/`end`) controlling the cross-axis offset. The arrow re-points after a flip.
 *
 * Two reveal modes: `prompted` (default) is user-triggered and transient — hover + keyboard focus,
 * dismiss on leave / Escape. `unprompted` opens on mount as a lightweight education/upsell nudge and
 * times out after `timeoutMs`; both are non-critical (the native long-press has no hover, so essential
 * info must never live here). The `unprompted`/`action` cases run as a controlled-open Radix Tooltip.
 *
 * An optional trailing `action` renders a tertiary icon button inside the bubble — a close `X` for
 * dismissal or a navigation icon. When present the bubble becomes persistent (controlled-open) and
 * stays until the action / timeout fires rather than dismissing on hover-out.
 *
 * Tone: `inverse` (default) is the dark `bg-foreground` bubble; `card` is a light `bg-card` bubble with
 * `shadow-md` to separate from the page (Calm-Depth). Both tones are pure-token, so they flip with
 * light/dark and re-brand by swapping the token set.
 *
 * Non-visual a11y: a tooltip only labels a trigger that already has an accessible name. When the
 * trigger content is non-text (an icon-only button), pass `accessibilityLabel` — it is applied as the
 * trigger's `aria-label` so screen-reader users hear the label even without the hover reveal. In dev
 * this is asserted when a single element child has no own `aria-label`. Parity with cn-native.
 *
 * Token classes only (re-brand by swapping the token set); the enter/leave + directional slide
 * animations come from tw-animate-css driven by Radix `data-state`/`data-side`, disabled under
 * `motion-reduce`.
 *
 * @scope both
 */
export function PUITooltip({
  content,
  accessibilityLabel,
  children,
  side = 'top',
  align = 'center',
  mode = 'prompted',
  action,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  tone = 'inverse',
  delayMs = DEFAULT_DELAY_MS,
  collisionPadding = DEFAULT_COLLISION_PADDING,
  className,
}: PUITooltipProps) {
  const singleChild = React.isValidElement(children) ? children : null

  if (process.env.NODE_ENV !== 'production' && singleChild != null) {
    const childProps = singleChild.props as { 'aria-label'?: unknown; children?: unknown }
    const hasOwnLabel =
      typeof childProps['aria-label'] === 'string' || typeof childProps.children === 'string'
    if (!hasOwnLabel && accessibilityLabel == null) {
      console.warn(
        'PUITooltip: the trigger has no accessible name. Pass `accessibilityLabel` so the tooltip text is announced for non-text (icon-only) triggers.',
      )
    }
  }

  const trigger =
    singleChild != null && accessibilityLabel != null
      ? React.cloneElement(singleChild as React.ReactElement<{ 'aria-label'?: string }>, {
          'aria-label':
            (singleChild.props as { 'aria-label'?: string })['aria-label'] ?? accessibilityLabel,
        })
      : children

  // An action button (or unprompted nudge) makes the bubble persistent: it stays open until the action
  // / timeout fires instead of dismissing on hover-out, so the Tooltip runs controlled in those cases.
  const persistent = action != null || mode === 'unprompted'
  const [open, setOpen] = React.useState(mode === 'unprompted')

  // Unprompted nudge: open on mount, then auto-dismiss after the timeout window.
  React.useEffect(() => {
    if (mode !== 'unprompted' || !open) return
    const id = setTimeout(() => setOpen(false), timeoutMs)
    return () => clearTimeout(id)
  }, [mode, open, timeoutMs])

  const isCard = tone === 'card'
  const ActionIcon = action?.icon ?? X

  // Persistent cases (action / unprompted) run controlled so the bubble survives hover-out; the
  // transient default leaves Radix to manage hover/focus open state itself.
  const rootProps: React.ComponentProps<typeof TooltipPrimitive.Root> = persistent
    ? { open, onOpenChange: setOpen }
    : {}

  return (
    <TooltipPrimitive.Provider delayDuration={delayMs}>
      <TooltipPrimitive.Root {...rootProps}>
        <TooltipPrimitive.Trigger asChild>{trigger}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            align={align}
            className={cn(
              'z-overlay flex w-max max-w-60 items-center gap-2 rounded-md px-3 py-1.5',
              'text-footnote text-center shadow-md',
              isCard ? 'bg-card text-card-foreground' : 'bg-foreground text-background',
              'data-[state=delayed-open]:animate-in data-[state=instant-open]:animate-in data-[state=closed]:animate-out motion-reduce:animate-none',
              'data-[state=delayed-open]:fade-in-0 data-[state=instant-open]:fade-in-0 data-[state=closed]:fade-out-0',
              'data-[state=delayed-open]:zoom-in-95 data-[state=instant-open]:zoom-in-95 data-[state=closed]:zoom-out-95',
              'data-[side=top]:slide-in-from-bottom-1 data-[side=bottom]:slide-in-from-top-1',
              'data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1',
              'duration-fast',
              className,
            )}
            collisionPadding={collisionPadding}
            side={side}
            sideOffset={SIDE_OFFSET}
          >
            <span className="shrink">{content}</span>
            {action != null ? (
              <button
                aria-label={action.label}
                className={cn(
                  '-mr-1 flex shrink-0 items-center justify-center rounded-sm',
                  'duration-fast opacity-70 transition-opacity hover:opacity-100',
                  isCard
                    ? 'text-card-foreground focus-visible:ring-ring'
                    : 'text-background focus-visible:ring-background',
                  'outline-none focus-visible:ring-2',
                )}
                onClick={action.onPress}
                type="button"
              >
                <ActionIcon aria-hidden className="size-4" />
              </button>
            ) : null}
            <TooltipPrimitive.Arrow
              className={isCard ? 'fill-card' : 'fill-foreground'}
              height={5}
              width={10}
            />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
