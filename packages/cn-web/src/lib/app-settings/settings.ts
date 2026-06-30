import { z } from 'zod'

import { type AppSettingsConfig, TextSize, ThemePreference } from './config'
import { type SettingsStorage } from './storage'

/**
 * The on-device app settings: language, theme, text size — persisted via the storage seam, applied
 * immediately, surviving restart, with NO account. The persisted blob is versioned so the shape can
 * evolve (the piparo.party settingsStore v0→vN migration pattern): unknown/old blobs are migrated up
 * or dropped to defaults, never crash the app. Kept migratable to a future account on login.
 */

export const SETTINGS_STORAGE_KEY = 'piparo.app-settings.v1'
export const SETTINGS_SCHEMA_VERSION = 1

/** Persisted shape. `locale: null` => follow the device locale (resolved at read time). */
export const PersistedSettings = z.strictObject({
  version: z.literal(SETTINGS_SCHEMA_VERSION),
  locale: z.string().min(2).nullable(),
  theme: ThemePreference,
  textSize: TextSize,
})
export type PersistedSettings = z.infer<typeof PersistedSettings>

/** The resolved, ready-to-apply settings the UI consumes (locale always concrete). */
export type AppSettings = {
  /** Effective BCP-47 locale (device locale resolved into a supported one). */
  locale: string
  /** Whether the user pinned a locale (true) or follows the device (false). */
  localePinned: boolean
  theme: ThemePreference
  textSize: TextSize
}

function defaults(config: AppSettingsConfig): PersistedSettings {
  return {
    version: SETTINGS_SCHEMA_VERSION,
    locale: null,
    theme: config.defaultTheme,
    textSize: config.defaultTextSize,
  }
}

/** Pick the supported locale that best matches the device locale (exact, then language, then [0]). */
export function resolveLocale(deviceLocale: string, supported: readonly string[]): string {
  const fallback = supported[0] ?? deviceLocale
  const want = deviceLocale.toLowerCase()
  const exact = supported.find((l) => l.toLowerCase() === want)
  if (exact) return exact
  const lang = want.split('-')[0]
  const byLang = supported.find((l) => l.toLowerCase().split('-')[0] === lang)
  return byLang ?? fallback
}

/**
 * Migrate any previously persisted blob (any version, or garbage) into the current shape. Returns
 * defaults when the input is missing/unparseable, so a corrupt store can never brick settings.
 */
export function migrateSettings(raw: unknown, config: AppSettingsConfig): PersistedSettings {
  if (raw == null || typeof raw !== 'object') return defaults(config)
  const current = PersistedSettings.safeParse(raw)
  if (current.success) return current.data

  // Best-effort field salvage from legacy / partial blobs.
  const obj = raw as Record<string, unknown>
  const out = defaults(config)
  if (typeof obj.locale === 'string' && obj.locale.length >= 2) out.locale = obj.locale
  const theme = ThemePreference.safeParse(obj.theme)
  if (theme.success) out.theme = theme.data
  const textSize = TextSize.safeParse(obj.textSize)
  if (textSize.success) out.textSize = textSize.data
  return out
}

function resolve(
  persisted: PersistedSettings,
  config: AppSettingsConfig,
  deviceLocale: string,
): AppSettings {
  const localePinned = persisted.locale != null
  const locale = localePinned
    ? resolveLocale(persisted.locale as string, config.supportedLocales)
    : resolveLocale(deviceLocale, config.supportedLocales)
  return { locale, localePinned, theme: persisted.theme, textSize: persisted.textSize }
}

export type SettingsStoreOptions = {
  config: AppSettingsConfig
  storage: SettingsStorage
  /** The device/system locale, e.g. from expo-localization. Used when no locale is pinned. */
  deviceLocale?: string
  key?: string
}

export type SettingsStore = {
  /** Read + resolve the current settings (migrates and re-persists a legacy blob on first read). */
  read(): AppSettings
  /** Pin an explicit locale (one of supportedLocales), or null to follow the device again. */
  setLocale(locale: string | null): AppSettings
  setTheme(theme: ThemePreference): AppSettings
  setTextSize(textSize: TextSize): AppSettings
  /** Reset to config defaults (e.g. on logout/migration handoff). */
  reset(): AppSettings
}

/**
 * The headless settings store. Pure aside from the injected storage + clock — the Shell hook wraps
 * it with React state. Every mutation persists synchronously, so a restart restores the last value.
 */
export function createSettingsStore(options: SettingsStoreOptions): SettingsStore {
  const { config, storage } = options
  const key = options.key ?? SETTINGS_STORAGE_KEY
  const deviceLocale = options.deviceLocale ?? config.supportedLocales[0] ?? 'en'

  function load(): PersistedSettings {
    const raw = storage.getString(key)
    let parsed: unknown
    if (raw != null) {
      try {
        parsed = JSON.parse(raw)
      } catch {
        parsed = undefined
      }
    }
    const migrated = migrateSettings(parsed, config)
    // Re-persist when the on-disk blob is absent or not already the current canonical shape.
    if (raw == null || JSON.stringify(migrated) !== raw) persist(migrated)
    return migrated
  }

  function persist(value: PersistedSettings): void {
    storage.set(key, JSON.stringify(value))
  }

  function mutate(patch: Partial<Omit<PersistedSettings, 'version'>>): AppSettings {
    const next: PersistedSettings = { ...load(), ...patch, version: SETTINGS_SCHEMA_VERSION }
    persist(next)
    return resolve(next, config, deviceLocale)
  }

  return {
    read: () => resolve(load(), config, deviceLocale),
    setLocale: (locale) => mutate({ locale }),
    setTheme: (theme) => mutate({ theme }),
    setTextSize: (textSize) => mutate({ textSize }),
    reset: () => {
      const fresh = defaults(config)
      persist(fresh)
      return resolve(fresh, config, deviceLocale)
    },
  }
}
