import assert from 'node:assert/strict'
import test from 'node:test'

import { serverDirectCheckoutOfferingResponseSchema as schema } from '../dist/index.js'

test('checkout offering requires ISO billing periods and exactly representable amounts', () => {
  const item = {
    identifier: 'monthly',
    label: 'Monthly',
    amountMicros: 5990000,
    currencyCode: 'EUR',
    billingPeriodIso: 'P1M',
  }
  const parse = (change) =>
    schema.safeParse({
      environment: 'sandbox',
      identifier: 'default',
      packages: [{ ...item, ...change }],
    }).success
  assert.equal(parse({}), true)
  assert.equal(parse({ billingPeriodIso: 'monthly' }), false)
  assert.equal(parse({ amountMicros: Number.MAX_SAFE_INTEGER + 1 }), false)
})
