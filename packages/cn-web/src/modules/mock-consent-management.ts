// In-memory mock of the consent-management seam so the module is fully interactive in the showcase
// without any storage, cookie or SDK. The Engine normally injects a synchronous KV store (cookie /
// localStorage on web, MMKV on mobile) and a gate manager whose registered SDKs are real trackers;
// here both are replaced with deterministic, offline doubles so the demo stays self-contained.
//
// Seeded: an EMPTY store (no decision yet, so the banner shows undecided) and three gated demo "SDKs"
// matching the native showcase, so both surfaces tell the same story: `posthog` (statistics), `sentry`
// (statistics) and `meta-pixel` (marketing). The gate manager reconciles them against the live
// decision so the demo can show, without a reload, which trackers a given consent choice activates.
import {
  type ConsentGate,
  type ConsentGateManager,
  type ConsentStorage,
  type ConsentStore,
  type ConsentStoreOptions,
  createConsentStore,
  createGateManager,
} from '@/lib/consent-management'

/** A deterministic in-memory `ConsentStorage` (stands in for cookie / localStorage / MMKV). */
export function createMemoryStorage(seed: Record<string, string> = {}): ConsentStorage {
  const map = new Map<string, string>(Object.entries(seed))
  return {
    getString: (key) => map.get(key),
    set: (key, value) => {
      map.set(key, value)
    },
    delete: (key) => {
      map.delete(key)
    },
  }
}

/** The same `createConsentStore` Engine, but always over an offline in-memory KV. */
export function createMockConsentStore(
  options: Omit<ConsentStoreOptions, 'storage'>,
): ConsentStore {
  return createConsentStore({ ...options, storage: createMemoryStorage() })
}

/** A demo SDK the gate reconciles against the live consent decision. */
export type DemoSdk = {
  id: string
  label: string
  vendor: string
  purpose: string
  requires: ConsentGate['requires']
  needsAppTracking: boolean
}

export const DEMO_SDKS: readonly DemoSdk[] = [
  {
    id: 'posthog',
    label: 'PostHog',
    vendor: 'First-party analytics',
    purpose: 'Product analytics, anonymous usage events',
    requires: 'statistics',
    needsAppTracking: false,
  },
  {
    id: 'sentry',
    label: 'Sentry',
    vendor: 'First-party monitoring',
    purpose: 'Error and performance monitoring',
    requires: 'statistics',
    needsAppTracking: false,
  },
  {
    id: 'meta-pixel',
    label: 'Meta Pixel',
    vendor: 'Third-party advertising',
    purpose: 'Ad attribution, carries a personal identifier',
    requires: 'marketing',
    needsAppTracking: true,
  },
]

/** A gate manager pre-registered with the demo SDKs (no real init — pure activation flags). */
export function createMockGateManager(): ConsentGateManager {
  const gate = createGateManager()
  for (const sdk of DEMO_SDKS) {
    gate.register({
      id: sdk.id,
      requires: sdk.requires,
      needsAppTracking: sdk.needsAppTracking,
      activate: () => undefined,
    })
  }
  return gate
}
