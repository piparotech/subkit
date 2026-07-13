import assert from 'node:assert/strict'
import test from 'node:test'

import { SubKit } from '../dist/index.js'

test('typed customer, contract, and access clients send scoped idempotent requests', async () => {
  const requests = []
  const fetch = async (input, init) => {
    const url = String(input)
    requests.push({
      body: JSON.parse(String(init.body)),
      headers: new Headers(init.headers),
      method: init.method,
      url,
    })
    return Response.json(responseFor(url, init.method))
  }
  const subkit = new SubKit({
    apiBaseUrl: 'https://subkit.example.com/',
    appId: 'smartcoach',
    fetch,
    secretKey: 'sk_srv_test',
  })

  const subject = await subkit.customers.upsertSubject(
    { externalId: 'trainer-1', kind: 'app_user' },
    { idempotencyKey: 'subject-1' },
  )
  const account = await subkit.customers.createBillingAccount(
    { displayName: 'FC Example', kind: 'organization' },
    { idempotencyKey: 'account-1' },
  )
  const contract = await subkit.contracts.create(
    {
      billingAccountId: account.id,
      externalContractId: 'contract-1',
      planVersionId: 'version-1',
      termStart: new Date('2027-01-01T00:00:00Z'),
    },
    { idempotencyKey: 'contract-1' },
  )
  await subkit.access.enrollFree(
    { planVersionId: 'version-free', subjectId: subject.id },
    { idempotencyKey: 'free-enrollment-1' },
  )
  await subkit.access.redeemPromotionCode(
    { code: 'SMART-COACH-30', subjectId: subject.id },
    { idempotencyKey: 'promotion-redemption-1' },
  )
  await subkit.access.reserve(
    { claimTokenHash: 'h'.repeat(64), poolId: contract.poolIds[0] },
    { idempotencyKey: 'reserve-1' },
  )
  await subkit.access.claim(
    { claimTokenHash: 'h'.repeat(64), subjectId: subject.id },
    { idempotencyKey: 'claim-1' },
  )
  await subkit.access.allocate(
    { externalReference: 'direct-1', poolId: 'pool/a b', subjectId: subject.id },
    { idempotencyKey: 'allocate-1' },
  )
  await subkit.access.updateAllocation(
    { action: 'suspend', allocationId: 'allocation/a b', reason: 'leave' },
    { idempotencyKey: 'suspend-1' },
  )
  await subkit.access.previewPoolCapacity({
    effectiveAt: new Date('2028-01-01T00:00:00Z'),
    newCapacity: 4,
    poolId: 'pool-1',
  })
  await subkit.access.updatePool(
    {
      action: 'change_capacity',
      effectiveAt: new Date('2028-01-01T00:00:00Z'),
      newCapacity: 4,
      poolId: 'pool-1',
      reason: 'renewal',
    },
    { idempotencyKey: 'capacity-1' },
  )
  await subkit.access.revokeReservation(
    { reason: 'cancelled', reservationId: 'reservation/a b' },
    { idempotencyKey: 'revoke-reservation-1' },
  )
  await subkit.access.manualProvision(
    {
      originReference: 'support-1',
      planVersionId: 'version-1',
      reason: 'support case',
      subjectId: subject.id,
      validFrom: new Date('2027-02-01T00:00:00Z'),
    },
    { idempotencyKey: 'manual-1' },
  )

  assert.equal(requests.length, 13)
  assert.deepEqual(
    requests.map(({ method, url }) => [method, new URL(url).pathname]),
    [
      ['POST', '/api/server/subjects/upsert'],
      ['POST', '/api/server/billing-accounts'],
      ['POST', '/api/server/contracts'],
      ['POST', '/api/server/free-enrollments'],
      ['POST', '/api/server/promotion-codes/redeem'],
      ['POST', '/api/server/access-pools/pool-1/reservations'],
      ['POST', '/api/server/access-reservations/claim'],
      ['POST', '/api/server/access-pools/pool%2Fa%20b/allocations'],
      ['PATCH', '/api/server/access-allocations/allocation%2Fa%20b'],
      ['POST', '/api/server/access-pools/pool-1'],
      ['PATCH', '/api/server/access-pools/pool-1'],
      ['DELETE', '/api/server/access-reservations/reservation%2Fa%20b'],
      ['POST', '/api/server/manual-provisions'],
    ],
  )
  for (const request of requests) {
    if (
      request.method !== 'POST' ||
      new URL(request.url).pathname !== '/api/server/access-pools/pool-1'
    ) {
      assert.match(request.headers.get('idempotency-key'), /.+/)
    }
    assert.equal(request.headers.get('authorization'), 'Bearer sk_srv_test')
  }
  assert.equal(requests[0].body.appId, 'smartcoach')
  assert.equal(requests[2].body.appId, 'smartcoach')
  assert.equal(requests[2].body.termStart, '2027-01-01T00:00:00.000Z')
  assert.equal(requests[3].body.appId, 'smartcoach')
  assert.equal(requests[4].body.appId, 'smartcoach')
  assert.equal(requests[6].body.appId, 'smartcoach')
  assert.equal(requests[9].body.effectiveAt, '2028-01-01T00:00:00.000Z')
  assert.equal(requests[10].body.effectiveAt, '2028-01-01T00:00:00.000Z')
  assert.equal(requests[11].body.reason, 'cancelled')
  assert.equal(requests[12].body.appId, 'smartcoach')
  assert.equal(requests[12].body.validFrom, '2027-02-01T00:00:00.000Z')
})

function responseFor(url, method) {
  const path = new URL(url).pathname
  if (path === '/api/server/subjects/upsert') return { id: 'subject-1', status: 'active' }
  if (path === '/api/server/billing-accounts') return { id: 'account-1', status: 'active' }
  if (path === '/api/server/contracts') return { accessSourceId: 'source-1', poolIds: ['pool-1'] }
  if (path === '/api/server/free-enrollments') {
    return {
      accessSourceId: 'source-free',
      allocationIds: ['allocation-free'],
      poolIds: ['pool-free'],
    }
  }
  if (path === '/api/server/promotion-codes/redeem') {
    return {
      accessSourceId: 'source-promotion',
      allocationIds: ['allocation-promotion'],
      poolIds: ['pool-promotion'],
      promotionBenefitId: 'benefit-1',
      promotionCampaignId: 'campaign-1',
    }
  }
  if (path.endsWith('/reservations')) return capacity({ reservationId: 'reservation-1' })
  if (path === '/api/server/access-reservations/claim') {
    return capacity({ allocationId: 'allocation-1' })
  }
  if (path.endsWith('/allocations') || path === '/api/server/manual-provisions') {
    return capacity({ allocationId: 'allocation-2' })
  }
  if (path.startsWith('/api/server/access-allocations/')) return { ok: true }
  if (path === '/api/server/access-pools/pool-1' && method === 'POST') {
    return {
      ...capacity({}),
      decision: 'schedule_at_renewal',
      effectiveAt: '2028-01-01T00:00:00.000Z',
      newCapacity: 4,
      pendingCapacity: null,
      policy: 'renewal_only',
      reason: 'allowed',
    }
  }
  if (path === '/api/server/access-pools/pool-1') return capacity({ poolId: 'pool-1' })
  if (path.startsWith('/api/server/access-reservations/')) return { ok: true }
  throw new Error(`Unexpected request: ${path}`)
}

function capacity(extra) {
  return { available: 1, capacity: 2, reserved: 0, used: 1, ...extra }
}
