import { strict as assert } from 'node:assert'
import test from 'node:test'

import { client, configureSubKit, getSubKitHasAccessSnapshot } from '../dist/index.js'

const APP_USER_ID = 'user_123'
const VERIFIED_CONTEXT = 'ctx_verified'
const TRANSACTION_ID = 'tx_123'

const purchase = {
  environment: 'production',
  originalTransactionId: TRANSACTION_ID,
  productId: 'premium_weekly',
  quantity: 1,
  raw: {},
  store: 'apple_app_store',
  transactionDate: Date.parse('2026-07-01T00:00:00.000Z'),
  transactionId: TRANSACTION_ID,
}

const offering = {
  description: 'Default paywall',
  identifier: 'default',
  metadata: {},
  name: 'Default',
  packages: [
    {
      badge: null,
      identifier: 'weekly',
      label: 'Weekly',
      product: {
        description: 'Premium',
        displayName: 'Premium',
        entitlements: [{ durationIso: null, grantMode: 'while_source_active', key: 'pro' }],
        kind: 'subscription',
        offers: [],
        plan: {
          billingKind: 'recurring',
          billingPeriodIso: 'P1W',
          fixedTermIso: null,
          gracePeriodIso: null,
          id: 'plan_weekly',
          key: 'weekly',
          version: 1,
          versionId: 'plan_version_weekly',
        },
        pools: [],
        prices: [],
        productId: 'product_premium',
        productKey: 'premium',
        storeProductIds: {
          apple: { offerIds: [], productId: 'premium_weekly', subscriptionGroupId: 'group_1' },
        },
        trial: null,
      },
    },
  ],
}

function createCustomerInfo(withAccess) {
  return {
    accessContext: withAccess
      ? { expiresAt: '2099-01-01T00:00:00.000Z', token: VERIFIED_CONTEXT }
      : null,
    appId: 'app_123',
    appUserId: APP_USER_ID,
    checkedAt: '2026-07-01T00:00:01.000Z',
    entitlements: withAccess
      ? {
          pro: {
            active: true,
            entitlementKey: 'pro',
            expiresAt: '2099-01-01T00:00:00.000Z',
            planKey: 'weekly',
            productIdentifier: 'premium_weekly',
            source: 'apple',
            startsAt: '2026-07-01T00:00:00.000Z',
            status: 'active',
            verifiedAt: '2026-07-01T00:00:01.000Z',
          },
        }
      : {},
    freshness: 'fresh',
    purchases: [],
    unclaimedPurchases: [],
  }
}

function createSyncResult(accepted, withAccess) {
  return {
    acceptedPurchases: accepted ? [TRANSACTION_ID] : [],
    checkedAt: '2026-07-01T00:00:01.000Z',
    conflicts: [],
    customerInfo: createCustomerInfo(withAccess),
    finishableTransactions: accepted
      ? [
          {
            isConsumable: false,
            purchaseId: `apple_app_store:tx:${TRANSACTION_ID}`,
            store: 'apple_app_store',
            transactionId: TRANSACTION_ID,
          },
        ]
      : [],
    rejectedPurchases: [],
    verificationStatus: accepted ? 'verified' : 'failed',
  }
}

// Like the service: a Store-portable entitlement is visible only with the
// signed access context, and an empty reconcile adds no Store evidence.
function respond(path, body) {
  const hasContext = body.accessContext === VERIFIED_CONTEXT
  if (path === '/api/runtime/customer-info') return createCustomerInfo(hasContext)
  if (path === '/api/runtime/offerings')
    return { all: [offering], appId: 'app_123', current: offering }
  if (path === '/api/runtime/iap/reconcile') {
    return body.purchases.length > 0
      ? createSyncResult(true, true)
      : createSyncResult(false, hasContext)
  }
  throw new Error(`Unexpected SubKit request ${path}`)
}

function installFetch() {
  const previousFetch = globalThis.fetch
  globalThis.fetch = async (url, request) => {
    const body = request?.body == null ? {} : JSON.parse(String(request.body))
    return new Response(JSON.stringify(respond(new URL(String(url)).pathname, body)), {
      status: 200,
    })
  }
  return () => {
    globalThis.fetch = previousFetch
  }
}

// expo-iap reports every requested purchase through purchaseUpdatedListener too.
function createAdapterBundle() {
  const purchaseListeners = new Set()
  return {
    iap: {
      async fetchProducts() {
        return [{ displayPrice: '2,99 €', id: 'premium_weekly', raw: {}, type: 'subs' }]
      },
      async finishTransaction() {},
      async getAvailablePurchases() {
        return []
      },
      async initConnection() {
        return true
      },
      async requestPurchase() {
        for (const listener of purchaseListeners) listener(purchase)
        return [purchase]
      },
    },
    listeners: {
      addPurchaseErrorListener: () => ({ remove() {} }),
      addPurchaseUpdatedListener(listener) {
        purchaseListeners.add(listener)
        return { remove: () => purchaseListeners.delete(listener) }
      },
    },
  }
}

test('purchase listener replay keeps the access verified by purchasePackage', async () => {
  const restoreFetch = installFetch()
  try {
    const configuredClient = configureSubKit({
      adapterBundle: createAdapterBundle(),
      apiBaseUrl: 'https://subkit.test',
      appStateSource: {
        getCurrentState: () => 'active',
        subscribe: () => ({ remove() {} }),
      },
      installationId: 'install_123',
      platform: 'ios',
      sdkKey: 'runtime_public_key',
    })
    await configuredClient.start()
    await configuredClient.identify(APP_USER_ID)

    const result = await configuredClient.purchasePackage('weekly')
    await configuredClient.getOfferings()

    assert.equal(result.status, 'verified')
    assert.equal(getSubKitHasAccessSnapshot('pro'), true)
  } finally {
    client.stop()
    restoreFetch()
  }
})
