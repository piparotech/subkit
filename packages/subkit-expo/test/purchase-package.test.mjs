import { strict as assert } from 'node:assert'
import test from 'node:test'

import { client, configureSubKit } from '../dist/index.js'

function createCustomerInfo() {
  return {
    appId: 'app_123',
    appUserId: 'user_123',
    checkedAt: '2026-07-01T00:00:00.000Z',
    entitlements: {},
    freshness: 'fresh',
    purchases: [],
    storeIdentityHints: {
      google: { obfuscatedAccountId: 'obfuscated-account' },
    },
    unclaimedPurchases: [],
  }
}

function createOfferings(google) {
  return {
    all: [
      {
        description: 'Default paywall',
        identifier: 'default',
        metadata: {},
        name: 'Default',
        packages: [
          {
            badge: null,
            identifier: 'monthly',
            label: 'Monthly',
            product: {
              description: 'Premium',
              displayName: 'Premium',
              entitlements: [{ durationIso: null, grantMode: 'while_source_active', key: 'pro' }],
              kind: 'subscription',
              offers: [],
              plan: {
                billingKind: 'recurring',
                billingPeriodIso: 'P1M',
                fixedTermIso: null,
                gracePeriodIso: null,
                id: 'plan_123',
                key: 'monthly',
                version: 1,
                versionId: 'plan_version_123',
              },
              pools: [],
              prices: [
                {
                  amountMicros: 9_990_000,
                  countryCode: null,
                  currencyCode: 'EUR',
                  salesChannel: 'google',
                  taxInclusive: true,
                },
              ],
              productId: 'product_123',
              productKey: 'premium',
              storeProductIds: { google },
              trial: null,
            },
          },
        ],
      },
    ],
    appId: 'app_123',
    current: null,
  }
}

function installFetch(offerings) {
  const previousFetch = globalThis.fetch
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/api/runtime/customer-info')) {
      return new Response(JSON.stringify(createCustomerInfo()), { status: 200 })
    }
    return new Response(JSON.stringify(offerings), { status: 200 })
  }
  return () => {
    globalThis.fetch = previousFetch
  }
}

function createAdapter(subscriptionOffers, requests) {
  return {
    async fetchProducts() {
      return [
        {
          id: 'com.acme.premium',
          raw: {},
          subscriptionOffers,
          type: 'subs',
        },
      ]
    },
    async finishTransaction() {},
    async getAvailablePurchases() {
      return []
    },
    async initConnection() {
      return true
    },
    async requestPurchase(request) {
      requests.push(request)
    },
  }
}

function configureAndroid(adapter) {
  return configureSubKit({
    adapterBundle: { iap: adapter },
    appStateSource: {
      getCurrentState: () => 'active',
      subscribe: () => ({ remove() {} }),
    },
    appUserId: 'user_123',
    autoStart: false,
    installationId: 'install_123',
    platform: 'android',
    sdkKey: 'runtime_public_key',
  })
}

test('purchasePackage resolves product, base plan and provider offer from Offerings', async () => {
  const requests = []
  const restoreFetch = installFetch(
    createOfferings({
      basePlanId: 'monthly-base',
      offerIds: ['intro-7-day'],
      productId: 'com.acme.premium',
    }),
  )

  try {
    const configuredClient = configureAndroid(
      createAdapter(
        [
          { basePlanId: 'annual-base', id: 'intro-7-day', offerToken: 'wrong-base-token' },
          { basePlanId: 'monthly-base', id: 'intro-7-day', offerToken: 'selected-token' },
        ],
        requests,
      ),
    )
    await configuredClient.getCustomerInfo()
    await configuredClient.getOfferings()
    const result = await configuredClient.purchasePackage('monthly')

    assert.equal(result.status, 'pending')
    assert.deepEqual(requests, [
      {
        appAccountToken: undefined,
        isConsumable: false,
        obfuscatedAccountId: 'obfuscated-account',
        obfuscatedProfileId: undefined,
        offerToken: 'selected-token',
        productId: 'com.acme.premium',
        productType: 'subs',
      },
    ])
  } finally {
    client.stop()
    restoreFetch()
  }
})

test('purchasePackage fails closed when configured Google offer is unavailable', async () => {
  const requests = []
  const restoreFetch = installFetch(
    createOfferings({
      basePlanId: 'monthly-base',
      offerIds: ['configured-offer'],
      productId: 'com.acme.premium',
    }),
  )

  try {
    const configuredClient = configureAndroid(
      createAdapter(
        [{ basePlanId: 'monthly-base', id: 'other-offer', offerToken: 'other-token' }],
        requests,
      ),
    )
    await configuredClient.getCustomerInfo()
    const result = await configuredClient.purchasePackage('monthly')

    assert.equal(result.status, 'failed')
    assert.equal(result.error.code, 'product_unavailable')
    assert.deepEqual(requests, [])
  } finally {
    client.stop()
    restoreFetch()
  }
})
