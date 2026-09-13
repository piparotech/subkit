import assert from 'node:assert/strict'
import test from 'node:test'

import { SubKit } from '../dist/index.js'

test('cancels the original reservation operation even without a reservation ID', async () => {
  const requests = []
  const client = new SubKit({
    secretKey: 'sk_srv_fixture',
    appId: 'app',
    apiBaseUrl: 'https://example.invalid',
    fetch: async (url, init) => {
      requests.push({
        path: new URL(url).pathname,
        method: init.method,
        key: new Headers(init.headers).get('idempotency-key'),
        body: JSON.parse(init.body),
      })
      return Response.json({ status: 'cancelled', reservationId: null })
    },
  })
  assert.deepEqual(
    await client.access.cancelReservationCreation(
      { poolId: 'pool/one', reason: 'Withdraw invitation' },
      { idempotencyKey: 'original-reserve-key' },
    ),
    { status: 'cancelled', reservationId: null },
  )
  assert.deepEqual(requests, [
    {
      path: '/api/server/access-pools/pool%2Fone/reservations',
      method: 'DELETE',
      key: 'original-reserve-key',
      body: { reason: 'Withdraw invitation' },
    },
  ])
})
