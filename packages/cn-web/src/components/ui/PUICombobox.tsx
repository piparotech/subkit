import { Check, ChevronDown, X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/utils'
import { type PUIComboboxOption, type PUIComboboxProps } from './PUICombobox.types'

export type { PUIComboboxOption, PUIComboboxProps } from './PUICombobox.types'

/**
 * Self-contained searchable single-select: an input + a filtered listbox with full keyboard nav.
 * A clear (x) button appears once a value is selected and resets it via `onValueChange('')`.
 *
 * @scope both
 */
export function PUICombobox({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  disabled = false,
  className,
  id,
}: PUIComboboxProps) {
  const generatedId = React.useId()
  const baseId = id ?? generatedId
  const listboxId = `${baseId}-listbox`
  const countId = `${baseId}-count`
  const optionId = React.useCallback((index: number) => `${baseId}-option-${index}`, [baseId])

  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [activeIndex, setActiveIndex] = React.useState(0)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)

  const selected = options.find((option) => option.value === value)

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return options
    return options.filter((option) => option.label.toLowerCase().includes(needle))
  }, [options, query])

  // Reset the highlighted option whenever the filter or open state changes — intentional UI reset.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIndex(0)
  }, [query, open])

  React.useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  React.useEffect(() => {
    if (open && activeIndex >= 0) {
      listRef.current
        ?.querySelector(`#${CSS.escape(optionId(activeIndex))}`)
        ?.scrollIntoView({ block: 'nearest' })
    }
  }, [open, activeIndex, optionId])

  const openMenu = () => {
    if (disabled) return
    setQuery('')
    setOpen(true)
  }

  const select = (option: PUIComboboxOption) => {
    onValueChange(option.value)
    setOpen(false)
    inputRef.current?.focus()
  }

  const clear = () => {
    onValueChange('')
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) {
        openMenu()
        return
      }
      setActiveIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        openMenu()
        return
      }
      setActiveIndex((i) => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0))
    } else if (event.key === 'Enter') {
      if (open && filtered[activeIndex]) {
        event.preventDefault()
        select(filtered[activeIndex])
      }
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault()
        setOpen(false)
      }
    } else if (event.key === 'Home' && open) {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End' && open) {
      event.preventDefault()
      setActiveIndex(filtered.length - 1)
    }
  }

  const activeOption = open ? filtered[activeIndex] : undefined

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <div
        className={cn(
          'flex min-h-11 w-full items-center gap-2 rounded-md border border-border bg-background px-3',
          'focus-within:ring-2 focus-within:ring-ring',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <input
          ref={inputRef}
          aria-activedescendant={activeOption ? optionId(activeIndex) : undefined}
          aria-autocomplete="list"
          aria-controls={open ? listboxId : undefined}
          aria-expanded={open}
          autoComplete="off"
          className="w-full bg-transparent text-subheadline text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          disabled={disabled}
          placeholder={open ? (searchPlaceholder ?? 'Search…') : (selected?.label ?? placeholder ?? '')}
          role="combobox"
          type="text"
          value={open ? query : ''}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={openMenu}
          onKeyDown={onKeyDown}
        />
        {selected && !disabled ? (
          <button
            aria-label="Clear selection"
            className="flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={clear}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            <X aria-hidden className="size-4" />
          </button>
        ) : null}
        <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </div>
      <span aria-live="polite" className="sr-only" id={countId} role="status">
        {open ? `${filtered.length} ${filtered.length === 1 ? 'result' : 'results'}` : ''}
      </span>
      {open ? (
        <ul
          ref={listRef}
          className="absolute z-overlay mt-1 max-h-[min(18rem,40vh)] w-full overflow-auto rounded-md border border-border bg-background py-1 shadow-md"
          id={listboxId}
          role="listbox"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2.5 text-subheadline text-muted-foreground" role="presentation">
              No results
            </li>
          ) : (
            filtered.map((option, index) => {
              const isSelected = option.value === value
              const isActive = index === activeIndex
              return (
                <li
                  key={option.value}
                  aria-selected={isSelected}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-subheadline text-foreground',
                    isActive && 'bg-accent text-accent-foreground',
                    isSelected && 'bg-accent font-medium text-accent-foreground',
                  )}
                  id={optionId(index)}
                  role="option"
                  onClick={() => select(option)}
                  onPointerMove={() => setActiveIndex(index)}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected ? <Check aria-hidden className="size-4 shrink-0" /> : null}
                </li>
              )
            })
          )}
        </ul>
      ) : null}
    </div>
  )
}
