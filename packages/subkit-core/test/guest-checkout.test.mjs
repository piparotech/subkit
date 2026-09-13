import assert from 'node:assert/strict'
import test from 'node:test'

import { serverGuestCheckoutSessionRequestSchema as schema } from '../dist/index.js'

test('guest checkout selects a published tariff without account authority or raw payment data', () => {
  const request = {
    appId: 'app',
    purchaseReference: '945b91e5-d348-4da5-90f6-03fce428e391',
    offeringIdentifier: 'default',
    packageIdentifier: 'annual',
    returnTarget: 'smartcoach-buy',
    reason: 'Public license purchase',
  }
  assert.deepEqual(schema.parse(request), request)
  for (const field of [
    'subjectId',
    'billingAccountId',
    'email',
    'environment',
    'amountMicros',
    'externalPriceId',
    'successUrl',
    'browserId',
  ]) {
    assert.equal(schema.safeParse({ ...request, [field]: 'untrusted' }).success, false, field)
  }
  assert.equal(schema.safeParse({ ...request, purchaseReference: 'guessable' }).success, false)
  for (const returnTarget of ['', 'https://example.com', '/purchase', 'buy?next=evil']) {
    assert.equal(schema.safeParse({ ...request, returnTarget }).success, false, returnTarget)
  }
})
