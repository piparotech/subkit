import assert from 'node:assert/strict'
import test from 'node:test'

import { SubKit } from '../dist/index.js'

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
  code: 'CLUB-23AB CDEF',
  codeVersion: 1,
  quantity: 1,
  formatRevision: 1,
  environment: 'sandbox',
  expiresAt: '2026-10-01T00:00:00.000Z',
  format,
}
const claim = {
  ...identity,
  code: 'club-23ab cdef',
  codeVersion: 1,
  subjectId: 'trainer',
  verifiedRecipientReference: 'verified-mailbox-reference',
  reason: 'Accept reviewed invitation',
}
const claimed = {
  ...identity,
  subjectId: 'trainer',
  codeVersion: 1,
  status: 'claimed',
  allocationId: 'seat',
}
const preview = {
  appId: 'app',
  subjectId: 'trainer',
  codeVersion: 1,
  reservation: {
    ...identity,
    checkedAt: '2026-09-25T00:00:00.000Z',
    environment: 'sandbox',
    expiresAt: delivery.expiresAt,
    quantity: 1,
    subjectId: null,
    state: 'pending',
    claim: null,
  },
  product: { id: 'product', name: 'Team access', planVersionId: 'version' },
  poolKey: 'seats',
  entitlementKeys: ['access'],
}

function fixture(response) {
  const requests = []
  const client = new SubKit({
    secretKey: 'sk_srv_test_invitation',
    appId: 'app',
    apiBaseUrl: 'https://example.invalid',
    fetch: async (url, init) => {
      requests.push({
        url,
        method: init.method,
        key: new Headers(init.headers).get('idempotency-key'),
        body: init.body ? JSON.parse(init.body) : undefined,
      })
      return Response.json(response)
    },
  })
  assert.ok(client.invitations, 'Missing invitation client')
  return { client, requests }
}

const mutation = { idempotencyKey: 'test-invitation-operation' }

test('issues recipient-bound codes with canonical app and idempotency', async () => {
  const { client, requests } = fixture(delivery)
  const input = {
    poolId: 'pool',
    recipient: { kind: 'subject', subjectId: 'trainer' },
    reason: 'Invite',
  }
  assert.deepEqual(await client.invitations.issue(input, mutation), delivery)
  assert.deepEqual(requests, [
    {
      url: 'https://example.invalid/api/server/access-invitations',
      method: 'POST',
      key: mutation.idempotencyKey,
      body: { ...input, appId: 'app', quantity: 1 },
    },
  ])
})

test('issuance refuses another quantity, initial version or requested expiry', async () => {
  const input = {
    poolId: 'pool',
    recipient: { kind: 'subject', subjectId: 'trainer' },
    quantity: 2,
    expiresAt: delivery.expiresAt,
    reason: 'Invite',
  }
  const response = { ...delivery, quantity: 2 }
  assert.deepEqual(await fixture(response).client.invitations.issue(input, mutation), response)
  for (const changed of [
    { quantity: 1 },
    { codeVersion: 2 },
    { expiresAt: '2026-10-02T00:00:00.000Z' },
    { expiresAt: '2026-09-30T00:00:00.000Z' },
  ]) {
    const { client } = fixture({ ...response, ...changed })
    await assert.rejects(() => client.invitations.issue(input, mutation), {
      code: 'validation_failed',
    })
  }
  const equivalent = fixture({ ...response, expiresAt: '2026-10-01T00:00:00Z' })
  assert.equal((await equivalent.client.invitations.issue(input, mutation)).quantity, 2)
})

test('delivery and rotation bind exact reservation and code version', async () => {
  for (const operation of ['getDelivery', 'rotateCode']) {
    const response = operation === 'rotateCode' ? { ...delivery, codeVersion: 2 } : delivery
    const { client, requests } = fixture(response)
    const input = { ...identity, expectedCodeVersion: 1, reason: 'Deliver invitation' }
    assert.deepEqual(await client.invitations[operation](input, mutation), response)
    assert.equal(requests[0].method, 'POST')
    assert.equal(
      requests[0].url,
      `https://example.invalid/api/server/access-invitations/${operation === 'rotateCode' ? 'rotate' : 'delivery'}`,
    )
    assert.equal(requests[0].key, mutation.idempotencyKey)
    assert.deepEqual(requests[0].body, input)
  }
})

test('preview sends normalized code and verified reference only in the body', async () => {
  const { client, requests } = fixture(preview)
  assert.deepEqual(
    await client.invitations.preview({
      code: claim.code,
      subjectId: 'trainer',
      verifiedRecipientReference: claim.verifiedRecipientReference,
    }),
    preview,
  )
  assert.equal(requests[0].url, 'https://example.invalid/api/server/access-invitations/preview')
  assert.equal(requests[0].body.code, 'CLUB-23ABCDEF')
  assert.equal(requests[0].body.verifiedRecipientReference, claim.verifiedRecipientReference)
  assert.equal(requests[0].key, null)
})

test('claims and recovers precisely the same reviewed operation', async () => {
  const { client, requests } = fixture(claimed)
  assert.deepEqual(await client.invitations.claim(claim, mutation), claimed)
  assert.deepEqual(
    await client.invitations.getClaimStatus({ ...claim, idempotencyKey: mutation.idempotencyKey }),
    claimed,
  )
  assert.equal(requests[0].url, 'https://example.invalid/api/server/access-invitations/claim')
  assert.equal(
    requests[1].url,
    'https://example.invalid/api/server/access-invitations/claim/status',
  )
  assert.deepEqual(requests[0].body, { ...claim, code: 'CLUB-23ABCDEF' })
  assert.deepEqual(requests[1].body, {
    ...requests[0].body,
    idempotencyKey: mutation.idempotencyKey,
  })
})

test('claim and recovery refuse a different code version for every result state', async () => {
  for (const response of [
    claimed,
    { ...identity, subjectId: 'trainer', codeVersion: 1, status: 'rejected', rejection: 'expired' },
    { ...identity, subjectId: 'trainer', codeVersion: 1, status: 'pending' },
  ]) {
    const { client } = fixture(response)
    assert.deepEqual(
      await client.invitations.getClaimStatus({
        ...claim,
        idempotencyKey: mutation.idempotencyKey,
      }),
      response,
    )
    const wrong = fixture({ ...response, codeVersion: 2 })
    await assert.rejects(
      () =>
        wrong.client.invitations.getClaimStatus({
          ...claim,
          idempotencyKey: mutation.idempotencyKey,
        }),
      { code: 'validation_failed' },
    )
    if (response.status !== 'pending') {
      assert.deepEqual(await client.invitations.claim(claim, mutation), response)
      await assert.rejects(() => wrong.client.invitations.claim(claim, mutation), {
        code: 'validation_failed',
      })
    }
  }
})

test('settings are app-scoped and updated against an explicit revision', async () => {
  const response = { appId: 'app', revision: 1, format }
  const { client, requests } = fixture(response)
  assert.deepEqual(await client.invitations.getFormat(), response)
  assert.deepEqual(
    await client.invitations.updateFormat(
      { format, expectedRevision: 0, reason: 'Configure' },
      mutation,
    ),
    response,
  )
  assert.deepEqual(requests[0], {
    url: 'https://example.invalid/api/server/invitation-code-format?appId=app',
    method: 'GET',
    key: null,
    body: undefined,
  })
  assert.equal(requests[1].method, 'PATCH')
  assert.equal(requests[1].body.expectedRevision, 0)
  assert.equal(requests[1].body.appId, 'app')
})

test('rejects changed app, pool, recipient, reservation and code version in successful responses', async () => {
  const cases = [
    [
      { ...delivery, appId: 'other' },
      (c) =>
        c.issue(
          {
            poolId: 'pool',
            recipient: { kind: 'subject', subjectId: 'trainer' },
            reason: 'Invite',
          },
          mutation,
        ),
    ],
    [
      { ...delivery, poolId: 'other' },
      (c) =>
        c.issue(
          {
            poolId: 'pool',
            recipient: { kind: 'subject', subjectId: 'trainer' },
            reason: 'Invite',
          },
          mutation,
        ),
    ],
    [
      { ...delivery, reservationId: 'other' },
      (c) => c.getDelivery({ ...identity, expectedCodeVersion: 1, reason: 'Deliver' }, mutation),
    ],
    [
      delivery,
      (c) => c.rotateCode({ ...identity, expectedCodeVersion: 1, reason: 'Rotate' }, mutation),
    ],
    [{ ...claimed, subjectId: 'other' }, (c) => c.claim(claim, mutation)],
    [
      { ...claimed, accessSourceId: 'other' },
      (c) => c.getClaimStatus({ ...claim, idempotencyKey: mutation.idempotencyKey }),
    ],
    [
      { ...preview, subjectId: 'other' },
      (c) => c.preview({ subjectId: 'trainer', code: claim.code }),
    ],
    [{ appId: 'other', revision: 1, format }, (c) => c.getFormat()],
    [
      { appId: 'app', revision: 4, format },
      (c) => c.updateFormat({ expectedRevision: 0, format, reason: 'Configure' }, mutation),
    ],
    [
      { appId: 'app', revision: 1, format: { ...format, prefix: 'TEAM-' } },
      (c) => c.updateFormat({ expectedRevision: 0, format, reason: 'Configure' }, mutation),
    ],
  ]
  for (const [response, operation] of cases) {
    const { client } = fixture(response)
    await assert.rejects(() => operation(client.invitations), { code: 'validation_failed' })
  }
})

test('rejects invalid input and missing idempotency before network access', async () => {
  const { client, requests } = fixture(delivery)
  const input = {
    poolId: 'pool',
    recipient: { kind: 'subject', subjectId: 'trainer' },
    reason: 'Invite',
  }
  for (const operation of [
    () => client.invitations.issue(input, {}),
    () => client.invitations.issue(input, { idempotencyKey: 'short' }),
    () => client.invitations.issue({ ...input, recipient: undefined }, mutation),
    () => client.invitations.issue({ ...input, environment: 'production' }, mutation),
    () => client.invitations.issue({ ...input, appId: 'foreign-app' }, mutation),
    () => client.invitations.preview({ code: claim.code }),
    () => client.invitations.claim({ ...claim, codeVersion: undefined }, mutation),
  ]) {
    await assert.rejects(async () => operation())
  }
  assert.equal(requests.length, 0)
})

test('transport uncertainty never triggers a second issuance automatically', async () => {
  let calls = 0
  const client = new SubKit({
    appId: 'app',
    apiBaseUrl: 'https://example.invalid',
    secretKey: 'sk_srv_test_invitation',
    fetch: async () => {
      calls++
      throw new Error('Connection lost')
    },
  })
  assert.ok(client.invitations, 'Missing invitation client')
  await assert.rejects(
    () =>
      client.invitations.issue(
        { poolId: 'pool', recipient: { kind: 'subject', subjectId: 'trainer' }, reason: 'Invite' },
        mutation,
      ),
    { code: 'network' },
  )
  assert.equal(calls, 1)
})

const organizationPool = {
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
  capacity: 7,
  used: 3,
  reserved: 1,
  available: 3,
}
const poolPage = {
  appId: 'app',
  organizationSubjectId: 'club',
  environment: 'sandbox',
  checkedAt: '2026-09-28T00:00:00.000Z',
  items: [organizationPool],
  nextCursor: 'next-page',
}
const invitationPage = {
  appId: 'app',
  organizationSubjectId: 'club',
  environment: null,
  checkedAt: '2026-09-28T00:00:00.000Z',
  items: [
    {
      reservationId: 'reservation',
      poolId: 'pool',
      accessSourceId: 'source',
      state: 'pending',
      quantity: 1,
      codeVersion: 2,
      subjectId: null,
      claimedBySubjectId: null,
      recipientDisplay: { email: 'lea@example.invalid', name: 'Lea' },
      reservedAt: '2026-09-27T00:00:00.000Z',
      expiresAt: '2026-10-11T00:00:00.000Z',
      claimedAt: null,
    },
  ],
  nextCursor: null,
}

test('issuance forwards encrypted-at-rest recipient display data and refuses empty display', async () => {
  const { client, requests } = fixture(delivery)
  const input = {
    poolId: 'pool',
    recipient: { kind: 'reference', reference: 'verified-mailbox-reference' },
    recipientDisplay: { email: 'lea@example.invalid', name: 'Lea' },
    reason: 'Invite',
  }
  await client.invitations.issue(input, mutation)
  assert.deepEqual(requests[0].body.recipientDisplay, input.recipientDisplay)
  for (const recipientDisplay of [{}, { email: 'not-an-email' }, { name: ' ' }]) {
    await assert.rejects(
      async () => client.invitations.issue({ ...input, recipientDisplay }, mutation),
      {
        code: 'validation_failed',
      },
    )
  }
  assert.equal(requests.length, 1)
})

test('managed claims accept only the terminal rejections a bound claim can produce', async () => {
  for (const rejection of ['expired', 'used', 'unavailable']) {
    const { client } = fixture({
      ...claimed,
      status: 'rejected',
      allocationId: undefined,
      rejection,
    })
    assert.equal((await client.invitations.claim(claim, mutation)).rejection, rejection)
  }
  for (const rejection of ['changed', 'recipient_mismatch']) {
    const { client } = fixture({
      ...identity,
      subjectId: 'trainer',
      codeVersion: 1,
      status: 'rejected',
      rejection,
    })
    await assert.rejects(() => client.invitations.claim(claim, mutation), {
      code: 'validation_failed',
    })
  }
})

test('organization pools are read page by page for the exact app and organization', async () => {
  const { client, requests } = fixture(poolPage)
  assert.deepEqual(
    await client.access.listOrganizationPools({
      organizationSubjectId: 'club',
      limit: 1,
      cursor: 'c1',
    }),
    poolPage,
  )
  assert.deepEqual(requests, [
    {
      url: 'https://example.invalid/api/server/organizations/club/access-pools?appId=app&limit=1&cursor=c1',
      method: 'GET',
      key: null,
      body: undefined,
    },
  ])
  for (const response of [
    { ...poolPage, organizationSubjectId: 'other' },
    { ...poolPage, appId: 'other' },
    { ...poolPage, items: [organizationPool, organizationPool] },
    { ...poolPage, items: [{ ...organizationPool, payerSubjectId: 'payer' }] },
    { ...poolPage, checkedAt: 'yesterday' },
  ]) {
    const { client: wrong } = fixture(response)
    await assert.rejects(
      () => wrong.access.listOrganizationPools({ organizationSubjectId: 'club', limit: 1 }),
      { code: 'validation_failed' },
    )
  }
  for (const limit of [0, 101, 1.5])
    await assert.rejects(async () =>
      client.access.listOrganizationPools({ organizationSubjectId: 'club', limit }),
    )
})

test('organization invitation lists never accept codes and bind app, organization and page size', async () => {
  const { client, requests } = fixture(invitationPage)
  assert.deepEqual(
    await client.invitations.listForOrganization({ organizationSubjectId: 'club' }),
    invitationPage,
  )
  assert.equal(
    requests[0].url,
    'https://example.invalid/api/server/organizations/club/access-invitations?appId=app',
  )
  for (const response of [
    { ...invitationPage, items: [{ ...invitationPage.items[0], code: 'CLUB-23AB CDEF' }] },
    { ...invitationPage, organizationSubjectId: 'other' },
  ]) {
    const { client: wrong } = fixture(response)
    await assert.rejects(
      () => wrong.invitations.listForOrganization({ organizationSubjectId: 'club' }),
      (error) => {
        assert.equal(error.code, 'validation_failed')
        assert.equal(JSON.stringify(error).includes('CLUB-23AB'), false)
        return true
      },
    )
  }
})
