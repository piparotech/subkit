import type {
  PurchaseOwnershipConflict,
  PurchaseSyncReason,
  PurchaseSyncResponse,
  PurchaseSyncResult,
  RejectedPurchase,
  StoreIdentityHints,
} from '@piparotech/subkit-core'

import type { SubKitExpoIapAdapter } from './adapter.js'
import {
  type SubKitRuntimeClient,
  SubKitRuntimeError,
  normalizePurchaseForReconcile,
} from './client.js'
import type { PurchaseQueueItem, PurchaseQueueStore } from './queue.js'
import type { SubKitIapPurchase } from './types.js'

export interface SubKitIapLogger {
  debug(message: string, context?: unknown): void
  error(message: string, context?: unknown): void
  warn(message: string, context?: unknown): void
}

export interface PurchaseSyncCoordinatorOptions {
  accessContext?: () => string | undefined
  appUserId: () => string | undefined
  foregroundMinIntervalMs?: number
  identityGeneration: () => number
  installationId: string | (() => Promise<string>)
  iap: SubKitExpoIapAdapter
  logger?: SubKitIapLogger
  platform: 'ios' | 'android'
  queue: PurchaseQueueStore
  runtime: SubKitRuntimeClient
  sessionId: () => string
  storeIdentityHints: () => StoreIdentityHints | undefined
}

export interface PurchaseSyncCoordinator {
  handlePurchaseEvent(purchase: SubKitIapPurchase): Promise<PurchaseSyncResult | null>
  syncPurchases(input: {
    force?: boolean
    reason: PurchaseSyncReason
  }): Promise<PurchaseSyncResult | null>
}

export function createPurchaseSyncCoordinator(
  options: PurchaseSyncCoordinatorOptions,
): PurchaseSyncCoordinator {
  let lastForegroundSyncAt = 0
  let syncChain: Promise<PurchaseSyncResult | null> = Promise.resolve(null)
  const foregroundMinIntervalMs = options.foregroundMinIntervalMs ?? 15 * 60 * 1000

  async function syncPurchases(input: {
    force?: boolean
    reason: PurchaseSyncReason
  }): Promise<PurchaseSyncResult | null> {
    const appUserId = normalizeAppUserId(options.appUserId())
    if (appUserId == null) {
      options.logger?.debug('Skipping SubKit IAP sync without app user id', {
        reason: input.reason,
      })
      return null
    }

    const now = Date.now()
    if (
      input.reason === 'foreground' &&
      input.force !== true &&
      now - lastForegroundSyncAt < foregroundMinIntervalMs
    ) {
      return null
    }

    return enqueueSync(async () => {
      const binding = await currentQueueBinding(appUserId)
      await options.iap.initConnection()
      const availablePurchases = await options.iap.getAvailablePurchases()
      await options.queue.enqueueMany(availablePurchases, binding)
      const result = await drainQueue(input.reason, binding)
      if (input.reason === 'foreground') lastForegroundSyncAt = now
      return result
    })
  }

  async function handlePurchaseEvent(
    purchase: SubKitIapPurchase,
  ): Promise<PurchaseSyncResult | null> {
    const appUserId = normalizeAppUserId(options.appUserId())
    if (appUserId == null) return null
    const binding = await currentQueueBinding(appUserId)
    await options.queue.enqueue(purchase, binding)
    return enqueueSync(() => drainQueue('purchase_event', binding))
  }

  function enqueueSync(
    task: () => Promise<PurchaseSyncResult | null>,
  ): Promise<PurchaseSyncResult | null> {
    const previous = syncChain.catch(() => null)
    const next = previous.then(task)
    syncChain = next.catch(() => null)
    return next
  }

  async function drainQueue(
    reason: PurchaseSyncReason,
    binding: { appUserId: string; identityGeneration: number; installationId: string },
  ): Promise<PurchaseSyncResult> {
    const pending = await options.queue.listPending(binding)
    const toResume = pending.filter((item) => item.reconcileId != null)
    const toPost = pending.filter((item) => item.reconcileId == null)

    let result: PurchaseSyncResponse | null = null

    async function postItems(
      items: PurchaseQueueItem[],
      binding: {
        appUserId: string
        identityGeneration: number
        installationId: string
      },
      reason: PurchaseSyncReason,
    ): Promise<PurchaseSyncResponse> {
      const purchases = items.map((item) =>
        normalizePurchaseForReconcile(queueItemToPurchase(item)),
      )
      const posted = await options.runtime.reconcile({
        accessContext: undefined,
        appUserId: binding.appUserId,
        installationId: binding.installationId,
        platform: options.platform,
        purchases,
        reason,
        sessionId: options.sessionId(),
        storeIdentities: options.storeIdentityHints(),
      })
      if (isPendingReconcile(posted)) {
        // Persist the reconcile id the instant the 202 arrives so a crash or
        // lost response resumes by polling, never by re-sending receipts.
        for (const item of items) {
          await options.queue.attachReconcileId(item.id, posted.reconcileId)
        }
      }
      return posted
    }

    // Items already bound to a durable job resume by polling (no re-send of
    // receipts); the rest are POSTed as one batch. Each job is the durable
    // unit; polling is idempotent and crash-safe (ADR 008/009).
    if (toPost.length > 0) {
      result = await postItems(toPost, binding, reason)
    } else if (toResume.length > 0 && toResume[0].reconcileId != null) {
      const resumeJobId = toResume[0].reconcileId
      let resumed = false
      try {
        // Resume an in-flight durable job from the first bound item.
        result = await pollWithBoundedWait(resumeJobId)
        resumed = true
      } catch (error) {
        if (!(error instanceof SubKitRuntimeError && error.code === 'not_found')) throw error
      }
      if (!resumed) {
        // The job was retired (terminal + 30-day retention) or is unknown;
        // `not_found` is non-retryable, so polling it forever would park the
        // queue items behind a dead reconcile id. Clear the stale id and
        // re-verify the items via a fresh POST (idempotent, no lost/duplicated
        // work) instead of re-polling a permanently-pending job.
        for (const item of toResume) {
          if (item.reconcileId === resumeJobId) {
            await options.queue.attachReconcileId(item.id, null)
          }
        }
        result = await postItems(toResume, binding, reason)
      }
    } else {
      // No pending items for this binding: refresh via an empty reconcile so
      // customer-info/freshness semantics and the call pattern are unchanged.
      result = await options.runtime.reconcile({
        accessContext: undefined,
        appUserId: binding.appUserId,
        installationId: binding.installationId,
        platform: options.platform,
        purchases: [],
        reason,
        sessionId: options.sessionId(),
        storeIdentities: options.storeIdentityHints(),
      })
    }

    if (result == null || isPendingReconcile(result)) {
      // The job is still running (bounded wait exhausted). The queue retains
      // reconcileId and the next sync trigger resumes polling; cached
      // customer-info keeps the UX stable. Return an empty terminal so the
      // caller does not surface a misleading grant before the worker finishes.
      return {
        acceptedPurchases: [],
        checkedAt: new Date().toISOString(),
        conflicts: [],
        customerInfo: {
          accessContext: null,
          appId: options.appUserId() ?? '',
          appUserId: '',
          checkedAt: new Date().toISOString(),
          entitlements: {},
          freshness: 'stale' as const,
          purchases: [],
          unclaimedPurchases: [],
        },
        finishableTransactions: [],
        rejectedPurchases: [],
        verificationStatus: 'failed',
      }
    }

    await assertBindingIsCurrent(binding)
    const terminalResult = result as PurchaseSyncResult

    for (const rejected of terminalResult.rejectedPurchases) {
      const item = findQueueItemForRejectedPurchase(pending, rejected)
      if (item != null) await options.queue.markRejected(item.id, rejected.message)
    }

    for (const conflict of terminalResult.conflicts) {
      const item = findQueueItemForOwnershipConflict(pending, conflict)
      if (item != null) await options.queue.markRejected(item.id, conflict.reason)
    }

    for (const transaction of terminalResult.finishableTransactions) {
      // Primary match by the server-minted purchase id; fall back to the
      // verified transaction id so a token-only Google purchase (client id is
      // `google_play:token:<token>`, server id falls back to a generic) is
      // still matched and finished — it must not be re-verified forever.
      const item =
        pending.find((candidate) => candidate.id === transaction.purchaseId) ??
        (transaction.transactionId == null
          ? undefined
          : pending.find(
              (candidate) =>
                candidate.status === 'pending' &&
                queueItemTransactionIdentifier(candidate) === transaction.transactionId,
            ))
      if (item == null) continue
      await options.queue.markVerified(item.id)
      try {
        await options.iap.finishTransaction({
          isConsumable: transaction.isConsumable,
          purchase: queueItemToPurchase(item),
        })
        await options.queue.markFinished(item.id)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to finish transaction'
        await options.queue.markFailed(item.id, message)
        options.logger?.warn('SubKit failed to finish transaction after verification', {
          error,
          itemId: item.id,
        })
      }
    }

    return terminalResult
  }

  // Bounded wait for a durable job to reach a terminal state (2s/4s/8s/16s
  // backoff, ~30s total). On exhaustion the caller keeps the queue id and
  // resumes on the next sync trigger; the job itself is never lost.
  async function pollWithBoundedWait(reconcileId: string): Promise<PurchaseSyncResponse> {
    const delays = [2_000, 4_000, 8_000, 16_000]
    for (const delay of delays) {
      const outcome = await options.runtime.pollReconcile(reconcileId)
      if (!isPendingReconcile(outcome)) return outcome
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
    const final = await options.runtime.pollReconcile(reconcileId)
    if (!isPendingReconcile(final)) return final
    return { checkedAt: new Date().toISOString(), reconcileId, status: 'pending' }
  }

  function isPendingReconcile(
    response: PurchaseSyncResponse | null,
  ): response is Extract<PurchaseSyncResponse, { status: 'pending' }> {
    return response != null && 'status' in response && response.status === 'pending'
  }

  async function currentQueueBinding(appUserId: string) {
    return {
      appUserId,
      identityGeneration: options.identityGeneration(),
      installationId:
        typeof options.installationId === 'string'
          ? options.installationId
          : await options.installationId(),
    }
  }

  async function assertBindingIsCurrent(binding: {
    appUserId: string
    identityGeneration: number
    installationId: string
  }): Promise<void> {
    const currentAppUserId = normalizeAppUserId(options.appUserId())
    const currentInstallationId =
      typeof options.installationId === 'string'
        ? options.installationId
        : await options.installationId()
    if (
      currentAppUserId !== binding.appUserId ||
      options.identityGeneration() !== binding.identityGeneration ||
      currentInstallationId !== binding.installationId
    ) {
      throw new Error('SubKit discarded a stale reconcile result after identity changed')
    }
  }

  return { handlePurchaseEvent, syncPurchases }
}

function queueItemToPurchase(item: PurchaseQueueItem): SubKitIapPurchase {
  return {
    environment: item.environment,
    linkedPurchaseToken: item.linkedPurchaseToken,
    orderId: item.orderId,
    originalTransactionId: item.originalTransactionId,
    ownershipType: item.ownershipType,
    productId: item.productId,
    purchaseToken: item.purchaseToken,
    quantity: item.quantity,
    raw: item.rawPurchase,
    receipt: item.receipt,
    store: item.store,
    transactionDate: item.purchaseTime,
    transactionId: item.transactionId,
  }
}

function findQueueItemForRejectedPurchase(
  items: readonly PurchaseQueueItem[],
  rejected: RejectedPurchase,
): PurchaseQueueItem | undefined {
  return items.find(
    (item) =>
      item.store === rejected.store &&
      item.productId === rejected.storeProductId &&
      queueItemTransactionIdentifier(item) === rejected.transactionId,
  )
}

function findQueueItemForOwnershipConflict(
  items: readonly PurchaseQueueItem[],
  conflict: PurchaseOwnershipConflict,
): PurchaseQueueItem | undefined {
  return items.find(
    (item) =>
      item.store === conflict.store &&
      item.productId === conflict.storeProductId &&
      queueItemTransactionIdentifier(item) === conflict.transactionId,
  )
}

function queueItemTransactionIdentifier(item: PurchaseQueueItem): string | null {
  return item.transactionId ?? item.purchaseToken ?? item.orderId ?? null
}

function normalizeAppUserId(appUserId: string | undefined): string | undefined {
  if (appUserId == null) return undefined
  const trimmed = appUserId.trim()
  return trimmed === '' ? undefined : trimmed
}
