import { type ReactNode } from 'react'

export type PUIToastVariant = 'default' | 'success' | 'destructive'

export type PUIToastPosition = 'top' | 'bottom'

export interface PUIToastOptions {
  /** Bold heading line of the toast. */
  title: ReactNode
  /** Optional supporting line under the title. */
  description?: ReactNode
  /** Visual tone. Defaults to `'default'`. */
  variant?: PUIToastVariant
  /** Auto-dismiss delay in ms. Defaults to `4000`. Pass `0` to disable auto-dismiss. */
  duration?: number
}

export interface PUIToast extends PUIToastOptions {
  /** Stable id assigned by the provider; used to dismiss a specific toast. */
  id: string
}

export interface PUIToastContextValue {
  /** Enqueue a toast; returns its id so it can be dismissed programmatically. */
  toast: (options: PUIToastOptions) => string
  /** Dismiss a toast by id. */
  dismiss: (id: string) => void
}

export interface PUIToastProviderProps {
  children: ReactNode
  /** Stack edge. Defaults to `'top'`. */
  position?: PUIToastPosition
  /** Default auto-dismiss delay in ms applied when a toast omits `duration`. Defaults to `4000`. */
  duration?: number
  /** Max number of toasts kept on screen at once. Defaults to `4`. */
  max?: number
}
