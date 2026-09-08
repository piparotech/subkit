import assert from 'node:assert/strict'
import test from 'node:test'

import { serverDirectCheckoutOfferingResponseSchema as schema } from '../dist/index.js'

test('checkout offering requires ISO billing periods and exactly representable amounts', () => {
  const item = {
    audience: 'individual',
    pools: [],
    entitlements: [],
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

test('organization packages keep arbitrary pools and entitlement mappings separate', () => {
  const item = {
    identifier: 'workspace',
    label: 'Workspace',
    amountMicros: 12000000,
    currencyCode: 'EUR',
    billingPeriodIso: 'P1M',
    audience: 'organization',
    entitlements: [{ key: 'edit', grantMode: 'while_source_active', durationIso: null }],
    pools: [
      {
        key: 'editors',
        capacity: 12,
        capacityChangePolicy: 'forbidden',
        entitlementKeys: ['edit'],
        reservationMode: 'required',
        reservationTtlIso: 'P7D',
      },
      {
        key: 'jobs',
        capacity: 250,
        capacityChangePolicy: 'renewal_only',
        entitlementKeys: [],
        reservationMode: 'disabled',
        reservationTtlIso: null,
      },
      {
        key: 'viewers',
        capacity: null,
        capacityChangePolicy: 'forbidden',
        entitlementKeys: [],
        reservationMode: 'disabled',
        reservationTtlIso: null,
      },
    ],
  }
  const payload = { environment: 'sandbox', identifier: 'workspace', packages: [item] }
  assert.deepEqual(schema.parse(payload), payload)
  assert.equal(
    schema.safeParse({ ...payload, packages: [{ ...item, audience: 'club' }] }).success,
    false,
  )
  assert.equal(
    schema.safeParse({ ...payload, packages: [{ ...item, pools: [...item.pools, item.pools[0]] }] })
      .success,
    false,
  )
})
