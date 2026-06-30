import { z } from 'zod'

// The `analytics-posthog` module config — provider keys/hosts and the cross-cutting analytics knobs.
// Keys are supplied by the host per environment; `<x>ConfigRights` declares who may edit each path
// (piparo = platform-owned defaults, customer = per-app/tenant-owned).

export const PostHogConfig = z.strictObject({
  /** Project API key (write-only ingest key). Empty disables PostHog (no-op sink). */
  apiKey: z.string().default(''),
  /** Ingest host. EU residency default per piparo.party. */
  host: z.string().url().default('https://eu.i.posthog.com'),
  /** Whether the SDK may capture lifecycle/app events automatically (still consent-gated). */
  captureAppLifecycle: z.boolean().default(true),
  /**
   * Session Replay availability at the SDK level. Even when true it ONLY runs after the separate,
   * identified-tier Session-Replay consent (capability: DSGVO-critical, never under anonymous).
   */
  sessionReplayEnabled: z.boolean().default(false),
})
export type PostHogConfig = z.infer<typeof PostHogConfig>

export const SentryConfig = z.strictObject({
  /** Sentry DSN. Empty disables Sentry (no-op sink). */
  dsn: z.string().default(''),
  /** Logical environment tag attached to every event (e.g. production, staging). */
  environment: z.string().default('production'),
  /** Release identifier (e.g. `app@1.2.3+45`) attached so issues carry release+version info. */
  release: z.string().default(''),
  /** App version string attached as a tag for fast filtering. */
  appVersion: z.string().default(''),
  /** Performance trace sample rate [0..1]. */
  tracesSampleRate: z.number().min(0).max(1).default(0),
})
export type SentryConfig = z.infer<typeof SentryConfig>

export const AnalyticsConfig = z.strictObject({
  posthog: PostHogConfig.default(() => PostHogConfig.parse({})),
  sentry: SentryConfig.default(() => SentryConfig.parse({})),
})
export type AnalyticsConfig = z.infer<typeof AnalyticsConfig>

export type EditableBy = 'piparo' | 'customer'

/** Every config path mapped to its owner (piparo platform default vs customer/tenant). */
export const analyticsConfigRights: Record<string, EditableBy> = {
  'posthog.apiKey': 'customer',
  'posthog.host': 'piparo',
  'posthog.captureAppLifecycle': 'piparo',
  'posthog.sessionReplayEnabled': 'piparo',
  'sentry.dsn': 'customer',
  'sentry.environment': 'customer',
  'sentry.release': 'customer',
  'sentry.appVersion': 'customer',
  'sentry.tracesSampleRate': 'piparo',
}

export function parseAnalyticsConfig(input: unknown) {
  return AnalyticsConfig.safeParse(input)
}
