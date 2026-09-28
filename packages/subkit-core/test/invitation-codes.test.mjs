import assert from 'node:assert/strict'
import test from 'node:test'

import * as core from '../dist/index.js'

const format = {
  prefix: 'CLUB-',
  randomLength: 8,
  alphabet: 'unambiguous-uppercase',
  groupSize: 4,
}
const identity = {
  appId: 'app',
  reservationId: 'reservation',
  poolId: 'pool',
  accessSourceId: 'source',
}
const delivery = {
  ...identity,
  environment: 'sandbox',
  codeVersion: 1,
  quantity: 1,
  formatRevision: 1,
  code: 'CLUB-23AB CDEF',
  format,
  expiresAt: '2026-10-01T00:00:00.000Z',
}

function schema(name) {
  assert.ok(core[name], `Missing public contract: ${name}`)
  return core[name]
}

test('validates configurable formats without granting security to the prefix', () => {
  const contract = schema('invitationCodeFormatSchema')
  for (const prefix of ['CLUB-', 'TEAM-', '']) {
    assert.deepEqual(contract.parse({ ...format, prefix }), { ...format, prefix })
  }
  for (const invalid of [
    { randomLength: 7 },
    { randomLength: 33 },
    { prefix: 'a'.repeat(80) },
    { prefix: 'CLÜB-' },
    { prefix: 'CLUB ' },
    { alphabet: '0123456789' },
    { groupSize: 0 },
    { groupSize: 9 },
    { randomLength: 8.5 },
    { pattern: '.*' },
  ]) {
    assert.equal(contract.safeParse({ ...format, ...invalid }).success, false)
  }
  assert.equal(contract.safeParse({ ...format, groupSize: null }).success, true)
})

test('normalizes ASCII input without depending on the currently configured prefix', () => {
  const contract = schema('invitationCodeInputSchema')
  assert.equal(contract.parse('  club-23ab cdef\n'), 'CLUB-23ABCDEF')
  assert.equal(contract.parse('team-23ab\tcdef'), 'TEAM-23ABCDEF')
  for (const code of [
    'CLÜB-23ABCDEF',
    'CLUB-23AB\u200bCDEF',
    'CLUB-23AB/CDEF',
    '',
    'A'.repeat(129),
  ]) {
    assert.equal(contract.safeParse(code).success, false)
  }
})

test('issuance requires exactly one recipient binding and cannot select an environment', () => {
  const contract = schema('serverInvitationIssueRequestSchema')
  const request = {
    appId: 'app',
    poolId: 'pool',
    recipient: { kind: 'subject', subjectId: 'trainer' },
    reason: 'Invite trainer',
  }
  assert.equal(contract.parse(request).quantity, 1)
  assert.equal(
    contract.safeParse({ ...request, recipient: { kind: 'reference', reference: 'mailbox-proof' } })
      .success,
    true,
  )
  for (const invalid of [
    { recipient: undefined },
    { recipient: { kind: 'subject', subjectId: 'trainer', reference: 'other' } },
    { recipient: { kind: 'reference', reference: '' } },
    { quantity: 0 },
    { environment: 'production' },
    { code: 'CLUB-CHOSEN12' },
    { format },
  ]) {
    assert.equal(contract.safeParse({ ...request, ...invalid }).success, false)
  }
})

test('delivery binds code to its immutable format, version, and reservation', () => {
  const contract = schema('serverInvitationDeliveryResponseSchema')
  assert.deepEqual(contract.parse(delivery), delivery)
  for (const invalid of [
    { code: 'TEAM-23AB CDEF' },
    { code: 'CLUB-23AB CDE0' },
    { code: 'CLUB-23ABCDEF' },
    { codeVersion: 0 },
    { environment: 'test' },
    { expiresAt: null },
    { expiresAt: 'never' },
    { claimTokenHash: 'a'.repeat(64) },
  ]) {
    assert.equal(contract.safeParse({ ...delivery, ...invalid }).success, false)
  }
  assert.equal(contract.safeParse({ ...delivery, environment: null }).success, true)
})

test('delivery requires reserved quantity and the immutable issued-format revision', () => {
  const contract = schema('serverInvitationDeliveryResponseSchema')
  const complete = { ...delivery, quantity: 2, formatRevision: 3 }
  assert.deepEqual(contract.parse(complete), complete)
  for (const invalid of [
    { quantity: undefined },
    { quantity: 0 },
    { quantity: 1.5 },
    { formatRevision: undefined },
    { formatRevision: 0 },
    { formatRevision: 1.5 },
  ])
    assert.equal(contract.safeParse({ ...complete, ...invalid }).success, false)
})

test('preview is recipient-bound and cannot return another app or claimant', () => {
  const request = schema('serverInvitationPreviewRequestSchema')
  assert.equal(request.safeParse({ appId: 'app', code: delivery.code }).success, false)
  assert.equal(
    request.parse({ appId: 'app', subjectId: 'trainer', code: delivery.code }).code,
    'CLUB-23ABCDEF',
  )
  const response = schema('serverInvitationPreviewResponseSchema')
  const result = {
    appId: 'app',
    subjectId: 'trainer',
    codeVersion: 1,
    reservation: {
      ...identity,
      checkedAt: '2026-09-25T00:00:00.000Z',
      environment: 'sandbox',
      expiresAt: delivery.expiresAt,
      quantity: 1,
      subjectId: 'trainer',
      state: 'pending',
      claim: null,
    },
    product: { id: 'product', name: 'Team access', planVersionId: 'plan-v1' },
    poolKey: 'seats',
    entitlementKeys: ['access'],
    organizationSubjectId: 'club',
  }
  assert.deepEqual(response.parse(result), result)
  assert.equal(response.safeParse({ ...result, organizationSubjectId: null }).success, true)
  assert.equal(response.safeParse({ ...result, organizationSubjectId: undefined }).success, false)
  assert.equal(response.safeParse({ ...result, subjectId: 'other' }).success, false)
  assert.equal(response.safeParse({ ...result, appId: 'other' }).success, false)
  assert.equal(response.safeParse({ ...result, code: delivery.code }).success, false)
  for (const reservation of [
    { ...result.reservation, expiresAt: null },
    { ...result.reservation, expiresAt: result.reservation.checkedAt },
    { ...result.reservation, expiresAt: '2026-09-24T00:00:00.000Z' },
    { ...result.reservation, state: 'expired' },
    { ...result.reservation, state: 'revoked' },
    {
      ...result.reservation,
      state: 'claimed',
      claim: {
        allocationId: 'seat',
        allocationState: 'active',
        claimedAt: result.reservation.checkedAt,
        subjectId: 'trainer',
      },
    },
  ])
    assert.equal(response.safeParse({ ...result, reservation }).success, false)
})

test('claim and exact recovery require reviewed identity and code version', () => {
  const request = {
    ...identity,
    subjectId: 'trainer',
    code: delivery.code,
    codeVersion: 1,
    verifiedRecipientReference: 'mailbox-proof',
    reason: 'Accept invitation',
  }
  const contract = schema('serverInvitationClaimRequestSchema')
  assert.equal(contract.parse(request).code, 'CLUB-23ABCDEF')
  for (const key of [
    'subjectId',
    'reservationId',
    'poolId',
    'accessSourceId',
    'codeVersion',
    'code',
  ]) {
    assert.equal(contract.safeParse({ ...request, [key]: undefined }).success, false)
  }
  const status = schema('serverInvitationClaimStatusRequestSchema')
  assert.equal(status.safeParse(request).success, false)
  assert.equal(status.safeParse({ ...request, idempotencyKey: 'claim-operation' }).success, true)
  assert.equal(status.safeParse({ ...request, idempotencyKey: 'short' }).success, false)
  const result = schema('serverInvitationClaimResponseSchema')
  assert.equal(
    result.safeParse({
      ...identity,
      subjectId: 'trainer',
      codeVersion: 1,
      status: 'claimed',
      allocationId: 'seat',
    }).success,
    true,
  )
  assert.equal(
    result.safeParse({ ...identity, subjectId: 'trainer', status: 'claimed' }).success,
    false,
  )
})

test('every invitation claim and recovery result carries its reviewed code version', () => {
  const claim = schema('serverInvitationClaimResponseSchema')
  const status = schema('serverInvitationClaimStatusResponseSchema')
  for (const result of [
    { ...identity, subjectId: 'trainer', status: 'claimed', allocationId: 'seat' },
    { ...identity, subjectId: 'trainer', status: 'rejected', rejection: 'expired' },
    { ...identity, subjectId: 'trainer', status: 'pending' },
  ]) {
    const contract = result.status === 'pending' ? status : claim
    assert.equal(contract.safeParse(result).success, false)
    assert.deepEqual(contract.parse({ ...result, codeVersion: 1 }), { ...result, codeVersion: 1 })
    assert.equal(status.safeParse({ ...result, codeVersion: 1 }).success, true)
    for (const codeVersion of [0, -1, 1.5, null])
      assert.equal(contract.safeParse({ ...result, codeVersion }).success, false)
  }
  assert.equal(
    schema('serverReservationClaimResponseSchema').safeParse({
      ...identity,
      subjectId: 'trainer',
      status: 'claimed',
      allocationId: 'seat',
    }).success,
    true,
  )
})

test('rotation and configuration use optimistic revisions without changing expiry implicitly', () => {
  const rotation = schema('serverInvitationRotateRequestSchema')
  const request = { ...identity, expectedCodeVersion: 1, reason: 'Replace disclosed code' }
  assert.deepEqual(rotation.parse(request), request)
  assert.equal(rotation.safeParse({ ...request, expectedCodeVersion: undefined }).success, false)
  assert.equal(rotation.safeParse({ ...request, expiresAt: delivery.expiresAt }).success, false)
  const settings = schema('serverInvitationFormatUpdateRequestSchema')
  const update = { appId: 'app', expectedRevision: 0, format, reason: 'Configure team codes' }
  assert.deepEqual(settings.parse(update), update)
  assert.equal(settings.safeParse({ ...update, expectedRevision: -1 }).success, false)
  const read = schema('serverInvitationFormatResponseSchema')
  assert.equal(read.safeParse({ appId: 'app', revision: 0, format: null }).success, true)
  assert.equal(read.safeParse({ appId: 'app', revision: 1, format }).success, true)
  assert.equal(read.safeParse({ appId: 'app', revision: 1, format: null }).success, false)
  assert.equal(read.safeParse({ appId: 'app', revision: 0, format }).success, false)
})

test('organization pool pages are strict, bounded observations without payer or member identity', async () => {
  const { serverOrganizationPoolListRequestSchema, serverOrganizationPoolListResponseSchema } =
    await import('../dist/index.js')
  const item = {
    accessSourceId: 'source',
    poolId: 'pool',
    poolKey: 'club_trainers',
    active: true,
    sourceState: 'active',
    sourceVerificationState: 'verified',
    sourceValidFrom: '2026-09-01T00:00:00.000Z',
    sourceValidUntil: null,
    poolState: 'active',
    poolValidFrom: '2026-09-01T00:00:00.000Z',
    poolValidUntil: null,
    entitlementKeys: ['smartcoach_access'],
    capacity: null,
    used: 0,
    reserved: 0,
    available: null,
  }
  const page = {
    appId: 'app',
    organizationSubjectId: 'club',
    environment: null,
    checkedAt: '2026-09-28T00:00:00.000Z',
    items: [item],
    nextCursor: null,
  }
  assert.deepEqual(serverOrganizationPoolListResponseSchema.parse(page), page)
  for (const change of [
    { items: [{ ...item, payerSubjectId: 'payer' }] },
    { items: [{ ...item, capacity: -1 }] },
    { checkedAt: '2026-09-28' },
    { environment: 'all' },
    { nextCursor: '' },
  ])
    assert.equal(
      serverOrganizationPoolListResponseSchema.safeParse({ ...page, ...change }).success,
      false,
    )
  for (const limit of [0, 101, 2.5])
    assert.equal(
      serverOrganizationPoolListRequestSchema.safeParse({
        appId: 'app',
        organizationSubjectId: 'club',
        limit,
      }).success,
      false,
    )
})

test('organization invitation pages carry display data but never a code', async () => {
  const { serverOrganizationInvitationListResponseSchema, INVITATION_CLAIM_REJECTIONS } =
    await import('../dist/index.js')
  assert.deepEqual([...INVITATION_CLAIM_REJECTIONS], ['expired', 'used', 'unavailable'])
  const item = {
    reservationId: 'reservation',
    poolId: 'pool',
    accessSourceId: 'source',
    state: 'claimed',
    quantity: 1,
    codeVersion: 1,
    subjectId: null,
    claimedBySubjectId: 'trainer',
    recipientDisplay: null,
    reservedAt: '2026-09-27T00:00:00.000Z',
    expiresAt: '2026-10-11T00:00:00.000Z',
    claimedAt: '2026-09-28T00:00:00.000Z',
  }
  const page = {
    appId: 'app',
    organizationSubjectId: 'club',
    environment: 'sandbox',
    checkedAt: '2026-09-28T00:00:00.000Z',
    items: [item],
    nextCursor: 'next',
  }
  assert.deepEqual(serverOrganizationInvitationListResponseSchema.parse(page), page)
  for (const change of [
    { code: 'CLUB-23AB CDEF' },
    { recipientDisplay: {} },
    { state: 'open' },
    { expiresAt: null },
  ])
    assert.equal(
      serverOrganizationInvitationListResponseSchema.safeParse({
        ...page,
        items: [{ ...item, ...change }],
      }).success,
      false,
    )
})
