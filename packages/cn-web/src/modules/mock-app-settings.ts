// In-memory mock of the app-settings seams so the module is fully interactive in the web showcase
// without any OS service or persistence backend. The Engine is storage-agnostic (a string-in/
// string-out SettingsStorage seam) and the push priming injects the OS permission request; here we
// supply an in-memory store and a fake OS dialog that grants after a short, deterministic delay,
// plus a deterministic host config. Mirrors the native mock so both showcases tell the same story.
import { type AppSettingsConfig, parseAppSettingsConfig } from '@/lib/app-settings'
import {
  type OsPermission,
  type SettingsStorage,
  inMemorySettingsStorage,
} from '@/lib/app-settings'

/** Human display names for the seeded supported locales (BCP-47 -> label). */
export const DEMO_LOCALE_LABELS: Record<string, string> = {
  de: 'Deutsch',
  en: 'English',
  fr: 'Français',
}

/** The device locale the demo reports, so an unpinned locale resolves to a concrete supported one. */
export const DEMO_DEVICE_LOCALE = 'de-DE'

/** Deterministic host config: 3 locales, system theme / default size, 4 push topics, priming on. */
export const DEMO_APP_SETTINGS_CONFIG: AppSettingsConfig = (() => {
  const parsed = parseAppSettingsConfig({
    supportedLocales: ['de', 'en', 'fr'],
    defaultTheme: 'system',
    defaultTextSize: 'default',
    pushTopics: [
      { id: 'news', label: 'Neuigkeiten', defaultSubscribed: true },
      { id: 'events', label: 'Veranstaltungen', defaultSubscribed: true },
      { id: 'offers', label: 'Angebote', defaultSubscribed: false },
      { id: 'product', label: 'Produkt-Updates', defaultSubscribed: false },
    ],
    priming: { enabled: true, maxPrompts: 2 },
  })
  if (!parsed.success) throw new Error('demo app-settings config invalid')
  return parsed.data
})()

/** A fresh in-memory storage seam (the on-device MMKV stand-in), empty so the demo starts at defaults. */
export const createMockSettingsStorage = (): SettingsStorage => inMemorySettingsStorage()

/** The injected OS permission requester. The real app calls expo-notifications; the demo settles to
 *  the given outcome after a short, deterministic delay so the soft-ask -> OS dialog flow is visible. */
export function createMockOsPermissionRequester(outcome: OsPermission = 'granted') {
  return () => new Promise<OsPermission>((resolve) => setTimeout(() => resolve(outcome), 150))
}
