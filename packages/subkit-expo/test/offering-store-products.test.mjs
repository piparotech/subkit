import { strict as assert } from 'node:assert'
import test from 'node:test'

import { client, configureSubKit } from '../dist/index.js'

function createPackage({ identifier, kind, storeProductId }) {
  const recurring = kind === 'subscription'
  return {
    badge: null,
    identifier,
    label: identifier,
    product: {
      description: identifier,
      displayName: identifier,
      entitlements: [{ durationIso: null, grantMode: 'while_source_active', key: 'pro' }],
      kind,
      offers: [],
      plan: {
        billingKind: recurring ? 'recurring' : 'one_time',
        billingPeriodIso: recurring ? 'P1W' : null,
        fixedTermIso: recurring ? null : 'PT12H',
        gracePeriodIso: null,
        id: `plan_${identifier}`,
        key: identifier,
        version: 1,
        versionId: `plan_version_${identifier}`,
      },
      pools: [],
      prices: [],
      productId: `product_${identifier}`,
      productKey: identifier,
      storeProductIds: {
        apple: { offerIds: [], productId: storeProductId },
        google: { basePlanId: null, offerIds: [], productId: storeProductId },
      },
      trial: null,
    },
  }
}

const offering = {
  description: 'Default paywall',
  identifier: 'default',
  metadata: {},
  name: 'Default',
  packages: [
    createPackage({ identifier: 'weekly', kind: 'subscription', storeProductId: 'premium_weekly' }),
    createPackage({ identifier: 'day_pass', kind: 'consumable', storeProductId: 'day_pass' }),
  ],
}

// StoreKit reports a non-renewing subscription as subs, so expo-iap
// returns it only for a subs or an all query.
const storeCatalog = [
  {
    nativeType: 'subs',
    product: { displayPrice: '2,99 €', id: 'premium_weekly', raw: {}, type: 'subs' },
  },
  {
    nativeType: 'subs',
    product: { displayPrice: '0,99 €', id: 'day_pass', raw: {}, type: 'subs' },
  },
]

function createAdapter(queries) {
  return {
    async fetchProducts({ skus, type }) {
      queries.push(type)
      return storeCatalog
        .filter((entry) => skus.includes(entry.product.id))
        .filter((entry) => type === 'all' || entry.nativeType === type)
        .map((entry) => entry.product)
    },
    async finishTransaction() {},
    async getAvailablePurchases() {
      return []
    },
    async initConnection() {
      return true
    },
    async requestPurchase() {
      return []
    },
  }
}

function installFetch() {
  const previousFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ all: [offering], appId: 'app_123', current: offering }), {
      status: 200,
    })
  return () => {
    globalThis.fetch = previousFetch
  }
}

async function loadPackages(platform, queries) {
  const restoreFetch = installFetch()
  try {
    const configuredClient = configureSubKit({
      adapterBundle: { iap: createAdapter(queries) },
      appStateSource: {
        getCurrentState: () => 'active',
        subscribe: () => ({ remove() {} }),
      },
      appUserId: 'user_123',
      autoStart: false,
      installationId: 'install_123',
      platform,
      sdkKey: 'runtime_public_key',
    })
    const offerings = await configuredClient.getOfferings()
    return offerings.current.packages.map((item) => [
      item.identifier,
      item.storeProduct?.displayPrice ?? null,
    ])
  } finally {
    client.stop()
    restoreFetch()
  }
}

test('getOfferings prices an Apple non-renewing subscription sold as a one-time package', async () => {
  const queries = []

  const packages = await loadPackages('ios', queries)

  assert.deepEqual(packages, [
    ['weekly', '2,99 €'],
    ['day_pass', '0,99 €'],
  ])
  assert.deepEqual(queries, ['subs', 'all'])
})

test('getOfferings keeps the in-app query for one-time packages on Android', async () => {
  const queries = []

  await loadPackages('android', queries)

  assert.deepEqual(queries, ['subs', 'in-app'])
})
