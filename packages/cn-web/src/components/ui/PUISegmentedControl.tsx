import * as React from 'react'

import { cn } from '../../lib/utils'
import { OPTICAL_CENTER_RATIO } from './PUIText'
import { type PUISegmentedControlOwnProps } from './PUISegmentedControl.types'

export type { PUISegmentedControlOwnProps, PUISegmentedOption } from './PUISegmentedControl.types'

export type PUISegmentedControlProps = PUISegmentedControlOwnProps

const ICON_SIZE = 20

interface Rect {
  x: number
  width: number
}

/**
 * Self-contained segmented control / inline tabs (no Radix). A bg-muted rounded row whose
 * selected segment is a bg-background card that slides via a CSS transform transition
 * (motion-reduce disables the slide). role tablist + tab with aria-selected; roving tabindex
 * plus arrow/Home/End keyboard navigation. Controlled via value/onValueChange.
 *
 * `width='fixed'` (default) stretches the track to its container with equal-width segments;
 * `width='hug'` shrinks the track to its content and sizes each segment to its own label. The
 * sliding indicator is driven off each segment's measured offset/width (ResizeObserver +
 * getBoundingClientRect), so the tile lands precisely under both modes — mirroring native's
 * onLayout-measured tile.
 *
 * When ANY option carries an `icon`, the control adopts the Uber "pair icons with text" layout:
 * each segment stacks its icon ABOVE the label (vertically centered) and the whole row grows
 * taller. With no icons it stays the compact single-line row.
 *
 * @scope both
 */
export function PUISegmentedControl({
  options,
  value,
  onValueChange,
  width = 'fixed',
  disabled = false,
  className,
}: PUISegmentedControlProps) {
  const fixed = width === 'fixed'
  const trackRef = React.useRef<HTMLDivElement | null>(null)
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])
  const stacked = options.some((option) => option.icon != null)
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )
  const count = options.length || 1

  const [rects, setRects] = React.useState<(Rect | undefined)[]>(() => options.map(() => undefined))

  React.useLayoutEffect(() => {
    const track = trackRef.current
    if (track == null) return
    const measure = () => {
      const base = track.getBoundingClientRect().left
      setRects((prev) => {
        let changed = prev.length !== options.length
        const next = options.map((_, index) => {
          const node = refs.current[index]
          if (node == null) return undefined
          const box = node.getBoundingClientRect()
          const rect = { x: box.left - base, width: box.width }
          const existing = prev[index]
          if (existing == null || existing.x !== rect.x || existing.width !== rect.width)
            changed = true
          return rect
        })
        return changed ? next : prev
      })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(track)
    refs.current.forEach((node) => {
      if (node != null) observer.observe(node)
    })
    return () => observer.disconnect()
  }, [options])

  const target = rects[selectedIndex]

  const select = (index: number) => {
    const option = options[index]
    if (!option) return
    onValueChange?.(option.value)
    refs.current[index]?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (disabled) return
    let next: number | null = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % count
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      next = (index - 1 + count) % count
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = count - 1
    if (next === null) return
    event.preventDefault()
    select(next)
  }

  return (
    <div
      ref={trackRef}
      aria-disabled={disabled || undefined}
      className={cn(
        'bg-muted relative items-center rounded-lg p-1',
        fixed ? 'flex w-full' : 'inline-flex self-start',
        stacked ? 'min-h-16' : 'min-h-11',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      role="tablist"
    >
      {target ? (
        <span
          aria-hidden
          className="bg-background duration-normal ease-standard absolute top-1 bottom-1 left-0 rounded-sm shadow-sm transition-transform motion-reduce:transition-none"
          style={{
            width: `${target.width}px`,
            transform: `translateX(${target.x}px)`,
          }}
        />
      ) : null}
      {options.map((option, index) => {
        const selected = option.value === value
        const iconColor = selected
          ? 'var(--color-foreground-default)'
          : 'var(--color-foreground-muted)'
        const accessibleName = typeof option.label === 'string' ? undefined : option.ariaLabel
        if (
          process.env.NODE_ENV !== 'production' &&
          typeof option.label !== 'string' &&
          option.ariaLabel == null
        ) {
          console.warn(
            `PUISegmentedControl: option "${option.value}" has no string label; provide \`ariaLabel\` so its tab has an accessible name.`,
          )
        }
        return (
          <button
            aria-label={accessibleName}
            aria-selected={selected}
            className={cn(
              'text-subheadline relative z-10 inline-flex items-center justify-center rounded-md px-3 font-medium whitespace-nowrap transition-colors motion-reduce:transition-none',
              fixed ? 'min-w-11 flex-1' : 'min-w-0',
              stacked ? 'min-h-14 flex-col gap-1 py-1.5' : 'min-h-11 flex-row gap-1.5',
              'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
              selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
            disabled={disabled}
            key={option.value}
            onClick={() => onValueChange?.(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            ref={(node) => {
              refs.current[index] = node
            }}
            role="tab"
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            {option.icon ? (
              <span aria-hidden className="inline-flex shrink-0 items-center justify-center">
                {option.icon({ selected, color: iconColor, size: ICON_SIZE })}
              </span>
            ) : null}
            {option.label != null ? (
              <span style={{ transform: `translateY(${OPTICAL_CENTER_RATIO}em)` }}>
                {option.label}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
