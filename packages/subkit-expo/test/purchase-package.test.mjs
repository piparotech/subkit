import { strict as assert } from 'node:assert'
import test from 'node:test'

import { client, configureSubKit } from '../dist/index.js'

function createCustomerInfo() {
  return {
    accessContext: null,
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

function installFetch(offerings, reconciledPurchases = []) {
  const previousFetch = globalThis.fetch
  globalThis.fetch = async (url, request) => {
    if (String(url).endsWith('/api/runtime/customer-info')) {
      return new Response(JSON.stringify(createCustomerInfo()), { status: 200 })
    }
    if (String(url).endsWith('/api/runtime/iap/reconcile')) {
      const body = JSON.parse(request.body)
      reconciledPurchases.push(body.purchases)
      return new Response(
        JSON.stringify({
          acceptedPurchases: ['purchase_direct'],
          checkedAt: '2026-07-01T00:00:00.000Z',
          conflicts: [],
          customerInfo: createCustomerInfo(),
          finishableTransactions: [
            {
              isConsumable: false,
              purchaseId: 'google_play:tx:purchase_direct',
              store: 'google_play',
              transactionId: 'purchase_direct',
            },
          ],
          rejectedPurchases: [],
          verificationStatus: 'verified',
        }),
        { status: 200 },
      )
    }
    return new Response(JSON.stringify(offerings), { status: 200 })
  }
  return () => {
    globalThis.fetch = previousFetch
  }
}

function createAdapter(subscriptionOffers, requests, directPurchases = [], finished = []) {
  return {
    async fetchProducts() {
      return [
        {
          currency: 'EUR',
          displayPrice: 'from-product',
          id: 'com.acme.premium',
          price: 99.99,
          raw: {},
          subscriptionOffers,
          title: 'Premium',
          type: 'subs',
        },
      ]
    },
    async finishTransaction(input) {
      finished.push(input)
    },
    async getAvailablePurchases() {
      return []
    },
    async initConnection() {
      return true
    },
    async requestPurchase(request) {
      requests.push(request)
      return directPurchases
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

test('getOfferings projects the exact configured Google base-plan price', async () => {
  const requests = []
  const restoreFetch = installFetch(
    createOfferings({
      basePlanId: 'monthly-base',
      offerIds: [],
      productId: 'com.acme.premium',
    }),
  )

  try {
    const configuredClient = configureAndroid(
      createAdapter(
        [
          {
            basePlanId: 'annual-base',
            currency: 'EUR',
            displayPrice: '49,99 €',
            id: 'annual-base',
            offerToken: 'annual-token',
            price: 49.99,
          },
          {
            basePlanId: 'monthly-base',
            currency: 'EUR',
            displayPrice: '5,99 €',
            id: 'monthly-base',
            offerToken: 'monthly-token',
            price: 5.99,
          },
        ],
        requests,
      ),
    )
    const offerings = await configuredClient.getOfferings({ placement: 'paywall' })

    assert.deepEqual(offerings.all[0].packages[0].storeProduct, {
      currency: 'EUR',
      displayPrice: '5,99 €',
      price: 5.99,
      title: 'Premium',
    })
  } finally {
    client.stop()
    restoreFetch()
  }
})

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

test('purchasePackage immediately reconciles and finishes a directly returned Android purchase', async () => {
  const requests = []
  const reconciledPurchases = []
  const finished = []
  const directPurchase = {
    productId: 'com.acme.premium',
    purchaseToken: 'token_direct',
    raw: { productId: 'com.acme.premium', store: 'google' },
    receipt: 'token_direct',
    store: 'google_play',
    transactionId: 'purchase_direct',
  }
  const restoreFetch = installFetch(
    createOfferings({
      basePlanId: 'monthly-base',
      offerIds: ['intro-7-day'],
      productId: 'com.acme.premium',
    }),
    reconciledPurchases,
  )

  try {
    const configuredClient = configureAndroid(
      createAdapter(
        [{ basePlanId: 'monthly-base', id: 'intro-7-day', offerToken: 'selected-token' }],
        requests,
        [directPurchase],
        finished,
      ),
    )
    await configuredClient.getCustomerInfo()
    const result = await configuredClient.purchasePackage('monthly')

    assert.equal(result.status, 'verified')
    assert.equal(reconciledPurchases.length, 1)
    assert.equal(reconciledPurchases[0][0].store, 'google_play')
    assert.equal(reconciledPurchases[0][0].transactionId, 'purchase_direct')
    assert.equal(finished.length, 1)
    assert.equal(finished[0].purchase.transactionId, 'purchase_direct')
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
