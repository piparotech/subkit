import { ChevronDown } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/utils'
import { PUIText } from './PUIText'

export interface PUIDropdownItem {
  label: string
  value: string
  icon?: React.ReactNode
  destructive?: boolean
}

export interface PUIDropdownProps {
  items: PUIDropdownItem[]
  onSelect: (value: string) => void
  /**
   * Visual content rendered inside the opener button. The component owns the click, so pass plain
   * content (text, an icon), not an interactive control. When omitted, a refined default
   * button-like trigger labelled with `triggerLabel` is rendered (parity with native).
   */
  trigger?: React.ReactNode
  /** Label for the default trigger when no custom `trigger` is provided. @default 'Options' */
  triggerLabel?: string
  disabled?: boolean
  className?: string
}

/**
 * Token-driven dropdown menu, the web twin of native PUIDropdown. A button trigger opens an
 * absolutely-positioned menu with arrow/Home/End roving-tabindex keyboard navigation. The menu
 * uses `shadow-md` (overlay shadow token) since it floats above the page.
 *
 * @scope both
 */
export function PUIDropdown({
  items,
  onSelect,
  trigger,
  triggerLabel = 'Options',
  disabled = false,
  className,
}: PUIDropdownProps) {
  const [open, setOpen] = React.useState(false)
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([])

  const close = React.useCallback(() => {
    setOpen(false)
    setActiveIndex(-1)
  }, [])

  React.useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, close])

  React.useEffect(() => {
    if (open && activeIndex >= 0) itemRefs.current[activeIndex]?.focus()
  }, [open, activeIndex])

  const select = (value: string) => {
    close()
    onSelect(value)
  }

  const onMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => (i + 1) % items.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => (i - 1 + items.length) % items.length)
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(items.length - 1)
    }
  }

  const triggerContent = trigger ?? (
    <span className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2.5 transition-colors duration-fast motion-reduce:transition-none hover:bg-muted">
      <PUIText variant="callout">{triggerLabel}</PUIText>
      <ChevronDown aria-hidden className="size-4 text-muted-foreground" />
    </span>
  )

  return (
    <div className={cn('relative inline-block', className)} ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        type="button"
      >
        {triggerContent}
      </button>
      {open ? (
        <div
          className="absolute left-0 z-50 mt-1 min-w-56 overflow-hidden rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-md"
          onKeyDown={onMenuKeyDown}
          role="menu"
        >
          {items.map((item, index) => (
            <button
              key={item.value}
              className={cn(
                'flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-left transition-colors motion-reduce:transition-none',
                'focus-visible:outline-none hover:bg-muted focus:bg-muted',
                item.destructive ? 'text-destructive' : 'text-popover-foreground',
              )}
              onClick={() => select(item.value)}
              ref={(el) => {
                itemRefs.current[index] = el
              }}
              role="menuitem"
              tabIndex={index === activeIndex || (activeIndex === -1 && index === 0) ? 0 : -1}
              type="button"
            >
              {item.icon != null ? (
                <span className="flex h-4 w-4 items-center justify-center">{item.icon}</span>
              ) : null}
              <PUIText className="flex-1" variant="callout">
                {item.label}
              </PUIText>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
