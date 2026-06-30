import * as React from 'react'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { cn } from '../../lib/utils'
import type { PUISheetProps, PUISheetSide, PUISheetSize } from './PUISheet.types'

export type { PUISheetProps, PUISheetSide, PUISheetSize } from './PUISheet.types'

// Panel anchoring + slide animation per side. Bottom keeps the original full-width, max-w-lg,
// rounded-top look; left/right are full-height edge drawers.
const SIDE_CLASSES: Record<PUISheetSide, string> = {
  bottom: cn(
    'inset-x-0 bottom-0 mx-auto w-full max-w-lg rounded-t-2xl border-t px-5 pb-8 pt-3',
    'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
  ),
  left: cn(
    'inset-y-0 left-0 h-full rounded-r-2xl border-r px-5 py-6',
    'data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
  ),
  right: cn(
    'inset-y-0 right-0 h-full rounded-l-2xl border-l px-5 py-6',
    'data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
  ),
}

// Bottom sheet: size caps the panel height. md preserves the original max-h-[90vh].
const BOTTOM_SIZE_CLASSES: Record<PUISheetSize, string> = {
  sm: 'max-h-[40vh]',
  md: 'max-h-[90vh]',
  lg: 'max-h-[75vh]',
  full: 'h-full max-h-screen rounded-none',
}

// Side drawer: size sets the panel width.
const SIDE_SIZE_CLASSES: Record<PUISheetSize, string> = {
  sm: 'w-full max-w-xs',
  md: 'w-full max-w-sm',
  lg: 'w-full max-w-md',
  full: 'w-screen max-w-none rounded-none',
}

// Past this downward drag (px) on a bottom sheet, release dismisses; otherwise it springs back.
const DRAG_DISMISS_THRESHOLD = 96

/**
 * Web sheet built on Radix Dialog (focus trap + Escape + labelled dialog), styled as a panel that
 * slides in from an edge. `side` picks the edge (bottom sheet, or a left/right drawer); `size` is a
 * discrete detent that caps the bottom panel's height or sets a side drawer's width. A bottom sheet
 * shows a grabber handle and can opt into pointer drag-to-dismiss on that grabber. A close button is
 * shown on side drawers (where there is no grabber/drag). Token classes only; re-brand by swapping the
 * token set.
 *
 * @scope both
 */
export function PUISheet({
  open,
  onOpenChange,
  children,
  title,
  description,
  side = 'bottom',
  size = 'md',
  showGrabber = true,
  dismissibleByDrag = false,
  className,
}: PUISheetProps) {
  const titleId = React.useId()
  const descriptionId = React.useId()
  const hasTitle = title != null
  const hasDescription = description != null
  const isBottom = side === 'bottom'
  // Side drawers have no grabber and no drag, so surface an explicit close affordance there.
  const showClose = !isBottom

  const sizeClasses = isBottom ? BOTTOM_SIZE_CLASSES[size] : SIDE_SIZE_CLASSES[size]
  const canDrag = isBottom && dismissibleByDrag
  const [dragY, setDragY] = React.useState<number | null>(null)
  const dragStartRef = React.useRef<number | null>(null)

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canDrag || event.button !== 0) return
    dragStartRef.current = event.clientY
    setDragY(0)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current == null) return
    setDragY(Math.max(0, event.clientY - dragStartRef.current))
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current == null) return
    const travelled = Math.max(0, event.clientY - dragStartRef.current)
    dragStartRef.current = null
    setDragY(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (travelled > DRAG_DISMISS_THRESHOLD) onOpenChange(false)
  }

  const dragStyle =
    dragY != null && dragY > 0
      ? { transform: `translateY(${dragY}px)`, transition: 'none' }
      : undefined

  return (
    <DialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'z-overlay bg-overlay fixed inset-0',
            'data-[state=open]:animate-in data-[state=closed]:animate-out motion-reduce:animate-none',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={hasDescription ? descriptionId : undefined}
          aria-labelledby={hasTitle ? titleId : undefined}
          className={cn(
            'z-overlay bg-card text-card-foreground fixed overflow-y-auto shadow-md',
            'border-border focus:outline-none',
            SIDE_CLASSES[side],
            sizeClasses,
            'data-[state=open]:animate-in data-[state=closed]:animate-out motion-reduce:animate-none',
            'data-[state=closed]:[--tw-duration:var(--duration-fast)] data-[state=open]:[--tw-duration:var(--duration-normal)]',
            className,
          )}
          style={dragStyle}
        >
          {isBottom && showGrabber ? (
            <div
              className={cn(
                'mx-auto mb-4 flex items-center justify-center',
                canDrag ? 'min-h-11 cursor-grab touch-none active:cursor-grabbing' : 'h-1',
              )}
              onPointerCancel={canDrag ? endDrag : undefined}
              onPointerDown={canDrag ? handlePointerDown : undefined}
              onPointerMove={canDrag ? handlePointerMove : undefined}
              onPointerUp={canDrag ? endDrag : undefined}
            >
              <div className="bg-border h-1 w-10 rounded-full" />
            </div>
          ) : null}
          {hasTitle ? (
            <DialogPrimitive.Title
              className={cn(
                'text-title-3 text-card-foreground font-semibold tracking-tight',
                hasDescription ? 'mb-1.5' : 'mb-4',
                showClose && 'pr-11',
              )}
              id={titleId}
            >
              {title}
            </DialogPrimitive.Title>
          ) : (
            <DialogPrimitive.Title className="sr-only">Sheet</DialogPrimitive.Title>
          )}
          {hasDescription ? (
            <DialogPrimitive.Description
              className="text-callout text-muted-foreground mb-4"
              id={descriptionId}
            >
              {description}
            </DialogPrimitive.Description>
          ) : null}
          {children}
          {showClose ? (
            <DialogPrimitive.Close
              aria-label="Close"
              className={cn(
                'absolute top-2 right-2 inline-flex min-h-11 min-w-11 items-center justify-center',
                'text-muted-foreground rounded-md opacity-70',
                'transition-opacity hover:opacity-100 motion-reduce:transition-none',
                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              )}
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
