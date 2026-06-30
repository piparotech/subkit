import { z } from 'zod'

// The `feature-flags-experiments` module config — the PostHog flag-provider knobs plus the cross-cutting
// evaluation behaviour. Keys are supplied by the host per environment; `<x>ConfigRights` declares who
// may edit each path (piparo = platform-owned defaults, customer = per-app/tenant-owned). Flags share
// PostHog's project with analytics-posthog, so the API key lives there — this config only governs the
// flag-evaluation behaviour layered on top.

export const FeatureFlagsConfig = z.strictObject({
  /**
   * Whether to evaluate flags at all. When false the store serves declared defaults only (a hard
   * provider-off switch, e.g. for environments without a PostHog project).
   */
  enabled: z.boolean().default(true),
  /**
   * Whether the SDK may preload/poll remote flags. When false, flags resolve to their declared
   * defaults until an explicit `refresh()` — the offline-safe default-fallback path.
   */
  preloadRemote: z.boolean().default(true),
  /**
   * Re-fetch interval in milliseconds (0 disables polling). A short interval makes a kill-switch take
   * effect quickly at runtime without an app-store release.
   */
  refreshIntervalMs: z.number().int().min(0).default(60_000),
  /**
   * Allow local QA/debug overrides to pin flag values via the debug panel. Disable in production
   * builds so a shipped override cannot mask the real remote value.
   */
  allowLocalOverrides: z.boolean().default(false),
})
export type FeatureFlagsConfig = z.infer<typeof FeatureFlagsConfig>

export type EditableBy = 'piparo' | 'customer'

/** Every config path mapped to its owner (piparo platform default vs customer/tenant). */
export const featureFlagsConfigRights: Record<string, EditableBy> = {
  enabled: 'piparo',
  preloadRemote: 'piparo',
  refreshIntervalMs: 'piparo',
  allowLocalOverrides: 'customer',
}

export function parseFeatureFlagsConfig(input: unknown) {
  return FeatureFlagsConfig.safeParse(input)
}
