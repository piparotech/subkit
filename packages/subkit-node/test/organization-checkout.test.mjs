import assert from 'node:assert/strict'
import test from 'node:test'

import { SubKit } from '../dist/index.js'

const purchaseReference = '00000000-0000-4000-8000-000000000001'

test('organization purchase methods retain generic pools and bind responses to the request', async () => {
  const requests = []
  let result = {
    purchaseReference,
    subjectId: 'verified-owner',
    organizationSubjectId: 'org',
    status: 'associated',
  }
  const client = new SubKit({
    apiBaseUrl: 'https://subkit.invalid',
    appId: 'app',
    secretKey: 'sk_srv_fixture',
    fetch: async (url, init) => {
      requests.push({
        path: new URL(url).pathname,
        body: JSON.parse(init.body),
        key: init.headers.get('idempotency-key'),
      })
      return Response.json(result)
    },
  })
  const input = {
    purchaseReference,
    subjectId: 'verified-owner',
    organizationName: 'Acme',
    reason: 'Verified buyer association',
  }
  assert.deepEqual(
    await client.checkout.associateOrganizationGuestPurchase(input, {
      idempotencyKey: purchaseReference,
    }),
    result,
  )
  assert.deepEqual(requests[0], {
    path: '/api/server/guest-checkout/organization-associate',
    body: { ...input, appId: 'app' },
    key: purchaseReference,
  })
  result = { ...result, subjectId: 'foreign' }
  await assert.rejects(
    client.checkout.associateOrganizationGuestPurchase(input, {
      idempotencyKey: purchaseReference,
    }),
  )
  assert.throws(() =>
    client.checkout.associateOrganizationGuestPurchase(
      { ...input, clubName: 'wrong contract' },
      { idempotencyKey: purchaseReference },
    ),
  )
  result = {
    purchaseReference,
    checkoutIntentId: 'checkout-intent:one',
    environment: 'sandbox',
    organizationSubjectId: 'org',
    accessReady: true,
    pools: [
      { key: 'editors', capacity: 12, used: 2, reserved: 1, entitlementKeys: ['edit'] },
      { key: 'viewers', capacity: null, used: 100, reserved: 0, entitlementKeys: ['view'] },
    ],
  }
  assert.deepEqual(
    await client.checkout.getOrganizationGuestAccess({
      purchaseReference,
      subjectId: 'verified-owner',
    }),
    result,
  )
  result = { ...result, purchaseReference: '00000000-0000-4000-8000-000000000002' }
  await assert.rejects(
    client.checkout.getOrganizationGuestAccess({ purchaseReference, subjectId: 'verified-owner' }),
  )
})
