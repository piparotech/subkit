import assert from 'node:assert/strict'
import test from 'node:test'

import { SubKit } from '../dist/index.js'

const accountContext = 'b'.repeat(64)

test('portal sends the displayed account context and keeps the original operation key', async () => {
  const requests = []
  const client = new SubKit({
    appId: 'app',
    secretKey: 'sk_srv_fixture',
    apiBaseUrl: 'https://subkit.invalid',
    fetch: async (url, init) => {
      requests.push({
        path: new URL(url).pathname,
        body: JSON.parse(init.body),
        key: new Headers(init.headers).get('idempotency-key'),
      })
      return Response.json({
        portalIntentId: 'billing-portal:fixture',
        redirectUrl: 'https://billing.stripe.com/p/fixture',
        redirectUrlExpiresAt: '2027-01-01T00:00:00.000Z',
      })
    },
  })
  await client.billing.createPortalSession(
    { accountContext, subjectId: 'owner', reason: 'Manage billing' },
    { idempotencyKey: 'original-operation' },
  )
  assert.deepEqual(requests, [
    {
      path: '/api/server/billing-portal/sessions',
      body: { appId: 'app', accountContext, subjectId: 'owner', reason: 'Manage billing' },
      key: 'original-operation',
    },
  ])
})
