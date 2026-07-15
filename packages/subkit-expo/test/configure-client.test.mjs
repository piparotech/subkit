import { strict as assert } from 'node:assert'
import test from 'node:test'

import { client, configureSubKit, getConfiguredSubKitClient } from '../dist/index.js'

function createIapAdapter() {
  return createIapAdapterWithPurchases([])
}

function createIapAdapterWithPurchases(purchases) {
  return {
    async fetchProducts() {
      return []
    },
    async finishTransaction() {},
    async getAvailablePurchases() {
      return purchases
    },
    async initConnection() {
      return true
    },
    async requestPurchase() {
      return null
    },
  }
}

test('client throws before configureSubKit is called', () => {
  assert.throws(
    () => client.getCustomerInfo,
    /Call configureSubKit\(\.\.\.\) before accessing client/,
  )
})

test('configureSubKit installs the global client proxy target', async () => {
  const configuredClient = configureSubKit({
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

  assert.equal(getConfiguredSubKitClient(), configuredClient)
  assert.equal(client.stop, configuredClient.stop)
  client.stop()
})

test('default purchase queue survives client reconfiguration', async () => {
  const previousFetch = globalThis.fetch
  const reconciledPurchases = []
  let shouldFail = true
  globalThis.fetch = async (_url, request) => {
    const body = JSON.parse(request.body)
    reconciledPurchases.push(body.purchases)
    if (shouldFail) throw new Error('offline')
    return new Response(
      JSON.stringify({
        acceptedPurchases: ['tx_durable'],
        checkedAt: '2026-07-01T00:00:00.000Z',
        conflicts: [],
        customerInfo: {
          accessContext: null,
          appId: 'app_123',
          appUserId: 'user_durable',
          checkedAt: '2026-07-01T00:00:00.000Z',
          entitlements: {},
          freshness: 'fresh',
          purchases: [],
          unclaimedPurchases: [],
        },
        finishableTransactions: [],
        rejectedPurchases: [],
        verificationStatus: 'verified',
      }),
      { headers: { 'content-type': 'application/json' }, status: 200 },
    )
  }

  try {
    const firstClient = configureSubKit({
      adapterBundle: {
        iap: createIapAdapterWithPurchases([
          {
            productId: 'pro_monthly',
            raw: { source: 'test' },
            store: 'apple_app_store',
            transactionId: 'tx_durable',
          },
        ]),
      },
      appStateSource: {
        getCurrentState: () => 'active',
        subscribe: () => ({ remove() {} }),
      },
      appUserId: 'user_durable',
      autoStart: false,
      installationId: 'install_durable',
      platform: 'ios',
      sdkKey: 'runtime_public_key',
    })

    await assert.rejects(
      () => firstClient.syncPurchases({ force: true, reason: 'app_start' }),
      /offline/,
    )
    shouldFail = false

    const secondClient = configureSubKit({
      adapterBundle: { iap: createIapAdapter() },
      appStateSource: {
        getCurrentState: () => 'active',
        subscribe: () => ({ remove() {} }),
      },
      appUserId: 'user_durable',
      autoStart: false,
      installationId: 'install_durable',
      platform: 'ios',
      sdkKey: 'runtime_public_key',
    })
    await secondClient.syncPurchases({ force: true, reason: 'queue_retry' })

    assert.equal(reconciledPurchases.length, 2)
    assert.equal(reconciledPurchases[1][0].transactionId, 'tx_durable')
  } finally {
    client.stop()
    globalThis.fetch = previousFetch
  }
})

test('one app SDK key authenticates Offerings on iOS and Android before a purchase exists', async () => {
  const previousFetch = globalThis.fetch
  const headers = []
  globalThis.fetch = async (_url, request) => {
    headers.push(request.headers.authorization)
    return new Response(JSON.stringify({ all: [], appId: 'app_123', current: null }), {
      headers: { 'content-type': 'application/json' },
      status: 200,
    })
  }

  try {
    for (const platform of ['ios', 'android']) {
      const configuredClient = configureSubKit({
        adapterBundle: { iap: createIapAdapter() },
        appStateSource: {
          getCurrentState: () => 'active',
          subscribe: () => ({ remove() {} }),
        },
        appUserId: 'user_123',
        autoStart: false,
        installationId: `install_${platform}`,
        platform,
        sdkKey: 'runtime_app_key',
      })
      await configuredClient.getOfferings()
    }
    assert.deepEqual(headers, ['Bearer runtime_app_key', 'Bearer runtime_app_key'])
  } finally {
    client.stop()
    globalThis.fetch = previousFetch
  }
})

test('configuration requires exactly one non-empty SDK key', () => {
  assert.throws(
    () =>
      configureSubKit({
        adapterBundle: { iap: createIapAdapter() },
        appStateSource: {
          getCurrentState: () => 'active',
          subscribe: () => ({ remove() {} }),
        },
        autoStart: false,
        installationId: 'install_missing_key',
        platform: 'ios',
        sdkKey: '',
      }),
    /sdkKey is required/,
  )
})

test('configureSubKit starts the client by default', async () => {
  let initConnectionCount = 0
  configureSubKit({
    adapterBundle: {
      iap: {
        ...createIapAdapter(),
        async initConnection() {
          initConnectionCount += 1
          return true
        },
      },
    },
    appStateSource: {
      getCurrentState: () => 'active',
      subscribe: () => ({ remove() {} }),
    },
    installationId: 'install_123',
    platform: 'ios',
    sdkKey: 'runtime_public_key',
  })

  await new Promise((resolve) => setTimeout(resolve, 0))

  assert.equal(initConnectionCount, 1)
  client.stop()
})
