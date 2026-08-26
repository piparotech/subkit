import { strict as assert } from 'node:assert'
import test from 'node:test'

import {
  serverBillingPortalSessionRequestSchema,
  serverBillingPortalSessionResponseSchema,
  serverDirectBillingStatusSchema,
  serverDirectBillingSummaryRequestSchema,
  serverDirectBillingSummaryResponseSchema,
  serverDirectCheckoutSessionRequestSchema,
  serverDirectCheckoutSessionResponseSchema,
} from '../dist/index.js'

const validCheckoutRequest = {
  appId: 'app_123',
  offeringIdentifier: 'default',
  packageIdentifier: 'monthly',
  reason: 'start selected direct billing checkout',
  returnTarget: 'billing_settings',
  subjectId: 'subject_123',
}

const validSummary = {
  amountMicros: 1200000,
  billingPeriodIso: 'P1M',
  cancelAtPeriodEnd: false,
  currencyCode: 'EUR',
  currentPeriodEnd: '2027-02-01T00:00:00.000Z',
  currentPeriodStart: '2027-01-01T00:00:00.000Z',
  nextBillingAt: '2027-02-01T00:00:00.000Z',
  offeringIdentifier: 'default',
  packageIdentifier: 'monthly',
  planKey: 'pro_monthly',
  planLabel: 'Pro monthly',
  status: 'active',
}

test('direct billing requests are app-bound and Subject-driven', () => {
  const checkout = serverDirectCheckoutSessionRequestSchema.parse(validCheckoutRequest)
  const portal = serverBillingPortalSessionRequestSchema.parse({
    appId: 'app_123',
    reason: 'open billing settings',
    subjectId: 'subject_123',
  })
  const summary = serverDirectBillingSummaryRequestSchema.parse({
    appId: 'app_123',
    subjectId: 'subject_123',
  })

  assert.equal(checkout.subjectId, 'subject_123')
  assert.equal(portal.subjectId, 'subject_123')
  assert.equal(summary.subjectId, 'subject_123')
  assert.throws(() =>
    serverDirectCheckoutSessionRequestSchema.parse({
      ...validCheckoutRequest,
      billingAccountId: 'account_123',
    }),
  )
  assert.throws(() =>
    serverBillingPortalSessionRequestSchema.parse({
      appId: 'app_123',
      billingAccountId: 'account_123',
      reason: 'open billing settings',
      subjectId: 'subject_123',
    }),
  )
  assert.throws(() =>
    serverDirectBillingSummaryRequestSchema.parse({
      appId: 'app_123',
      billingAccountId: 'account_123',
      subjectId: 'subject_123',
    }),
  )
  assert.throws(() =>
    serverDirectCheckoutSessionRequestSchema.parse({ ...validCheckoutRequest, amount: 1200 }),
  )
  assert.throws(() =>
    serverDirectCheckoutSessionRequestSchema.parse({
      ...validCheckoutRequest,
      cancelUrl: 'https://evil.example/cancel',
    }),
  )
  assert.throws(() =>
    serverDirectCheckoutSessionRequestSchema.parse({
      ...validCheckoutRequest,
      stripePriceId: 'price_secret',
    }),
  )
  assert.throws(() =>
    serverDirectCheckoutSessionRequestSchema.parse({
      ...validCheckoutRequest,
      returnTarget: 'https://example.com/return',
    }),
  )
})

test('direct billing session responses expose service-owned intents and HTTPS redirects', () => {
  const checkout = serverDirectCheckoutSessionResponseSchema.parse({
    checkoutIntentId: 'checkout-intent:opaque_123',
    redirectUrl: 'https://billing.example.test/checkout/short-lived-token',
    redirectUrlExpiresAt: '2027-01-01T00:15:00.000Z',
  })
  const portal = serverBillingPortalSessionResponseSchema.parse({
    portalIntentId: 'billing-portal:opaque_123',
    redirectUrl: 'https://billing.example.test/portal/short-lived-token',
    redirectUrlExpiresAt: '2027-01-01T00:15:00.000Z',
  })

  assert.equal(checkout.checkoutIntentId, 'checkout-intent:opaque_123')
  assert.equal(portal.portalIntentId, 'billing-portal:opaque_123')
  for (const redirectUrl of [
    'javascript:alert(1)',
    'data:text/plain,unsafe',
    'ftp://billing.example.test/checkout',
    'http://billing.example.test/checkout',
  ]) {
    assert.throws(() =>
      serverDirectCheckoutSessionResponseSchema.parse({
        ...checkout,
        redirectUrl,
      }),
    )
    assert.throws(() =>
      serverBillingPortalSessionResponseSchema.parse({
        ...portal,
        redirectUrl,
      }),
    )
  }
  for (const redirectUrlExpiresAt of ['2027-01-01', 'not-a-date']) {
    assert.throws(() =>
      serverDirectCheckoutSessionResponseSchema.parse({
        ...checkout,
        redirectUrlExpiresAt,
      }),
    )
    assert.throws(() =>
      serverBillingPortalSessionResponseSchema.parse({
        ...portal,
        redirectUrlExpiresAt,
      }),
    )
  }
  for (const checkoutIntentId of ['cs_test_123', 'checkout_intent_opaque', 'checkout-intent:']) {
    assert.throws(() =>
      serverDirectCheckoutSessionResponseSchema.parse({
        ...checkout,
        checkoutIntentId,
      }),
    )
  }
  for (const portalIntentId of ['bps_test_123', 'portal_intent_opaque', 'billing-portal:']) {
    assert.throws(() =>
      serverBillingPortalSessionResponseSchema.parse({
        ...portal,
        portalIntentId,
      }),
    )
  }
  assert.throws(() =>
    serverDirectCheckoutSessionResponseSchema.parse({
      ...checkout,
      clientSecret: 'should-not-be-public',
    }),
  )
  assert.throws(() =>
    serverBillingPortalSessionResponseSchema.parse({
      ...portal,
      stripeSessionId: 'raw_provider_id',
    }),
  )
})

test('direct billing summary validates canonical terms and currency', () => {
  const summary = serverDirectBillingSummaryResponseSchema.parse(validSummary)

  assert.equal(summary.status, 'active')
  assert.equal(summary.cancelAtPeriodEnd, false)
  for (const billingPeriodIso of ['one month', 'P']) {
    assert.throws(() =>
      serverDirectBillingSummaryResponseSchema.parse({ ...validSummary, billingPeriodIso }),
    )
  }
  for (const field of ['currentPeriodStart', 'currentPeriodEnd', 'nextBillingAt']) {
    for (const value of ['2027-01-01', 'not-a-date']) {
      assert.throws(() =>
        serverDirectBillingSummaryResponseSchema.parse({ ...validSummary, [field]: value }),
      )
    }
  }
  for (const currencyCode of ['eur', '123']) {
    assert.throws(() =>
      serverDirectBillingSummaryResponseSchema.parse({ ...validSummary, currencyCode }),
    )
  }
  assert.throws(() =>
    serverDirectBillingSummaryResponseSchema.parse({
      ...summary,
      paymentMethod: { brand: 'visa', last4: '4242' },
    }),
  )
})

test('direct billing status schema accepts every canonical provider state and none', () => {
  const statuses = [
    'none',
    'pending',
    'trialing',
    'active',
    'past_due',
    'paused',
    'unpaid',
    'canceled',
    'incomplete',
    'incomplete_expired',
  ]

  for (const status of statuses) assert.equal(serverDirectBillingStatusSchema.parse(status), status)
  assert.throws(() => serverDirectBillingStatusSchema.parse('unknown'))
})
