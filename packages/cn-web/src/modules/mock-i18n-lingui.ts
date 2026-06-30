// In-memory seam for the i18n-lingui Engine: a deterministic locale registry, compiled message
// catalogs per locale (deliberately partial so the source-text fallback is observable), and the
// storage-agnostic persistence port wired to an in-process key-value map (standing in for the web
// `localStorage` / native MMKV the host would adapt). The real, unchanged Engine runs on top — locale
// negotiation, the source-text fallback resolver, and the versioned load/save. Seeded data mirrors the
// piparo Mobile standard (source locale `de`, shipped `de`/`en`, plus a partly-translated `pt-BR` and
// the RTL `ar` to exercise direction handling) so both showcases tell one story.
import type { LocaleDescriptor, Messages, PreferenceStorage } from '@/lib/i18n-lingui'

/** The key the demo persists its choice under (the module's default `persistKey`). */
export const MOCK_PERSIST_KEY = 'i18n-lingui'

/** The locale the catalogs are authored in: every other locale falls back to these strings. */
export const SOURCE_LOCALE = 'de'

/** The locale shown when neither a stored choice nor a device preference matches. */
export const FALLBACK_LOCALE = 'de'

/** The locales this demo app ships, in picker order. */
export const SUPPORTED_LOCALES: readonly LocaleDescriptor[] = [
  { code: 'de', nativeName: 'Deutsch' },
  { code: 'en', nativeName: 'English' },
  { code: 'pt-BR', nativeName: 'Português (Brasil)' },
  { code: 'ar', nativeName: 'العربية', rtl: true },
]

export const SUPPORTED_CODES: readonly string[] = SUPPORTED_LOCALES.map((l) => l.code)

/** The message ids rendered by the preview surface, in display order, with a label per id. */
export const MESSAGE_IDS = [
  { id: 'nav.greeting', label: 'Greeting' },
  { id: 'nav.dashboard', label: 'Dashboard link' },
  { id: 'action.save', label: 'Primary action' },
  { id: 'action.cancel', label: 'Secondary action' },
  { id: 'status.synced', label: 'Status line' },
] as const

export type MessageId = (typeof MESSAGE_IDS)[number]['id']

/**
 * Compiled catalogs per locale. `de` is complete (the source of truth). `en` is complete. `pt-BR` is
 * intentionally PARTIAL — two ids carry an empty string, the exact shape a compiled Lingui catalog
 * ships for an untranslated entry. `ar` is partial too and right-to-left. The Engine's resolver turns
 * every empty entry into the German source text rather than the raw id, which the demo makes visible.
 */
export const CATALOGS: Record<string, Messages> = {
  de: {
    'nav.greeting': 'Willkommen zurück',
    'nav.dashboard': 'Übersicht',
    'action.save': 'Speichern',
    'action.cancel': 'Abbrechen',
    'status.synced': 'Alle Änderungen gespeichert',
  },
  en: {
    'nav.greeting': 'Welcome back',
    'nav.dashboard': 'Overview',
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'status.synced': 'All changes saved',
  },
  'pt-BR': {
    'nav.greeting': 'Bem-vindo de volta',
    'nav.dashboard': 'Visão geral',
    'action.save': 'Salvar',
    'action.cancel': '',
    'status.synced': '',
  },
  ar: {
    'nav.greeting': 'مرحبًا بعودتك',
    'nav.dashboard': 'نظرة عامة',
    'action.save': 'حفظ',
    'action.cancel': 'إلغاء',
    'status.synced': '',
  },
}

/** The source-locale catalog the fallback resolver consults for any empty target entry. */
export const SOURCE_CATALOG: Messages = CATALOGS[SOURCE_LOCALE]

/**
 * A synchronous in-memory `PreferenceStorage` — the exact port the Engine's load/save seam expects.
 * Seedable so a story can simulate "a returning visitor whose chosen language survived a reload".
 */
export function createMockPreferenceStorage(seed?: Record<string, string>): PreferenceStorage {
  const map = new Map<string, string>(Object.entries(seed ?? {}))
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  }
}

/** A returning visitor whose previous choice (`pt-BR`) the Engine reads back on first render. */
export const RETURNING_VISITOR = JSON.stringify({
  version: 1,
  state: { locale: 'pt-BR' },
})

/** A simulated device-preference list (as `navigator.languages` / expo-localization would report). */
export const DEVICE_PREFERENCES = ['fr-FR', 'pt-PT', 'en-GB'] as const
