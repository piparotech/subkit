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
    values,
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

test('corrupt CustomerInfo is quarantined and removed from the active key', async () => {
  const storage = createStorage()
  const cache = createCustomerInfoCacheStore({ keyPrefix: 'test', storage })
  await cache.write(createCustomerInfo({}))
  const key = [...storage.values.keys()][0]
  assert.ok(key)
  await storage.setItem(key, '{not-json')

  assert.equal(await cache.read('user_123'), null)
  assert.equal(storage.values.has(key), false)
  assert.equal(storage.values.get(`${key}:corrupt`), '{not-json')
})

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

test('server-issued Device Access expiry disables cached offline entitlement', () => {
  const info = createCustomerInfo({ pro: createEntitlement({ expiresAt: null }) })
  info.deviceAccess = {
    accessExpiresAt: '2026-07-02T00:00:00.000Z',
    activation: null,
    blockedReason: null,
    commerciallyActive: true,
  }
  const offline = evaluateOfflineCustomerInfo(info, {
    now: Date.parse('2026-07-03T00:00:00.000Z'),
  })
  assert.equal(offline.entitlements.pro.active, false)
  assert.equal(offline.deviceAccess.blockedReason, 'DEVICE_REPLACED')
})

test('old device remains offline only until its previously issued access expiry after replacement', () => {
  const info = createCustomerInfo({ pro: createEntitlement({ expiresAt: null }) })
  info.deviceAccess = {
    accessExpiresAt: '2026-07-02T00:00:00.000Z',
    activation: {
      activationGroupKey: 'pro',
      activationId: 'old-device',
      expiresAt: '2026-08-01T00:00:00.000Z',
      installationLabel: null,
      lastSeenAt: '2026-07-01T00:00:00.000Z',
      policyVersionId: 'version-1',
      state: 'active',
    },
    blockedReason: null,
    commerciallyActive: true,
  }
  const beforeExpiry = evaluateOfflineCustomerInfo(info, {
    now: Date.parse('2026-07-01T23:59:59.999Z'),
  })
  const atExpiry = evaluateOfflineCustomerInfo(info, {
    now: Date.parse('2026-07-02T00:00:00.000Z'),
  })
  assert.equal(beforeExpiry.entitlements.pro.active, true)
  assert.equal(atExpiry.entitlements.pro.active, false)
  assert.equal(atExpiry.deviceAccess.blockedReason, 'DEVICE_REPLACED')
})

test('server outage preserves bounded existing authority but grants none to a new installation', async () => {
  const storage = createStorage()
  const cache = createCustomerInfoCacheStore({
    keyPrefix: 'subkit:outage',
    now: () => Date.parse('2026-07-02T00:00:00.000Z'),
    storage,
  })
  await cache.write(createCustomerInfo({ pro: createEntitlement() }))
  const existing = await cache.read('user_123')
  const newInstallation = await cache.read('new_user_without_verified_cache')
  assert.equal(existing.entitlements.pro.active, true)
  assert.equal(newInstallation, null)
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
