// Apple App Tracking Transparency (ATT) — the iOS device-level gate that, since iOS 14.5, must be
// granted IN ADDITION to GDPR/category consent before an app may track the user across apps/sites
// (the IDFA). Pure + platform-neutral: the Shell maps the native `expo-tracking-transparency` status
// onto this type and the consent gate composes it with consent. On non-iOS there is no ATT →
// `unavailable` (it never blocks; consent alone governs). No native import lives here — the Engine
// stays offline-testable and the host wires the real permission API via an injected adapter.

export type AppTrackingStatus =
  | 'unavailable' // not iOS / pre-14.5 — ATT does not apply
  | 'undetermined' // iOS, the system prompt has not been shown yet
  | 'denied' // the user declined
  | 'restricted' // blocked by MDM / parental controls — cannot be granted
  | 'granted' // the user allowed cross-app tracking

export const APP_TRACKING_STATUSES: readonly AppTrackingStatus[] = [
  'unavailable',
  'undetermined',
  'denied',
  'restricted',
  'granted',
]

/**
 * May an app-tracking (IDFA / cross-app) SDK run, as far as ATT is concerned? True only when ATT is
 * `granted`, or when ATT does not apply at all (`unavailable` — non-iOS, governed by consent alone).
 * `undetermined`/`denied`/`restricted` all block — the SDK must stay off until the user authorizes.
 */
export function isAppTrackingAllowed(status: AppTrackingStatus): boolean {
  return status === 'granted' || status === 'unavailable'
}

/** Whether the ATT prompt can still meaningfully be shown (only `undetermined` on iOS). */
export function canRequestAppTracking(status: AppTrackingStatus): boolean {
  return status === 'undetermined'
}

/**
 * Normalize the `expo-tracking-transparency` PermissionStatus (+ platform) into an `AppTrackingStatus`.
 * Non-iOS always maps to `unavailable`; an unknown/never-determined value maps to `undetermined` so the
 * host can prompt. Keeps the native-string mapping in one tested place.
 */
export function normalizeAppTrackingStatus(
  raw: string | null | undefined,
  isIOS: boolean,
): AppTrackingStatus {
  if (!isIOS) return 'unavailable'
  switch (raw) {
    case 'granted':
      return 'granted'
    case 'denied':
      return 'denied'
    case 'restricted':
      return 'restricted'
    case 'undetermined':
      return 'undetermined'
    default:
      return 'undetermined'
  }
}
