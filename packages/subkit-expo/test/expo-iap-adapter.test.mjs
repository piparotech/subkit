import { setAvailablePurchasesForTest } from 'expo-iap'
import { strict as assert } from 'node:assert'
import test from 'node:test'

import { createExpoIapAdapter } from '../dist/expoIapAdapter.js'

test('preserves StoreKit environment values for server verification', async () => {
  setAvailablePurchasesForTest(
    ['Sandbox', 'Production', 'sandbox', 'production', 'Xcode', undefined].map(
      (environmentIOS) => ({
        environmentIOS,
        productId: 'pro_weekly',
        store: 'apple',
        transactionDate: 1,
        transactionId: 'transaction',
      }),
    ),
  )

  try {
    const purchases = await createExpoIapAdapter().iap.getAvailablePurchases()
    assert.deepEqual(
      purchases.map((purchase) => purchase.environment),
      ['sandbox', 'production', 'sandbox', 'production', 'unknown', 'unknown'],
    )
  } finally {
    setAvailablePurchasesForTest([])
  }
})
