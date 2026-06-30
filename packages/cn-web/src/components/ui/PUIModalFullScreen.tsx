import * as React from 'react'

import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ArrowLeft, X } from 'lucide-react'

import { cn } from '../../lib/utils'
import { PUIButton } from './PUIButton'
import {
  type PUIModalFullScreenConfirmCopy,
  type PUIModalFullScreenProps,
} from './PUIModalFullScreen.types'

export type {
  PUIModalFullScreenConfirmCopy,
  PUIModalFullScreenHeaderAction,
  PUIModalFullScreenLeadingAction,
  PUIModalFullScreenPresentation,
  PUIModalFullScreenProps,
} from './PUIModalFullScreen.types'

const DEFAULT_CONFIRM: PUIModalFullScreenConfirmCopy = {
  title: 'Discard changes?',
  message: 'You have unsaved changes that will be lost.',
  confirmLabel: 'Discard',
  cancelLabel: 'Keep editing',
}

/**
 * Web full-screen takeover (the route-like twin of native PUIModalFullScreen): a BLOCKING surface
 * built on Radix Dialog that covers the whole viewport (`fixed inset-0 h-full w-full`, NOT a centered
 * panel) to let the user complete a self-contained task (signup, multi-step form, terms) and then
 * return to the previous context. Distinct from PUISheet (a partial bottom panel) and PUIDialog (a
 * small centered confirmation). Radix supplies the focus trap, Escape handling, and labelled dialog;
 * focus returns to the trigger on close, so the caller does not manage focus return. The surface
 * slides up from the bottom edge and respects `motion-reduce`.
 *
 * Layout is a docked header row (leading close/back control + required title + optional tertiary
 * trailing action), a scrollable body that grows to fill, and an optional docked footer holding the
 * PRIMARY final action — reachable, never header-only. `presentation` switches between an opaque
 * full-bleed surface (`immersive`, the default) and a slightly inset, top-rounded surface (`stacked`)
 * that lets the previous context read as a layer behind it (API parity with native).
 *
 * `confirmOnClose` intercepts dismissal with a composed Radix AlertDialog (`alertdialog` role,
 * non-dismissible, explicit destructive/cancel choice) so unsaved work is not lost. While the confirm
 * is open the takeover stays put; closing only happens after the user confirms.
 *
 * @scope both
 */
export function PUIModalFullScreen({
  open,
  onOpenChange,
  title,
  presentation = 'immersive',
  leadingAction = 'close',
  headerAction,
  footer,
  confirmOnClose,
  scrollable = true,
  children,
  className,
}: PUIModalFullScreenProps) {
  const titleId = React.useId()
  const [confirming, setConfirming] = React.useState(false)
  const [scrolled, setScrolled] = React.useState(false)

  const isStacked = presentation === 'stacked'
  const isBack = leadingAction === 'back'
  const isCustomLeading = React.isValidElement(leadingAction)

  // Dismissal routes through confirm-on-close when set; otherwise it closes directly. Radix calls
  // this for the header close/back control, the Escape key, and (had we one) the backdrop.
  const requestClose = React.useCallback(() => {
    if (confirmOnClose) {
      setConfirming(true)
    } else {
      onOpenChange(false)
    }
  }, [confirmOnClose, onOpenChange])

  const confirmDiscard = React.useCallback(() => {
    setConfirming(false)
    onOpenChange(false)
  }, [onOpenChange])

  // Radix Dialog drives dismissal through onOpenChange; route every close-to-`false` through the
  // confirm gate instead of letting it close directly.
  const handleDialogOpenChange = React.useCallback(
    (next: boolean) => {
      if (next) {
        onOpenChange(true)
      } else {
        requestClose()
      }
    },
    [onOpenChange, requestClose],
  )

  const confirmCopy: PUIModalFullScreenConfirmCopy =
    confirmOnClose && typeof confirmOnClose === 'object' ? confirmOnClose : DEFAULT_CONFIRM

  const onBodyScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrolled(event.currentTarget.scrollTop > 0)
  }, [])

  const leadingIcon = isCustomLeading ? (
    leadingAction
  ) : isBack ? (
    <ArrowLeft className="size-6" />
  ) : (
    <X className="size-6" />
  )

  return (
    <DialogPrimitive.Root onOpenChange={handleDialogOpenChange} open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'z-overlay bg-overlay fixed inset-0',
            'data-[state=open]:animate-in data-[state=closed]:animate-out motion-reduce:animate-none',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          )}
        />
        <DialogPrimitive.Content
          aria-labelledby={titleId}
          className={cn(
            'z-overlay bg-background text-foreground fixed flex flex-col overflow-hidden',
            'focus:outline-none',
            isStacked
              ? 'border-border inset-x-2 top-3 bottom-0 rounded-t-2xl border border-b-0 shadow-md'
              : 'inset-0 h-full w-full',
            'data-[state=open]:animate-in data-[state=closed]:animate-out motion-reduce:animate-none',
            'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'data-[state=open]:duration-normal data-[state=closed]:duration-fast',
            'data-[state=open]:ease-decelerate data-[state=closed]:ease-accelerate',
          )}
        >
          <header
            className={cn(
              'bg-background flex shrink-0 items-center gap-2 px-2 py-2',
              'duration-fast transition-colors motion-reduce:transition-none',
              scrolled && 'border-border border-b',
            )}
          >
            <button
              aria-label={isBack ? 'Back' : 'Close'}
              className={cn(
                'text-foreground inline-flex min-h-11 min-w-11 items-center justify-center rounded-md',
                'duration-fast hover:bg-muted transition-colors motion-reduce:transition-none',
                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              )}
              onClick={requestClose}
              type="button"
            >
              {leadingIcon}
            </button>
            <DialogPrimitive.Title
              className="text-headline text-foreground flex-1 truncate font-semibold tracking-tight"
              id={titleId}
            >
              {title}
            </DialogPrimitive.Title>
            {headerAction != null ? (
              <button
                className={cn(
                  'inline-flex min-h-11 items-center justify-center rounded-md px-3',
                  'text-callout text-primary font-semibold',
                  'duration-fast hover:bg-muted transition-colors motion-reduce:transition-none',
                  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                )}
                onClick={headerAction.onPress}
                type="button"
              >
                {headerAction.label}
              </button>
            ) : null}
          </header>

          {scrollable ? (
            <div
              className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-4', className)}
              onScroll={onBodyScroll}
            >
              {children}
            </div>
          ) : (
            <div className={cn('min-h-0 flex-1 overflow-hidden px-5 py-4', className)}>
              {children}
            </div>
          )}

          {footer != null ? (
            <footer className="border-border bg-background shrink-0 border-t px-5 py-3 shadow-md">
              {footer}
            </footer>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>

      {confirmOnClose ? (
        <AlertDialogPrimitive.Root onOpenChange={setConfirming} open={confirming}>
          <AlertDialogPrimitive.Portal>
            <AlertDialogPrimitive.Overlay
              className={cn(
                'z-overlay bg-overlay fixed inset-0',
                'data-[state=open]:animate-in data-[state=closed]:animate-out motion-reduce:animate-none',
                'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
              )}
            />
            <AlertDialogPrimitive.Content
              className={cn(
                'z-overlay fixed top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
                'border-border bg-card text-card-foreground rounded-2xl border p-6 shadow-md',
                'focus:outline-none',
                'data-[state=open]:animate-in data-[state=closed]:animate-out motion-reduce:animate-none',
                'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
                'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
                'data-[state=open]:duration-normal data-[state=closed]:duration-fast',
              )}
            >
              <AlertDialogPrimitive.Title className="text-title-3 text-card-foreground font-semibold tracking-tight">
                {confirmCopy.title}
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="text-callout text-muted-foreground mt-1.5">
                {confirmCopy.message}
              </AlertDialogPrimitive.Description>
              <div className="mt-6 flex items-center justify-end gap-3">
                <AlertDialogPrimitive.Cancel asChild>
                  <PUIButton onPress={() => setConfirming(false)} variant="ghost">
                    {confirmCopy.cancelLabel}
                  </PUIButton>
                </AlertDialogPrimitive.Cancel>
                <AlertDialogPrimitive.Action asChild>
                  <PUIButton onPress={confirmDiscard} variant="destructive">
                    {confirmCopy.confirmLabel}
                  </PUIButton>
                </AlertDialogPrimitive.Action>
              </div>
            </AlertDialogPrimitive.Content>
          </AlertDialogPrimitive.Portal>
        </AlertDialogPrimitive.Root>
      ) : null}
    </DialogPrimitive.Root>
  )
}
