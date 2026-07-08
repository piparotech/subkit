// In-memory mock of the analytics-posthog seams so the module is fully interactive in the showcase
// without a live PostHog/Sentry SDK. The Engine forwards consent-gated, schema-validated calls to an
// injected `AnalyticsSink` (PostHog in production) and `ErrorSink` (Sentry); here both are recording
// fakes that simply remember what got through the gate. A deterministic event registry + a seeded
// candidate list let the demo prove the consent ladder live (off / anonymous / identified + replay).
import { type SentryConfig } from '@/lib/analytics-posthog/config'
import { type EventRegistry, defineEvents } from '@/lib/analytics-posthog/events'
import { type ErrorSink } from '@/lib/analytics-posthog/reporter'
import { type AnalyticsSink, type Tracker } from '@/lib/analytics-posthog/tracker'
import { z } from 'zod'

const eventSchemas = {
  app_opened: z.strictObject({ source: z.string() }),
  screen_viewed: z.strictObject({ name: z.string() }),
  cta_pressed: z.strictObject({ id: z.string() }),
}
export type DemoEventSchemas = typeof eventSchemas
export type DemoTracker = Tracker<DemoEventSchemas>

/** The demo app's typed event schema — undeclared names or bad payloads are rejected by the Engine. */
export const demoEvents: EventRegistry<DemoEventSchemas> = defineEvents(eventSchemas)

/** One deterministic action the demo can fire at the gate, carrying its own typed capture call so the
 *  event name and payload stay statically bound (no `Record<string, unknown>` widening). */
export type DemoAction = {
  label: string
  capture: (tracker: DemoTracker) => ReturnType<DemoTracker['capture']>
}

export const DEMO_ACTIONS: readonly DemoAction[] = [
  {
    label: 'App opened',
    capture: (tracker) => tracker.capture('app_opened', { source: 'deep-link' }),
  },
  {
    label: 'Pricing viewed',
    capture: (tracker) => tracker.capture('screen_viewed', { name: 'pricing' }),
  },
  {
    label: 'Upgrade pressed',
    capture: (tracker) => tracker.capture('cta_pressed', { id: 'upgrade' }),
  },
]

/** The identified person + properties the top tier may attach (DSGVO: only at `identified`). */
export const DEMO_PERSON = { distinctId: 'demo-user-7f3a', properties: { plan: 'pro' } }

/** Fixed Sentry context so reported errors carry deterministic release/version info. */
export const demoSentryConfig: SentryConfig = {
  dsn: 'https://demo@sentry.local/1',
  environment: 'production',
  release: 'showcase@1.4.2+88',
  appVersion: '1.4.2',
  tracesSampleRate: 0,
}

export type CapturedEvent = { name: string; properties: Record<string, unknown> }

/** A recording PostHog stand-in: it remembers every capture/identify the consent gate let through. */
export type RecordingAnalyticsSink = AnalyticsSink & {
  readonly events: CapturedEvent[]
  identifiedAs: string | null
  replaying: boolean
}

export function createRecordingAnalyticsSink(): RecordingAnalyticsSink {
  const sink: RecordingAnalyticsSink = {
    events: [],
    identifiedAs: null,
    replaying: false,
    capture(name, properties) {
      sink.events.push({ name, properties })
    },
    identify(distinctId) {
      sink.identifiedAs = distinctId
    },
    reset() {
      sink.identifiedAs = null
      sink.replaying = false
    },
    startSessionReplay() {
      sink.replaying = true
    },
    stopSessionReplay() {
      sink.replaying = false
    },
  }
  return sink
}

export type ReportedError = { name: string; message: string; release: string; appVersion: string }

/** A recording Sentry stand-in: it remembers every exception the consent gate let through. */
export type RecordingErrorSink = ErrorSink & {
  readonly errors: ReportedError[]
  user: string | null
}

export function createRecordingErrorSink(): RecordingErrorSink {
  const sink: RecordingErrorSink = {
    errors: [],
    user: null,
    captureException(event) {
      sink.errors.push({
        name: event.name,
        message: event.message,
        release: event.release,
        appVersion: event.appVersion,
      })
    },
    setUser(next) {
      sink.user = next?.id ?? null
    },
  }
  return sink
}
