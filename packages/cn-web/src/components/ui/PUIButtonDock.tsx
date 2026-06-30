import { Children, isValidElement } from 'react'
import * as React from 'react'

import { cn } from '../../lib/utils'
import {
  type PUIButtonDockLayout,
  type PUIButtonDockPosition,
  type PUIButtonDockProps,
} from './PUIButtonDock.types'

export type { PUIButtonDockLayout, PUIButtonDockPosition, PUIButtonDockProps }

const positionClass: Record<PUIButtonDockPosition, string> = {
  sticky: 'z-overlay sticky inset-x-0 bottom-0',
  fixed: 'z-overlay fixed inset-x-0 bottom-0',
  static: 'relative',
}

/**
 * Bottom action bar (web twin of native PUIButtonDock): up to four large action slots plus an
 * optional top accessory, pinned to the viewport bottom so the primary CTA stays above the fold
 * while content scrolls beneath. The host composes PUIButton children at one consistent `size='lg'`
 * in priority order top to bottom (`stack`) or two side-by-side (`split`, wide layouts only).
 *
 * Pinning is CSS `position: sticky | fixed` (`position` prop), with padding extended by the device
 * safe-area insets — `env(safe-area-inset-bottom)` so the bar clears the home indicator, plus
 * `env(safe-area-inset-left | -right)` so a left- or right-most button is not clipped under the
 * notch / rounded corner in landscape on mobile browsers (parity with the native insets contract).
 * When content scrolls behind it the dock takes the `elevated` state — a top hairline plus a soft
 * separation shadow that casts UPWARD (negative Y, mirroring native `shadow.sheet`) since the bar
 * rises from the bottom edge and must separate from the content scrolling above it. The actions
 * wrapper carries `role="group"` only when `aria-label` is supplied, so the group is always named
 * (always pass `aria-label`); each child keeps its own button semantics. No entrance animation; any
 * host-added show/hide transition must honor `motion-reduce`.
 *
 * Tier 2 (Native-Controls, ADR 0023): API-parity with native, platform-native pinning by design.
 *
 * @scope web-only
 */
export const PUIButtonDock = React.forwardRef<HTMLDivElement, PUIButtonDockProps>(
  (
    {
      children,
      accessory,
      layout = 'stack',
      position = 'sticky',
      topSpacing = true,
      elevated = true,
      'aria-label': ariaLabel,
      className,
    },
    ref,
  ) => {
    const items = Children.toArray(children).filter(isValidElement)

    return (
      <div
        ref={ref}
        className={cn(
          'bg-background',
          positionClass[position],
          topSpacing ? 'pt-3' : 'pt-0',
          elevated && 'border-border border-t',
          className,
        )}
        style={{
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'calc(1rem + env(safe-area-inset-left, 0px))',
          paddingRight: 'calc(1rem + env(safe-area-inset-right, 0px))',
          ...(elevated
            ? {
                boxShadow:
                  '0px -2px 8px rgba(10,23,64,0.04), 0px -12px 32px -8px rgba(10,23,64,0.08)',
              }
            : null),
        }}
      >
        {accessory != null ? <div className="mb-2">{accessory}</div> : null}
        <div
          aria-label={ariaLabel}
          className={cn('flex', layout === 'split' ? 'flex-row gap-2' : 'flex-col gap-2')}
          role={ariaLabel ? 'group' : undefined}
        >
          {items.map((child) => (
            <div className={layout === 'split' ? 'flex-1' : 'w-full'} key={child.key}>
              {child}
            </div>
          ))}
        </div>
      </div>
    )
  },
)
PUIButtonDock.displayName = 'PUIButtonDock'
