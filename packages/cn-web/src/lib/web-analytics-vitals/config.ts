import { z } from 'zod'

// The `web-analytics-vitals` module config — privacy-first WEB analytics (Plausible and/or PostHog-js)
// for a marketing/SEO site. Distinct from `analytics-posthog` (in-app product events): different
// audience, different tooling, its own consent shape. Keys/domains are supplied by the host per
// environment; `webAnalyticsConfigRights` declares who may edit each path (piparo = platform-owned
// defaults, customer = per-site/tenant-owned).

export const PlausibleConfig = z.strictObject({
  /** The site domain registered in Plausible (e.g. `piparo.tech`). Empty disables the Plausible sink. */
  domain: z.string().default(''),
  /** Plausible API/script host. EU-hosted, cookieless default. */
  apiHost: z.string().url().default('https://plausible.io'),
  /** Auto-track outbound link clicks (Plausible `outbound-links` extension). */
  trackOutboundLinks: z.boolean().default(true),
  /** Auto-track file downloads (Plausible `file-downloads` extension). */
  trackFileDownloads: z.boolean().default(true),
})
export type PlausibleConfig = z.infer<typeof PlausibleConfig>

export const PosthogWebConfig = z.strictObject({
  /** Project API key (write-only ingest key). Empty disables the PostHog-js sink. */
  apiKey: z.string().default(''),
  /** Ingest host. EU residency default. */
  apiHost: z.string().url().default('https://eu.i.posthog.com'),
  /**
   * `person_profiles` mode. `identified_only` keeps anonymous visitors profile-free (privacy-first,
   * matches the `website` reference); `always` creates a profile per visitor.
   */
  personProfiles: z.enum(['identified_only', 'always']).default('identified_only'),
})
export type PosthogWebConfig = z.infer<typeof PosthogWebConfig>

export const WebAnalyticsConfig = z.strictObject({
  /**
   * Load analytics scripts ONLY in production (capability AC: "produktions-only laden"). When false
   * the loader stays inert regardless of consent, so dev/preview never pollutes the dashboards.
   */
  productionOnly: z.boolean().default(true),
  /**
   * Consent strategy. `opt-in` (DSGVO default) sends nothing until consent is granted; `opt-out`
   * tracks by default until the visitor declines (only lawful where the chosen tooling is cookieless).
   */
  consentMode: z.enum(['opt-in', 'opt-out']).default('opt-in'),
  plausible: PlausibleConfig.default(() => PlausibleConfig.parse({})),
  posthog: PosthogWebConfig.default(() => PosthogWebConfig.parse({})),
})
export type WebAnalyticsConfig = z.infer<typeof WebAnalyticsConfig>

export type EditableBy = 'piparo' | 'customer'

/** Every config path mapped to its owner (piparo platform default vs customer/site-owned). */
export const webAnalyticsConfigRights: Record<string, EditableBy> = {
  productionOnly: 'piparo',
  consentMode: 'customer',
  'plausible.domain': 'customer',
  'plausible.apiHost': 'piparo',
  'plausible.trackOutboundLinks': 'customer',
  'plausible.trackFileDownloads': 'customer',
  'posthog.apiKey': 'customer',
  'posthog.apiHost': 'piparo',
  'posthog.personProfiles': 'piparo',
}

export function parseWebAnalyticsConfig(input: unknown) {
  return WebAnalyticsConfig.safeParse(input)
}
