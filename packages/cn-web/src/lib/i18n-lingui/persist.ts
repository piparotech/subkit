// The persistence seam — pure, storage-agnostic (de)serialization + migration of the locale choice.
// This is the executable core of "a chosen language survives an app restart / page reload": the Shell
// wires a real key-value store (zustand + MMKV on native, localStorage on web) to this seam, but the
// round-trip and the versioned migration are testable here without any platform storage.
import { isSupportedLocale } from './locales'

/** The persisted preference shape. */
export type LocalePreference = {
  /** `null` = no explicit choice yet (follow device detection / fallback). */
  locale: string | null
}

/** Bump on every shape change; `migrateLocalePreference` brings older payloads forward. */
export const LOCALE_PREFERENCE_VERSION = 1 as const

export function defaultLocalePreference(): LocalePreference {
  return { locale: null }
}

/**
 * Coerce an unknown persisted payload of any past version into the current shape, keeping the stored
 * locale only when it is still one of the supported locales — a locale dropped from a later release
 * silently reverts to "no choice" rather than activating a catalog that no longer ships.
 */
export function migrateLocalePreference(
  persisted: unknown,
  supported: readonly string[],
): LocalePreference {
  if (typeof persisted !== 'object' || persisted === null) return defaultLocalePreference()
  const record = persisted as Record<string, unknown>
  const locale = record.locale
  if (typeof locale === 'string' && isSupportedLocale(locale, supported)) return { locale }
  return defaultLocalePreference()
}

/** A minimal synchronous key-value store — what the Shell adapts MMKV / localStorage onto. */
export type PreferenceStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

type Envelope = { version: number; state: LocalePreference }

/**
 * Read + migrate the preference from a storage. Returns the default ("no choice") when the key is
 * absent or the stored JSON is unparseable — startup is always safe.
 */
export function loadLocalePreference(
  storage: PreferenceStorage,
  key: string,
  supported: readonly string[],
): LocalePreference {
  const raw = storage.getItem(key)
  if (raw === null) return defaultLocalePreference()
  try {
    const parsed = JSON.parse(raw) as Partial<Envelope>
    return migrateLocalePreference(parsed?.state, supported)
  } catch {
    return defaultLocalePreference()
  }
}

/** Persist the preference under the current version envelope. */
export function saveLocalePreference(
  storage: PreferenceStorage,
  key: string,
  state: LocalePreference,
): void {
  const envelope: Envelope = { version: LOCALE_PREFERENCE_VERSION, state }
  storage.setItem(key, JSON.stringify(envelope))
}
