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

test('parallel runtime keys are selected from trusted native Store context', async () => {
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
    for (const environment of ['production', 'sandbox']) {
      const configuredClient = configureSubKit({
        adapterBundle: {
          iap: {
            ...createIapAdapter(),
            async detectEnvironment() {
              return environment
            },
          },
        },
        appStateSource: {
          getCurrentState: () => 'active',
          subscribe: () => ({ remove() {} }),
        },
        appUserId: 'user_123',
        autoStart: false,
        installationId: `install_${environment}`,
        platform: 'ios',
        sdkKeys: {
          production: 'runtime_production_key',
          sandbox: 'runtime_sandbox_key',
        },
      })
      await configuredClient.getOfferings()
    }
    assert.deepEqual(headers, ['Bearer runtime_production_key', 'Bearer runtime_sandbox_key'])
  } finally {
    client.stop()
    globalThis.fetch = previousFetch
  }
})

test('unknown native Store context fails closed before Runtime HTTP', async () => {
  const previousFetch = globalThis.fetch
  let requestCount = 0
  globalThis.fetch = async () => {
    requestCount += 1
    return new Response('{}', { status: 200 })
  }

  try {
    const configuredClient = configureSubKit({
      adapterBundle: {
        iap: {
          ...createIapAdapter(),
          async detectEnvironment() {
            return 'unknown'
          },
        },
      },
      appStateSource: {
        getCurrentState: () => 'active',
        subscribe: () => ({ remove() {} }),
      },
      appUserId: 'user_123',
      autoStart: false,
      installationId: 'install_unknown',
      platform: 'ios',
      sdkKeys: {
        production: 'runtime_production_key',
        sandbox: 'runtime_sandbox_key',
      },
    })
    await assert.rejects(
      () => configuredClient.getOfferings(),
      /could not derive a trusted ios Store environment/,
    )
    assert.equal(requestCount, 0)
  } finally {
    client.stop()
    globalThis.fetch = previousFetch
  }
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
