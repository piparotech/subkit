import { strict as assert } from 'node:assert'
import test from 'node:test'

import {
  client,
  configureSubKit,
  getConfiguredSubKitClient,
  useSubKitOfferings,
} from '../dist/index.js'

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

test('Expo SDK exports the offerings hook documented by the public guide', () => {
  assert.equal(typeof useSubKitOfferings, 'function')
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
      (error) => error.code === 'network',
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

test('restart retries a verified transaction when finish previously failed', async () => {
  const previousFetch = globalThis.fetch
  let finishCalls = 0
  globalThis.fetch = async (_url, request) => {
    const body = JSON.parse(request.body)
    const purchase = body.purchases[0]
    return Response.json({
      acceptedPurchases: purchase == null ? [] : [purchase.transactionId],
      checkedAt: '2026-07-01T00:00:00.000Z',
      conflicts: [],
      customerInfo: {
        accessContext: null,
        appId: 'app_123',
        appUserId: 'user_restart',
        checkedAt: '2026-07-01T00:00:00.000Z',
        entitlements: {},
        freshness: 'fresh',
        purchases: [],
        unclaimedPurchases: [],
      },
      finishableTransactions:
        purchase == null
          ? []
          : [
              {
                isConsumable: false,
                purchaseId: `apple_app_store:tx:${purchase.transactionId}`,
                store: 'apple_app_store',
                transactionId: purchase.transactionId,
              },
            ],
      rejectedPurchases: [],
      verificationStatus: 'verified',
    })
  }
  const purchase = {
    productId: 'pro_monthly',
    raw: { source: 'test' },
    store: 'apple_app_store',
    transactionId: 'tx_restart_finish',
  }
  try {
    const firstClient = configureSubKit({
      adapterBundle: {
        iap: {
          ...createIapAdapterWithPurchases([purchase]),
          async finishTransaction() {
            finishCalls += 1
            throw new Error('native process ended before finish')
          },
        },
      },
      appStateSource: {
        getCurrentState: () => 'active',
        subscribe: () => ({ remove() {} }),
      },
      appUserId: 'user_restart',
      autoStart: false,
      installationId: 'install_restart',
      platform: 'ios',
      sdkKey: 'runtime_public_key',
    })
    await firstClient.syncPurchases({ force: true, reason: 'purchase_event' })

    const secondClient = configureSubKit({
      adapterBundle: {
        iap: {
          ...createIapAdapter(),
          async finishTransaction() {
            finishCalls += 1
          },
        },
      },
      appStateSource: {
        getCurrentState: () => 'active',
        subscribe: () => ({ remove() {} }),
      },
      appUserId: 'user_restart',
      autoStart: false,
      installationId: 'install_restart',
      platform: 'ios',
      sdkKey: 'runtime_public_key',
    })
    await secondClient.syncPurchases({ force: true, reason: 'queue_retry' })
    assert.equal(finishCalls, 2)
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

test('lazy installation provider is single-flight, retryable, and immutable after success', async () => {
  let calls = 0
  let release
  const configuredClient = configureSubKit({
    adapterBundle: { iap: createIapAdapter() },
    appStateSource: {
      getCurrentState: () => 'active',
      subscribe: () => ({ remove() {} }),
    },
    autoStart: false,
    installationId: () => {
      calls += 1
      if (calls === 1) return Promise.reject(new Error('temporary storage failure'))
      return new Promise((resolve) => {
        release = resolve
      })
    },
    platform: 'ios',
    sdkKey: 'runtime_public_key',
  })

  await assert.rejects(() => configuredClient.ready(), /temporary storage failure/)
  const first = configuredClient.ready()
  const second = configuredClient.ready()
  await Promise.resolve()
  assert.equal(calls, 2)
  release('install_lazy')
  await Promise.all([first, second])
  await configuredClient.ready()
  assert.equal(calls, 2)
  client.stop()
})

test('reconfiguration rejects a stale lazy installation resolution', async () => {
  let release
  const staleClient = configureSubKit({
    adapterBundle: { iap: createIapAdapter() },
    appStateSource: {
      getCurrentState: () => 'active',
      subscribe: () => ({ remove() {} }),
    },
    autoStart: false,
    installationId: () =>
      new Promise((resolve) => {
        release = resolve
      }),
    platform: 'ios',
    sdkKey: 'runtime_public_key',
  })
  const staleReady = staleClient.ready()
  await Promise.resolve()

  configureSubKit({
    adapterBundle: { iap: createIapAdapter() },
    appStateSource: {
      getCurrentState: () => 'active',
      subscribe: () => ({ remove() {} }),
    },
    autoStart: false,
    installationId: 'replacement-id',
    platform: 'ios',
    sdkKey: 'runtime_public_key',
  })
  release('stale-id')
  await assert.rejects(() => staleReady, /replaced during initialization/)
  client.stop()
})

test('start resolves installation id before registering IAP listeners', async () => {
  const events = []
  const configuredClient = configureSubKit({
    adapterBundle: {
      iap: {
        ...createIapAdapter(),
        async initConnection() {
          events.push('iap')
          return true
        },
      },
      listeners: {
        addPurchaseErrorListener() {
          events.push('listener')
          return { remove() {} }
        },
        addPurchaseUpdatedListener() {
          events.push('listener')
          return { remove() {} }
        },
      },
    },
    appStateSource: {
      getCurrentState: () => 'active',
      subscribe: () => ({ remove() {} }),
    },
    autoStart: false,
    installationId: async () => {
      events.push('installation')
      return 'install_ordered'
    },
    platform: 'ios',
    sdkKey: 'runtime_public_key',
  })

  await configuredClient.start()
  assert.deepEqual(events.slice(0, 2), ['installation', 'iap'])
  client.stop()
})

test('identity changes serialize behind in-flight public operations', async () => {
  const previousFetch = globalThis.fetch
  const requests = []
  let releaseOfferings
  globalThis.fetch = async (url, request) => {
    const pathname = new URL(url).pathname
    requests.push(pathname)
    if (pathname.endsWith('/offerings')) {
      await new Promise((resolve) => {
        releaseOfferings = resolve
      })
      return new Response(JSON.stringify({ all: [], appId: 'app_123', current: null }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      })
    }
    if (pathname.endsWith('/customer-info')) {
      const body = JSON.parse(request.body)
      return new Response(
        JSON.stringify({
          accessContext: null,
          appId: 'app_123',
          appUserId: body.appUserId,
          checkedAt: '2026-07-01T00:00:00.000Z',
          entitlements: {},
          freshness: 'fresh',
          purchases: [],
          unclaimedPurchases: [],
        }),
        { headers: { 'content-type': 'application/json' }, status: 200 },
      )
    }
    return new Response(
      JSON.stringify({
        acceptedPurchases: [],
        checkedAt: '2026-07-01T00:00:00.000Z',
        conflicts: [],
        customerInfo: {
          accessContext: null,
          appId: 'app_123',
          appUserId: 'user_b',
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
    const configuredClient = configureSubKit({
      adapterBundle: { iap: createIapAdapter() },
      appStateSource: {
        getCurrentState: () => 'active',
        subscribe: () => ({ remove() {} }),
      },
      appUserId: 'user_a',
      autoStart: false,
      installationId: 'install_serialized',
      platform: 'ios',
      sdkKey: 'runtime_public_key',
    })
    const offerings = configuredClient.getOfferings()
    while (requests.length === 0) await new Promise((resolve) => setTimeout(resolve, 0))
    const identify = configuredClient.identify('user_b')
    await Promise.resolve()
    assert.deepEqual(requests, ['/api/runtime/offerings'])
    releaseOfferings()
    await offerings
    await identify
    assert.deepEqual(requests, [
      '/api/runtime/offerings',
      '/api/runtime/customer-info',
      '/api/runtime/iap/reconcile',
    ])
  } finally {
    client.stop()
    globalThis.fetch = previousFetch
  }
})

test('reconcile auto-claims applicable activation groups and stores tokens separately', async () => {
  const previousFetch = globalThis.fetch
  const stored = new Map()
  const requests = []
  globalThis.fetch = async (url, request) => {
    const pathname = new URL(url).pathname
    requests.push({ body: JSON.parse(request.body), pathname })
    if (pathname.endsWith('/iap/reconcile')) {
      return Response.json({
        acceptedPurchases: ['tx_1'],
        checkedAt: '2026-07-01T00:00:00.000Z',
        conflicts: [],
        customerInfo: {
          accessContext: null,
          appId: 'app_123',
          appUserId: 'user_123',
          checkedAt: '2026-07-01T00:00:00.000Z',
          entitlements: {
            pro: {
              active: true,
              entitlementKey: 'pro',
              expiresAt: null,
              planKey: 'annual',
              productIdentifier: 'pro',
              source: 'apple',
              startsAt: null,
              status: 'active',
              verifiedAt: '2026-07-01T00:00:00.000Z',
            },
          },
          freshness: 'fresh',
          purchases: [],
          unclaimedPurchases: [],
        },
        finishableTransactions: [],
        managementSession: {
          activationGroupKeys: ['pro'],
          allowedOperations: ['list', 'claim', 'renew', 'replace', 'revoke'],
          beneficiarySubjectId: 'beneficiary_1',
          expiresAt: '2026-07-01T00:15:00.000Z',
          token: 'sk_mgmt_test',
        },
        rejectedPurchases: [],
        verificationStatus: 'verified',
      })
    }
    return Response.json({
      activation: {
        activationGroupKey: 'pro',
        activationId: 'activation_1',
        expiresAt: '2026-08-01T00:00:00.000Z',
        installationLabel: null,
        lastSeenAt: null,
        policyVersionId: 'version_1',
        state: 'active',
      },
      deviceAccessToken: {
        expiresAt: '2026-07-08T00:00:00.000Z',
        token: 'sk_device_test',
      },
      devices: [],
      status: 'activated',
    })
  }
  try {
    const configuredClient = configureSubKit({
      adapterBundle: { iap: createIapAdapter() },
      appStateSource: {
        getCurrentState: () => 'active',
        subscribe: () => ({ remove() {} }),
      },
      appUserId: 'user_123',
      autoStart: false,
      installationId: 'install_123',
      persistence: {
        keyPrefix: 'test:auto-device',
        storage: {
          async getItem(key) {
            return stored.get(key) ?? null
          },
          async removeItem(key) {
            stored.delete(key)
          },
          async setItem(key, value) {
            stored.set(key, value)
          },
        },
      },
      platform: 'ios',
      sdkKey: 'runtime_public_key',
    })
    const result = await configuredClient.syncPurchases({ force: true, reason: 'manual_restore' })
    assert.equal(result.customerInfo.deviceAccess.activation.activationId, 'activation_1')
    assert.deepEqual(
      requests.map((request) => request.pathname),
      ['/api/runtime/iap/reconcile', '/api/runtime/devices/claim'],
    )
    assert.equal(
      JSON.parse(stored.get('test:auto-device:device-tokens:v1:management')).token,
      'sk_mgmt_test',
    )
    assert.equal(
      JSON.parse(stored.get('test:auto-device:device-tokens:v1:access:pro')).token,
      'sk_device_test',
    )
    const cached = [...stored.entries()].find(([key]) => key.includes(':customer-info:v1:'))
    assert.ok(cached)
    assert.equal(
      JSON.parse(cached[1]).customerInfo.deviceAccess.accessExpiresAt,
      '2026-07-08T00:00:00.000Z',
    )
    assert.equal(cached[1].includes('sk_device_test'), false)
    assert.equal(cached[1].includes('sk_mgmt_test'), false)
  } finally {
    client.stop()
    globalThis.fetch = previousFetch
  }
})

test('purchase and restore operations are single-flight', async () => {
  let purchaseCalls = 0
  let restoreCalls = 0
  let releasePurchase
  let releaseRestore
  const previousFetch = globalThis.fetch
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/offerings')) {
      return new Response(
        JSON.stringify({
          all: [
            {
              description: '',
              identifier: 'main',
              metadata: {},
              name: 'Main',
              packages: [
                {
                  badge: null,
                  identifier: 'pro',
                  label: 'Pro',
                  product: {
                    description: '',
                    displayName: 'Pro',
                    entitlements: [],
                    kind: 'non_consumable',
                    offers: [],
                    plan: {
                      billingKind: 'one_time',
                      billingPeriodIso: null,
                      fixedTermIso: null,
                      gracePeriodIso: null,
                      id: 'p',
                      key: 'p',
                      version: 1,
                      versionId: 'v',
                    },
                    pools: [],
                    prices: [],
                    productId: 'product',
                    productKey: 'product',
                    storeProductIds: { apple: { offerIds: [], productId: 'pro_product' } },
                    trial: null,
                  },
                },
              ],
            },
          ],
          appId: 'app',
          current: null,
        }),
        { status: 200 },
      )
    }
    return new Response(
      JSON.stringify({
        acceptedPurchases: [],
        checkedAt: new Date().toISOString(),
        conflicts: [],
        customerInfo: {
          accessContext: null,
          appId: 'app',
          appUserId: 'user',
          checkedAt: new Date().toISOString(),
          entitlements: {},
          freshness: 'fresh',
          purchases: [],
          unclaimedPurchases: [],
        },
        finishableTransactions: [],
        rejectedPurchases: [],
        verificationStatus: 'failed',
      }),
      { status: 200 },
    )
  }
  try {
    const configuredClient = configureSubKit({
      adapterBundle: {
        iap: {
          ...createIapAdapter(),
          async fetchProducts() {
            return [{ id: 'pro_product', raw: {}, type: 'in-app' }]
          },
          async requestPurchase() {
            purchaseCalls += 1
            return new Promise((resolve) => {
              releasePurchase = resolve
            })
          },
          async restorePurchases() {
            restoreCalls += 1
            return new Promise((resolve) => {
              releaseRestore = resolve
            })
          },
        },
      },
      appStateSource: { getCurrentState: () => 'active', subscribe: () => ({ remove() {} }) },
      appUserId: 'user',
      autoStart: false,
      installationId: 'install',
      platform: 'ios',
      sdkKey: 'key',
    })
    const purchaseA = configuredClient.purchasePackage('pro')
    const purchaseB = configuredClient.purchasePackage('pro')
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(purchaseCalls, 1)
    releasePurchase([])
    await Promise.all([purchaseA, purchaseB])

    const restoreA = configuredClient.restorePurchases()
    const restoreB = configuredClient.restorePurchases()
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(restoreCalls, 1)
    releaseRestore()
    await Promise.all([restoreA, restoreB])
    client.stop()
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('parallel restore purchase activation and sync share one serialized reconcile path', async () => {
  let reconcileCalls = 0
  let activeReconciles = 0
  let maxActiveReconciles = 0
  const previousFetch = globalThis.fetch
  globalThis.fetch = async (url, request) => {
    if (String(url).endsWith('/offerings')) {
      return Response.json({
        all: [
          {
            description: '',
            identifier: 'main',
            metadata: {},
            name: 'Main',
            packages: [
              {
                badge: null,
                identifier: 'pro',
                label: 'Pro',
                product: {
                  description: '',
                  displayName: 'Pro',
                  entitlements: [],
                  kind: 'non_consumable',
                  offers: [],
                  plan: {
                    billingKind: 'one_time',
                    billingPeriodIso: null,
                    fixedTermIso: null,
                    gracePeriodIso: null,
                    id: 'p',
                    key: 'p',
                    version: 1,
                    versionId: 'v',
                  },
                  pools: [],
                  prices: [],
                  productId: 'product',
                  productKey: 'product',
                  storeProductIds: { apple: { offerIds: [], productId: 'pro_product' } },
                  trial: null,
                },
              },
            ],
          },
        ],
        appId: 'app',
        current: null,
      })
    }
    if (String(url).includes('/devices/')) {
      return Response.json({
        activation: {
          activationGroupKey: 'pro',
          activationId: 'activation',
          expiresAt: '2026-12-01T00:00:00.000Z',
          installationLabel: null,
          lastSeenAt: '2026-07-01T00:00:00.000Z',
          policyVersionId: 'version',
          state: 'active',
        },
        deviceAccessToken: {
          expiresAt: '2026-12-01T00:00:00.000Z',
          token: 'sk_device_parallel',
        },
        devices: [],
        status: 'activated',
      })
    }
    reconcileCalls += 1
    activeReconciles += 1
    maxActiveReconciles = Math.max(maxActiveReconciles, activeReconciles)
    await new Promise((resolve) => setTimeout(resolve, 3))
    activeReconciles -= 1
    const body = JSON.parse(request.body)
    return Response.json({
      acceptedPurchases: [],
      checkedAt: '2026-07-01T00:00:00.000Z',
      conflicts: [],
      customerInfo: {
        accessContext: null,
        appId: 'app',
        appUserId: 'user',
        checkedAt: '2026-07-01T00:00:00.000Z',
        entitlements: {},
        freshness: 'fresh',
        purchases: [],
        unclaimedPurchases: [],
      },
      finishableTransactions: [],
      managementSession: {
        activationGroupKeys: ['pro'],
        allowedOperations: ['list', 'claim', 'renew', 'replace', 'revoke'],
        beneficiarySubjectId: 'beneficiary',
        expiresAt: '2026-07-01T00:15:00.000Z',
        token: 'sk_mgmt_parallel',
      },
      rejectedPurchases: body.purchases.map((purchase) => purchase.transactionId),
      verificationStatus: 'failed',
    })
  }
  try {
    const configuredClient = configureSubKit({
      adapterBundle: {
        iap: {
          ...createIapAdapter(),
          async fetchProducts() {
            return [{ id: 'pro_product', raw: {}, type: 'in-app' }]
          },
          async requestPurchase() {
            return []
          },
          async restorePurchases() {},
        },
      },
      appStateSource: { getCurrentState: () => 'active', subscribe: () => ({ remove() {} }) },
      appUserId: 'user',
      autoStart: false,
      installationId: 'install',
      platform: 'ios',
      sdkKey: 'key',
    })
    await Promise.all([
      configuredClient.purchasePackage('pro'),
      configuredClient.restorePurchases(),
      configuredClient.syncPurchases({ force: true, reason: 'foreground' }),
      configuredClient.getDeviceActivations('sk_mgmt_parallel'),
    ])
    assert.equal(maxActiveReconciles, 1)
    assert.equal(reconcileCalls, 2)
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
    identityGeneration: () => 1,
    installationId: 'install_123',
    platform: 'ios',
    sdkKey: 'runtime_public_key',
  })

  await new Promise((resolve) => setTimeout(resolve, 0))

  assert.equal(initConnectionCount, 1)
  client.stop()
})
