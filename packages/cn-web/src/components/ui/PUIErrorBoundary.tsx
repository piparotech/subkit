import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react'

import { PUIText } from './PUIText'

type State = { error: Error | null }

export type PUIErrorBoundaryProps = PropsWithChildren<{
  /**
   * Reporting seam (provider-agnostic): consumers dock Sentry/their logger here without
   * forking the component. When omitted, the boundary logs to the console.
   */
  onError?: (error: Error, info: ErrorInfo) => void
  /**
   * Optional custom fallback. Receives the caught error and a `reset` to clear the boundary
   * (e.g. after the consumer re-mounts/refetches). When omitted, a dependency-free default
   * fallback renders with static design-token classes.
   */
  fallback?: (error: Error, reset: () => void) => ReactNode
  /**
   * Clears the captured error when any key changes. Useful for route params/search queries so a
   * crashed screen does not poison the next item the user opens.
   */
  resetKeys?: readonly unknown[]
  /** Runs whenever the boundary is reset manually or because `resetKeys` changed. */
  onReset?: () => void
}>

function resetKeysChanged(previous?: readonly unknown[], next?: readonly unknown[]): boolean {
  if (!previous || !next || previous.length !== next.length) {
    return previous !== next
  }
  return previous.some((value, index) => !Object.is(value, next[index]))
}

/**
 * Dependency-free error boundary. The default fallback renders without hooks/theme/provider
 * access (so it still works when those crash) using static design-token classes. Reporting
 * runs through the `onError` seam.
 *
 * @scope both
 */
export class PUIErrorBoundary extends Component<PUIErrorBoundaryProps, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error, info)
    } else {
      console.error('[PUIErrorBoundary]', error, info.componentStack)
    }
  }

  componentDidUpdate(prevProps: PUIErrorBoundaryProps) {
    if (this.state.error && resetKeysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.reset()
    }
  }

  private reset = () => {
    this.props.onReset?.()
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (error) {
      if (this.props.fallback) {
        return this.props.fallback(error, this.reset)
      }
      return (
        <div className="min-h-skeleton-xl gap-sm bg-background p-xl flex flex-col items-center justify-center text-center">
          <PUIText className="font-semibold" variant="headline">
            Something went wrong.
          </PUIText>
          <PUIText tone="muted" variant="callout">
            Please try again.
          </PUIText>
        </div>
      )
    }
    return this.props.children
  }
}
