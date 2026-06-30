// Pure color-scheme resolution — the `system`/`light`/`dark` preference collapsed against the live
// OS scheme. This is the testable core of two acceptance criteria: a forced light/dark choice is
// honoured regardless of the OS, while `system` follows (and tracks changes to) the device scheme.
import type { Scheme } from './preset'

/** The user-facing preference: an explicit scheme, or `system` (follow the device). */
export type ColorSchemePreference = 'system' | 'light' | 'dark'

export const COLOR_SCHEME_PREFERENCES: readonly ColorSchemePreference[] = [
  'system',
  'light',
  'dark',
] as const

export function isColorSchemePreference(value: unknown): value is ColorSchemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

/**
 * Resolve the preference + the OS scheme into the concrete scheme to render.
 *
 * - `light` / `dark` → that scheme, independent of the OS (an explicit choice is fixed).
 * - `system` → the device scheme; when the OS reports nothing yet, default to `light`.
 *
 * Because the resolver reads `systemScheme` on every call, a `system` preference re-resolves the
 * moment the OS scheme changes (the Shell subscribes to the OS scheme and re-renders).
 */
export function resolveScheme(
  preference: ColorSchemePreference,
  systemScheme: Scheme | null | undefined,
): Scheme {
  if (preference === 'light' || preference === 'dark') return preference
  return systemScheme === 'dark' ? 'dark' : 'light'
}

/** Whether a `system`-preference UI should re-track the OS scheme (vs. a fixed light/dark choice). */
export function followsSystem(preference: ColorSchemePreference): boolean {
  return preference === 'system'
}
