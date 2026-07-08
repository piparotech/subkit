import {
  type ScriptHost,
  type WebAnalyticsConfig,
  type WebTracker,
  defineGoals,
  parseWebAnalyticsConfig,
} from '@/lib/web-analytics-vitals'
import { z } from 'zod'

// In-memory seam for the web-analytics-vitals Engine demo. In production the host injects two sides
// the Engine drives: a `ScriptHost` (the real Plausible/PostHog <script> lifecycle) and a
// `WebAnalyticsSink` (the SDK ingest calls). Here both are inert fakes, so the demo exercises the
// consent and production gates end to end with no network and no SDK. The Shell reports outcomes
// from the tracker's `TrackOutcome` and the loader's `ScriptState`, so the fakes need no recording.

/** The seeded site config: piparo.tech, both providers wired, DSGVO opt-in, production-only. */
export const seededConfig: WebAnalyticsConfig = (() => {
  const result = parseWebAnalyticsConfig({
    productionOnly: true,
    consentMode: 'opt-in',
    plausible: { domain: 'piparo.tech' },
    posthog: { apiKey: 'phc_demo_seeded_key' },
  })
  if (!result.success) throw new Error('seeded web-analytics config is invalid')
  return result.data
})()

/** The site's conversion goals, each with a typed property schema (the typed-goal contract). */
const seededGoalSchemas = {
  'Signup completed': z.strictObject({ plan: z.enum(['free', 'pro']) }),
  'Contact form sent': z.strictObject({ topic: z.string().min(1) }),
  Newsletter: z.strictObject({}),
} as const

export const seededGoals = defineGoals(seededGoalSchemas)

export type SeededGoalName = (typeof seededGoals.names)[number]

/** The tracker type bound to the seeded goal registry, so goal calls stay type-checked per name. */
export type SeededTracker = WebTracker<typeof seededGoalSchemas>

/** A fake ScriptHost with a fixed production flag; load/unload are no-ops (no real <script>). */
export function createMemoryScriptHost(isProduction: boolean): ScriptHost {
  return { load() {}, unload() {}, isProduction: () => isProduction }
}
