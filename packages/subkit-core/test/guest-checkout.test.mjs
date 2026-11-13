import assert from 'node:assert/strict'
import test from 'node:test'

import {
  serverGuestCheckoutSessionRequestSchema as schema,
  serverGuestCheckoutStatusResponseSchema as statusSchema,
} from '../dist/index.js'

test('guest checkout selects a published tariff without account authority or raw payment data', () => {
  const request = {
    selectionRevision: 'a'.repeat(64),
    appId: 'app',
    purchaseReference: '945b91e5-d348-4da5-90f6-03fce428e391',
    offeringIdentifier: 'default',
    packageIdentifier: 'annual',
    returnTarget: 'smartcoach-buy',
    reason: 'Public license purchase',
  }
  assert.deepEqual(schema.parse(request), request)
  assert.equal(schema.safeParse({ ...request, selectionRevision: undefined }).success, false)
  assert.equal(schema.safeParse({ ...request, selectionRevision: 'invalid' }).success, false)
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

test('guest checkout status carries the collected payer identity additively', () => {
  const status = {
    checkoutIntentId: 'checkout-intent:intent-a',
    environment: 'sandbox',
    status: 'completed',
    expiresAt: '2026-09-16T12:30:00.000Z',
    paymentVerified: true,
  }
  // A service that does not return the payer fields yet stays valid.
  assert.deepEqual(statusSchema.parse(status), status)

  const withPayer = {
    ...status,
    payerAddress: {
      line1: 'Teststrasse 1',
      line2: null,
      city: 'Wien',
      postalCode: '1010',
      state: null,
      country: 'AT',
    },
    payerEmail: 'payer@example.test',
  }
  assert.deepEqual(statusSchema.parse(withPayer), withPayer)
  assert.deepEqual(statusSchema.parse({ ...status, payerAddress: null, payerEmail: null }), {
    ...status,
    payerAddress: null,
    payerEmail: null,
  })

  for (const invalid of [
    { ...status, payerEmail: 42 },
    { ...status, payerAddress: { line1: 'x' } },
    {
      ...status,
      payerAddress: {
        line1: null,
        line2: null,
        city: null,
        postalCode: null,
        state: null,
        country: null,
        extra: 'x',
      },
    },
    { ...status, payerUnknown: 'x' },
  ]) {
    assert.equal(statusSchema.safeParse(invalid).success, false)
  }
})

test('guest checkout accepts the buyer fields of a one-time purchase additively', () => {
  const request = {
    selectionRevision: 'a'.repeat(64),
    appId: 'app',
    purchaseReference: '945b91e5-d348-4da5-90f6-03fce428e391',
    offeringIdentifier: 'default',
    packageIdentifier: 'license',
    returnTarget: 'buy',
    reason: 'Public license purchase',
  }
  assert.deepEqual(schema.parse(request), request)

  const withBuyer = {
    ...request,
    customerEmail: 'buyer@example.test',
    consents: { immediateProvision: true, waiverConfirmed: false, textVersion: '2026-11-10' },
    appReference: 'LIC-1',
    renewal: true,
    renewalStartsOn: '2027-11-10',
  }
  assert.deepEqual(schema.parse(withBuyer), withBuyer)
  assert.equal(schema.parse(withBuyer).consents.waiverConfirmed, false)

  for (const [field, value] of [
    ['customerEmail', 'not-an-address'],
    ['customerEmail', `${'a'.repeat(250)}@example.test`],
    ['consents', { immediateProvision: true, waiverConfirmed: true }],
    ['consents', { immediateProvision: 'yes', waiverConfirmed: true, textVersion: 'v1' }],
    ['consents', { immediateProvision: true, waiverConfirmed: true, textVersion: '' }],
    ['consents', { immediateProvision: true, waiverConfirmed: true, textVersion: 'v1', at: 1 }],
    ['appReference', ''],
    ['appReference', 'L'.repeat(65)],
    ['renewal', 'true'],
    ['renewalStartsOn', '2027-11-10T00:00:00.000Z'],
    ['renewalStartsOn', '2027-13-01'],
  ]) {
    assert.equal(schema.safeParse({ ...request, [field]: value }).success, false, field)
  }
})

test('guest checkout status carries the app reference and the provision day additively', () => {
  const status = {
    checkoutIntentId: 'checkout-intent:intent-a',
    environment: 'production',
    status: 'completed',
    expiresAt: '2026-11-10T12:30:00.000Z',
    paymentVerified: true,
  }
  assert.deepEqual(statusSchema.parse(status), status)

  const withPurchase = { ...status, appReference: 'LIC-1', provisionOn: '2026-11-24' }
  assert.deepEqual(statusSchema.parse(withPurchase), withPurchase)
  assert.deepEqual(statusSchema.parse({ ...status, appReference: null, provisionOn: null }), {
    ...status,
    appReference: null,
    provisionOn: null,
  })

  for (const invalid of [
    { ...status, appReference: '' },
    { ...status, appReference: 'L'.repeat(65) },
    { ...status, provisionOn: '2026-11-24T00:00:00.000Z' },
    { ...status, provisionOn: 20261124 },
  ]) {
    assert.equal(statusSchema.safeParse(invalid).success, false)
  }
})
