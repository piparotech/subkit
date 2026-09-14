import assert from 'node:assert/strict'
import test from 'node:test'

import {
  serverBillingManagementResponseSchema,
  serverBillingPortalSessionRequestSchema,
  serverDirectBillingSummaryResponseSchema,
} from '../dist/index.js'

const accountContext = 'a'.repeat(64)
const portal = { appId: 'app', subjectId: 'owner', reason: 'Manage billing' }
const management = {
  appId: 'app',
  subjectId: 'owner',
  environment: 'production',
  checkedAt: '2026-09-14T00:00:00.000Z',
  providers: ['stripe'],
}
const emptySummary = {
  environment: 'production',
  amountMicros: null,
  billingPeriodIso: null,
  cancelAtPeriodEnd: false,
  currencyCode: null,
  currentPeriodEnd: null,
  currentPeriodStart: null,
  nextBillingAt: null,
  offeringIdentifier: null,
  packageIdentifier: null,
  planKey: null,
  planLabel: null,
  status: 'none',
}

test('portal refuses an unbound request and accepts the exact opaque account context', () => {
  assert.equal(serverBillingPortalSessionRequestSchema.safeParse(portal).success, false)
  assert.equal(
    serverBillingPortalSessionRequestSchema.parse({ ...portal, accountContext }).accountContext,
    accountContext,
  )
  for (const value of [null, '', 'cus_provider', 'a'.repeat(63), 'Z'.repeat(64)]) {
    assert.equal(
      serverBillingPortalSessionRequestSchema.safeParse({ ...portal, accountContext: value })
        .success,
      false,
    )
  }
})

test('management requires a context exactly when Stripe ownership is present', () => {
  assert.equal(serverBillingManagementResponseSchema.safeParse(management).success, false)
  assert.equal(
    serverBillingManagementResponseSchema.parse({ ...management, accountContext }).accountContext,
    accountContext,
  )
  assert.equal(
    serverBillingManagementResponseSchema.safeParse({ ...management, accountContext: null })
      .success,
    false,
  )
  assert.equal(
    serverBillingManagementResponseSchema.parse({
      ...management,
      providers: ['apple'],
      accountContext: null,
    }).accountContext,
    null,
  )
  assert.equal(
    serverBillingManagementResponseSchema.safeParse({
      ...management,
      providers: [],
      accountContext,
    }).success,
    false,
  )
})

test('summary distinguishes an owned account without subscription from no owned account', () => {
  assert.equal(
    serverDirectBillingSummaryResponseSchema.parse({ ...emptySummary, accountContext })
      .accountContext,
    accountContext,
  )
  assert.equal(
    serverDirectBillingSummaryResponseSchema.parse({ ...emptySummary, accountContext: null })
      .accountContext,
    null,
  )
  assert.equal(
    serverDirectBillingSummaryResponseSchema.safeParse({
      ...emptySummary,
      status: 'active',
      accountContext: null,
    }).success,
    false,
  )
  assert.equal(serverDirectBillingSummaryResponseSchema.safeParse(emptySummary).success, false)
})
