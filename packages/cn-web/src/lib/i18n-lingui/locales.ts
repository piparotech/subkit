// Pure locale registry + device-locale negotiation — the testable core of "which locale do we show".
// No Lingui, no React, no platform APIs: the Shell feeds in the device's preferred locales (from
// expo-localization / navigator.languages) and this resolves them against the app's supported set,
// falling back deterministically. A locale tag here is a BCP-47 base or region tag (e.g. `de`,
// `pt-BR`); matching is case-insensitive and tolerates `_`/`-` separators.

/** RTL scripts — used to flip layout direction for the resolved locale (ICU + RTL per the KB notes). */
const RTL_LANGUAGES: ReadonlySet<string> = new Set([
  'ar',
  'he',
  'fa',
  'ur',
  'ps',
  'dv',
  'ckb',
  'yi',
])

/** A supported locale and how it is presented in a language picker. */
export type LocaleDescriptor = {
  /** BCP-47 tag, e.g. `de`, `en`, `pt-BR`. */
  code: string
  /** Name in the locale's own language, for the picker (e.g. `Deutsch`, `English`). */
  nativeName: string
  /** Whether the locale's script is right-to-left. Defaults from the language subtag when omitted. */
  rtl?: boolean
}

/** Normalize a tag for comparison: lowercase, `_`→`-`, trimmed. */
export function normalizeLocale(tag: string): string {
  return tag.trim().toLowerCase().replace(/_/g, '-')
}

/** The primary language subtag of a tag (`pt-BR` → `pt`). */
export function languageSubtag(tag: string): string {
  const normalized = normalizeLocale(tag)
  const dash = normalized.indexOf('-')
  return dash === -1 ? normalized : normalized.slice(0, dash)
}

/** Whether the resolved locale renders right-to-left (explicit descriptor flag wins). */
export function isRtlLocale(locale: string, rtl?: boolean): boolean {
  if (typeof rtl === 'boolean') return rtl
  return RTL_LANGUAGES.has(languageSubtag(locale))
}

/** Whether `code` is one of the supported locales (exact tag match, case-insensitive). */
export function isSupportedLocale(code: string, supported: readonly string[]): boolean {
  const target = normalizeLocale(code)
  return supported.some((s) => normalizeLocale(s) === target)
}

/** Return the supported locale that matches `code`, preserving the registry's canonical casing. */
function matchSupported(code: string, supported: readonly string[]): string | undefined {
  const target = normalizeLocale(code)
  const exact = supported.find((s) => normalizeLocale(s) === target)
  if (exact) return exact
  // Fall back to a language-only match: `pt-PT` accepts a supported `pt`, and a device `pt` accepts a
  // supported `pt-BR` (first such region wins).
  const lang = languageSubtag(code)
  return supported.find((s) => languageSubtag(s) === lang)
}

/**
 * Negotiate the locale to activate at startup from the device's ordered preferences. The first
 * device preference with a supported (exact or language-level) match wins; if none match, fall back
 * to `fallbackLocale`. This is the executable core of "open the app in a sensible language" and is
 * the input the Shell hands to Lingui before the first render.
 */
export function pickInitialLocale(
  devicePreferences: readonly string[],
  supported: readonly string[],
  fallbackLocale: string,
): string {
  for (const preference of devicePreferences) {
    const match = matchSupported(preference, supported)
    if (match) return match
  }
  return fallbackLocale
}
