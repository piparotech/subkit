import { strict as assert } from 'node:assert'
import test from 'node:test'

import {
  serverBillingPortalSessionRequestSchema,
  serverBillingPortalSessionResponseSchema,
  serverDirectBillingSummaryRequestSchema,
  serverDirectBillingSummaryResponseSchema,
  serverDirectCheckoutSessionRequestSchema,
  serverDirectCheckoutSessionResponseSchema,
} from '../dist/index.js'

test('direct billing requests are app-bound and offering/package driven', () => {
  const checkout = serverDirectCheckoutSessionRequestSchema.parse({
    appId: 'app_123',
    billingAccountId: 'billing_account_123',
    offeringIdentifier: 'default',
    packageIdentifier: 'monthly',
    reason: 'start selected direct billing checkout',
    returnTarget: 'billing_settings',
    subjectId: 'subject_123',
  })

  assert.equal(checkout.packageIdentifier, 'monthly')
  assert.throws(() =>
    serverDirectCheckoutSessionRequestSchema.parse({
      ...checkout,
      amount: 1200,
    }),
  )
  assert.throws(() =>
    serverDirectCheckoutSessionRequestSchema.parse({
      ...checkout,
      cancelUrl: 'https://evil.example/cancel',
    }),
  )
  assert.throws(() =>
    serverDirectCheckoutSessionRequestSchema.parse({
      ...checkout,
      stripePriceId: 'price_secret',
    }),
  )
  assert.throws(() =>
    serverDirectCheckoutSessionRequestSchema.parse({
      ...checkout,
      returnTarget: 'https://example.com/return',
    }),
  )
})

test('direct billing session responses expose only opaque intents and expiring redirects', () => {
  const checkout = serverDirectCheckoutSessionResponseSchema.parse({
    checkoutIntentId: 'checkout_intent_opaque',
    redirectUrl: 'https://billing.example.test/checkout/short-lived-token',
    redirectUrlExpiresAt: '2027-01-01T00:15:00.000Z',
  })
  const portal = serverBillingPortalSessionResponseSchema.parse({
    portalIntentId: 'portal_intent_opaque',
    redirectUrl: 'https://billing.example.test/portal/short-lived-token',
    redirectUrlExpiresAt: '2027-01-01T00:15:00.000Z',
  })

  assert.equal(checkout.checkoutIntentId, 'checkout_intent_opaque')
  assert.equal(portal.portalIntentId, 'portal_intent_opaque')
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

test('billing portal and summary contracts retain ownership references and canonical fields', () => {
  const portalRequest = serverBillingPortalSessionRequestSchema.parse({
    appId: 'app_123',
    billingAccountId: 'billing_account_123',
    reason: 'open billing settings',
    subjectId: 'subject_123',
  })
  const summaryRequest = serverDirectBillingSummaryRequestSchema.parse({
    appId: 'app_123',
    billingAccountId: 'billing_account_123',
    subjectId: 'subject_123',
  })
  const summary = serverDirectBillingSummaryResponseSchema.parse({
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
  })

  assert.equal(portalRequest.billingAccountId, summaryRequest.billingAccountId)
  assert.equal(summary.status, 'active')
  assert.equal(summary.cancelAtPeriodEnd, false)
  assert.throws(() =>
    serverDirectBillingSummaryResponseSchema.parse({
      ...summary,
      paymentMethod: { brand: 'visa', last4: '4242' },
    }),
  )
})
