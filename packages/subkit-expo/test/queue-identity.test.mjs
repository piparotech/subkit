import { strict as assert } from 'node:assert'
import test from 'node:test'

import { createPurchaseSyncCoordinator } from '../dist/coordinator.js'
import { createMemoryPurchaseQueueStore, createPurchaseQueueId } from '../dist/queue.js'
import { createMmkvJsonStorage, createStoredPurchaseQueueStore } from '../dist/storageQueue.js'

const userAPurchase = {
  productId: 'pro_monthly',
  raw: { source: 'test', user: 'a' },
  store: 'apple_app_store',
  transactionDate: 1,
  transactionId: 'tx_user_a',
}

const userBPurchase = {
  productId: 'pro_monthly',
  raw: { source: 'test', user: 'b' },
  store: 'apple_app_store',
  transactionDate: 2,
  transactionId: 'tx_user_b',
}

function createRuntimeRecorder() {
  const calls = []
  return {
    calls,
    runtime: {
      async reconcile(input) {
        calls.push(input)
        return {
          acceptedPurchases: input.purchases.map(
            (purchase) => purchase.transactionId ?? purchase.storeProductId,
          ),
          checkedAt: '2026-07-01T00:00:00.000Z',
          conflicts: [],
          customerInfo: {
            appId: 'app_123',
            appUserId: input.appUserId ?? 'unknown',
            checkedAt: '2026-07-01T00:00:00.000Z',
            entitlements: {},
            freshness: 'fresh',
            purchases: [],
            unclaimedPurchases: [],
          },
          finishableTransactions: [],
          rejectedPurchases: [],
          verificationStatus: 'accepted_unverified',
        }
      },
    },
  }
}

function createIapAdapter(availablePurchases = []) {
  return {
    async fetchProducts() {
      return []
    },
    async finishTransaction() {},
    async getAvailablePurchases() {
      return availablePurchases
    },
    async initConnection() {
      return true
    },
    async requestPurchase() {
      return null
    },
  }
}

test('memory queue lists pending purchases only for the requested app user', async () => {
  const queue = createMemoryPurchaseQueueStore()
  await queue.enqueue(userAPurchase, 'user_a')
  await queue.enqueue(userBPurchase, 'user_b')

  assert.deepEqual(
    (await queue.listPending('user_a')).map((item) => item.transactionId),
    ['tx_user_a'],
  )
  assert.deepEqual(
    (await queue.listPending('user_b')).map((item) => item.transactionId),
    ['tx_user_b'],
  )
})

test('stored queue keeps the first associated app user when the same purchase is re-enqueued', async () => {
  const values = new Map()
  const queue = createStoredPurchaseQueueStore({
    storage: {
      async getItem(key) {
        return values.get(key) ?? null
      },
      async removeItem(key) {
        values.delete(key)
      },
      async setItem(key, value) {
        values.set(key, value)
      },
    },
  })

  await queue.enqueue(userAPurchase, 'user_a')
  await queue.enqueue(userAPurchase, 'user_b')

  assert.equal((await queue.listPending('user_a')).length, 1)
  assert.equal((await queue.listPending('user_b')).length, 0)
})

test('stored queue enqueueMany persists many purchases with a single storage write', async () => {
  const values = new Map()
  let writes = 0
  const queue = createStoredPurchaseQueueStore({
    storage: {
      async getItem(key) {
        return values.get(key) ?? null
      },
      async removeItem(key) {
        values.delete(key)
      },
      async setItem(key, value) {
        writes += 1
        values.set(key, value)
      },
    },
  })

  await queue.enqueueMany([userAPurchase, userBPurchase], 'user_a')

  assert.equal(writes, 1)
  assert.equal((await queue.listPending('user_a')).length, 2)
})

test('MMKV adapter exposes the async JSON storage shape used by the stored queue', async () => {
  const values = new Map()
  const storage = createMmkvJsonStorage({
    delete(key) {
      values.delete(key)
    },
    getString(key) {
      return values.get(key)
    },
    set(key, value) {
      values.set(key, value)
    },
  })

  await storage.setItem('subkit:test', 'value')
  assert.equal(await storage.getItem('subkit:test'), 'value')

  await storage.removeItem('subkit:test')
  assert.equal(await storage.getItem('subkit:test'), null)
})

test('purchase sync coordinator does not reconcile one user pending purchase as another user', async () => {
  let currentAppUserId = 'user_a'
  const queue = createMemoryPurchaseQueueStore()
  const { calls, runtime } = createRuntimeRecorder()

  const coordinator = createPurchaseSyncCoordinator({
    appUserId: () => currentAppUserId,
    iap: createIapAdapter(),
    installationId: 'install_123',
    platform: 'ios',
    queue,
    runtime,
    sessionId: () => 'session_123',
    storeIdentityHints: () => undefined,
  })

  await coordinator.handlePurchaseEvent(userAPurchase)
  currentAppUserId = 'user_b'
  await coordinator.syncPurchases({ force: true, reason: 'identity_changed' })

  assert.equal(calls.length, 2)
  assert.equal(calls[0].appUserId, 'user_a')
  assert.deepEqual(
    calls[0].purchases.map((purchase) => purchase.transactionId),
    ['tx_user_a'],
  )
  assert.equal(calls[1].appUserId, 'user_b')
  assert.deepEqual(calls[1].purchases, [])
})

test('purchase sync coordinator finishes transactions using the shared queue purchase id', async () => {
  const queue = createMemoryPurchaseQueueStore()
  const finished = []
  const purchaseId = createPurchaseQueueId(userAPurchase)
  const coordinator = createPurchaseSyncCoordinator({
    appUserId: () => 'user_a',
    iap: {
      ...createIapAdapter(),
      async finishTransaction(input) {
        finished.push(input.purchase.transactionId)
      },
    },
    installationId: 'install_123',
    platform: 'ios',
    queue,
    runtime: {
      async reconcile(input) {
        return {
          acceptedPurchases: ['tx_user_a'],
          checkedAt: '2026-07-01T00:00:00.000Z',
          conflicts: [],
          customerInfo: {
            appId: 'app_123',
            appUserId: input.appUserId,
            checkedAt: '2026-07-01T00:00:00.000Z',
            entitlements: {},
            freshness: 'fresh',
            purchases: [],
            unclaimedPurchases: [],
          },
          finishableTransactions: [
            {
              isConsumable: true,
              purchaseId,
              store: 'apple_app_store',
              transactionId: 'tx_user_a',
            },
          ],
          rejectedPurchases: [],
          verificationStatus: 'accepted_unverified',
        }
      },
    },
    sessionId: () => 'session_123',
    storeIdentityHints: () => undefined,
  })

  await coordinator.handlePurchaseEvent(userAPurchase)

  assert.deepEqual(finished, ['tx_user_a'])
  assert.deepEqual(await queue.listPending('user_a'), [])
})

test('purchase sync coordinator forwards receipt proof fields to reconcile', async () => {
  const purchase = {
    ...userAPurchase,
    environment: 'sandbox',
    ownershipType: 'purchased',
    quantity: 2,
    receipt: 'signed-jws-or-token',
  }
  const { calls, runtime } = createRuntimeRecorder()
  const coordinator = createPurchaseSyncCoordinator({
    appUserId: () => 'user_a',
    iap: createIapAdapter(),
    installationId: 'install_123',
    platform: 'ios',
    queue: createMemoryPurchaseQueueStore(),
    runtime,
    sessionId: () => 'session_123',
    storeIdentityHints: () => undefined,
  })

  await coordinator.handlePurchaseEvent(purchase)

  assert.equal(calls.length, 1)
  assert.equal(calls[0].purchases[0].environment, 'sandbox')
  assert.equal(calls[0].purchases[0].ownershipType, 'purchased')
  assert.equal(calls[0].purchases[0].quantity, 2)
  assert.equal(calls[0].purchases[0].receipt, 'signed-jws-or-token')
})

test('purchase sync coordinator marks rejected purchases as failed instead of retrying forever', async () => {
  const queue = createMemoryPurchaseQueueStore()
  const calls = []
  const coordinator = createPurchaseSyncCoordinator({
    appUserId: () => 'user_a',
    iap: createIapAdapter(),
    installationId: 'install_123',
    platform: 'ios',
    queue,
    runtime: {
      async reconcile(input) {
        calls.push(input)
        return {
          acceptedPurchases: [],
          checkedAt: '2026-07-01T00:00:00.000Z',
          conflicts: [],
          customerInfo: {
            appId: 'app_123',
            appUserId: input.appUserId,
            checkedAt: '2026-07-01T00:00:00.000Z',
            entitlements: {},
            freshness: 'fresh',
            purchases: [],
            unclaimedPurchases: [],
          },
          finishableTransactions: [],
          rejectedPurchases: [
            {
              code: 'invalid_purchase',
              message: 'invalid',
              store: 'apple_app_store',
              storeProductId: 'pro_monthly',
              transactionId: 'tx_user_a',
            },
          ],
          verificationStatus: 'failed',
        }
      },
    },
    sessionId: () => 'session_123',
    storeIdentityHints: () => undefined,
  })

  await coordinator.handlePurchaseEvent(userAPurchase)
  await coordinator.syncPurchases({ force: true, reason: 'queue_retry' })

  assert.equal(calls.length, 2)
  assert.deepEqual(calls[1].purchases, [])
})
