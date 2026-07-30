import { strict as assert } from 'node:assert'
import test from 'node:test'

import {
  getSubKitAccessSnapshot,
  getSubKitHasAccessSnapshot,
  resolveSubKitEntitlementAccess,
  subscribeSubKitAccess,
} from '../dist/index.js'

function createEntitlement(entitlementKey, active) {
  return {
    active,
    entitlementKey,
    expiresAt: null,
    planKey: 'monthly',
    productIdentifier: `${entitlementKey}_monthly`,
    source: 'apple',
    startsAt: '2026-07-01T00:00:00.000Z',
    status: active ? 'active' : 'expired',
    verifiedAt: '2026-07-01T00:00:00.000Z',
  }
}

function createCustomerInfo({ deviceAccess, entitlements = {}, freshness = 'fresh' } = {}) {
  return {
    accessContext: null,
    appId: 'app_123',
    appUserId: 'user_123',
    checkedAt: '2026-07-01T00:00:00.000Z',
    deviceAccess,
    entitlements,
    freshness,
    purchases: [],
    unclaimedPurchases: [],
  }
}

function createSnapshot({ customerInfo = null, error = null, state }) {
  return {
    clientConfigured: state !== 'unconfigured',
    customerInfo,
    error,
    lastRefreshAttemptAt: null,
    lastUpdatedAt: customerInfo == null ? null : 1,
    state,
    version: 1,
  }
}

test('exposes unconfigured and loading as lifecycle states without fake entitlement data', () => {
  assert.deepEqual(
    resolveSubKitEntitlementAccess(createSnapshot({ state: 'unconfigured' }), 'pro'),
    { state: 'unconfigured' },
  )
  assert.deepEqual(resolveSubKitEntitlementAccess(createSnapshot({ state: 'loading' }), 'pro'), {
    state: 'loading',
  })
})

test('exposes offline unavailable only when a network failure has no cached CustomerInfo', () => {
  const access = resolveSubKitEntitlementAccess(
    createSnapshot({ error: new Error('network offline'), state: 'error' }),
    'pro',
  )

  assert.deepEqual(access, { state: 'offline_unavailable' })
})

test('preserves non-network failures as typed error lifecycle state', () => {
  const error = new Error('schema invalid')
  const access = resolveSubKitEntitlementAccess(createSnapshot({ error, state: 'error' }), 'pro')

  assert.equal(access.state, 'error')
  assert.equal(access.error, error)
})

test('resolves cached offline CustomerInfo as a regular decision with offline evidence', () => {
  const access = resolveSubKitEntitlementAccess(
    createSnapshot({
      customerInfo: createCustomerInfo({
        entitlements: { pro: createEntitlement('pro', true) },
        freshness: 'offline',
      }),
      error: new Error('offline'),
      state: 'offline',
    }),
    'pro',
  )

  assert.equal(access.state, 'granted')
  assert.equal(access.evidence.freshness, 'offline')
})

test('does not grant pro when device metadata says some other entitlement is commercial', () => {
  const access = resolveSubKitEntitlementAccess(
    createSnapshot({
      customerInfo: createCustomerInfo({
        deviceAccess: {
          accessExpiresAt: null,
          activation: null,
          blockedReason: null,
          commerciallyActive: true,
        },
        entitlements: { premium: createEntitlement('premium', true) },
      }),
      state: 'ready',
    }),
    'pro',
  )

  assert.equal(access.state, 'missing')
})

test('global access snapshots fail closed before SubKit is configured', () => {
  assert.deepEqual(getSubKitAccessSnapshot('pro'), { state: 'unconfigured' })
  assert.equal(getSubKitHasAccessSnapshot('pro'), false)
})

test('access subscriptions bind listeners to one entitlement decision', () => {
  let calls = 0
  const unsubscribe = subscribeSubKitAccess('pro', (access) => {
    calls += 1
    assert.equal(access.state, 'unconfigured')
  })

  assert.equal(typeof unsubscribe, 'function')
  assert.equal(calls, 0)
  unsubscribe()
})

test('rejects an empty entitlement key', () => {
  assert.throws(
    () => resolveSubKitEntitlementAccess(createSnapshot({ state: 'loading' }), '  '),
    /entitlement key is required/,
  )
})
