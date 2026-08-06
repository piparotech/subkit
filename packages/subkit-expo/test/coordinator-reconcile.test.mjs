import { strict as assert } from 'node:assert'
import test from 'node:test'

import { SubKitRuntimeError } from '../dist/client.js'
import { createPurchaseSyncCoordinator } from '../dist/coordinator.js'
import { createMemoryPurchaseQueueStore } from '../dist/queue.js'

function googlePurchase() {
  return {
    environment: 'production',
    linkedPurchaseToken: undefined,
    orderId: undefined,
    originalTransactionId: undefined,
    ownershipType: undefined,
    platform: 'android',
    productId: 'com.acme.coach.monthly',
    purchaseTime: 1788999999000,
    purchaseToken: 'purchase-token-abc',
    quantity: 1,
    raw: undefined,
    receipt: undefined,
    store: 'google_play',
    transactionDate: 1788999999000,
    transactionId: undefined,
  }
}

function binding() {
  return { appUserId: 'user-1', identityGeneration: 0, installationId: 'install-1' }
}

function terminalResult() {
  return {
    acceptedPurchases: [],
    checkedAt: '2026-07-01T00:00:00.000Z',
    conflicts: [],
    customerInfo: {
      accessContext: null,
      appId: 'app_123',
      appUserId: 'user-1',
      checkedAt: '2026-07-01T00:00:00.000Z',
      entitlements: {},
      freshness: 'fresh',
      purchases: [],
      unclaimedPurchases: [],
    },
    finishableTransactions: [],
    rejectedPurchases: [],
    verificationStatus: 'failed',
  }
}

test('a retired (404) resumed job clears the stale reconcile id and re-verifies', async () => {
  const queue = createMemoryPurchaseQueueStore()
  const iap = {
    finishTransaction: async () => {},
    getAvailablePurchases: async () => [],
    initConnection: async () => {},
  }
  const reconcileCalls = []
  const pollCalls = []
  const runtime = {
    pollReconcile: async () => {
      pollCalls.push('poll')
      throw new SubKitRuntimeError({
        code: 'not_found',
        message: 'Reconcile job is unknown or has been retired',
        status: 404,
      })
    },
    reconcile: async (input) => {
      reconcileCalls.push(input.purchases.length)
      return terminalResult()
    },
  }

  const coordinator = createPurchaseSyncCoordinator({
    accessContext: () => undefined,
    appUserId: () => 'user-1',
    identityGeneration: () => 0,
    iap,
    installationId: 'install-1',
    logger: undefined,
    platform: 'android',
    queue,
    reason: undefined,
    runtime,
    sessionId: () => 'session-1',
    storeIdentityHints: () => undefined,
  })

  // Seed a pending queue item bound to a now-retired job id.
  const item = await queue.enqueue(googlePurchase(), binding())
  await queue.attachReconcileId(item.id, 'dead-job-id')

  const result = await coordinator.syncPurchases({ force: true, reason: 'foreground' })
  assert.ok(result, 'the sync resolves instead of rejecting on a retired job')

  // The stale id was cleared, and the items were re-verified via a fresh POST.
  const pending = await queue.listPending(binding())
  assert.equal(pending.length, 1)
  assert.equal(pending[0].reconcileId, null, 'reconcileId must be cleared on 404')
  assert.equal(pollCalls.length, 1, 'the retired job is polled exactly once')
  assert.equal(reconcileCalls.length, 1, 'the cleared items are re-POSTed once')
})
