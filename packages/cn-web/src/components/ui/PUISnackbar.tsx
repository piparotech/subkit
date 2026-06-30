import * as React from 'react'

import { CircleCheck, CircleX, TriangleAlert } from 'lucide-react'

import { cn } from '../../lib/utils'
import {
  type PUISnackbar,
  type PUISnackbarContextValue,
  type PUISnackbarOptions,
  type PUISnackbarPosition,
  type PUISnackbarProviderProps,
  type PUISnackbarState,
} from './PUISnackbar.types'
import { PUISpinner } from './PUISpinner'

export type {
  PUISnackbar,
  PUISnackbarAction,
  PUISnackbarContextValue,
  PUISnackbarOptions,
  PUISnackbarPosition,
  PUISnackbarProviderProps,
  PUISnackbarState,
} from './PUISnackbar.types'

const DEFAULT_DURATION = 4000

// Only the states that render a tinted lucide glyph; `default` renders no glyph and `loading`
// renders a <PUISpinner tone="muted" />, so neither reads this map.
const STATE_ICON_TONE: Record<'success' | 'warning' | 'failure', string> = {
  success: 'text-success',
  warning: 'text-warning',
  failure: 'text-destructive',
}

const PUISnackbarContext = React.createContext<PUISnackbarContextValue | null>(null)

/**
 * Returns `{ show, dismiss }`. Must be called under a {@link PUISnackbarProvider}.
 */
// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider (library, not an HMR app)
export function useSnackbar(): PUISnackbarContextValue {
  const ctx = React.useContext(PUISnackbarContext)
  if (ctx == null) {
    throw new Error('useSnackbar must be used within a PUISnackbarProvider')
  }
  return ctx
}

/**
 * Distinct, self-contained snackbar — NOT an alias over {@link PUIToastProvider}. The two patterns
 * deliberately differ: PUIToast is a stacked (max 4) title + description card with a close (X)
 * affordance and no action slot; this snackbar is a single bottom/top-CENTER compact bar carrying a
 * message + an optional status-colored leading glyph + a single tertiary action, shown strictly ONE
 * AT A TIME (a second `show()` queues and enters only once the active one dismisses — never stacked),
 * mirroring the native twin (`@piparo/cn-native`). Because PUIToast can express neither the single
 * tertiary action nor the one-at-a-time queue nor the status-glyph-only bar, a thin preset over it
 * was rejected.
 *
 * Mount once near the app root. Provides `useSnackbar()` and renders the active snackbar in a fixed,
 * centered viewport above content (`z-toast`). The gray `bg-card` container carries the message + an
 * optional status-colored leading glyph + a single tertiary action; status never fills the surface
 * (use PUIBanner/PUIAlert for color/emphasis). A `'loading'` snackbar shows a spinner and persists
 * (`duration: 0`) until replaced. Dismiss paths are the action or the auto-dismiss timeout.
 *
 * It CSS-animates in (slide + fade, tw-animate-css) and snaps in with no translate when the OS
 * Reduce Motion setting is on (`motion-reduce:animate-none`, a11y gate, AGENTS.md). Non-modal: it
 * announces via an `alert`/`status` live region and never traps focus, so users who need more time
 * keep a non-timed path (WCAG 2.2.1/2.2.2).
 *
 * @scope both
 */
export function PUISnackbarProvider({
  children,
  position = 'bottom',
  duration = DEFAULT_DURATION,
  className,
}: PUISnackbarProviderProps) {
  const [queue, setQueue] = React.useState<PUISnackbar[]>([])
  const counter = React.useRef(0)

  const dismiss = React.useCallback((id: string) => {
    setQueue((current) => current.filter((item) => item.id !== id))
  }, [])

  const show = React.useCallback((options: PUISnackbarOptions) => {
    const id = `snackbar-${counter.current++}`
    const next: PUISnackbar = { id, ...options }
    setQueue((current) => [...current, next])
    return id
  }, [])

  const value = React.useMemo<PUISnackbarContextValue>(() => ({ show, dismiss }), [show, dismiss])

  // One at a time: only the head of the queue is ever mounted; the rest wait their turn.
  const active = queue[0]

  return (
    <PUISnackbarContext.Provider value={value}>
      {children}
      {active != null ? (
        <div
          className={cn(
            'z-toast pointer-events-none fixed inset-x-0 mx-auto flex w-full max-w-md flex-col items-center px-4',
            position === 'top' ? 'top-0 pt-6' : 'bottom-0 pb-6',
            className,
          )}
        >
          <SnackbarItem
            defaultDuration={duration}
            item={active}
            key={active.id}
            onDismiss={dismiss}
            position={position}
          />
        </div>
      ) : null}
    </PUISnackbarContext.Provider>
  )
}

function StateGlyph({ state }: { state: PUISnackbarState }) {
  if (state === 'loading') return <PUISpinner size="md" tone="muted" />
  if (state === 'success')
    return <CircleCheck aria-hidden className={cn('size-6', STATE_ICON_TONE[state])} />
  if (state === 'warning')
    return <TriangleAlert aria-hidden className={cn('size-6', STATE_ICON_TONE[state])} />
  if (state === 'failure')
    return <CircleX aria-hidden className={cn('size-6', STATE_ICON_TONE[state])} />
  return null
}

function SnackbarItem({
  item,
  position,
  defaultDuration,
  onDismiss,
}: {
  item: PUISnackbar
  position: PUISnackbarPosition
  defaultDuration: number
  onDismiss: (id: string) => void
}) {
  const state = item.state ?? 'default'
  // A `'loading'` snackbar (or an explicit `duration: 0`) persists until replaced and never times out.
  const persists = state === 'loading' || item.duration === 0

  React.useEffect(() => {
    if (persists) return
    const ms = item.duration ?? defaultDuration
    if (ms <= 0) return
    const timer = window.setTimeout(() => onDismiss(item.id), ms)
    return () => window.clearTimeout(timer)
  }, [persists, item.id, item.duration, defaultDuration, onDismiss])

  const leading = item.leading ?? <StateGlyph state={state} />

  // Only `failure` interrupts (role=alert + assertive); every other state — including `warning` —
  // announces politely as role=status, kept in lockstep so the two ARIA signals never contradict
  // (matching PUIBanner/PUIToast: a warning informs but must not rudely barge in).
  const urgent = state === 'failure'

  const handleActionPress = () => {
    item.action?.onPress()
    onDismiss(item.id)
  }

  return (
    <div
      aria-live={urgent ? 'assertive' : 'polite'}
      className={cn(
        'bg-card text-card-foreground pointer-events-auto flex w-full items-center gap-3 rounded-2xl px-4 py-3 shadow-md',
        'animate-in fade-in-0 duration-normal ease-decelerate motion-reduce:animate-none',
        position === 'top' ? 'slide-in-from-top-2' : 'slide-in-from-bottom-2',
      )}
      role={urgent ? 'alert' : 'status'}
    >
      {leading != null ? (
        <span className="flex shrink-0 items-center justify-center">{leading}</span>
      ) : null}
      <p className="text-footnote line-clamp-3 min-w-0 flex-1">{item.message}</p>
      {item.action != null ? (
        <button
          className={cn(
            'text-footnote text-primary -mr-1 flex min-h-11 shrink-0 items-center justify-center rounded-md px-2 font-medium',
            'duration-fast transition-opacity hover:opacity-80 motion-reduce:transition-none',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
          )}
          onClick={handleActionPress}
          type="button"
        >
          {item.action.label}
        </button>
      ) : null}
    </div>
  )
}
