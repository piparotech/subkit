// The consent gate — the provider-neutral tag/script-gating substrate (capability AC: SDKs are not
// initialized and send no events while their category/tier has no consent; on grant they activate
// WITHOUT a reload; on revoke they are torn down). The host registers a named initializer per SDK
// bound to the category it needs; `apply(decision, appTracking)` reconciles the live set against the
// decision. Idempotent and pure of any real SDK — registered `activate` callbacks own the actual init.
//
// App-tracking SDKs (IDFA / cross-app — e.g. an ad pixel) additionally require Apple App Tracking
// Transparency on iOS: register them with `needsAppTracking: true` and they only activate when consent
// AND ATT are granted. Non-tracking SDKs ignore ATT entirely.
import { type AppTrackingStatus, isAppTrackingAllowed } from './app-tracking'
import { type ConsentCategory, type ConsentDecision, isCategoryGranted } from './model'

/** One gated SDK/tag. `activate` runs once on grant; the returned teardown runs on revoke. */
export type ConsentGate = {
  /** Stable id (e.g. `posthog`, `meta-pixel`) — used for idempotent reconciliation. */
  id: string
  /** The category/tier this SDK requires before it may initialize. */
  requires: ConsentCategory
  /**
   * iOS App Tracking Transparency requirement: set for SDKs that track across apps / use the IDFA
   * (ad pixels, attribution). When true the gate ALSO needs ATT `granted` (or `unavailable` on
   * non-iOS) — consent alone is not enough on Apple. Defaults to false (first-party SDKs).
   */
  needsAppTracking?: boolean
  /**
   * Called the first time consent for `requires` is granted. May initialize the SDK and start sending.
   * An optional teardown is returned/registered to undo it on revoke (stop the SDK, drop identifiers).
   */
  activate: () => void | (() => void)
}

export type GateStatus = {
  id: string
  requires: ConsentCategory
  needsAppTracking: boolean
  active: boolean
}

export type ConsentGateManager = {
  /** Register a gated SDK. Does NOT activate it — call `apply` with the current decision afterwards. */
  register: (gate: ConsentGate) => void
  /** Remove a gate (tears it down if active). */
  unregister: (id: string) => void
  /**
   * Reconcile every registered gate against `decision` (and the current iOS ATT status). Activates
   * granted-but-inactive gates and tears down revoked-but-active ones — including app-tracking gates
   * that lose ATT. Safe to call on every consent / ATT change (no reload). Returns what changed.
   * `appTracking` defaults to `unavailable` (non-iOS / not wired) so first-party gates are unaffected.
   */
  apply: (
    decision: ConsentDecision,
    appTracking?: AppTrackingStatus,
  ) => { activated: string[]; deactivated: string[] }
  /** Current activation status of every registered gate. */
  status: () => GateStatus[]
}

type Entry = {
  gate: ConsentGate
  active: boolean
  teardown?: () => void
}

export function createGateManager(): ConsentGateManager {
  const entries = new Map<string, Entry>()

  function deactivate(entry: Entry): void {
    if (!entry.active) return
    try {
      entry.teardown?.()
    } finally {
      entry.teardown = undefined
      entry.active = false
    }
  }

  function activate(entry: Entry): void {
    if (entry.active) return
    const teardown = entry.gate.activate()
    entry.teardown = typeof teardown === 'function' ? teardown : undefined
    entry.active = true
  }

  return {
    register(gate) {
      const existing = entries.get(gate.id)
      if (existing) deactivate(existing)
      entries.set(gate.id, { gate, active: false })
    },

    unregister(id) {
      const entry = entries.get(id)
      if (!entry) return
      deactivate(entry)
      entries.delete(id)
    },

    apply(decision, appTracking = 'unavailable') {
      const activated: string[] = []
      const deactivated: string[] = []
      for (const entry of entries.values()) {
        const consented = isCategoryGranted(decision, entry.gate.requires)
        const trackingOk = !entry.gate.needsAppTracking || isAppTrackingAllowed(appTracking)
        const granted = consented && trackingOk
        if (granted && !entry.active) {
          activate(entry)
          activated.push(entry.gate.id)
        } else if (!granted && entry.active) {
          deactivate(entry)
          deactivated.push(entry.gate.id)
        }
      }
      return { activated, deactivated }
    },

    status() {
      return [...entries.values()].map((entry) => ({
        id: entry.gate.id,
        requires: entry.gate.requires,
        needsAppTracking: entry.gate.needsAppTracking ?? false,
        active: entry.active,
      }))
    },
  }
}
