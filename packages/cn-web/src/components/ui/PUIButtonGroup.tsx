import * as React from 'react'

import { cva } from 'class-variance-authority'

import { cn } from '../../lib/utils'
import {
  type PUIButtonGroupItem,
  type PUIButtonGroupProps,
  type PUIButtonGroupSize,
} from './PUIButtonGroup.types'

export type {
  PUIButtonGroupItem,
  PUIButtonGroupMode,
  PUIButtonGroupProps,
  PUIButtonGroupSelection,
  PUIButtonGroupSize,
} from './PUIButtonGroup.types'

// Attached row geometry per size. Density only: every button stays on the same height + radius and
// never drops below the 44px touch floor, so `size` tightens padding/type rather than shrinking the
// hit target.
const buttonVariants = cva(
  'relative -ml-px inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap border border-border font-semibold transition-colors duration-fast motion-reduce:transition-none focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring first:ml-0 first:rounded-l-md last:rounded-r-md disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'min-h-11 px-3 text-subheadline',
        md: 'min-h-11 px-4 text-callout',
      } satisfies Record<PUIButtonGroupSize, string>,
      pressed: {
        true: 'z-10 bg-primary text-primary-foreground border-primary hover:bg-primary-hover',
        false: 'bg-background text-foreground hover:bg-muted',
      },
    },
    defaultVariants: { size: 'md', pressed: false },
  },
)

// Only string/number labels can become the button's accessible name; richer nodes need none here
// (the visible text is announced by the DOM content).
const textOf = (node: React.ReactNode): string | undefined =>
  typeof node === 'string' || typeof node === 'number' ? String(node) : undefined

/**
 * Attached / segmented button row (filters, choice, view toggles): 2+ related buttons joined into one
 * cluster with shared borders and rounded ends. Unlike PUISegmentedControl (a sliding single-choice
 * track), this is a button row that supports single OR multiple selection and also a pure action mode.
 *
 * `mode='select'` toggles persistent state — `selection='single'` is radio-like (one value),
 * `'multiple'` is checkbox-like (a value array). `mode='action'` carries no selection and fires
 * `onAction` per click. The container is `role='group'`; each button exposes `aria-pressed`. Roving
 * tabindex with Arrow/Home/End moves focus across the row. Every button meets the ≥44px hit floor and
 * shares one height + radius; `size` only tightens padding/type density.
 *
 * Pass `aria-label` to give the `role='group'` an accessible name — without it the cluster is
 * announced as an unnamed group, so it is best practice for the pattern even though the prop is optional.
 *
 * Web-exclusive shape (the native twin renders separated chips with `overflow`/`align` geometry that
 * does not map to an attached web row); API stays aligned on
 * `items`/`mode`/`selection`/`value`/`onValueChange`/`onAction`/`size`/`disabled`.
 *
 * @scope both
 */
export function PUIButtonGroup({
  items,
  mode = 'select',
  selection = 'single',
  value,
  onValueChange,
  onAction,
  size = 'md',
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: PUIButtonGroupProps) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])
  const isAction = mode === 'action'
  const multiple = selection === 'multiple'

  const selectedValues: string[] = isAction
    ? []
    : multiple
      ? Array.isArray(value)
        ? value
        : []
      : typeof value === 'string'
        ? [value]
        : []

  const isSelected = (itemValue: string) => selectedValues.includes(itemValue)

  const handlePress = (itemValue: string) => {
    if (isAction) {
      onAction?.(itemValue)
      return
    }
    if (multiple) {
      const next = isSelected(itemValue)
        ? selectedValues.filter((v) => v !== itemValue)
        : [...selectedValues, itemValue]
      onValueChange?.(next)
      return
    }
    onValueChange?.(itemValue)
  }

  const enabledIndexes = items
    .map((item, index) => (item.disabled ? -1 : index))
    .filter((index) => index >= 0)
  const firstEnabled = enabledIndexes[0] ?? 0

  // Roving tab stop. For single-select (radio-like) the stop sits on the selected item so Tab
  // returns to the active choice, mirroring PUISegmentedControl; multiple/action keep the row head.
  const selectedEnabledIndex =
    !isAction && !multiple
      ? items.findIndex((item) => !item.disabled && isSelected(item.value))
      : -1
  const activeIndex = selectedEnabledIndex >= 0 ? selectedEnabledIndex : firstEnabled

  const focusIndex = (index: number) => {
    refs.current[index]?.focus()
  }

  const step = (from: number, delta: number) => {
    if (enabledIndexes.length === 0) return
    const position = enabledIndexes.indexOf(from)
    const base = position === -1 ? 0 : position
    const nextPos = (base + delta + enabledIndexes.length) % enabledIndexes.length
    focusIndex(enabledIndexes[nextPos]!)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (disabled) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') step(index, 1)
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') step(index, -1)
    else if (event.key === 'Home') focusIndex(enabledIndexes[0] ?? 0)
    else if (event.key === 'End') focusIndex(enabledIndexes[enabledIndexes.length - 1] ?? 0)
    else return
    event.preventDefault()
  }

  const renderButton = (item: PUIButtonGroupItem, index: number) => {
    const selected = isSelected(item.value)
    const itemDisabled = disabled || item.disabled === true
    const LeadingIcon = item.leadingIcon
    return (
      <button
        aria-label={textOf(item.label)}
        aria-pressed={isAction ? undefined : selected}
        className={buttonVariants({ size, pressed: selected })}
        disabled={itemDisabled}
        key={item.value}
        onClick={() => handlePress(item.value)}
        onKeyDown={(event) => onKeyDown(event, index)}
        ref={(node) => {
          refs.current[index] = node
        }}
        tabIndex={index === activeIndex ? 0 : -1}
        type="button"
      >
        {LeadingIcon != null ? <LeadingIcon aria-hidden className="size-4 shrink-0" /> : null}
        {item.label}
      </button>
    )
  }

  return (
    <div
      aria-disabled={disabled || undefined}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex w-fit items-stretch',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      role="group"
    >
      {items.map(renderButton)}
    </div>
  )
}
