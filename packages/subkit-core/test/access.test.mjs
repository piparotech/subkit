import { strict as assert } from 'node:assert'
import test from 'node:test'

import { isEntitlementAccessGranted, resolveEntitlementAccess } from '../dist/index.js'

function createEntitlement(entitlementKey, active, status = active ? 'active' : 'expired') {
  return {
    active,
    entitlementKey,
    expiresAt: active ? '2026-08-01T00:00:00.000Z' : '2026-06-01T00:00:00.000Z',
    planKey: 'monthly',
    productIdentifier: `${entitlementKey}_monthly`,
    source: 'apple',
    startsAt: '2026-05-01T00:00:00.000Z',
    status,
    verifiedAt: '2026-07-01T00:00:00.000Z',
  }
}

function createCustomerInfo({ deviceAccess, entitlements = {}, freshness = 'fresh' } = {}) {
  return {
    accessContext: null,
    appId: 'app_123',
    appUserId: 'user_123',
    checkedAt: '2026-07-01T00:00:00.000Z',
    entitlements,
    deviceAccess,
    freshness,
    purchases: [],
    unclaimedPurchases: [],
  }
}

test('grants the requested active entitlement without a device block', () => {
  const access = resolveEntitlementAccess(
    createCustomerInfo({ entitlements: { pro: createEntitlement('pro', true) } }),
    'pro',
  )

  assert.equal(access.state, 'granted')
  assert.equal(access.entitlement.active, true)
  assert.equal(access.evidence.freshness, 'fresh')
  assert.equal(isEntitlementAccessGranted(access), true)
})

test('reports a missing requested entitlement', () => {
  const access = resolveEntitlementAccess(createCustomerInfo(), 'pro')

  assert.deepEqual(access, {
    entitlement: null,
    evidence: {
      checkedAt: '2026-07-01T00:00:00.000Z',
      freshness: 'fresh',
    },
    state: 'missing',
  })
  assert.equal(isEntitlementAccessGranted(access), false)
})

test('reports an inactive requested entitlement before considering device access', () => {
  const access = resolveEntitlementAccess(
    createCustomerInfo({
      deviceAccess: {
        accessExpiresAt: null,
        activation: null,
        blockedReason: 'DEVICE_REPLACED',
        commerciallyActive: true,
      },
      entitlements: { pro: createEntitlement('pro', false) },
    }),
    'pro',
  )

  assert.equal(access.state, 'inactive')
  assert.equal(access.entitlement.active, false)
})

test('reports device recovery only for an active requested entitlement', () => {
  const access = resolveEntitlementAccess(
    createCustomerInfo({
      deviceAccess: {
        accessExpiresAt: '2026-07-15T00:00:00.000Z',
        activation: null,
        blockedReason: 'DEVICE_CHANGE_LIMIT_REACHED',
        commerciallyActive: true,
      },
      entitlements: { pro: createEntitlement('pro', true) },
    }),
    'pro',
  )

  assert.equal(access.state, 'device_blocked')
  assert.equal(access.entitlement.active, true)
  assert.equal(access.reason, 'DEVICE_CHANGE_LIMIT_REACHED')
  assert.equal(access.accessExpiresAt, '2026-07-15T00:00:00.000Z')
})

test('does not grant the requested entitlement when only another entitlement is active', () => {
  const access = resolveEntitlementAccess(
    createCustomerInfo({
      deviceAccess: {
        accessExpiresAt: null,
        activation: null,
        blockedReason: null,
        commerciallyActive: true,
      },
      entitlements: { premium: createEntitlement('premium', true) },
    }),
    'pro',
  )

  assert.equal(access.state, 'missing')
  assert.equal(isEntitlementAccessGranted(access), false)
})

test('preserves valid offline evidence on a granted decision', () => {
  const access = resolveEntitlementAccess(
    createCustomerInfo({
      entitlements: { pro: createEntitlement('pro', true) },
      freshness: 'offline',
    }),
    'pro',
  )

  assert.equal(access.state, 'granted')
  assert.equal(access.evidence.freshness, 'offline')
})
