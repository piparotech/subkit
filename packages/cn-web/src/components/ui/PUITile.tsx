import * as React from 'react'

import { Check, ChevronRight } from 'lucide-react'

import { cn } from '../../lib/utils'
import {
  type PUITileGroupMode,
  type PUITileGroupProps,
  type PUITileKind,
  type PUITileProps,
  type PUITileTrailing,
} from './PUITile.types'

export type {
  PUITileGroupLayout,
  PUITileGroupMode,
  PUITileGroupProps,
  PUITileKind,
  PUITileOption,
  PUITileProps,
  PUITileTrailing,
} from './PUITile.types'

/** Track-and-thumb toggle, sized for a tile's trailing slot. The thumb slides via a CSS transform. */
function TileSwitchIndicator({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex h-[26px] w-11 shrink-0 items-center rounded-full p-0.5 transition-colors motion-reduce:transition-none',
        on ? 'bg-primary' : 'bg-border',
      )}
    >
      <span
        className={cn(
          'bg-background size-[22px] rounded-full shadow-sm transition-transform motion-reduce:transition-none',
          on ? 'translate-x-[18px]' : 'translate-x-0',
        )}
      />
    </span>
  )
}

/** Resolves the `trailing` prop: built-in selection/nav indicators for the string presets, else passthrough. */
function TileTrailing({ trailing, selected }: { trailing: PUITileTrailing; selected: boolean }) {
  if (trailing === 'check') {
    return (
      <span
        aria-hidden
        className={cn(
          'flex size-6 items-center justify-center rounded-md border-2',
          selected ? 'border-primary bg-primary' : 'border-border',
        )}
      >
        {selected ? <Check className="text-primary-foreground size-4" /> : null}
      </span>
    )
  }

  if (trailing === 'radio') {
    return (
      <span
        aria-hidden
        className={cn(
          'flex size-5 items-center justify-center rounded-full border-2',
          selected ? 'border-primary' : 'border-border',
        )}
      >
        {selected ? <span className="bg-primary size-2.5 rounded-full" /> : null}
      </span>
    )
  }

  if (trailing === 'switch') return <TileSwitchIndicator on={selected} />

  if (trailing === 'chevron')
    return <ChevronRight aria-hidden className="text-muted-foreground size-5" />

  return <>{trailing}</>
}

/**
 * Resolves the tile's accessible role + checked/pressed wiring.
 *
 * - `action` → plain `button` (navigate/act, no selected state).
 * - `selection` inside a group (`selectionMode` set) → `radio` for single-select, `checkbox` for
 *   multi-select, with `aria-checked`. The group owns the `radiogroup`/`group` container, roving
 *   tabindex and Arrow/Home/End navigation those roles require on the web.
 * - standalone `selection` (no `selectionMode`) → a plain toggle button with `aria-pressed`; it never
 *   emits a lone `radio`, which would need a radiogroup it is not in.
 */
const ariaForTile = (
  kind: PUITileKind,
  selectionMode: PUITileGroupMode | undefined,
  isSelected: boolean,
) => {
  if (kind === 'action') return { role: 'button' as const }
  if (selectionMode === 'multiple') return { role: 'checkbox' as const, 'aria-checked': isSelected }
  if (selectionMode === 'single') return { role: 'radio' as const, 'aria-checked': isSelected }
  return { role: 'button' as const, 'aria-pressed': isSelected }
}

interface PUITileInternalProps extends PUITileProps {
  /** Roving tabindex, set by {@link PUITileGroup}. Standalone tiles stay default-focusable. */
  tabIndex?: number
  /** Group-managed Arrow/Home/End handler, set by {@link PUITileGroup}. */
  onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>
}

/**
 * A large clickable tile for SELECTIONS, ACTIONS, or NAVIGATION. The top row pairs leading artwork
 * with a trailing affordance (a built-in `check`/`radio`/`switch` selection control, a `chevron` nav
 * arrow, or any custom node), and the bottom stacks the label with up to two muted paragraphs. The
 * `selection` kind carries a selected state (accent surface + filled control); the `action` kind reads
 * as a button/link with no selected state. Use 2+ together via {@link PUITileGroup} (a lone tile should
 * be a PUICard).
 *
 * The whole tile is one accessible element, rendered as a `<button>`. Compose tiles with
 * {@link PUITileGroup}: there `radio` (single) / `checkbox` (multiple) roles get the `radiogroup`,
 * roving tabindex and Arrow/Home/End navigation the web requires. A standalone selection tile stays a
 * plain toggle button (`aria-pressed`) rather than emitting a lone `radio`. The focus ring is
 * `focus-visible:ring-2`.
 *
 * @scope both
 */
export const PUITile = React.forwardRef<HTMLButtonElement, PUITileInternalProps>(function PUITile(
  {
    label,
    description,
    description2,
    leading,
    trailing,
    kind = 'selection',
    selected = false,
    selectionMode,
    onPress,
    disabled = false,
    className,
    tabIndex,
    onKeyDown,
  },
  ref,
) {
  const isSelection = kind === 'selection'
  const isSelected = isSelection && selected
  const aria = ariaForTile(kind, selectionMode, isSelected)

  return (
    <button
      {...aria}
      className={cn(
        'flex min-h-[44px] flex-col gap-3 rounded-xl border p-4 text-left transition-colors motion-reduce:transition-none',
        'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        isSelected
          ? 'border-primary bg-accent text-accent-foreground'
          : 'border-border bg-card hover:bg-accent/40',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      disabled={disabled}
      onClick={onPress}
      onKeyDown={onKeyDown}
      ref={ref}
      tabIndex={tabIndex}
      type="button"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="flex">{leading}</span>
        {trailing != null ? (
          <span className="flex shrink-0">
            <TileTrailing selected={isSelected} trailing={trailing} />
          </span>
        ) : null}
      </span>

      <span className="flex flex-col gap-1">
        <span className="text-callout font-medium">{label}</span>
        {description != null ? (
          <span className="text-footnote text-muted-foreground">{description}</span>
        ) : null}
        {description2 != null ? (
          <span className="text-footnote text-muted-foreground">{description2}</span>
        ) : null}
      </span>
    </button>
  )
})

/**
 * A group of {@link PUITile}s with shared selection state. `single` mode is radio behavior (one value,
 * the rest auto-deselect); `multiple` mode is check/switch behavior (each tile toggles independently).
 * Lays out as a wrapping `grid`, a vertical `list`, or a peeking horizontal row (`hscroll`). In
 * `multiple` mode, `selectionHint` (e.g. "Select up to 4") can communicate a selection cap above the
 * tiles.
 *
 * The container is a `radiogroup` for single-select (a `group` for multiple), and threads `mode` to
 * each tile as `selectionMode`, so tiles carry the matching `radio`/`checkbox` role and `aria-checked`.
 * Roving tabindex makes the group one Tab stop; Arrow/Home/End move focus across the tiles, as the
 * radio/checkbox roles require on the web.
 *
 * @scope both
 */
export function PUITileGroup<T extends string = string>({
  options,
  mode = 'single',
  value,
  onValueChange,
  values,
  onValuesChange,
  layout = 'list',
  selectionHint,
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: PUITileGroupProps<T>) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])
  const isMultiple = mode === 'multiple'
  const selectedSet = new Set(values ?? [])
  const trailing: PUITileTrailing = isMultiple ? 'check' : 'radio'
  const showHint = selectionHint != null && isMultiple

  const isOptionSelected = (optionValue: T) =>
    isMultiple ? selectedSet.has(optionValue) : optionValue === value

  const toggle = (optionValue: T) => {
    if (!isMultiple) {
      onValueChange?.(optionValue)
      return
    }
    const next = new Set(selectedSet)
    if (next.has(optionValue)) next.delete(optionValue)
    else next.add(optionValue)
    onValuesChange?.([...next])
  }

  const enabledIndexes = options
    .map((option, index) => (disabled || option.disabled === true ? -1 : index))
    .filter((index) => index >= 0)
  const firstEnabled = enabledIndexes[0] ?? 0

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

  const tiles = options.map((option, index) => {
    const optionDisabled = disabled || option.disabled === true
    return (
      <PUITile
        className={cn(
          layout === 'grid' && 'min-w-40 flex-1 basis-[45%]',
          layout === 'hscroll' && 'w-60 shrink-0',
        )}
        description={option.description}
        disabled={optionDisabled}
        key={option.value}
        kind="selection"
        label={option.label}
        leading={option.leading}
        onKeyDown={(event) => onKeyDown(event, index)}
        onPress={() => toggle(option.value)}
        ref={(node) => {
          refs.current[index] = node
        }}
        selected={isOptionSelected(option.value)}
        selectionMode={mode}
        tabIndex={index === firstEnabled ? 0 : -1}
        trailing={trailing}
      />
    )
  })

  const containerClass = cn(
    layout === 'grid' && 'flex flex-row flex-wrap gap-3',
    layout === 'list' && 'flex flex-col gap-3',
    layout === 'hscroll' && 'flex flex-row flex-wrap gap-3',
  )

  return (
    <div
      aria-disabled={disabled || undefined}
      aria-label={ariaLabel}
      className={cn('flex flex-col gap-3', disabled && 'pointer-events-none opacity-50', className)}
      role={isMultiple ? 'group' : 'radiogroup'}
    >
      {showHint ? (
        <span className="text-footnote text-muted-foreground">{selectionHint}</span>
      ) : null}
      <div className={containerClass}>{tiles}</div>
    </div>
  )
}
