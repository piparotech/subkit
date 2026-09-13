import assert from 'node:assert/strict'
import test from 'node:test'

import {
  serverLicenseListRequestSchema,
  serverLicenseeReferenceSchema,
} from '@piparotech/subkit-core'

import { SubKit } from '../dist/index.js'

for (const selection of [
  [],
  ['subject-1'],
  Array.from({ length: 1000 }, (_, i) => `subject-${i}`),
]) {
  test(`forwards exact subject selection of ${selection.length} without omitting empty filters`, async () => {
    const requests = []
    const response = {
      licenses: [],
      totalCount: 0,
      activeCount: 0,
      expiringSoonCount: 0,
      openReservationCount: 0,
      nextCursor: null,
    }
    const client = new SubKit({
      appId: 'app',
      apiBaseUrl: 'https://example.invalid',
      secretKey: 'sk_srv_fixture',
      fetch: async (_, init) => {
        requests.push(JSON.parse(init.body))
        return Response.json(response)
      },
    })
    await client.licenses.list({
      licenseeSubjectIds: selection,
      state: 'active',
      query: 'Workspace',
      limit: 5,
    })
    assert.deepEqual(requests, [
      {
        appId: 'app',
        licenseeSubjectIds: selection,
        state: 'active',
        query: 'Workspace',
        limit: 5,
      },
    ])
    assert.equal(serverLicenseListRequestSchema.safeParse(requests[0]).success, true)
  })
}

test('rejects oversized selection rather than silently truncating it', () => {
  assert.equal(
    serverLicenseListRequestSchema.safeParse({
      appId: 'app',
      licenseeSubjectIds: Array.from({ length: 1001 }, (_, i) => `subject-${i}`),
    }).success,
    false,
  )
})

test('neutral reference contract rejects inconsistent assigned/unassigned states', () => {
  for (const state of ['unassigned', 'ambiguous']) {
    assert.deepEqual(serverLicenseeReferenceSchema.parse({ state, subject: null }), {
      state,
      subject: null,
    })
    assert.equal(
      serverLicenseeReferenceSchema.safeParse({
        state,
        subject: { id: 's', kind: 'app_user', externalId: 'local' },
      }).success,
      false,
    )
  }
  assert.equal(
    serverLicenseeReferenceSchema.safeParse({ state: 'assigned', subject: null }).success,
    false,
  )
  assert.deepEqual(
    serverLicenseeReferenceSchema.parse({
      state: 'assigned',
      subject: { id: 's', kind: 'organization', externalId: null },
    }),
    { state: 'assigned', subject: { id: 's', kind: 'organization', externalId: null } },
  )
})
