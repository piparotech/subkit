import assert from 'node:assert/strict'
import { test } from 'node:test'

import { SubKit } from '../dist/index.js'

test('management read preserves subject identity and multiple owner providers', async () => {
  const client = new SubKit({
    appId: 'app',
    secretKey: 'sk_srv_fixture',
    apiBaseUrl: 'https://subkit.invalid',
    fetch: async (url, init) => {
      assert.equal(new URL(url).pathname, '/api/server/billing/management')
      assert.deepEqual(JSON.parse(init.body), { appId: 'app', subjectId: 'owner' })
      return Response.json({
        accountContext: 'a'.repeat(64),
        appId: 'app',
        subjectId: 'owner',
        environment: 'production',
        checkedAt: new Date().toISOString(),
        providers: ['stripe', 'apple', 'google'],
      })
    },
  })
  assert.deepEqual((await client.billing.getManagement({ subjectId: 'owner' })).providers, [
    'stripe',
    'apple',
    'google',
  ])
})

test('management read rejects a response for another owner', async () => {
  const client = new SubKit({
    appId: 'app',
    secretKey: 'sk_srv_fixture',
    apiBaseUrl: 'https://subkit.invalid',
    fetch: async () =>
      Response.json({
        accountContext: 'a'.repeat(64),
        appId: 'app',
        subjectId: 'other',
        environment: 'sandbox',
        checkedAt: new Date().toISOString(),
        providers: ['stripe'],
      }),
  })
  await assert.rejects(client.billing.getManagement({ subjectId: 'owner' }), /identity mismatch/)
})
