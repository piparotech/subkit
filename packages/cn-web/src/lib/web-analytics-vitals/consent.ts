// Web consent model — the single source of truth for whether web analytics may run. Unlike the
// mobile 3-tier ladder (`analytics-posthog`/`consent-management`), a privacy-first website uses a
// binary cookie-banner decision per purpose: `analytics` granted or not, plus the lifecycle status
// (`pending` until the visitor decides). All decisions here are PURE functions over a `WebConsentState`,
// so they are unit-testable offline and identical on server (no-op) and browser.
import type { WebAnalyticsConfig } from './config'

/**
 * Consent lifecycle for the analytics purpose:
 * - `pending`   — the visitor has not decided yet (banner showing). Under opt-in nothing runs.
 * - `granted`   — analytics is permitted; scripts may load and events may be sent.
 * - `denied`    — analytics is refused; scripts must be unloaded and nothing is sent (opt-out honored).
 */
export type ConsentStatus = 'pending' | 'granted' | 'denied'

export const CONSENT_STATUSES: readonly ConsentStatus[] = ['pending', 'granted', 'denied']

export type WebConsentState = {
  analytics: ConsentStatus
}

export const DEFAULT_CONSENT: WebConsentState = { analytics: 'pending' }

export function isConsentStatus(value: unknown): value is ConsentStatus {
  return value === 'pending' || value === 'granted' || value === 'denied'
}

/** Normalize untrusted persisted/input state into a valid `WebConsentState` (pending-by-default). */
export function normalizeConsent(input: unknown): WebConsentState {
  if (typeof input !== 'object' || input === null) return DEFAULT_CONSENT
  const record = input as Record<string, unknown>
  return { analytics: isConsentStatus(record.analytics) ? record.analytics : 'pending' }
}

/**
 * Whether analytics tracking is allowed right now, given the consent state AND the configured strategy.
 * - opt-in  → only when explicitly `granted`.
 * - opt-out → allowed while `pending` or `granted`; blocked only once `denied`.
 * This is the authoritative gate the loader and tracker both consult (capability AC: "Tracking erst
 * nach erteiltem Consent" / "bei Consent-Widerruf wieder entfernen (opt-out)").
 */
export function isTrackingAllowed(
  state: WebConsentState,
  mode: WebAnalyticsConfig['consentMode'],
): boolean {
  if (state.analytics === 'denied') return false
  if (mode === 'opt-out') return true
  return state.analytics === 'granted'
}

/** True once the visitor has made an explicit choice (banner may close). */
export function hasDecided(state: WebConsentState): boolean {
  return state.analytics !== 'pending'
}

export type ConsentSource = () => WebConsentState
