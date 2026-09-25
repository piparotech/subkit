import { setAvailableProductsForTest } from 'expo-iap'
import { strict as assert } from 'node:assert'
import test from 'node:test'

import { createExpoIapAdapter } from '../dist/expoIapAdapter.js'

test('base-plan fallback uses provider offer identity even when a promotion has the same display id', async () => {
  setAvailableProductsForTest([
    {
      id: 'pro_weekly',
      platform: 'android',
      type: 'subs',
      subscriptionOffers: [
        {
          id: 'weekly',
          basePlanIdAndroid: 'weekly',
          offerTokenAndroid: 'promo',
          displayPrice: '1 €',
        },
        {
          id: 'weekly',
          basePlanIdAndroid: 'weekly',
          offerTokenAndroid: 'base',
          displayPrice: '4 €',
        },
        {
          id: 'weekly',
          basePlanIdAndroid: 'weekly',
          offerTokenAndroid: 'unknown',
          displayPrice: '4 €',
        },
      ],
      subscriptionOfferDetailsAndroid: [
        { basePlanId: 'weekly', offerId: 'weekly', offerToken: 'promo' },
        { basePlanId: 'weekly', offerId: null, offerToken: 'base' },
      ],
    },
  ])
  try {
    const result = await createExpoIapAdapter().iap.fetchProducts({
      skus: ['pro_weekly'],
      type: 'subs',
    })
    assert.deepEqual(
      result[0].subscriptionOffers.map((offer) => offer.isBasePlan),
      [false, true, false],
    )
  } finally {
    setAvailableProductsForTest([])
  }
})
