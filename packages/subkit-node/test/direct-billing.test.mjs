import assert from 'node:assert/strict'
import test from 'node:test'

import { SubKit } from '../dist/index.js'

test('direct billing clients send app-bound catalog and ownership references', async () => {
  const requests = []
  const fetch = async (input, init) => {
    const url = String(input)
    requests.push({
      body: JSON.parse(String(init.body)),
      headers: new Headers(init.headers),
      method: init.method,
      url,
    })
    return Response.json(responseFor(new URL(url).pathname))
  }
  const subkit = new SubKit({
    apiBaseUrl: 'https://subkit.example.com/',
    appId: 'app_123',
    fetch,
    secretKey: 'sk_srv_test',
  })

  const checkout = await subkit.checkout.createSession(
    {
      billingAccountId: 'billing_account_123',
      offeringIdentifier: 'default',
      packageIdentifier: 'monthly',
      reason: 'start selected direct billing checkout',
      returnTarget: 'billing_settings',
      subjectId: 'subject_123',
    },
    { idempotencyKey: 'checkout:subject_123:monthly' },
  )
  const portal = await subkit.billing.createPortalSession(
    {
      billingAccountId: 'billing_account_123',
      reason: 'open billing settings',
      subjectId: 'subject_123',
    },
    { idempotencyKey: 'portal:subject_123' },
  )
  const summary = await subkit.billing.getSummary({
    billingAccountId: 'billing_account_123',
    subjectId: 'subject_123',
  })

  assert.equal(checkout.checkoutIntentId, 'checkout_intent_opaque')
  assert.equal(portal.portalIntentId, 'portal_intent_opaque')
  assert.equal(summary.status, 'active')
  assert.deepEqual(
    requests.map(({ method, url }) => [method, new URL(url).pathname]),
    [
      ['POST', '/api/server/direct-billing/checkout-session'],
      ['POST', '/api/server/direct-billing/portal-session'],
      ['POST', '/api/server/direct-billing/summary'],
    ],
  )
  assert.deepEqual(requests[0].body, {
    appId: 'app_123',
    billingAccountId: 'billing_account_123',
    offeringIdentifier: 'default',
    packageIdentifier: 'monthly',
    reason: 'start selected direct billing checkout',
    returnTarget: 'billing_settings',
    subjectId: 'subject_123',
  })
  assert.deepEqual(requests[1].body, {
    appId: 'app_123',
    billingAccountId: 'billing_account_123',
    reason: 'open billing settings',
    subjectId: 'subject_123',
  })
  assert.deepEqual(requests[2].body, {
    appId: 'app_123',
    billingAccountId: 'billing_account_123',
    subjectId: 'subject_123',
  })
  assert.equal(requests[0].headers.get('idempotency-key'), 'checkout:subject_123:monthly')
  assert.equal(requests[1].headers.get('idempotency-key'), 'portal:subject_123')
  assert.equal(requests[2].headers.get('idempotency-key'), null)
})

function responseFor(path) {
  if (path === '/api/server/direct-billing/checkout-session') {
    return {
      checkoutIntentId: 'checkout_intent_opaque',
      redirectUrl: 'https://billing.example.test/checkout/short-lived-token',
      redirectUrlExpiresAt: '2027-01-01T00:15:00.000Z',
    }
  }
  if (path === '/api/server/direct-billing/portal-session') {
    return {
      portalIntentId: 'portal_intent_opaque',
      redirectUrl: 'https://billing.example.test/portal/short-lived-token',
      redirectUrlExpiresAt: '2027-01-01T00:15:00.000Z',
    }
  }
  if (path === '/api/server/direct-billing/summary') {
    return {
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
  }
  throw new Error(`Unexpected request: ${path}`)
}
