import type {
  CustomerEntitlement,
  CustomerInfo,
  CustomerInfoFreshness,
  DeviceActivationSummary,
  DeviceBlockedReason,
} from './types.js'

export type ActiveCustomerEntitlement = Omit<CustomerEntitlement, 'active'> & {
  active: true
}

export type InactiveCustomerEntitlement = Omit<CustomerEntitlement, 'active'> & {
  active: false
}

export interface EntitlementAccessEvidence {
  checkedAt: string
  freshness: CustomerInfoFreshness
}

export type EntitlementAccessDecision =
  | {
      entitlement: ActiveCustomerEntitlement
      evidence: EntitlementAccessEvidence
      state: 'granted'
    }
  | {
      entitlement: null
      evidence: EntitlementAccessEvidence
      state: 'missing'
    }
  | {
      entitlement: InactiveCustomerEntitlement
      evidence: EntitlementAccessEvidence
      state: 'inactive'
    }
  | {
      accessExpiresAt: string | null
      activation: DeviceActivationSummary | null
      entitlement: ActiveCustomerEntitlement
      evidence: EntitlementAccessEvidence
      reason: DeviceBlockedReason
      state: 'device_blocked'
    }

export type GrantedEntitlementAccess = Extract<EntitlementAccessDecision, { state: 'granted' }>

export function resolveEntitlementAccess(
  customerInfo: CustomerInfo,
  entitlementKey: string,
): EntitlementAccessDecision {
  if (entitlementKey.trim() === '') {
    throw new Error('SubKit entitlement key is required')
  }
  const evidence = {
    checkedAt: customerInfo.checkedAt,
    freshness: customerInfo.freshness,
  }
  const entitlement = customerInfo.entitlements[entitlementKey]

  if (entitlement == null) {
    return { entitlement: null, evidence, state: 'missing' }
  }

  if (!entitlement.active) {
    return {
      entitlement: { ...entitlement, active: false },
      evidence,
      state: 'inactive',
    }
  }

  const blockedReason = customerInfo.deviceAccess?.blockedReason
  if (blockedReason != null) {
    return {
      accessExpiresAt: customerInfo.deviceAccess?.accessExpiresAt ?? null,
      activation: customerInfo.deviceAccess?.activation ?? null,
      entitlement: { ...entitlement, active: true },
      evidence,
      reason: blockedReason,
      state: 'device_blocked',
    }
  }

  return {
    entitlement: { ...entitlement, active: true },
    evidence,
    state: 'granted',
  }
}

export function isEntitlementAccessGranted(
  access: EntitlementAccessDecision,
): access is GrantedEntitlementAccess {
  return access.state === 'granted'
}
