import { strict as assert } from 'node:assert'
import test from 'node:test'

import {
  iapReconcileRequestSchema,
  runtimeCustomerInfoRequestSchema,
} from '@piparotech/subkit-core'

import { SubKitRuntimeClient } from '../dist/client.js'

function createResponse(body) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  })
}

function createCustomerInfo(appUserId = 'user_123') {
  return {
    appId: 'app_123',
    appUserId,
    checkedAt: '2026-07-01T00:00:00.000Z',
    entitlements: {},
    freshness: 'fresh',
    purchases: [],
    unclaimedPurchases: [],
  }
}

function parseRequestBody(request) {
  assert.equal(typeof request.body, 'string')
  return JSON.parse(request.body)
}

test('runtime request schemas ignore legacy appId fields for backwards compatibility', () => {
  assert.deepEqual(
    runtimeCustomerInfoRequestSchema.parse({ appId: 'legacy_app', appUserId: 'user_123' }),
    { appUserId: 'user_123' },
  )
  assert.deepEqual(
    iapReconcileRequestSchema.parse({
      appId: 'legacy_app',
      appUserId: 'user_123',
      installationId: 'install_123',
      platform: 'ios',
      purchases: [],
      reason: 'app_start',
      sessionId: 'session_123',
    }),
    {
      appUserId: 'user_123',
      installationId: 'install_123',
      platform: 'ios',
      purchases: [],
      reason: 'app_start',
      sessionId: 'session_123',
    },
  )
})

test('runtime client omits appId from customer info requests', async () => {
  const requests = []
  const previousFetch = globalThis.fetch
  globalThis.fetch = async (url, request) => {
    requests.push({ request, url })
    return createResponse(createCustomerInfo('user_123'))
  }

  try {
    const client = new SubKitRuntimeClient({
      apiBaseUrl: 'https://subkit.example.com',
      sdkKey: 'runtime_public_key',
    })
    await client.getCustomerInfo('user_123')
  } finally {
    globalThis.fetch = previousFetch
  }

  assert.equal(requests.length, 1)
  assert.equal(requests[0].request.headers.authorization, 'Bearer runtime_public_key')
  assert.deepEqual(parseRequestBody(requests[0].request), { appUserId: 'user_123' })
})

test('runtime client omits appId from offerings requests', async () => {
  const requests = []
  const previousFetch = globalThis.fetch
  globalThis.fetch = async (url, request) => {
    requests.push({ request, url })
    return createResponse({ all: [], appId: 'app_123', current: null })
  }

  try {
    const client = new SubKitRuntimeClient({
      apiBaseUrl: 'https://subkit.example.com',
      sdkKey: 'runtime_public_key',
    })
    await client.getOfferings({ appUserId: 'user_123', platform: 'ios' })
  } finally {
    globalThis.fetch = previousFetch
  }

  assert.equal(requests.length, 1)
  assert.deepEqual(parseRequestBody(requests[0].request), {
    appUserId: 'user_123',
    platform: 'ios',
  })
})

test('runtime client omits appId from reconcile requests', async () => {
  const requests = []
  const previousFetch = globalThis.fetch
  globalThis.fetch = async (url, request) => {
    requests.push({ request, url })
    return createResponse({
      acceptedPurchases: [],
      checkedAt: '2026-07-01T00:00:00.000Z',
      conflicts: [],
      customerInfo: createCustomerInfo('user_123'),
      finishableTransactions: [],
      rejectedPurchases: [],
      verificationStatus: 'failed',
    })
  }

  try {
    const client = new SubKitRuntimeClient({
      apiBaseUrl: 'https://subkit.example.com',
      sdkKey: 'runtime_public_key',
    })
    await client.reconcile({
      appUserId: 'user_123',
      installationId: 'install_123',
      platform: 'ios',
      purchases: [],
      reason: 'app_start',
      sessionId: 'session_123',
    })
  } finally {
    globalThis.fetch = previousFetch
  }

  assert.equal(requests.length, 1)
  assert.deepEqual(parseRequestBody(requests[0].request), {
    appUserId: 'user_123',
    installationId: 'install_123',
    platform: 'ios',
    purchases: [],
    reason: 'app_start',
    sessionId: 'session_123',
  })
})
