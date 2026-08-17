import { AppState } from 'react-native'

export type SubKitAppState = 'active' | 'background' | 'inactive' | 'unknown'

export interface SubKitAppStateSubscription {
  remove(): void
}

export interface SubKitAppStateSource {
  getCurrentState(): SubKitAppState
  subscribe(listener: (state: SubKitAppState) => void): SubKitAppStateSubscription
}

export interface SubKitAppStateSyncOptions {
  appStateSource: SubKitAppStateSource
  logger?: {
    warn(message: string, context?: unknown): void
  }
  minBackgroundDurationMs?: number
  now?: () => number
  onBecameActive(): Promise<void>
}

export function createReactNativeAppStateSource(): SubKitAppStateSource {
  return {
    getCurrentState() {
      return normalizeReactNativeAppState(AppState.currentState)
    },
    subscribe(listener) {
      const subscription = AppState.addEventListener('change', (state) => {
        listener(normalizeReactNativeAppState(state))
      })
      return { remove: () => subscription.remove() }
    },
  }
}

export function createSubKitAppStateSync(options: SubKitAppStateSyncOptions): {
  start(): SubKitAppStateSubscription
} {
  return {
    start() {
      let previous = options.appStateSource.getCurrentState()
      let backgroundedAt: number | null = previous === 'active' ? null : (options.now ?? Date.now)()
      return options.appStateSource.subscribe((next) => {
        const now = (options.now ?? Date.now)()
        if (next !== 'active' && previous === 'active') backgroundedAt = now
        const becameActive = next === 'active' && previous !== 'active'
        const backgroundDuration = backgroundedAt == null ? null : now - backgroundedAt
        previous = next
        if (!becameActive) return
        if (
          options.minBackgroundDurationMs != null &&
          backgroundDuration != null &&
          backgroundDuration < options.minBackgroundDurationMs
        )
          return
        backgroundedAt = null
        options.onBecameActive().catch((error: unknown) => {
          options.logger?.warn('SubKit foreground sync failed', error)
        })
      })
    },
  }
}

function normalizeReactNativeAppState(state: string | null | undefined): SubKitAppState {
  if (state === 'active') return 'active'
  if (state === 'background') return 'background'
  if (state === 'inactive') return 'inactive'
  return 'unknown'
}
