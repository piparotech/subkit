import * as React from 'react'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

import { cn } from '../../lib/utils'
import { type PUIDialogProps } from './PUIDialog.types'

export type { PUIDialogProps } from './PUIDialog.types'

// Error-shake keyframes (web analog of the native errorSignal choreography): a quick nudge on x
// that springs back. Two identical names are alternated by `getShakeStyle` so a repeated rejected
// submit restarts the animation without remounting the Radix panel. Under Reduce Motion the shake is
// not triggered at all (gated in JS via useReducedMotion), so no movement is applied.
const shakeKeyframes = `
@keyframes pui-dialog-shake-a {
  0%, 100% { transform: translateX(0); }
  15% { transform: translateX(9px); }
  30% { transform: translateX(-7px); }
  45% { transform: translateX(5px); }
  60% { transform: translateX(-3px); }
}
@keyframes pui-dialog-shake-b {
  0%, 100% { transform: translateX(0); }
  15% { transform: translateX(9px); }
  30% { transform: translateX(-7px); }
  45% { transform: translateX(5px); }
  60% { transform: translateX(-3px); }
}`

const getShakeStyle = (shakeKey: number): React.CSSProperties => ({
  animationName: shakeKey % 2 === 1 ? 'pui-dialog-shake-a' : 'pui-dialog-shake-b',
  animationDuration: 'var(--duration-slow, 400ms)',
  animationTimingFunction: 'cubic-bezier(0.36, 0.07, 0.19, 0.97)',
})

/** Tracks `prefers-reduced-motion`. SSR-safe (returns `false` until the client subscribes). */
function useReducedMotion(): boolean {
  const subscribe = React.useCallback((onChange: () => void) => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  )
}

/**
 * Web modal dialog built on Radix Dialog (focus trap + Escape + labelled/described dialog), styled
 * as a centered panel over a dimmed backdrop.
 *
 * `role` resolves to the W3C `dialog`/`alertdialog` role on the panel; `alert` is a boolean
 * shorthand for `role="alertdialog"`. In alert mode the dialog blocks backdrop-click and Escape and
 * hides the close button, so the user answers through the actions — for irreversible confirmations
 * and errors. When `dismissible` is false the same blocking applies without the alert role.
 *
 * Optional `artwork` (or the `icon` alias) renders above the title: centered within the padding for
 * `artworkVariant="inline"` (default) or full-bleed with rounded top corners for `"hero"`.
 *
 * Token classes only (re-brand by swapping the token set).
 *
 * @scope both
 * ADR-0023: Tier 3 (Composite) — parity optional; web Radix overlay vs native reanimated Modal.
 */
export function PUIDialog({
  open,
  onOpenChange,
  title,
  description,
  artwork,
  icon,
  artworkVariant = 'inline',
  children,
  actions,
  role = 'dialog',
  alert = false,
  dismissible = true,
  errorSignal,
  className,
}: PUIDialogProps) {
  const titleId = React.useId()
  const descriptionId = React.useId()
  const hasTitle = title != null
  const hasDescription = description != null

  const isAlert = role === 'alertdialog' || alert
  // Alert dialogs are intentionally blocking: no outside/Escape dismiss and no close affordance.
  const canDismiss = dismissible && !isAlert

  // Error-shake: nudge the panel and spring back on a rising errorSignal while the alert is open —
  // web analog of the native twin's choreography. The alternating keyframe name (see getShakeStyle)
  // restarts the animation so a repeated rejected submit re-fires. Reduce Motion is honored at the
  // source: the shake is gated on `prefers-reduced-motion` here, since the inline animation style
  // would otherwise win over a `motion-reduce:animate-none` class.
  const prefersReducedMotion = useReducedMotion()
  const [shakeKey, setShakeKey] = React.useState(0)
  const [prevErrorSignal, setPrevErrorSignal] = React.useState(errorSignal)
  // Adjust the shake token during render when a rising errorSignal arrives while the
  // alert is open. React's "adjust state when a prop changes" pattern keeps the previous
  // signal in state (not a ref), avoiding both a setState-in-effect cascade and a ref
  // read during render; setState during render is allowed and converges via this guard.
  if (errorSignal !== prevErrorSignal) {
    setPrevErrorSignal(errorSignal)
    if (errorSignal != null && open && isAlert && !prefersReducedMotion) {
      setShakeKey((key) => key + 1)
    }
  }

  const artworkNode = artwork ?? icon
  const hasArtwork = artworkNode != null
  const isHero = hasArtwork && artworkVariant === 'hero'
  const hasInlineArtwork = hasArtwork && !isHero

  const blockWhenLocked = (event: Event) => {
    if (!canDismiss) event.preventDefault()
  }

  return (
    <DialogPrimitive.Root onOpenChange={onOpenChange} open={open}>
      <DialogPrimitive.Portal>
        <style>{shakeKeyframes}</style>
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
            'z-overlay fixed top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
            'focus:outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out motion-reduce:animate-none',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
            'data-[state=closed]:[--tw-animate-duration:var(--duration-fast)] data-[state=open]:[--tw-animate-duration:var(--duration-normal)]',
            className,
          )}
          onEscapeKeyDown={blockWhenLocked}
          onInteractOutside={blockWhenLocked}
          onPointerDownOutside={blockWhenLocked}
          role={isAlert ? 'alertdialog' : undefined}
        >
          {/* Shake layer: own transform/animation so the error-shake never collides with the
              centering translate or the Radix enter/exit animation on the Content above. */}
          <div
            className={cn(
              'border-border bg-card text-card-foreground relative w-full rounded-2xl border shadow-md',
              isHero ? 'overflow-hidden' : 'p-6',
            )}
            style={shakeKey > 0 ? getShakeStyle(shakeKey) : undefined}
          >
            {isHero ? (
              <div className="w-full overflow-hidden rounded-t-2xl">{artworkNode}</div>
            ) : null}
            <div className={cn(isHero && 'p-6')}>
              {hasInlineArtwork ? (
                <div className="mb-4 flex justify-center">{artworkNode}</div>
              ) : null}
              {hasTitle ? (
                <DialogPrimitive.Title
                  className={cn(
                    'text-title-3 text-card-foreground font-semibold tracking-tight',
                    hasInlineArtwork ? 'text-center' : !isAlert && 'pr-11',
                  )}
                  id={titleId}
                >
                  {title}
                </DialogPrimitive.Title>
              ) : (
                <DialogPrimitive.Title className="sr-only">Dialog</DialogPrimitive.Title>
              )}
              {hasDescription ? (
                <DialogPrimitive.Description
                  className={cn(
                    'text-callout text-muted-foreground mt-1.5',
                    hasInlineArtwork && 'text-center',
                  )}
                  id={descriptionId}
                >
                  {description}
                </DialogPrimitive.Description>
              ) : null}
              {children != null ? (
                <div className={cn(hasTitle || hasDescription ? 'mt-4' : undefined)}>
                  {children}
                </div>
              ) : null}
              {actions != null ? (
                <div className="mt-6 flex items-center justify-end gap-3">{actions}</div>
              ) : null}
            </div>
            {canDismiss ? (
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
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
