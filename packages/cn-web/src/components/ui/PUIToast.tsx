import { X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../../lib/utils'
import {
  type PUIToast,
  type PUIToastContextValue,
  type PUIToastOptions,
  type PUIToastPosition,
  type PUIToastProviderProps,
  type PUIToastVariant,
} from './PUIToast.types'

export type {
  PUIToast,
  PUIToastContextValue,
  PUIToastOptions,
  PUIToastPosition,
  PUIToastProviderProps,
  PUIToastVariant,
} from './PUIToast.types'

const DEFAULT_DURATION = 4000

const VARIANT_CARD: Record<PUIToastVariant, string> = {
  default: 'bg-card text-card-foreground',
  success: 'bg-success text-success-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
}

const VARIANT_DESCRIPTION: Record<PUIToastVariant, string> = {
  default: 'text-muted-foreground',
  success: 'text-success-foreground/90',
  destructive: 'text-destructive-foreground/90',
}

const PUIToastContext = React.createContext<PUIToastContextValue | null>(null)

/**
 * Returns `{ toast, dismiss }`. Must be called under a {@link PUIToastProvider}.
 */
// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider (library, not an HMR app)
export function useToast(): PUIToastContextValue {
  const ctx = React.useContext(PUIToastContext)
  if (ctx == null) {
    throw new Error('useToast must be used within a PUIToastProvider')
  }
  return ctx
}

/**
 * Mount once near the app root. Provides `useToast()` and renders a fixed toast stack that
 * CSS-animates in/out (tailwindcss-animate). Each toast lives in an aria-live region
 * (assertive for destructive, polite otherwise) and is keyboard-dismissible.
 */
export function PUIToastProvider({
  children,
  position = 'top',
  duration = DEFAULT_DURATION,
  max = 4,
}: PUIToastProviderProps) {
  const [toasts, setToasts] = React.useState<PUIToast[]>([])
  const counter = React.useRef(0)

  const dismiss = React.useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = React.useCallback(
    (options: PUIToastOptions) => {
      const id = `toast-${counter.current++}`
      const next: PUIToast = { id, variant: 'default', duration, ...options }
      setToasts((current) => {
        const merged = [...current, next]
        return merged.length > max ? merged.slice(merged.length - max) : merged
      })
      return id
    },
    [duration, max],
  )

  const value = React.useMemo<PUIToastContextValue>(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <PUIToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 ? (
        <div
          className={cn(
            'pointer-events-none fixed inset-x-0 z-toast mx-auto flex w-full max-w-sm flex-col gap-2 px-4',
            position === 'top' ? 'top-0 pt-6' : 'bottom-0 pb-6',
          )}
        >
          {toasts.map((item) => (
            <ToastItem item={item} key={item.id} onDismiss={dismiss} position={position} />
          ))}
        </div>
      ) : null}
    </PUIToastContext.Provider>
  )
}

function ToastItem({
  item,
  position,
  onDismiss,
}: {
  item: PUIToast
  position: PUIToastPosition
  onDismiss: (id: string) => void
}) {
  React.useEffect(() => {
    const ms = item.duration ?? DEFAULT_DURATION
    if (ms <= 0) return
    const timer = window.setTimeout(() => onDismiss(item.id), ms)
    return () => window.clearTimeout(timer)
  }, [item.id, item.duration, onDismiss])

  const variant = item.variant ?? 'default'
  const hasDescription = item.description != null

  return (
    <div
      aria-live={variant === 'destructive' ? 'assertive' : 'polite'}
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-2xl p-4 shadow-md',
        'animate-in fade-in-0 duration-normal ease-decelerate motion-reduce:animate-none',
        position === 'top' ? 'slide-in-from-top-2' : 'slide-in-from-bottom-2',
        VARIANT_CARD[variant],
      )}
      role={variant === 'destructive' ? 'alert' : 'status'}
    >
      <div className="flex flex-1 flex-col gap-1 py-0.5">
        <p className="text-headline font-semibold">{item.title}</p>
        {hasDescription ? (
          <p className={cn('text-footnote', VARIANT_DESCRIPTION[variant])}>{item.description}</p>
        ) : null}
      </div>
      <button
        aria-label="Dismiss notification"
        className="-m-1.5 flex min-h-11 min-w-11 shrink-0 items-center justify-center self-start rounded-md opacity-70 transition-opacity duration-fast hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        onClick={() => onDismiss(item.id)}
        type="button"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  )
}
