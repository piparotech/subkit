import type { z } from 'zod'

import type { WebAnalyticsConfig } from './config'
import { type ConsentSource, isTrackingAllowed } from './consent'
import type { GoalRegistry, GoalSchemaMap } from './goals'

// Provider-neutral WEB analytics tracker. It owns ALL consent gating + goal-schema enforcement, then
// forwards sanitized calls to an injected `WebAnalyticsSink` (Plausible/PostHog-js in production, an
// in-memory fake in tests). Nothing here imports a real SDK or touches `window`, so it is fully
// unit-testable offline and never opens a socket. The acceptance contract lives in these gates:
//   - pageview / goal / outbound / download -> sent only while `isTrackingAllowed` (consent + mode)
//   - opt-in pending  -> nothing sent; opt-out denied -> nothing sent
//   - undeclared / malformed goal -> rejected before reaching the sink (typed + runtime parse)

/** The minimal surface a concrete web provider must implement (Plausible + PostHog-js satisfy this). */
export type WebAnalyticsSink = {
  /** Record a pageview for `url` (capability AC: "wird ein Pageview … erfasst"). */
  pageview: (url: string, referrer?: string) => void
  /** Record a named conversion goal/event with optional custom properties. */
  goal: (name: string, properties: Record<string, unknown>) => void
  /** Record an outbound-link click. */
  outbound: (url: string) => void
  /** Record a file download. */
  download: (url: string) => void
}

/** A do-nothing sink — used when no provider is configured, so the site runs analytics-free safely. */
export function noopSink(): WebAnalyticsSink {
  return { pageview() {}, goal() {}, outbound() {}, download() {} }
}

export type WebTrackerOptions<M extends GoalSchemaMap> = {
  sink: WebAnalyticsSink
  goals: GoalRegistry<M>
  consent: ConsentSource
  config: Pick<WebAnalyticsConfig, 'consentMode'>
  /** Optional hook for schema-validation failures (dev warnings); never receives PII bytes. */
  onInvalidGoal?: (name: string, issues: string[]) => void
}

export type TrackOutcome =
  | { status: 'tracked' }
  | { status: 'blocked'; reason: 'no-consent' }
  | { status: 'invalid'; issues: string[] }

export type WebTracker<M extends GoalSchemaMap> = {
  /** Record a pageview — dropped unless consent allows it. */
  pageview: (url: string, referrer?: string) => TrackOutcome
  /** Record a declared, validated conversion goal — dropped unless consent allows it. */
  trackGoal: <K extends keyof M & string>(name: K, props: z.infer<M[K]>) => TrackOutcome
  /** Record an outbound-link click — dropped unless consent allows it. */
  trackOutbound: (url: string) => TrackOutcome
  /** Record a file download — dropped unless consent allows it. */
  trackDownload: (url: string) => TrackOutcome
}

const BLOCKED: TrackOutcome = { status: 'blocked', reason: 'no-consent' }

export function createWebTracker<M extends GoalSchemaMap>(
  options: WebTrackerOptions<M>,
): WebTracker<M> {
  const { sink, goals, consent, config, onInvalidGoal } = options

  function allowed(): boolean {
    return isTrackingAllowed(consent(), config.consentMode)
  }

  function pageview(url: string, referrer?: string): TrackOutcome {
    if (!allowed()) return BLOCKED
    sink.pageview(url, referrer)
    return { status: 'tracked' }
  }

  function trackGoal<K extends keyof M & string>(name: K, props: z.infer<M[K]>): TrackOutcome {
    const validation = goals.validate(name, props)
    if ('issues' in validation) {
      onInvalidGoal?.(name, validation.issues)
      return { status: 'invalid', issues: validation.issues }
    }
    if (!allowed()) return BLOCKED
    sink.goal(name, validation.data as Record<string, unknown>)
    return { status: 'tracked' }
  }

  function trackOutbound(url: string): TrackOutcome {
    if (!allowed()) return BLOCKED
    sink.outbound(url)
    return { status: 'tracked' }
  }

  function trackDownload(url: string): TrackOutcome {
    if (!allowed()) return BLOCKED
    sink.download(url)
    return { status: 'tracked' }
  }

  return { pageview, trackGoal, trackOutbound, trackDownload }
}
