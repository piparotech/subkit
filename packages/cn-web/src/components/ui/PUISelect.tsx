import * as React from 'react'

import { Check, ChevronDown } from 'lucide-react'

import { cn } from '../../lib/utils'
import type { PUISelectOwnProps } from './PUISelect.types'

export type { PUISelectOption, PUISelectOwnProps } from './PUISelect.types'

export interface PUISelectProps extends PUISelectOwnProps {
  id?: string
}

/**
 * Self-contained single-select dropdown (button trigger + token-styled listbox). The trigger owns a
 * full listbox keyboard model via roving virtual focus (`aria-activedescendant`): Arrow/Home/End to
 * move the active option, Enter/Space to select it, Escape to close and refocus the trigger, plus
 * typeahead. The listbox floats above the page, so it uses `shadow-md` and the `z-overlay` token.
 *
 * @scope both
 */
export function PUISelect({
  options,
  value,
  onValueChange,
  placeholder,
  disabled = false,
  className,
  id,
}: PUISelectProps) {
  const generatedId = React.useId()
  const baseId = id ?? generatedId
  const listboxId = `${baseId}-listbox`
  const optionId = React.useCallback((index: number) => `${baseId}-option-${index}`, [baseId])

  const [open, setOpen] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)
  const typeahead = React.useRef({ buffer: '', timer: 0 })

  const selectedIndex = options.findIndex((option) => option.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined

  const close = React.useCallback((focusTrigger = false) => {
    setOpen(false)
    setActiveIndex(-1)
    if (focusTrigger) triggerRef.current?.focus()
  }, [])

  const openMenu = React.useCallback(() => {
    if (disabled) return
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }, [disabled, selectedIndex])

  React.useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, close])

  React.useEffect(() => {
    if (open && activeIndex >= 0) {
      listRef.current
        ?.querySelector(`#${CSS.escape(optionId(activeIndex))}`)
        ?.scrollIntoView({ block: 'nearest' })
    }
  }, [open, activeIndex, optionId])

  React.useEffect(() => () => window.clearTimeout(typeahead.current.timer), [])

  const select = (index: number) => {
    const option = options[index]
    if (!option) return
    onValueChange(option.value)
    close(true)
  }

  const onTypeahead = (key: string) => {
    if (typeahead.current.timer) window.clearTimeout(typeahead.current.timer)
    typeahead.current.buffer += key.toLowerCase()
    const buffer = typeahead.current.buffer
    typeahead.current.timer = window.setTimeout(() => {
      typeahead.current.buffer = ''
    }, 500)

    const from = activeIndex >= 0 ? activeIndex : 0
    // Search from the option after the current one, wrapping, so repeated keys cycle matches.
    for (let step = 1; step <= options.length; step += 1) {
      const index = (from + step) % options.length
      if (options[index].label.toLowerCase().startsWith(buffer)) {
        if (!open) openMenu()
        setActiveIndex(index)
        return
      }
    }
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) {
        openMenu()
        return
      }
      setActiveIndex((i) => (i + 1) % options.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        openMenu()
        return
      }
      setActiveIndex((i) => (i - 1 + options.length) % options.length)
    } else if (event.key === 'Home' && open) {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End' && open) {
      event.preventDefault()
      setActiveIndex(options.length - 1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (open) select(activeIndex)
      else openMenu()
    } else if (event.key === ' ' || event.key === 'Spacebar') {
      // Space selects the active option when open; otherwise it opens (and never types a space here).
      event.preventDefault()
      if (open) select(activeIndex)
      else openMenu()
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault()
        close(true)
      }
    } else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      onTypeahead(event.key)
    }
  }

  const activeOption = open && activeIndex >= 0 ? options[activeIndex] : undefined

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        aria-activedescendant={activeOption ? optionId(activeIndex) : undefined}
        aria-controls={open ? listboxId : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          'border-border bg-background text-callout flex min-h-11 w-full items-center justify-between gap-2 rounded-md border px-3',
          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        disabled={disabled}
        role="combobox"
        type="button"
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className={cn('truncate', selected ? 'text-foreground' : 'text-muted-foreground')}>
          {selected?.label ?? placeholder ?? ''}
        </span>
        <ChevronDown aria-hidden className="text-muted-foreground size-4 shrink-0" />
      </button>
      {open ? (
        <ul
          ref={listRef}
          aria-activedescendant={activeOption ? optionId(activeIndex) : undefined}
          className="z-overlay border-border bg-background absolute mt-1 max-h-80 w-full overflow-auto rounded-md border py-1 shadow-md"
          id={listboxId}
          role="listbox"
          tabIndex={-1}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value
            const isActive = index === activeIndex
            return (
              <li
                key={option.value}
                aria-selected={isSelected}
                className={cn(
                  'text-callout text-foreground flex min-h-11 cursor-pointer items-center justify-between gap-2 px-3 py-2',
                  isActive && 'bg-accent text-accent-foreground',
                  isSelected && 'bg-accent text-accent-foreground font-medium',
                )}
                id={optionId(index)}
                role="option"
                onClick={() => select(index)}
                onPointerMove={() => setActiveIndex(index)}
              >
                <span className="truncate">{option.label}</span>
                {isSelected ? <Check aria-hidden className="size-4 shrink-0" /> : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
