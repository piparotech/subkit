// Consent model — the single source of truth for what analytics may do, shared with the
// `consent-management` capability. Three mutually exclusive tiers plus an orthogonal, separately
// granted Session Replay flag (DSGVO-critical, never implied by a tier). All decisions here are PURE
// functions over a `ConsentState`, so they are unit-testable offline and identical on every platform.

/**
 * The mobile 3-tier consent ladder (see `consent-management`):
 * - `off`        — no analytics at all; nothing is sent.
 * - `anonymous`  — usage events allowed, but NO personal identifier (no `identify`, distinct id is
 *                  a rotating/device id, person properties stripped).
 * - `identified` — events plus an identified person (login `identify` allowed).
 */
export type ConsentTier = 'off' | 'anonymous' | 'identified'

export const CONSENT_TIERS: readonly ConsentTier[] = ['off', 'anonymous', 'identified']

export type ConsentState = {
  tier: ConsentTier
  /**
   * Session Replay is granted SEPARATELY and is only honored at the `identified` tier — it must never
   * run under anonymous tracking (capability note: DSGVO-critical). Defaults to false.
   */
  sessionReplay: boolean
}

export const DEFAULT_CONSENT: ConsentState = { tier: 'off', sessionReplay: false }

export function isConsentTier(value: unknown): value is ConsentTier {
  return value === 'off' || value === 'anonymous' || value === 'identified'
}

/** Normalize untrusted persisted/input state into a valid `ConsentState` (off-by-default, fail-safe). */
export function normalizeConsent(input: unknown): ConsentState {
  if (typeof input !== 'object' || input === null) return DEFAULT_CONSENT
  const record = input as Record<string, unknown>
  const tier = isConsentTier(record.tier) ? record.tier : 'off'
  const sessionReplay = record.sessionReplay === true
  // Session Replay can only stand at the `identified` tier; anything else collapses it (fail-safe).
  return { tier, sessionReplay: tier === 'identified' ? sessionReplay : false }
}

/** Any analytics capture at all requires at least `anonymous`. */
export function canCaptureEvents(state: ConsentState): boolean {
  return state.tier !== 'off'
}

/** A personal identifier (identify / person properties) requires the `identified` tier. */
export function canSendIdentifier(state: ConsentState): boolean {
  return state.tier === 'identified'
}

/** Session Replay requires the separate flag AND the identified tier — never under anonymous. */
export function canRecordSession(state: ConsentState): boolean {
  return state.tier === 'identified' && state.sessionReplay === true
}

export type ConsentSource = () => ConsentState
