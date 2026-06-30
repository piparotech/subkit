// The persistence seam — pure, storage-agnostic (de)serialization + migration of the theme
// preference. This is the executable core of "a previously made choice survives an app restart /
// page reload": the Shell wires a real key-value store (zustand + MMKV on native, localStorage on
// web) to this seam, but the round-trip and the versioned migration are tested here without any
// platform storage.
import { type ColorSchemePreference, isColorSchemePreference } from './scheme'

/** The persisted preference shape. `themeId` is the selected preset (omitted = the base preset). */
export type ThemePreferences = {
  colorScheme: ColorSchemePreference
  themeId: string
}

/** Bump on every shape change; `migrateThemePreferences` brings older payloads forward. */
export const THEME_PREFERENCES_VERSION = 1 as const

export function defaultThemePreferences(defaults?: Partial<ThemePreferences>): ThemePreferences {
  return {
    colorScheme: defaults?.colorScheme ?? 'system',
    themeId: defaults?.themeId ?? 'base',
  }
}

/**
 * Coerce an unknown persisted payload of any past version into the current shape. Unknown / missing
 * fields fall back to defaults so a corrupt or partial value never breaks startup (NFR-aligned).
 */
export function migrateThemePreferences(
  persisted: unknown,
  defaults?: Partial<ThemePreferences>,
): ThemePreferences {
  const base = defaultThemePreferences(defaults)
  if (typeof persisted !== 'object' || persisted === null) return base
  const record = persisted as Record<string, unknown>
  const colorScheme = isColorSchemePreference(record.colorScheme)
    ? record.colorScheme
    : base.colorScheme
  const themeId = typeof record.themeId === 'string' ? record.themeId : base.themeId
  return { colorScheme, themeId }
}

/** A minimal synchronous key-value store — what the Shell adapts MMKV / localStorage onto. */
export type PreferenceStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

type Envelope = { version: number; state: ThemePreferences }

/**
 * Read + migrate the preference from a storage. Returns the defaults when the key is absent or the
 * stored JSON is unparseable — startup is always safe.
 */
export function loadThemePreferences(
  storage: PreferenceStorage,
  key: string,
  defaults?: Partial<ThemePreferences>,
): ThemePreferences {
  const raw = storage.getItem(key)
  if (raw === null) return defaultThemePreferences(defaults)
  try {
    const parsed = JSON.parse(raw) as Partial<Envelope>
    return migrateThemePreferences(parsed?.state, defaults)
  } catch {
    return defaultThemePreferences(defaults)
  }
}

/** Persist the preference under the current version envelope. */
export function saveThemePreferences(
  storage: PreferenceStorage,
  key: string,
  state: ThemePreferences,
): void {
  const envelope: Envelope = { version: THEME_PREFERENCES_VERSION, state }
  storage.setItem(key, JSON.stringify(envelope))
}
