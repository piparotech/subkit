import type { z } from 'zod'

import {
  type ConsentSource,
  canCaptureEvents,
  canRecordSession,
  canSendIdentifier,
} from './consent'
import type { EventRegistry, EventSchemaMap } from './events'
import { isValidationError } from './events'

// Provider-neutral analytics tracker. It owns ALL consent gating and event-schema enforcement, then
// forwards sanitized calls to an injected `AnalyticsSink` (PostHog in production, an in-memory fake in
// tests). Nothing here imports a real SDK, so it is fully unit-testable offline and never opens a
// socket. The acceptance contract lives in these gates:
//   - off        -> nothing is captured / identified / replayed
//   - anonymous  -> events captured, NO identifier, NO session replay
//   - identified -> events + identifier (+ session replay iff separately granted)

/** The minimal surface a concrete provider must implement (PostHog satisfies this). */
export type AnalyticsSink = {
  capture: (name: string, properties: Record<string, unknown>) => void
  identify: (distinctId: string, personProperties?: Record<string, unknown>) => void
  reset: () => void
  startSessionReplay?: () => void
  stopSessionReplay?: () => void
}

/** A do-nothing sink — used when no API key is configured, so the app runs analytics-free safely. */
export function noopSink(): AnalyticsSink {
  return {
    capture() {},
    identify() {},
    reset() {},
    startSessionReplay() {},
    stopSessionReplay() {},
  }
}

export type TrackerOptions<M extends EventSchemaMap> = {
  sink: AnalyticsSink
  events: EventRegistry<M>
  consent: ConsentSource
  /** Optional hook for schema-validation failures (dev warnings); never receives token/PII bytes. */
  onInvalidEvent?: (name: string, issues: string[]) => void
}

export type CaptureResult =
  | { status: 'captured' }
  | { status: 'blocked'; reason: 'no-consent' }
  | { status: 'invalid'; issues: string[] }

export type Tracker<M extends EventSchemaMap> = {
  /** Capture a declared, validated event — silently dropped unless consent allows it. */
  capture: <K extends keyof M & string>(name: K, payload: z.infer<M[K]>) => CaptureResult
  /** Identify the person after login — a no-op unless the `identified` tier is granted. */
  identify: (distinctId: string, personProperties?: Record<string, unknown>) => boolean
  /** Re-apply the current consent state to the sink (call after a consent change, no reload). */
  syncConsent: () => ConsentEffect
  /** Drop any identified person + stop replay (call on logout or consent downgrade). */
  reset: () => void
}

export type ConsentEffect = {
  captureAllowed: boolean
  identifyAllowed: boolean
  sessionReplay: 'started' | 'stopped'
}

export function createTracker<M extends EventSchemaMap>(options: TrackerOptions<M>): Tracker<M> {
  const { sink, events, consent, onInvalidEvent } = options

  function capture<K extends keyof M & string>(name: K, payload: z.infer<M[K]>): CaptureResult {
    const validation = events.validate(name, payload)
    if (isValidationError(validation)) {
      onInvalidEvent?.(name, validation.issues)
      return { status: 'invalid', issues: validation.issues }
    }
    if (!canCaptureEvents(consent())) return { status: 'blocked', reason: 'no-consent' }
    sink.capture(name, validation.data as Record<string, unknown>)
    return { status: 'captured' }
  }

  function identify(distinctId: string, personProperties?: Record<string, unknown>): boolean {
    if (!canSendIdentifier(consent())) return false
    sink.identify(distinctId, personProperties)
    return true
  }

  function syncConsent(): ConsentEffect {
    const state = consent()
    const sessionReplay = canRecordSession(state)
    if (sessionReplay) sink.startSessionReplay?.()
    else sink.stopSessionReplay?.()
    return {
      captureAllowed: canCaptureEvents(state),
      identifyAllowed: canSendIdentifier(state),
      sessionReplay: sessionReplay ? 'started' : 'stopped',
    }
  }

  function reset(): void {
    sink.stopSessionReplay?.()
    sink.reset()
  }

  return { capture, identify, syncConsent, reset }
}
