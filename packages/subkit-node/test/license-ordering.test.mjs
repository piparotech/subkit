import assert from 'node:assert/strict'
import test from 'node:test'

import { serverLicenseListRequestSchema } from '@piparotech/subkit-core'

import { SubKit } from '../dist/index.js'

for (const sortBy of [
  'createdAt',
  'validUntil',
  'licenseeName',
  'licenseeKind',
  'productName',
  'state',
]) {
  for (const sortDirection of ['asc', 'desc']) {
    test(`license list forwards ${sortBy} ${sortDirection} with cursor and filters`, async () => {
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
        apiBaseUrl: 'https://subkit.example.invalid',
        appId: 'fixture-app',
        secretKey: 'sk_srv_fixture',
        fetch: async (url, init) => {
          requests.push({
            path: new URL(url).pathname,
            method: init.method,
            body: JSON.parse(init.body),
          })
          return Response.json(response)
        },
      })
      const input = {
        sortBy,
        sortDirection,
        cursor: 'opaque',
        licenseeKind: 'organization',
        query: 'Grün',
        state: 'active',
        limit: 5,
      }
      assert.deepEqual(await client.licenses.list(input), response)
      assert.deepEqual(requests, [
        { path: '/api/server/licenses', method: 'POST', body: { ...input, appId: 'fixture-app' } },
      ])
      assert.equal(
        serverLicenseListRequestSchema.safeParse({ appId: 'fixture-app', sortBy: 'unsupported' })
          .success,
        false,
      )
      assert.equal(requests.length, 1)
    })
  }
}
