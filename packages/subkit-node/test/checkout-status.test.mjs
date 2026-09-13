import assert from 'node:assert/strict'
import test from 'node:test'

import { SubKit } from '../dist/index.js'

test('purchase status validates scope input and rejects inconsistent confirmation', async () => {
  const requests = []
  let accessReady = false
  let checkoutIntentId = 'checkout-intent:fixture'
  const client = new SubKit({
    apiBaseUrl: 'https://subkit.example.invalid',
    appId: 'app',
    secretKey: 'sk_srv_fixture',
    fetch: async (url, init) => {
      requests.push({ path: new URL(url).pathname, body: JSON.parse(init.body) })
      return Response.json({
        checkoutIntentId,
        environment: 'sandbox',
        status: 'pending',
        accessReady,
        completedAt: null,
        source: null,
        expiresAt: '2026-09-08T00:00:00Z',
      })
    },
  })
  const input = {
    subjectId: 'subject',
    checkoutIntentId: 'checkout-intent:fixture',
    entitlement: 'access',
  }
  assert.equal((await client.checkout.getStatus(input)).accessReady, false)
  assert.deepEqual(requests, [
    { path: '/api/server/direct-checkout/status', body: { ...input, appId: 'app' } },
  ])
  assert.throws(() => client.checkout.getStatus({ ...input, environment: 'production' }))
  assert.equal(requests.length, 1)
  checkoutIntentId = 'checkout-intent:other'
  await assert.rejects(client.checkout.getStatus(input))
  checkoutIntentId = input.checkoutIntentId
  accessReady = true
  await assert.rejects(client.checkout.getStatus(input))
})
