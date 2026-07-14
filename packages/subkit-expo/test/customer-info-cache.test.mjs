import { strict as assert } from 'node:assert'
import test from 'node:test'

import {
  createCustomerInfoCacheStore,
  evaluateOfflineCustomerInfo,
} from '../dist/customerInfoCache.js'

function createCustomerInfo(entitlements) {
  return {
    accessContext: null,
    appId: 'app_123',
    appUserId: 'user_123',
    checkedAt: '2026-07-01T00:00:00.000Z',
    entitlements,
    freshness: 'fresh',
    purchases: [],
    unclaimedPurchases: [],
  }
}

function createEntitlement(overrides = {}) {
  return {
    active: true,
    entitlementKey: 'pro',
    expiresAt: '2026-07-03T00:00:00.000Z',
    planKey: 'monthly',
    productIdentifier: 'pro_monthly',
    source: 'apple',
    startsAt: '2026-07-01T00:00:00.000Z',
    status: 'active',
    verifiedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

function createStorage() {
  const values = new Map()
  return {
    async getItem(key) {
      return values.get(key) ?? null
    },
    async removeItem(key) {
      values.delete(key)
    },
    async setItem(key, value) {
      values.set(key, value)
    },
  }
}

test('cached active subscription remains available while stale but before expiry', async () => {
  const storage = createStorage()
  let now = Date.parse('2026-07-01T00:00:00.000Z')
  const cache = createCustomerInfoCacheStore({
    keyPrefix: 'subkit:test',
    now: () => now,
    policy: { customerInfoStaleAfterMs: 60_000 },
    storage,
  })
  await cache.write(createCustomerInfo({ pro: createEntitlement() }))

  now = Date.parse('2026-07-02T00:00:00.000Z')
  const cached = await cache.read('user_123')

  assert.equal(cached.freshness, 'stale')
  assert.equal(cached.entitlements.pro.active, true)
})

test('cached subscription is disabled after its known expiry', async () => {
  const storage = createStorage()
  let now = Date.parse('2026-07-01T00:00:00.000Z')
  const cache = createCustomerInfoCacheStore({
    keyPrefix: 'subkit:test',
    now: () => now,
    storage,
  })
  await cache.write(createCustomerInfo({ pro: createEntitlement() }))

  now = Date.parse('2026-07-04T00:00:00.000Z')
  const cached = await cache.read('user_123')

  assert.equal(cached.entitlements.pro.active, false)
  assert.equal(cached.entitlements.pro.status, 'expired')
})

test('expired Runtime access context is removed from cached CustomerInfo', () => {
  const info = {
    ...createCustomerInfo({}),
    accessContext: {
      expiresAt: '2026-07-01T00:15:00.000Z',
      token: 'sk_ctx_v1.test',
    },
  }

  const valid = evaluateOfflineCustomerInfo(info, {
    now: Date.parse('2026-07-01T00:10:00.000Z'),
  })
  const expired = evaluateOfflineCustomerInfo(info, {
    now: Date.parse('2026-07-01T00:15:00.001Z'),
  })

  assert.equal(valid.accessContext?.token, 'sk_ctx_v1.test')
  assert.equal(expired.accessContext, null)
})

test('non-expiring entitlement remains offline only within verified max age', () => {
  const info = createCustomerInfo({
    lifetime: createEntitlement({
      entitlementKey: 'lifetime',
      expiresAt: null,
      verifiedAt: '2026-07-01T00:00:00.000Z',
    }),
  })

  const withinMaxAge = evaluateOfflineCustomerInfo(info, {
    nonExpiringEntitlementMaxOfflineAgeMs: 30 * 24 * 60 * 60 * 1000,
    now: Date.parse('2026-07-30T00:00:00.000Z'),
  })
  const beyondMaxAge = evaluateOfflineCustomerInfo(info, {
    nonExpiringEntitlementMaxOfflineAgeMs: 30 * 24 * 60 * 60 * 1000,
    now: Date.parse('2026-08-01T00:00:00.001Z'),
  })

  assert.equal(withinMaxAge.freshness, 'offline')
  assert.equal(withinMaxAge.entitlements.lifetime.active, true)
  assert.equal(beyondMaxAge.entitlements.lifetime.active, false)
})
