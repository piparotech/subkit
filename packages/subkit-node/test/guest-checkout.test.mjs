import assert from 'node:assert/strict'
import test from 'node:test'

import { SubKit } from '../dist/index.js'

test('guest transport validates selection, status and exact association without email authority', async () => {
  const purchaseReference = '945b91e5-d348-4da5-90f6-03fce428e391'
  const requests = []
  let response = {
    checkoutIntentId: 'checkout-intent:fixture',
    redirectUrl: 'https://checkout.stripe.com/c/pay/fixture',
    redirectUrlExpiresAt: '2030-01-01T00:00:00.000Z',
  }
  const client = new SubKit({
    appId: 'app',
    apiBaseUrl: 'https://subkit.example.invalid',
    secretKey: 'sk_srv_fixture',
    fetch: async (url, init) => {
      requests.push({
        path: new URL(url).pathname,
        body: JSON.parse(init.body),
        headers: new Headers(init.headers),
      })
      return Response.json(response)
    },
  })
  const selection = {
    purchaseReference,
    offeringIdentifier: 'default',
    packageIdentifier: 'annual',
    returnTarget: 'buy',
    reason: 'Guest purchase',
  }
  const options = { idempotencyKey: 'guest-fixture-key' }
  assert.deepEqual(await client.checkout.createGuestSession(selection, options), response)
  assert.equal(requests[0].path, '/api/server/guest-checkout/sessions')
  assert.equal(requests[0].headers.get('idempotency-key'), options.idempotencyKey)
  assert.deepEqual(requests[0].body, { ...selection, appId: 'app' })
  for (const extra of [
    { subjectId: 'foreign' },
    { email: 'other@example.invalid' },
    { environment: 'production' },
    { amountMicros: 1 },
  ]) {
    assert.throws(() => client.checkout.createGuestSession({ ...selection, ...extra }, options))
  }
  assert.equal(requests.length, 1)
  response = {
    checkoutIntentId: 'checkout-intent:fixture',
    environment: 'sandbox',
    status: 'pending',
    expiresAt: '2030-01-01T00:00:00.000Z',
    paymentVerified: false,
  }
  assert.deepEqual(await client.checkout.getGuestStatus({ purchaseReference }), response)
  assert.equal(requests[1].path, '/api/server/guest-checkout/status')
  response = { ...response, paymentVerified: true }
  await assert.rejects(client.checkout.getGuestStatus({ purchaseReference }))
  const association = {
    purchaseReference,
    subjectId: 'verified-subject',
    reason: 'Verified app session and browser',
  }
  response = { purchaseReference, subjectId: association.subjectId, status: 'associated' }
  assert.deepEqual(await client.checkout.associateGuestPurchase(association, options), response)
  assert.equal(requests.at(-1).path, '/api/server/guest-checkout/associate')
  response = { ...response, subjectId: 'foreign' }
  await assert.rejects(client.checkout.associateGuestPurchase(association, options))
  response = {
    ...response,
    subjectId: association.subjectId,
    purchaseReference: '5ac214f0-79cc-45b5-88e9-a80a7e7c26ec',
  }
  await assert.rejects(client.checkout.associateGuestPurchase(association, options))
})
