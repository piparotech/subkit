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
    return Response.json(responseFor(url, init.method, init.body))
  }
  const subkit = new SubKit({
    apiBaseUrl: 'https://subkit.example.com/',
    appId: 'smartcoach',
    fetch,
    secretKey: 'sk_srv_test',
  })

  await subkit.entitlements.check({
    accessContext: 'sk_ctx_v1.signed.production',
    appUserId: 'trainer-1',
    entitlement: 'smartcoach_access',
  })
  await subkit.customers.getCustomerInfo({
    accessContext: 'sk_ctx_v1.signed.production',
    appUserId: 'trainer-1',
  })
  const subject = await subkit.customers.upsertSubject(
    { externalId: 'trainer-1', kind: 'app_user', reason: 'sync trainer identity' },
    { idempotencyKey: 'subject-1' },
  )
  await subkit.customers.addSubjectAlias(
    { alias: 'trainer-previous-1', reason: 'link previous identity', subjectId: subject.id },
    { idempotencyKey: 'subject-alias-1' },
  )
  const membership = await subkit.customers.startOrganizationMembership(
    {
      effectiveAt: new Date('2027-01-01T00:00:00Z'),
      memberSubjectId: subject.id,
      organizationSubjectId: 'club-subject-1',
      reason: 'add trainer to club roster',
      roles: ['trainer'],
    },
    { idempotencyKey: 'organization-membership-1' },
  )
  await subkit.customers.mutateOrganizationMembership(
    {
      action: 'assign_role',
      effectiveAt: new Date('2027-02-01T00:00:00Z'),
      membershipId: membership.membershipId,
      organizationSubjectId: 'club-subject-1',
      reason: 'promote trainer to club admin',
      role: 'admin',
    },
    { idempotencyKey: 'organization-membership-role-1' },
  )
  const account = await subkit.customers.createBillingAccount(
    { displayName: 'FC Example', kind: 'organization', reason: 'onboard club payer' },
    { idempotencyKey: 'account-1' },
  )
  const contract = await subkit.contracts.create(
    {
      billingAccountId: account.id,
      externalContractId: 'contract-1',
      licenseeSubjectId: 'club-subject-1',
      planVersionId: 'version-1',
      reason: 'activate signed club contract',
      termStart: new Date('2027-01-01T00:00:00Z'),
    },
    { idempotencyKey: 'contract-1' },
  )
  await subkit.contracts.changeLicensee(
    {
      effectiveAt: new Date('2028-01-01T00:00:00Z'),
      licenseeSubjectId: 'club-subject-2',
      reason: 'transfer club license',
      sourceId: contract.accessSourceId,
    },
    { idempotencyKey: 'contract-licensee-1' },
  )
  await subkit.payments.record(
    {
      accessSourceId: contract.accessSourceId,
      amountMicros: 100_000_000,
      billingAccountId: account.id,
      currencyCode: 'EUR',
      externalId: 'invoice-1',
      kind: 'charge',
      occurredAt: new Date('2027-01-02T00:00:00Z'),
      provider: 'external',
      reason: 'record settled club invoice',
      state: 'succeeded',
    },
    { idempotencyKey: 'payment-1' },
  )
  await subkit.products.updatePlanVersionLifecycle(
    { action: 'retire', planVersionId: 'version/a b', reason: 'superseded' },
    { idempotencyKey: 'retire-version-1' },
  )
  await subkit.access.enrollFree(
    {
      planVersionId: 'version-free',
      reason: 'enroll eligible basis user',
      subjectId: subject.id,
    },
    { idempotencyKey: 'free-enrollment-1' },
  )
  await subkit.access.redeemPromotionCode(
    {
      code: 'SMART-COACH-30',
      reason: 'redeem customer promotion',
      subjectId: subject.id,
    },
    { idempotencyKey: 'promotion-redemption-1' },
  )
  await subkit.access.reserve(
    {
      claimTokenHash: 'h'.repeat(64),
      poolId: contract.poolIds[0],
      reason: 'invite named trainer',
    },
    { idempotencyKey: 'reserve-1' },
  )
  await subkit.access.claim(
    {
      claimTokenHash: 'h'.repeat(64),
      reason: 'trainer accepted invitation',
      subjectId: subject.id,
    },
    { idempotencyKey: 'claim-1' },
  )
  await subkit.access.allocate(
    {
      externalReference: 'direct-1',
      poolId: 'pool/a b',
      reason: 'assign purchased seat',
      subjectId: subject.id,
    },
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
  await subkit.access.updatePool(
    {
      action: 'apply_scheduled_capacity',
      poolId: 'pool-1',
      reason: 'renewal effective',
    },
    { idempotencyKey: 'capacity-apply-1' },
  )
  await subkit.access.revokeReservation(
    { reason: 'cancelled', reservationId: 'reservation/a b' },
    { idempotencyKey: 'revoke-reservation-1' },
  )
  await subkit.devices.list({ environment: 'production' })
  await subkit.devices.revoke(
    { activationId: 'activation/a b', reason: 'support revoke' },
    { idempotencyKey: 'device-revoke-1' },
  )
  await subkit.devices.resetChangeBudget(
    {
      activationGroupKey: 'pro',
      beneficiarySubjectId: 'subject-1',
      environment: 'production',
      reason: 'support reset',
    },
    { idempotencyKey: 'device-budget-1' },
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

  assert.equal(requests.length, 25)
  assert.deepEqual(
    requests.map(({ method, url }) => [method, new URL(url).pathname]),
    [
      ['POST', '/api/server/entitlements/check'],
      ['POST', '/api/server/customer-info'],
      ['POST', '/api/server/subjects/upsert'],
      ['POST', '/api/server/subjects/subject-1/aliases'],
      ['POST', '/api/server/organizations/club-subject-1/memberships'],
      ['PATCH', '/api/server/organizations/club-subject-1/memberships'],
      ['POST', '/api/server/billing-accounts'],
      ['POST', '/api/server/contracts'],
      ['PATCH', '/api/server/contracts/source-1/licensee'],
      ['POST', '/api/server/payments'],
      ['PATCH', '/api/server/plan-versions/version%2Fa%20b'],
      ['POST', '/api/server/free-enrollments'],
      ['POST', '/api/server/promotion-codes/redeem'],
      ['POST', '/api/server/access-pools/pool-1/reservations'],
      ['POST', '/api/server/access-reservations/claim'],
      ['POST', '/api/server/access-pools/pool%2Fa%20b/allocations'],
      ['PATCH', '/api/server/access-allocations/allocation%2Fa%20b'],
      ['POST', '/api/server/access-pools/pool-1'],
      ['PATCH', '/api/server/access-pools/pool-1'],
      ['PATCH', '/api/server/access-pools/pool-1'],
      ['DELETE', '/api/server/access-reservations/reservation%2Fa%20b'],
      ['POST', '/api/server/devices'],
      ['DELETE', '/api/server/devices/activation%2Fa%20b'],
      ['POST', '/api/server/devices/budget-reset'],
      ['POST', '/api/server/manual-provisions'],
    ],
  )
  for (const request of requests) {
    const path = new URL(request.url).pathname
    if (
      path !== '/api/server/entitlements/check' &&
      path !== '/api/server/customer-info' &&
      path !== '/api/server/devices' &&
      (request.method !== 'POST' || path !== '/api/server/access-pools/pool-1')
    ) {
      assert.match(request.headers.get('idempotency-key'), /.+/)
    }
    assert.equal(request.headers.get('authorization'), 'Bearer sk_srv_test')
    assert.equal(request.headers.get('user-agent'), '@piparotech/subkit-node/0.1.8')
  }
  assert.equal(requests[0].body.accessContext, 'sk_ctx_v1.signed.production')
  assert.equal(requests[1].body.accessContext, 'sk_ctx_v1.signed.production')
  assert.equal(requests[2].body.appId, 'smartcoach')
  assert.equal(requests[3].body.appId, 'smartcoach')
  assert.equal(requests[3].body.alias, 'trainer-previous-1')
  assert.equal(requests[4].body.effectiveAt, '2027-01-01T00:00:00.000Z')
  assert.deepEqual(requests[4].body.roles, ['trainer'])
  assert.equal(requests[5].body.action, 'assign_role')
  assert.equal(requests[5].body.role, 'admin')
  assert.equal(requests[7].body.appId, 'smartcoach')
  assert.equal(requests[7].body.licenseeSubjectId, 'club-subject-1')
  assert.equal(requests[7].body.termStart, '2027-01-01T00:00:00.000Z')
  assert.equal(requests[8].body.appId, 'smartcoach')
  assert.equal(requests[8].body.effectiveAt, '2028-01-01T00:00:00.000Z')
  assert.equal(requests[9].body.appId, 'smartcoach')
  assert.equal(requests[9].body.occurredAt, '2027-01-02T00:00:00.000Z')
  assert.equal(requests[10].body.reason, 'superseded')
  assert.equal(requests[11].body.appId, 'smartcoach')
  assert.equal(requests[12].body.appId, 'smartcoach')
  assert.equal(requests[14].body.appId, 'smartcoach')
  assert.equal(requests[17].body.effectiveAt, '2028-01-01T00:00:00.000Z')
  assert.equal(requests[18].body.effectiveAt, '2028-01-01T00:00:00.000Z')
  assert.equal(requests[19].body.reason, 'renewal effective')
  assert.equal(requests[20].body.reason, 'cancelled')
  assert.equal(requests[21].body.appId, 'smartcoach')
  assert.equal(requests[22].body.reason, 'support revoke')
  assert.equal(requests[23].body.beneficiarySubjectId, 'subject-1')
  assert.equal(requests[24].body.appId, 'smartcoach')
  assert.equal(requests[24].body.validFrom, '2027-02-01T00:00:00.000Z')
})

function responseFor(url, method, body) {
  const path = new URL(url).pathname
  if (path === '/api/server/entitlements/check') {
    return {
      allowed: true,
      appId: 'smartcoach',
      appUserId: 'trainer-1',
      checkedAt: '2027-01-01T00:00:00.000Z',
      entitlement: 'smartcoach_access',
      grants: [],
      reason: 'allowed',
      status: 'active',
    }
  }
  if (path === '/api/server/customer-info') {
    return {
      appId: 'smartcoach',
      appUserId: 'trainer-1',
      checkedAt: '2027-01-01T00:00:00.000Z',
      entitlements: {},
    }
  }
  if (path === '/api/server/subjects/upsert') return { id: 'subject-1', status: 'active' }
  if (path === '/api/server/subjects/subject-1/aliases') {
    return { aliasId: 'subject-1:alias:opaque', subjectId: 'subject-1' }
  }
  if (path === '/api/server/organizations/club-subject-1/memberships') {
    return { membershipId: 'membership-1', roleIds: ['membership-role-1'], status: 'active' }
  }
  if (path === '/api/server/billing-accounts') return { id: 'account-1', status: 'active' }
  if (path === '/api/server/contracts') return { accessSourceId: 'source-1', poolIds: ['pool-1'] }
  if (path === '/api/server/contracts/source-1/licensee') {
    return {
      currentLicenseeId: 'club-subject-2',
      previousLicenseeId: 'club-subject-1',
      relationshipId: 'licensee-relationship-2',
    }
  }
  if (path === '/api/server/payments') {
    return {
      accessSourceId: 'source-1',
      amountMicros: 100_000_000,
      appId: 'smartcoach',
      billingAccountId: 'account-1',
      currencyCode: 'EUR',
      externalId: 'invoice-1',
      id: 'payment-1',
      kind: 'charge',
      occurredAt: '2027-01-02T00:00:00.000Z',
      provider: 'external',
      state: 'succeeded',
    }
  }
  if (path.startsWith('/api/server/plan-versions/')) {
    return { planVersionId: 'version/a b', state: 'retired' }
  }
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
  if (path === '/api/server/access-pools/pool-1') {
    const parsed = body == null ? null : JSON.parse(body)
    return capacity({
      ...(parsed?.action === 'change_capacity' ? { decision: 'scheduled' } : {}),
      poolId: 'pool-1',
    })
  }
  if (path === '/api/server/devices') return { devices: [] }
  if (path.startsWith('/api/server/devices/') && method === 'DELETE') {
    return {
      activation: {
        activationGroupKey: 'pro',
        activationId: 'activation/a b',
        beneficiarySubjectId: 'subject-1',
        environment: 'production',
        expiresAt: '2027-03-01T00:00:00.000Z',
        installationLabel: null,
        lastSeenAt: '2027-02-01T00:00:00.000Z',
        policyVersionId: 'version-1',
        state: 'revoked',
      },
      ok: true,
    }
  }
  if (path === '/api/server/devices/budget-reset') {
    return { ok: true, resetAt: '2027-02-01T00:00:00.000Z' }
  }
  if (path.startsWith('/api/server/access-reservations/')) return { ok: true }
  throw new Error(`Unexpected request: ${path}`)
}

function capacity(extra) {
  return { available: 1, capacity: 2, reserved: 0, used: 1, ...extra }
}
