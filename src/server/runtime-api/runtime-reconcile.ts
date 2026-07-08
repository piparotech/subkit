import { and, eq, inArray } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { db } from '~/db/client'
import {
  entitlementGrants,
  prices,
  productEntitlements,
  productPlans,
  products,
  purchaseEvents,
  runtimeReconcileEvents,
  storeProductBindings,
  storePurchaseOwnerships,
} from '~/db/schema'
import { ensureDatabaseReady } from '~/db/setup'

import {
  type IapReconcileWithAppRequestInput,
  type NormalizedStorePurchase,
  type PurchaseOwnershipConflict,
  type PurchaseSyncResult,
  type RejectedPurchase,
  type StoreName,
  createPurchaseQueueId,
} from '@piparotech/subkit-core'

import { resolveRuntimeAppUser } from './runtime-app-users'
import { buildCustomerInfo, emptyCustomerInfo } from './runtime-customer-info'
import {
  type EntitlementGrantStatus,
  type ProductPlanRow,
  type ProductRow,
  RUNTIME_IAP_VALIDATION_PENDING_NOTE,
  type RuntimeStore,
  type StoreProductBindingRow,
  amountMicrosToCents,
  assertAppExists,
  sha256Hex,
  stringifyJson,
  toRuntimeStore,
} from './runtime-shared'

interface RuntimeProductContext {
  binding: StoreProductBindingRow
  entitlementIds: string[]
  product: ProductRow
  productPlan: ProductPlanRow
}

export async function reconcileRuntimeIap(
  input: IapReconcileWithAppRequestInput,
): Promise<PurchaseSyncResult> {
  await ensureDatabaseReady()
  await assertAppExists(input.appId)

  const checkedAt = new Date().toISOString()
  const rejectedPurchases: RejectedPurchase[] = []
  const conflicts: PurchaseOwnershipConflict[] = []
  const acceptedPurchases: string[] = []
  const finishableTransactions: PurchaseSyncResult['finishableTransactions'] = []

  const resolvedAppUser = await resolveRuntimeAppUser(
    input.appId,
    input.appUserId,
    input.storeIdentities,
  )
  if (resolvedAppUser == null) {
    for (const purchase of input.purchases) {
      rejectedPurchases.push(
        rejectPurchase(
          purchase,
          'missing_identity',
          'Missing app user id and no store identity matched a known app user',
        ),
      )
    }
    const customerInfo = emptyCustomerInfo(input.appId, '', checkedAt)
    return {
      acceptedPurchases,
      checkedAt,
      conflicts,
      customerInfo,
      finishableTransactions,
      rejectedPurchases,
      verificationStatus: 'failed',
    }
  }

  const appUser = resolvedAppUser.appUser

  for (const purchase of input.purchases) {
    const transactionId =
      purchase.transactionId ?? purchase.purchaseToken ?? purchase.orderId ?? null
    if (transactionId == null) {
      rejectedPurchases.push(
        rejectPurchase(purchase, 'invalid_purchase', 'Missing transaction id or purchase token'),
      )
      continue
    }

    const store = toRuntimeStore(purchase.store)
    const originalTransactionId = purchase.originalTransactionId ?? transactionId
    const productContext = await findRuntimeProduct(
      input.appId,
      purchase.store,
      purchase.storeProductId,
    )
    if (productContext == null) {
      rejectedPurchases.push(
        rejectPurchase(
          purchase,
          'product_not_found',
          'Store product is not bound to a SubKit product plan',
        ),
      )
      await insertRuntimeEvent(
        input.appId,
        appUser.id,
        null,
        store,
        'product_not_found',
        purchase.storeProductId,
      )
      continue
    }

    const existingOwnership = await findStorePurchaseOwnership(
      input.appId,
      store,
      originalTransactionId,
    )
    if (existingOwnership != null && existingOwnership.appUserId !== appUser.id) {
      conflicts.push({
        reason: 'owned_by_another_user',
        resolution: 'support_required',
        store: purchase.store,
        storeProductId: purchase.storeProductId,
        transactionId,
      })
      rejectedPurchases.push(
        rejectPurchase(
          purchase,
          'ownership_conflict',
          'Purchase is already owned by another app user',
        ),
      )
      await insertRuntimeEvent(
        input.appId,
        appUser.id,
        existingOwnership.id,
        store,
        'ownership_conflict',
        originalTransactionId,
      )
      continue
    }

    const ownershipId = storePurchaseOwnershipId(input.appId, store, originalTransactionId)
    const grantId = entitlementGrantId(input.appId, store, originalTransactionId)
    const now = new Date()
    const status = toGrantStatus(purchase)
    const startsAt =
      purchase.purchaseTime == null ? checkedAt : new Date(purchase.purchaseTime).toISOString()
    const rawPayloadJson = stringifyJson(purchase.rawPayload)
    const purchaseTokenHash =
      purchase.purchaseToken == null ? null : sha256Hex(purchase.purchaseToken)
    const receiptHash = purchase.receipt == null ? null : sha256Hex(purchase.receipt)

    if (existingOwnership == null) {
      await db.insert(storePurchaseOwnerships).values({
        appId: input.appId,
        appUserId: appUser.id,
        createdAt: now,
        entitlementGrantId: grantId,
        environment: purchase.environment ?? 'unknown',
        expiresAt: null,
        id: ownershipId,
        lastReconciledAt: now,
        originalTransactionId,
        ownershipType: purchase.ownershipType ?? 'unknown',
        productId: productContext.product.id,
        productIdentifier: purchase.storeProductId,
        productPlanId: productContext.productPlan.id,
        purchaseTokenHash,
        purchasedAt: startsAt,
        rawPayloadJson,
        receiptHash,
        revokedAt: null,
        status,
        store,
        storeProductBindingId: productContext.binding.id,
        transactionId,
        updatedAt: now,
      })
      await insertRuntimeEvent(
        input.appId,
        appUser.id,
        ownershipId,
        store,
        'purchase_created',
        originalTransactionId,
      )
    } else {
      await db
        .update(storePurchaseOwnerships)
        .set({
          entitlementGrantId: grantId,
          environment: purchase.environment ?? existingOwnership.environment,
          lastReconciledAt: now,
          productId: productContext.product.id,
          productIdentifier: purchase.storeProductId,
          productPlanId: productContext.productPlan.id,
          purchaseTokenHash,
          rawPayloadJson,
          receiptHash,
          status,
          storeProductBindingId: productContext.binding.id,
          transactionId,
          updatedAt: now,
        })
        .where(eq(storePurchaseOwnerships.id, existingOwnership.id))
      await insertRuntimeEvent(
        input.appId,
        appUser.id,
        existingOwnership.id,
        store,
        'purchase_updated',
        originalTransactionId,
      )
    }

    for (const entitlementId of productContext.entitlementIds) {
      await upsertEntitlementGrant({
        appId: input.appId,
        appUserId: appUser.id,
        entitlementId,
        grantId:
          entitlementId === productContext.entitlementIds[0]
            ? grantId
            : `${grantId}:${entitlementId}`,
        ownershipId,
        ownershipSource: store === 'apple' ? 'app_account_token' : 'obfuscated_account_id',
        productId: productContext.product.id,
        productPlanId: productContext.productPlan.id,
        source: store === 'apple' ? 'apple' : 'google',
        startsAt,
        status,
        storeProductBindingId: productContext.binding.id,
      })
    }

    await insertPurchaseEventIfMissing({
      amountCents: await readPlanPriceCents(productContext.productPlan.id),
      appUserId: appUser.id,
      eventId: purchaseEventId(input.appId, store, transactionId),
      grantId,
      occurredOn: startsAt,
      store,
    })

    acceptedPurchases.push(transactionId)
    finishableTransactions.push({
      isConsumable: productContext.product.productType === 'consumable',
      purchaseId: createPurchaseQueueId(purchase),
      store: purchase.store,
      transactionId,
    })
  }

  const customerInfo = await buildCustomerInfo(input.appId, appUser)
  return {
    acceptedPurchases,
    checkedAt,
    conflicts,
    customerInfo,
    finishableTransactions,
    rejectedPurchases,
    verificationStatus: rejectedPurchases.length === 0 ? 'accepted_unverified' : 'pending',
  }
}

async function findRuntimeProduct(
  appId: string,
  store: StoreName,
  productIdentifier: string,
): Promise<RuntimeProductContext | null> {
  const runtimeStore = toRuntimeStore(store)
  const [row] = await db
    .select({
      binding: storeProductBindings,
      product: products,
      productPlan: productPlans,
    })
    .from(storeProductBindings)
    .innerJoin(products, eq(products.id, storeProductBindings.productId))
    .innerJoin(productPlans, eq(productPlans.id, storeProductBindings.productPlanId))
    .where(
      and(
        eq(storeProductBindings.appId, appId),
        eq(storeProductBindings.store, runtimeStore),
        eq(storeProductBindings.externalProductId, productIdentifier),
        inArray(storeProductBindings.bindingStatus, ['linked', 'synced', 'drifted']),
      ),
    )
    .limit(1)

  if (row == null) return null
  const entitlementIds = await readEntitlementIdsForProduct(row.product.id)
  return { ...row, entitlementIds }
}

async function findStorePurchaseOwnership(
  appId: string,
  store: RuntimeStore,
  originalTransactionId: string,
): Promise<typeof storePurchaseOwnerships.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(storePurchaseOwnerships)
    .where(
      and(
        eq(storePurchaseOwnerships.appId, appId),
        eq(storePurchaseOwnerships.store, store),
        eq(storePurchaseOwnerships.originalTransactionId, originalTransactionId),
      ),
    )
    .limit(1)
  return row ?? null
}

async function upsertEntitlementGrant(input: {
  appId: string
  appUserId: string
  entitlementId: string
  grantId: string
  ownershipId: string
  ownershipSource: 'app_account_token' | 'obfuscated_account_id'
  productId: string
  productPlanId: string
  source: 'apple' | 'google'
  startsAt: string
  status: EntitlementGrantStatus
  storeProductBindingId: string
}): Promise<void> {
  const now = new Date()
  const [existing] = await db
    .select({ id: entitlementGrants.id })
    .from(entitlementGrants)
    .where(eq(entitlementGrants.id, input.grantId))
    .limit(1)
  if (existing == null) {
    await db.insert(entitlementGrants).values({
      appId: input.appId,
      appUserId: input.appUserId,
      createdAt: now,
      entitlementId: input.entitlementId,
      expiresAt: null,
      id: input.grantId,
      note: RUNTIME_IAP_VALIDATION_PENDING_NOTE,
      ownershipSource: input.ownershipSource,
      productId: input.productId,
      productPlanId: input.productPlanId,
      revokedAt: null,
      source: input.source,
      storeProductBindingId: input.storeProductBindingId,
      storePurchaseId: input.ownershipId,
      startsAt: input.startsAt,
      status: input.status,
    })
    return
  }

  await db
    .update(entitlementGrants)
    .set({
      note: RUNTIME_IAP_VALIDATION_PENDING_NOTE,
      ownershipSource: input.ownershipSource,
      productId: input.productId,
      productPlanId: input.productPlanId,
      startsAt: input.startsAt,
      status: input.status,
      storeProductBindingId: input.storeProductBindingId,
      storePurchaseId: input.ownershipId,
    })
    .where(eq(entitlementGrants.id, input.grantId))
}

async function insertPurchaseEventIfMissing(input: {
  amountCents: number
  appUserId: string
  eventId: string
  grantId: string
  occurredOn: string
  store: RuntimeStore
}): Promise<void> {
  const [existing] = await db
    .select({ id: purchaseEvents.id })
    .from(purchaseEvents)
    .where(eq(purchaseEvents.id, input.eventId))
    .limit(1)
  if (existing != null) return
  await db.insert(purchaseEvents).values({
    amountCents: input.amountCents,
    appUserId: input.appUserId,
    entitlementGrantId: input.grantId,
    id: input.eventId,
    occurredOn: input.occurredOn,
    store: input.store === 'apple' ? 'App Store' : 'Play Store',
    type: 'iap_reconciled',
  })
}

async function insertRuntimeEvent(
  appId: string,
  appUserId: string | null,
  ownershipId: string | null,
  store: RuntimeStore,
  action: string,
  detail: string,
): Promise<void> {
  await db.insert(runtimeReconcileEvents).values({
    action,
    appId,
    appUserId,
    createdAt: new Date(),
    detail,
    id: `rre_${randomUUID()}`,
    store,
    storePurchaseOwnershipId: ownershipId,
  })
}

async function readEntitlementIdsForProduct(productId: string): Promise<string[]> {
  const rows = await db
    .select({ entitlementId: productEntitlements.entitlementId })
    .from(productEntitlements)
    .where(eq(productEntitlements.productId, productId))
  return rows.map((row) => row.entitlementId)
}

async function readPlanPriceCents(productPlanId: string): Promise<number> {
  const [row] = await db
    .select({ amountMicros: prices.amountMicros })
    .from(prices)
    .where(and(eq(prices.productPlanId, productPlanId), eq(prices.status, 'active')))
    .limit(1)
  return amountMicrosToCents(row?.amountMicros ?? null)
}

function toGrantStatus(purchase: NormalizedStorePurchase): EntitlementGrantStatus {
  if (purchase.ownershipType === 'family_shared') return 'active'
  return 'active'
}

function rejectPurchase(
  purchase: NormalizedStorePurchase,
  code: RejectedPurchase['code'],
  message: string,
): RejectedPurchase {
  return {
    code,
    message,
    store: purchase.store,
    storeProductId: purchase.storeProductId,
    transactionId: purchase.transactionId ?? purchase.purchaseToken ?? null,
  }
}

function storePurchaseOwnershipId(
  appId: string,
  store: RuntimeStore,
  originalTransactionId: string,
): string {
  return `${appId}:${store}:purchase:${encodeURIComponent(originalTransactionId)}`
}

function entitlementGrantId(
  appId: string,
  store: RuntimeStore,
  originalTransactionId: string,
): string {
  return `${appId}:${store}:grant:${encodeURIComponent(originalTransactionId)}`
}

function purchaseEventId(appId: string, store: RuntimeStore, transactionId: string): string {
  return `${appId}:${store}:event:${encodeURIComponent(transactionId)}`
}
