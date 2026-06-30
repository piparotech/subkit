import { type SentryConfig } from './config'
import { type ConsentSource, canCaptureEvents, canSendIdentifier } from './consent'

// Provider-neutral error/crash reporter (Sentry in production). It attaches release + app-version
// context to every event (capability: "erscheint in Sentry inkl. Release- und Versionsinfo") and is
// consent-gated like analytics. Crash reporting at the `anonymous` tier is allowed but is scrubbed of
// any user identifier; user context is attached only at the `identified` tier. Nothing here imports a
// real SDK, so it is unit-testable offline. Never log token/secret bytes — only error names.

export type ErrorEvent = {
  name: string
  message: string
  release: string
  environment: string
  appVersion: string
  /** Present only when the identified tier is granted. */
  user?: { id: string }
  tags?: Record<string, string>
}

/** The minimal surface a concrete provider must implement (Sentry satisfies this). */
export type ErrorSink = {
  captureException: (event: ErrorEvent) => void
  setUser: (user: { id: string } | null) => void
}

export function noopErrorSink(): ErrorSink {
  return { captureException() {}, setUser() {} }
}

export type ErrorReporterOptions = {
  sink: ErrorSink
  config: SentryConfig
  consent: ConsentSource
}

export type ReportResult = { status: 'reported' } | { status: 'blocked'; reason: 'no-consent' }

export type ErrorReporter = {
  /** Report an error/crash with release + version context. Dropped entirely under the `off` tier. */
  report: (error: unknown, tags?: Record<string, string>) => ReportResult
  /** Attach (identified) or clear the user on the sink, honoring consent. */
  setUser: (id: string | null) => void
}

function errorName(error: unknown): string {
  if (error instanceof Error) return error.name || 'Error'
  return typeof error
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'non-error thrown'
}

export function createErrorReporter(options: ErrorReporterOptions): ErrorReporter {
  const { sink, config, consent } = options

  function report(error: unknown, tags?: Record<string, string>): ReportResult {
    if (!canCaptureEvents(consent())) return { status: 'blocked', reason: 'no-consent' }
    sink.captureException({
      name: errorName(error),
      message: errorMessage(error),
      release: config.release,
      environment: config.environment,
      appVersion: config.appVersion,
      tags,
    })
    return { status: 'reported' }
  }

  function setUser(id: string | null): void {
    if (id === null || !canSendIdentifier(consent())) {
      sink.setUser(null)
      return
    }
    sink.setUser({ id })
  }

  return { report, setUser }
}
