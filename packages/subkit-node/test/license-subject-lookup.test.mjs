import assert from 'node:assert/strict'
import test from 'node:test'

import { SubKit } from '../dist/index.js'

test('subject lookup uses a read request without mutation idempotency and parses only neutral fields', async () => {
  const calls = []
  const client = new SubKit({
    appId: 'app',
    apiBaseUrl: 'https://example.invalid',
    secretKey: 'sk_srv_fixture',
    fetch: async (url, init) => {
      calls.push({
        path: new URL(url).pathname,
        body: JSON.parse(init.body),
        headers: new Headers(init.headers),
      })
      return Response.json({
        subjects: [
          { id: 's', kind: 'app_user', externalId: 'local', displayName: 'Not requested' },
        ],
      })
    },
  })
  const input = {
    references: [
      { by: 'externalId', kind: 'app_user', externalId: 'local' },
      { by: 'id', id: 's' },
    ],
  }
  assert.deepEqual(await client.customers.lookupSubjects(input), {
    subjects: [{ id: 's', kind: 'app_user', externalId: 'local' }],
  })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].path, '/api/server/subjects/lookup')
  assert.deepEqual(calls[0].body, { ...input, appId: 'app' })
  assert.equal(calls[0].headers.has('Idempotency-Key'), false)
})

test('organization association transports no name when the application owns it locally', async () => {
  const purchaseReference = '11111111-1111-4111-8111-111111111111'
  let body
  const client = new SubKit({
    appId: 'app',
    apiBaseUrl: 'https://example.invalid',
    secretKey: 'sk_srv_fixture',
    fetch: async (_, init) => {
      body = JSON.parse(init.body)
      return Response.json({
        purchaseReference,
        subjectId: 's',
        organizationSubjectId: 'org',
        status: 'associated',
      })
    },
  })
  await client.checkout.associateOrganizationGuestPurchase(
    { purchaseReference, subjectId: 's', reason: 'Fixture' },
    { idempotencyKey: 'fixture' },
  )
  assert.equal(Object.hasOwn(body, 'organizationName'), false)
  assert.equal(body.subjectId, 's')
})
