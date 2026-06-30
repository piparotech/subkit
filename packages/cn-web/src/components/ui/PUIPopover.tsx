import * as React from 'react'

import { cn } from '../../lib/utils'

export type PUIPopoverSide = 'top' | 'bottom' | 'left' | 'right'

export interface PUIPopoverProps {
  /** Controlled open state. */
  open: boolean
  /** Called with the next open state on trigger click, outside click, or Escape. */
  onOpenChange: (open: boolean) => void
  /** The element that anchors and toggles the panel. Rendered inside the trigger button. */
  trigger: React.ReactNode
  /** Panel content. */
  children: React.ReactNode
  /** Side of the trigger to place the panel. Defaults to `'bottom'`. */
  side?: PUIPopoverSide
  /** Extra classes for the panel surface. */
  className?: string
}

const SIDE_CLASSES: Record<PUIPopoverSide, string> = {
  bottom: 'left-1/2 top-full mt-2 -translate-x-1/2',
  top: 'left-1/2 bottom-full mb-2 -translate-x-1/2',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
  right: 'left-full top-1/2 ml-2 -translate-y-1/2',
}

/**
 * Self-contained anchored overlay panel: a trigger button (aria-expanded + aria-haspopup) and an
 * absolutely positioned panel placed on `side`. Closes on outside click or Escape; focus moves into
 * the panel on open and returns to the trigger on close. Token classes only (re-brand by swapping
 * the token set).
 *
 * @scope both
 */
export function PUIPopover({
  open,
  onOpenChange,
  trigger,
  children,
  side = 'bottom',
  className,
}: PUIPopoverProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const panelId = React.useId()

  const close = React.useCallback(() => onOpenChange(false), [onOpenChange])
  const wasOpen = React.useRef(false)

  React.useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  // Move focus into the panel on open; restore it to the trigger on close (focus trap/restore
  // parity with the native useModalFocus twin), regardless of whether the close came from Escape,
  // an outside click, or the trigger toggle.
  React.useEffect(() => {
    if (open) {
      wasOpen.current = true
      panelRef.current?.focus()
    } else if (wasOpen.current) {
      wasOpen.current = false
      triggerRef.current?.focus()
    }
  }, [open])

  return (
    <div className="relative inline-block" ref={rootRef}>
      <button
        aria-controls={open ? panelId : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex min-h-11 items-center justify-center"
        onClick={() => onOpenChange(!open)}
        ref={triggerRef}
        type="button"
      >
        {trigger}
      </button>
      {open ? (
        <div
          aria-modal={false}
          className={cn(
            'absolute z-overlay min-w-55 max-w-xs rounded-xl border border-border bg-card p-3 text-card-foreground shadow-md outline-none',
            SIDE_CLASSES[side],
            className,
          )}
          id={panelId}
          ref={panelRef}
          role="dialog"
          tabIndex={-1}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}
