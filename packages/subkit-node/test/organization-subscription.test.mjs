import assert from 'node:assert/strict'
import test from 'node:test'

import { SubKit } from '../dist/index.js'

test('organization subscription transport binds current payer and purchase without credentials in response', async () => {
  const purchaseReference = '945b91e5-d348-4da5-90f6-03fce428e391'
  let response = {
    appId: 'app',
    subjectId: 'owner',
    purchaseReference,
    organizationSubjectId: 'org',
    environment: 'sandbox',
    accessReady: false,
    subscription: null,
  }
  const requests = []
  const client = new SubKit({
    secretKey: 'sk_srv_fixture',
    appId: 'app',
    apiBaseUrl: 'https://example.invalid',
    fetch: async (url, init) => {
      requests.push({ path: new URL(url).pathname, body: JSON.parse(init.body) })
      return Response.json(response)
    },
  })
  assert.deepEqual(
    await client.checkout.getOrganizationGuestSubscription({
      subjectId: 'owner',
      purchaseReference,
    }),
    response,
  )
  assert.deepEqual(requests[0], {
    path: '/api/server/guest-checkout/organization-subscription',
    body: { appId: 'app', subjectId: 'owner', purchaseReference },
  })
  for (const field of ['appId', 'subjectId', 'purchaseReference']) {
    const original = response
    response = {
      ...response,
      [field]: field === 'purchaseReference' ? '945b91e5-d348-4da5-90f6-03fce428e392' : 'foreign',
    }
    await assert.rejects(
      client.checkout.getOrganizationGuestSubscription({ subjectId: 'owner', purchaseReference }),
    )
    response = original
  }
})
