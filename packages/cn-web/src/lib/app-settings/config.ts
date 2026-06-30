import { z } from 'zod'

/**
 * The `app-settings` module's `config.schema` — the on-device settings shell knobs. Everything here
 * is host policy (which preferences the app offers, which push topics exist, how priming behaves);
 * the per-user VALUES are persisted on-device by the store, never here.
 */

export const ThemePreference = z.enum(['light', 'dark', 'system'])
export type ThemePreference = z.infer<typeof ThemePreference>

export const TextSize = z.enum(['small', 'default', 'large', 'xlarge'])
export type TextSize = z.infer<typeof TextSize>

/** A push topic the user can subscribe to on-device (e.g. "news", "events"). */
export const PushTopic = z.strictObject({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9_-]*$/, 'topic id must be a slug (lowercase, digits, - _)'),
  label: z.string().min(1),
  /** Whether this topic is subscribed by default (opt-out) or off until chosen (opt-in). */
  defaultSubscribed: z.boolean().default(false),
})
export type PushTopic = z.infer<typeof PushTopic>

export const PrimingConfig = z.strictObject({
  /** Show the soft-ask before the system permission dialog (recommended). */
  enabled: z.boolean().default(true),
  /** How many times the soft-ask may be shown before we stop nagging. */
  maxPrompts: z.number().int().positive().default(2),
})
export type PrimingConfig = z.infer<typeof PrimingConfig>

export const AppSettingsConfig = z.strictObject({
  /** BCP-47 tags the app ships. The first is the fallback when the device locale is unsupported. */
  supportedLocales: z.array(z.string().min(2)).min(1).default(['de', 'en']),
  /** Theme preference offered out of the box. */
  defaultTheme: ThemePreference.default('system'),
  defaultTextSize: TextSize.default('default'),
  /** The catalogue of push topics the user can toggle on-device. Empty = no topic UI. */
  pushTopics: z.array(PushTopic).default([]),
  priming: PrimingConfig.default(() => PrimingConfig.parse({})),
})
export type AppSettingsConfig = z.infer<typeof AppSettingsConfig>

export type EditableBy = 'piparo' | 'customer'

/** Every config path mapped to who may edit it (ADR: piparo-locked vs customer-tunable). */
export const appSettingsConfigRights: Record<string, EditableBy> = {
  supportedLocales: 'piparo',
  defaultTheme: 'customer',
  defaultTextSize: 'customer',
  pushTopics: 'customer',
  'priming.enabled': 'customer',
  'priming.maxPrompts': 'piparo',
}

export function parseAppSettingsConfig(input: unknown) {
  return AppSettingsConfig.safeParse(input)
}
