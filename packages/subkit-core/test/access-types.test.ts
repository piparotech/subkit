import type {
  ActiveCustomerEntitlement,
  EntitlementAccessDecision,
  EntitlementAccessEvidence,
} from '../src/index.js'

declare const activeEntitlement: ActiveCustomerEntitlement
declare const evidence: EntitlementAccessEvidence

const granted: EntitlementAccessDecision = {
  entitlement: activeEntitlement,
  evidence,
  state: 'granted',
}

const blocked: EntitlementAccessDecision = {
  accessExpiresAt: null,
  activation: null,
  entitlement: activeEntitlement,
  evidence,
  reason: 'DEVICE_REPLACED',
  state: 'device_blocked',
}

const contradictoryGranted: EntitlementAccessDecision = {
  entitlement: activeEntitlement,
  evidence,
  // @ts-expect-error Granted access cannot carry a device-block reason.
  reason: 'DEVICE_REPLACED',
  state: 'granted',
}

// @ts-expect-error Device-blocked access requires a typed recovery reason.
const blockWithoutReason: EntitlementAccessDecision = {
  accessExpiresAt: null,
  activation: null,
  entitlement: activeEntitlement,
  evidence,
  state: 'device_blocked',
}

function readDecision(access: EntitlementAccessDecision): string {
  switch (access.state) {
    case 'granted':
      return access.entitlement.entitlementKey
    case 'missing':
      return access.state
    case 'inactive':
      return access.entitlement.status
    case 'device_blocked':
      return access.reason
  }
}

readDecision(granted)
readDecision(blocked)
readDecision(contradictoryGranted)
readDecision(blockWithoutReason)
