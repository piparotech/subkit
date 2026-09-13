import assert from 'node:assert/strict'
import test from 'node:test'

import * as core from '../dist/index.js'

test('organization subscription exposes verified periods separately from effective access', () => {
  const schema = core.serverOrganizationSubscriptionResponseSchema
  assert.ok(schema, 'Organization subscription contract is missing')
  const response = {
    appId: 'app',
    subjectId: 'owner',
    purchaseReference: '945b91e5-d348-4da5-90f6-03fce428e391',
    organizationSubjectId: 'org',
    environment: 'sandbox',
    accessReady: false,
    subscription: {
      status: 'canceled',
      currentPeriodStart: '2026-09-10T09:18:37.000Z',
      currentPeriodEnd: '2027-09-10T09:18:37.000Z',
      cancelAtPeriodEnd: false,
    },
  }
  assert.deepEqual(schema.parse(response), response)
  assert.equal(
    schema.safeParse({
      ...response,
      subscription: { ...response.subscription, currentPeriodEnd: 'invented' },
    }).success,
    false,
  )
  assert.equal(schema.safeParse({ ...response, subscription: null }).success, true)
  assert.equal(
    schema.safeParse({ ...response, accessReady: true, subscription: null }).success,
    false,
  )
})
