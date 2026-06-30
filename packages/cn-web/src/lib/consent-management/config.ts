import { z } from 'zod'

// The `consent-management` module config — the consent SURFACE (mode, categories shown, retention,
// re-open placement, privacy-policy link). The runtime decision lives in storage, not here.
// `<x>ConfigRights` declares who may edit each path: piparo = platform-owned compliance defaults,
// customer = per-app/tenant copy and policy URL.

export const ConsentCategoryConfig = z.strictObject({
  /** Category id — must be one of the built-in categories the model gates on. */
  id: z.enum(['necessary', 'statistics', 'marketing']),
  /** Whether the user may toggle it. `necessary` is always locked on. */
  toggleable: z.boolean().default(true),
})
export type ConsentCategoryConfig = z.infer<typeof ConsentCategoryConfig>

/** Apple App Tracking Transparency surface (iOS only). Cross-app/IDFA tracking on Apple needs ATT in
 *  addition to consent; this controls whether/when the ATT system prompt is requested. */
export const AppTrackingConfig = z.strictObject({
  /** Request the iOS ATT prompt when the tracking category is granted. Turn off to never prompt. */
  enabled: z.boolean().default(true),
  /** Which granted category triggers the ATT prompt (the cross-app/IDFA category). */
  category: z.enum(['statistics', 'marketing']).default('marketing'),
  /** `NSUserTrackingUsageDescription` shown in the system ATT prompt (Info.plist; customer copy). */
  usageDescription: z
    .string()
    .min(1)
    .default(
      'Wir nutzen diese Erlaubnis, um Inhalte und Werbung relevanter zu machen und die App zu verbessern.',
    ),
})
export type AppTrackingConfig = z.infer<typeof AppTrackingConfig>

export const ConsentManagementConfig = z.strictObject({
  /** Which surface to present: web `category` banner or mobile `tier` sheet. */
  mode: z.enum(['category', 'tier']).default('category'),
  /** Surface/policy version — bumping it re-prompts users who decided under an older version. */
  version: z.number().int().positive().default(1),
  /** The persistence key (cookie name / MMKV key / localStorage key). */
  storageKey: z.string().min(1).default('piparo.consent'),
  /** Consent retention in days (web cookie lifetime; informational on mobile). */
  retentionDays: z.number().int().positive().default(180),
  /** Categories offered in `category` mode (ignored in `tier` mode). */
  categories: z
    .array(ConsentCategoryConfig)
    .default(() => [
      ConsentCategoryConfig.parse({ id: 'necessary', toggleable: false }),
      ConsentCategoryConfig.parse({ id: 'statistics' }),
      ConsentCategoryConfig.parse({ id: 'marketing' }),
    ]),
  /** Link to the privacy policy shown on the banner/sheet (capability AC: policy is linked). */
  privacyPolicyUrl: z.string().url().default('https://example.com/datenschutz'),
  /** Offer a persistent re-open entry (footer link / settings row) to change the decision later. */
  reopenEnabled: z.boolean().default(true),
  /** iOS App Tracking Transparency (Apple requires it for cross-app/IDFA tracking, in addition to consent). */
  appTracking: AppTrackingConfig.default(() => AppTrackingConfig.parse({})),
})
export type ConsentManagementConfig = z.infer<typeof ConsentManagementConfig>

export type EditableBy = 'piparo' | 'customer'

/** Every config path mapped to its owner (piparo platform default vs customer/tenant). */
export const consentManagementConfigRights: Record<string, EditableBy> = {
  mode: 'piparo',
  version: 'piparo',
  storageKey: 'piparo',
  retentionDays: 'piparo',
  categories: 'piparo',
  privacyPolicyUrl: 'customer',
  reopenEnabled: 'customer',
  appTracking: 'piparo',
}

export function parseConsentManagementConfig(input: unknown) {
  return ConsentManagementConfig.safeParse(input)
}
