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
    accessContext: null,
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

test('runtime request schemas reject caller-selected app and environment authority', () => {
  assert.equal(
    runtimeCustomerInfoRequestSchema.safeParse({
      appId: 'caller_app',
      appUserId: 'user_123',
    }).success,
    false,
  )
  assert.equal(
    iapReconcileRequestSchema.safeParse({
      appUserId: 'user_123',
      environment: 'sandbox',
      installationId: 'install_123',
      platform: 'ios',
      purchases: [],
      reason: 'app_start',
      sessionId: 'session_123',
    }).success,
    false,
  )
})

test('runtime client omits appId and forwards only the signed access context for customer info', async () => {
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
    await client.getCustomerInfo('user_123', 'sk_ctx_v1.signed')
  } finally {
    globalThis.fetch = previousFetch
  }

  assert.equal(requests.length, 1)
  assert.equal(requests[0].request.headers.authorization, 'Bearer runtime_public_key')
  assert.deepEqual(parseRequestBody(requests[0].request), {
    accessContext: 'sk_ctx_v1.signed',
    appUserId: 'user_123',
  })
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
      accessContext: 'sk_ctx_v1.signed',
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
    accessContext: 'sk_ctx_v1.signed',
    appUserId: 'user_123',
    installationId: 'install_123',
    platform: 'ios',
    purchases: [],
    reason: 'app_start',
    sessionId: 'session_123',
  })
})
