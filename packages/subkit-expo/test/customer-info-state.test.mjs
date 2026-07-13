import { strict as assert } from 'node:assert'
import test from 'node:test'

import {
  client,
  configureSubKit,
  getSubKitCustomerInfoSnapshot,
  refreshSubKitCustomerInfo,
  subscribeSubKitCustomerInfo,
} from '../dist/index.js'

function createIapAdapter() {
  return {
    async fetchProducts() {
      return []
    },
    async finishTransaction() {},
    async getAvailablePurchases() {
      return []
    },
    async initConnection() {
      return true
    },
    async requestPurchase() {
      return null
    },
  }
}

function createCustomerInfo(appUserId, entitlementActive) {
  return {
    appId: 'app_123',
    appUserId,
    checkedAt: '2026-07-01T00:00:00.000Z',
    entitlements: {
      pro: {
        active: entitlementActive,
        entitlementKey: 'pro',
        planKey: 'monthly',
        expiresAt: null,
        productIdentifier: 'pro_monthly',
        source: 'apple',
        startsAt: '2026-07-01T00:00:00.000Z',
        status: entitlementActive ? 'active' : 'expired',
        verifiedAt: '2026-07-01T00:00:00.000Z',
      },
    },
    freshness: 'fresh',
    purchases: [],
    storeIdentityHints: {
      apple: {
        appAccountToken: '00000000-0000-4000-8000-000000000123',
      },
    },
    unclaimedPurchases: [],
  }
}

function installFetch(handler) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = handler
  return () => {
    globalThis.fetch = originalFetch
  }
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body
    },
  }
}

test('initial customer info snapshot is unconfigured without an error object', () => {
  const snapshot = getSubKitCustomerInfoSnapshot()
  assert.equal(snapshot.clientConfigured, false)
  assert.equal(snapshot.state, 'unconfigured')
  assert.equal(snapshot.error, null)
})

test('configureSubKit resets customer info snapshot and refresh publishes latest info', async () => {
  let calls = 0
  const restoreFetch = installFetch(async (url) => {
    calls += 1
    const entitlementActive = calls > 1
    if (String(url).endsWith('/api/runtime/iap/reconcile')) {
      return jsonResponse({
        acceptedPurchases: [],
        checkedAt: '2026-07-01T00:00:00.000Z',
        conflicts: [],
        customerInfo: createCustomerInfo('user_123', entitlementActive),
        finishableTransactions: [],
        rejectedPurchases: [],
        verificationStatus: 'failed',
      })
    }
    return jsonResponse(createCustomerInfo('user_123', entitlementActive))
  })

  try {
    configureSubKit({
      adapterBundle: { iap: createIapAdapter() },
      appStateSource: {
        getCurrentState: () => 'active',
        subscribe: () => ({ remove() {} }),
      },
      appUserId: 'user_123',
      autoStart: false,
      installationId: 'install_123',
      platform: 'ios',
      sdkKey: 'runtime_public_key',
    })

    assert.equal(getSubKitCustomerInfoSnapshot().state, 'idle')
    assert.equal(getSubKitCustomerInfoSnapshot().customerInfo, null)

    const info = await refreshSubKitCustomerInfo()

    assert.equal(info.entitlements.pro.active, false)
    assert.equal(getSubKitCustomerInfoSnapshot().state, 'ready')
    assert.equal(getSubKitCustomerInfoSnapshot().customerInfo.entitlements.pro.active, false)

    const identifiedInfo = await client.identify('user_123')

    assert.equal(identifiedInfo.entitlements.pro.active, true)
    assert.equal(getSubKitCustomerInfoSnapshot().customerInfo.entitlements.pro.active, true)
  } finally {
    client.stop()
    restoreFetch()
  }
})

test('refresh publishes a failing customer info request once and rejects to callers', async () => {
  const restoreFetch = installFetch(
    async () =>
      new Response(JSON.stringify({ error: { code: 'server_error', message: 'boom' } }), {
        status: 500,
      }),
  )
  let notifications = 0

  try {
    configureSubKit({
      adapterBundle: { iap: createIapAdapter() },
      appStateSource: {
        getCurrentState: () => 'active',
        subscribe: () => ({ remove() {} }),
      },
      appUserId: 'user_error',
      autoStart: false,
      installationId: 'install_error',
      platform: 'ios',
      sdkKey: 'runtime_public_key',
    })

    const unsubscribe = subscribeSubKitCustomerInfo(() => {
      notifications += 1
    })

    await assert.rejects(() => refreshSubKitCustomerInfo(), /boom/)
    unsubscribe()

    assert.equal(getSubKitCustomerInfoSnapshot().state, 'error')
    assert.equal(getSubKitCustomerInfoSnapshot().error.message, 'boom')
    assert.equal(notifications, 2)
  } finally {
    client.stop()
    restoreFetch()
  }
})

test('customer info subscribers are notified when singleton state changes', async () => {
  const restoreFetch = installFetch(async () => jsonResponse(createCustomerInfo('user_456', true)))
  let notifications = 0

  try {
    configureSubKit({
      adapterBundle: { iap: createIapAdapter() },
      appStateSource: {
        getCurrentState: () => 'active',
        subscribe: () => ({ remove() {} }),
      },
      appUserId: 'user_456',
      autoStart: false,
      installationId: 'install_456',
      platform: 'ios',
      sdkKey: 'runtime_public_key',
    })

    const unsubscribe = subscribeSubKitCustomerInfo(() => {
      notifications += 1
    })

    await refreshSubKitCustomerInfo()
    assert.ok(notifications > 0)

    const before = notifications
    unsubscribe()
    await refreshSubKitCustomerInfo()
    assert.equal(notifications, before)
  } finally {
    client.stop()
    restoreFetch()
  }
})
