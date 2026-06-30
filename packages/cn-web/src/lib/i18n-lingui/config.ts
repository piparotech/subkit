import { z } from 'zod'

/**
 * The `i18n-lingui` module's `config.schema` — the cross-cutting i18n policy for a generated app. The
 * actual translated strings are app content (they live in the `.po` catalogs the Shell loads); this
 * config only carries the knobs that decide which locales exist, which is the source/fallback, and how
 * the locale is chosen and persisted. `catalogPath` mirrors the `lingui.config` so the catalog
 * location stays a single declared fact across the module + the host's extraction pipeline.
 */

const LocaleTag = z
  .string()
  .regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, 'must be a BCP-47 locale tag, e.g. de or pt-BR')

export const I18nLinguiConfig = z
  .strictObject({
    /** The locale messages are authored in — the fallback source of truth (piparo standard: `de`). */
    sourceLocale: LocaleTag.default('de'),
    /** All locales the app ships. Must include the source locale. */
    locales: z.array(LocaleTag).min(1).default(['de', 'en']),
    /** Locale shown when neither the device nor a stored choice matches a supported locale. */
    fallbackLocale: LocaleTag.default('de'),
    /** Negotiate the initial locale from the device's preferences before any stored choice. */
    detectDeviceLocale: z.boolean().default(true),
    /** Storage key under which the chosen locale is persisted (survives a restart). */
    persistKey: z.string().min(1).default('i18n-lingui'),
    /** Where compiled `.po`/`.mjs` catalogs live — mirrors `lingui.config` `catalogs[].path`. */
    catalogPath: z.string().min(1).default('i18n/locales/{locale}/messages'),
    /** Whether ESLint's `no-unlocalized-strings` is enforced (when ESLint is active in the host). */
    enforceLocalizedStrings: z.boolean().default(true),
  })
  .refine((cfg) => cfg.locales.includes(cfg.sourceLocale), {
    message: 'locales must include sourceLocale',
    path: ['locales'],
  })
  .refine((cfg) => cfg.locales.includes(cfg.fallbackLocale), {
    message: 'locales must include fallbackLocale',
    path: ['fallbackLocale'],
  })
export type I18nLinguiConfig = z.infer<typeof I18nLinguiConfig>

export type EditableBy = 'piparo' | 'customer'

/** Every config path mapped to who may edit it. */
export const i18nLinguiConfigRights: Record<keyof I18nLinguiConfig, EditableBy> = {
  sourceLocale: 'piparo',
  locales: 'customer',
  fallbackLocale: 'piparo',
  detectDeviceLocale: 'customer',
  persistKey: 'piparo',
  catalogPath: 'piparo',
  enforceLocalizedStrings: 'piparo',
}

export function parseI18nLinguiConfig(input: unknown) {
  return I18nLinguiConfig.safeParse(input)
}
