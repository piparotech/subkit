import assert from 'node:assert/strict'
import test from 'node:test'

import { SubKit } from '../dist/index.js'

test('offering read sends no buyer subject and validates exact public projection', async () => {
  const requests = []
  let result = {
    environment: 'sandbox',
    identifier: 'default',
    packages: [
      {
        identifier: 'annual',
        label: 'Annual',
        amountMicros: 49990000,
        currencyCode: 'EUR',
        billingPeriodIso: 'P1Y',
      },
    ],
  }
  const client = new SubKit({
    apiBaseUrl: 'https://subkit.example.invalid',
    appId: 'app',
    secretKey: 'sk_srv_fixture',
    fetch: async (url, init) => {
      requests.push({ path: new URL(url).pathname, body: JSON.parse(init.body) })
      return Response.json(result)
    },
  })
  assert.deepEqual(await client.checkout.getOffering({ offeringIdentifier: 'default' }), result)
  assert.deepEqual(requests, [
    {
      path: '/api/server/direct-checkout/offering',
      body: { appId: 'app', offeringIdentifier: 'default' },
    },
  ])
  assert.throws(() =>
    client.checkout.getOffering({ offeringIdentifier: 'default', subjectId: 'forbidden' }),
  )
  assert.throws(() =>
    client.checkout.getOffering({ offeringIdentifier: 'default', environment: 'production' }),
  )
  assert.equal(requests.length, 1)
  const valid = result
  for (const invalid of [
    { ...valid, identifier: 'foreign' },
    { ...valid, customerId: 'private' },
    { ...valid, packages: [...valid.packages, ...valid.packages] },
    { ...valid, packages: [{ ...valid.packages[0], amountMicros: -1 }] },
  ]) {
    result = invalid
    await assert.rejects(client.checkout.getOffering({ offeringIdentifier: 'default' }))
  }
})
