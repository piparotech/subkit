import { createHash } from 'node:crypto'

import {
  type CustomerEntitlement,
  type CustomerInfo,
  type IapReconcileRequestInput,
  type NormalizedStorePurchase,
  type Offering,
  type PurchaseOwnershipConflict,
  type PurchaseSyncResult,
  type RejectedPurchase,
  type RuntimeCustomerInfoRequestInput,
  type RuntimeOfferingsRequestInput,
  type RuntimeOfferingsResponse,
  type StoreIdentityHints,
  type StoreName,
} from '@piparotech/subkit-core'
import { and, eq, or } from 'drizzle-orm'

import { db } from '~/db/client'
import { ensureDatabaseReady } from '~/db/setup'
import {
  appUserStoreIdentities,
  appUsers,
  apps,
  entitlementGrants,
  entitlements,
  offeringPackages,
  offerings,
  products,
  purchaseEvents,
  runtimeReconcileEvents,
  storePurchaseOwnerships,
} from '~/db/schema'
import { parseServerEnv } from '~/server/env'

type AppUserRow = typeof appUsers.$inferSelect
type ProductRow = typeof products.$inferSelect
type EntitlementGrantStatus = typeof entitlementGrants.$inferSelect.status
type RuntimeStore = typeof storePurchaseOwnerships.$inferSelect.store

interface RuntimeAppUserContext {
  appUser: AppUserRow
  created: boolean
}

interface RuntimeProductContext {
  entitlementKey: string
  product: ProductRow
}

export function authorizeRuntimeRequest(request: Request): Response | null {
  const key = parseServerEnv(process.env).SUBKIT_RUNTIME_READ_API_KEY
  if (key == null) {
    return Response.json({ error: 'Runtime API key is not configured' }, { status: 503 })
  }

  const header = request.headers.get('authorization')
  if (header !== `Bearer ${key}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}

export async function getRuntimeCustomerInfo(input: RuntimeCustomerInfoRequestInput): Promise<CustomerInfo> {
  await ensureDatabaseReady()
  await assertAppExists(input.appId)
  const { appUser } = await getOrCreateRuntimeAppUser(input.appId, input.appUserId)
  return buildCustomerInfo(input.appId, appUser)
}

export async function listRuntimeOfferings(input: RuntimeOfferingsRequestInput): Promise<RuntimeOfferingsResponse> {
  await ensureDatabaseReady()
  await assertAppExists(input.appId)

  const rows = await db
    .select({
      badge: offeringPackages.badge,
      duration: products.duration,
      entitlementKey: entitlements.key,
      offeringDescription: offerings.description,
      offeringId: offerings.id,
      offeringKey: offerings.key,
      offeringName: offerings.name,
      packageLabel: offeringPackages.label,
      packagePriceLabel: offeringPackages.priceLabel,
      packageSortOrder: offeringPackages.sortOrder,
      productAppStoreId: products.appStoreId,
      productDisplayName: products.displayName,
      productIdentifier: products.identifier,
      productPlayStoreId: products.playStoreId,
      productPriceCents: products.priceCents,
      productTrialEnabled: products.trialEnabled,
    })
    .from(offerings)
    .innerJoin(offeringPackages, eq(offeringPackages.offeringId, offerings.id))
    .innerJoin(products, eq(products.id, offeringPackages.productId))
    .innerJoin(entitlements, eq(entitlements.id, products.entitlementId))
    .where(eq(offerings.appId, input.appId))

  const byOffering = new Map<string, Offering>()
  const sortedRows = [...rows].sort((left, right) => {
    const offeringDelta = left.offeringKey.localeCompare(right.offeringKey)
    if (offeringDelta !== 0) return offeringDelta
    return left.packageSortOrder - right.packageSortOrder
  })

  for (const row of sortedRows) {
    const existing = byOffering.get(row.offeringId)
    const offering = existing ?? {
      description: row.offeringDescription,
      identifier: row.offeringKey,
      metadata: {},
      name: row.offeringName,
      packages: [],
    }

    offering.packages.push({
      badge: row.badge.trim() === '' ? null : row.badge,
      identifier: row.packageLabel,
      label: row.packageLabel,
      product: {
        description: row.packagePriceLabel,
        displayName: row.productDisplayName,
        duration: row.duration,
        entitlementKey: row.entitlementKey,
        identifier: row.productIdentifier,
        kind: row.duration.toLowerCase() === 'lifetime' ? 'non_consumable' : 'subscription',
        priceCents: row.productPriceCents,
        storeProductIds: {
          apple: row.productAppStoreId.trim() === '' ? undefined : row.productAppStoreId,
          google: row.productPlayStoreId.trim() === '' ? undefined : row.productPlayStoreId,
        },
        trialEnabled: row.productTrialEnabled,
      },
    })

    byOffering.set(row.offeringId, offering)
  }

  const all = [...byOffering.values()]
  return {
    all,
    appId: input.appId,
    current: all.find((offering) => offering.identifier === 'default') ?? all[0] ?? null,
  }
}

export async function reconcileRuntimeIap(input: IapReconcileRequestInput): Promise<PurchaseSyncResult> {
  await ensureDatabaseReady()
  await assertAppExists(input.appId)

  const checkedAt = new Date().toISOString()
  const rejectedPurchases: RejectedPurchase[] = []
  const conflicts: PurchaseOwnershipConflict[] = []
  const acceptedPurchases: string[] = []
  const finishableTransactions: PurchaseSyncResult['finishableTransactions'] = []

  const resolvedAppUser = await resolveRuntimeAppUser(input.appId, input.appUserId, input.storeIdentities)
  if (resolvedAppUser == null) {
    for (const purchase of input.purchases) {
      rejectedPurchases.push(rejectPurchase(purchase, 'missing_identity', 'Missing app user id and no store identity matched a known app user'))
    }
    const customerInfo = emptyCustomerInfo(input.appId, '', checkedAt)
    return { acceptedPurchases, checkedAt, conflicts, customerInfo, finishableTransactions, rejectedPurchases, verificationStatus: 'failed' }
  }

  const appUser = resolvedAppUser.appUser

  for (const purchase of input.purchases) {
    const transactionId = purchase.transactionId ?? purchase.purchaseToken ?? purchase.orderId ?? null
    if (transactionId == null) {
      rejectedPurchases.push(rejectPurchase(purchase, 'invalid_purchase', 'Missing transaction id or purchase token'))
      continue
    }

    const store = toRuntimeStore(purchase.store)
    const originalTransactionId = purchase.originalTransactionId ?? transactionId
    const productContext = await findRuntimeProduct(input.appId, purchase.store, purchase.storeProductId)
    if (productContext == null) {
      rejectedPurchases.push(rejectPurchase(purchase, 'product_not_found', 'Store product is not mapped in SubKit'))
      await insertRuntimeEvent(input.appId, appUser.id, null, store, 'product_not_found', purchase.storeProductId)
      continue
    }

    const existingOwnership = await findStorePurchaseOwnership(input.appId, store, originalTransactionId)
    if (existingOwnership != null && existingOwnership.appUserId !== appUser.id) {
      conflicts.push({
        reason: 'owned_by_another_user',
        resolution: 'support_required',
        store: purchase.store,
        storeProductId: purchase.storeProductId,
        transactionId,
      })
      rejectedPurchases.push(rejectPurchase(purchase, 'ownership_conflict', 'Purchase is already owned by another app user'))
      await insertRuntimeEvent(input.appId, appUser.id, existingOwnership.id, store, 'ownership_conflict', originalTransactionId)
      continue
    }

    const ownershipId = storePurchaseOwnershipId(input.appId, store, originalTransactionId)
    const grantId = entitlementGrantId(input.appId, store, originalTransactionId)
    const now = new Date()
    const status = toGrantStatus(purchase)
    const startsAt = purchase.purchaseTime == null ? checkedAt : new Date(purchase.purchaseTime).toISOString()
    const rawPayloadJson = stringifyJson(purchase.rawPayload)
    const purchaseTokenHash = purchase.purchaseToken == null ? null : sha256Hex(purchase.purchaseToken)
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
        purchaseTokenHash,
        purchasedAt: startsAt,
        rawPayloadJson,
        receiptHash,
        revokedAt: null,
        status,
        store,
        transactionId,
        updatedAt: now,
      })
      await insertRuntimeEvent(input.appId, appUser.id, ownershipId, store, 'purchase_created', originalTransactionId)
    } else {
      await db
        .update(storePurchaseOwnerships)
        .set({
          entitlementGrantId: grantId,
          environment: purchase.environment ?? existingOwnership.environment,
          lastReconciledAt: now,
          productId: productContext.product.id,
          productIdentifier: purchase.storeProductId,
          purchaseTokenHash,
          rawPayloadJson,
          receiptHash,
          status,
          transactionId,
          updatedAt: now,
        })
        .where(eq(storePurchaseOwnerships.id, existingOwnership.id))
      await insertRuntimeEvent(input.appId, appUser.id, existingOwnership.id, store, 'purchase_updated', originalTransactionId)
    }

    await upsertEntitlementGrant({
      appId: input.appId,
      appUserId: appUser.id,
      entitlementId: productContext.product.entitlementId,
      grantId,
      ownershipId,
      ownershipSource: store === 'apple' ? 'app_account_token' : 'obfuscated_account_id',
      productId: productContext.product.id,
      source: store === 'apple' ? 'apple' : 'google',
      startsAt,
      status,
    })

    await insertPurchaseEventIfMissing({
      amountCents: productContext.product.priceCents,
      appUserId: appUser.id,
      eventId: purchaseEventId(input.appId, store, transactionId),
      grantId,
      occurredOn: startsAt,
      store,
    })

    acceptedPurchases.push(transactionId)
    finishableTransactions.push({ isConsumable: productContext.product.duration.toLowerCase() === 'consumable', purchaseId: purchaseQueueId(purchase), store: purchase.store, transactionId })
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

async function assertAppExists(appId: string): Promise<void> {
  const [app] = await db.select({ id: apps.id }).from(apps).where(eq(apps.id, appId)).limit(1)
  if (app == null) throw new Error('App not found')
}

async function getOrCreateRuntimeAppUser(appId: string, appUserId: string): Promise<RuntimeAppUserContext> {
  const now = new Date()
  const [existing] = await db.select().from(appUsers).where(and(eq(appUsers.appId, appId), eq(appUsers.appUserId, appUserId))).limit(1)
  if (existing != null) {
    await db.update(appUsers).set({ lastSeenAt: now }).where(eq(appUsers.id, existing.id))
    return { appUser: { ...existing, lastSeenAt: now }, created: false }
  }

  const appUser: AppUserRow = {
    appId,
    appUserId,
    country: 'Unknown',
    countryCode: 'XX',
    createdAt: now,
    id: runtimeAppUserId(appId, appUserId),
    lastSeenAt: now,
  }
  await db.insert(appUsers).values(appUser)
  return { appUser, created: true }
}

async function resolveRuntimeAppUser(appId: string, appUserId: string | undefined, storeIdentities: StoreIdentityHints | undefined): Promise<RuntimeAppUserContext | null> {
  if (appUserId != null && appUserId.trim() !== '') return getOrCreateRuntimeAppUser(appId, appUserId)

  const appleToken = storeIdentities?.apple?.appAccountToken
  if (appleToken != null && appleToken.trim() !== '') {
    const context = await findRuntimeAppUserByStoreIdentity(appId, 'apple', appleToken)
    if (context != null) return context
  }

  const googleAccountId = storeIdentities?.google?.obfuscatedAccountId
  if (googleAccountId != null && googleAccountId.trim() !== '') {
    const context = await findRuntimeAppUserByStoreIdentity(appId, 'google', googleAccountId)
    if (context != null) return context
  }

  return null
}

async function findRuntimeAppUserByStoreIdentity(appId: string, store: RuntimeStore, identifier: string): Promise<RuntimeAppUserContext | null> {
  const [row] = await db
    .select({ appUser: appUsers })
    .from(appUserStoreIdentities)
    .innerJoin(appUsers, eq(appUsers.id, appUserStoreIdentities.appUserId))
    .where(
      and(
        eq(appUserStoreIdentities.appId, appId),
        eq(appUserStoreIdentities.store, store),
        store === 'apple' ? eq(appUserStoreIdentities.appAccountToken, identifier) : eq(appUserStoreIdentities.obfuscatedAccountId, identifier),
      ),
    )
    .limit(1)
  if (row == null) return null
  await db.update(appUsers).set({ lastSeenAt: new Date() }).where(eq(appUsers.id, row.appUser.id))
  return { appUser: row.appUser, created: false }
}

async function buildCustomerInfo(appId: string, appUser: AppUserRow): Promise<CustomerInfo> {
  const checkedAt = new Date().toISOString()
  const grantRows = await db
    .select({
      entitlementKey: entitlements.key,
      expiresAt: entitlementGrants.expiresAt,
      productIdentifier: products.identifier,
      source: entitlementGrants.source,
      startsAt: entitlementGrants.startsAt,
      status: entitlementGrants.status,
      revokedAt: entitlementGrants.revokedAt,
      createdAt: entitlementGrants.createdAt,
    })
    .from(entitlementGrants)
    .innerJoin(entitlements, eq(entitlements.id, entitlementGrants.entitlementId))
    .leftJoin(products, eq(products.id, entitlementGrants.productId))
    .where(and(eq(entitlementGrants.appId, appId), eq(entitlementGrants.appUserId, appUser.id)))

  const entitlementsByKey: Record<string, CustomerEntitlement> = {}
  for (const grant of [...grantRows].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())) {
    if (entitlementsByKey[grant.entitlementKey] != null) continue
    entitlementsByKey[grant.entitlementKey] = {
      active: isGrantCurrentlyEffective(grant),
      entitlementKey: grant.entitlementKey,
      expiresAt: grant.expiresAt,
      productIdentifier: grant.productIdentifier,
      source: grant.source,
      startsAt: grant.startsAt,
      status: grant.status,
      verifiedAt: checkedAt,
    }
  }

  const ownershipRows = await db
    .select()
    .from(storePurchaseOwnerships)
    .where(and(eq(storePurchaseOwnerships.appId, appId), eq(storePurchaseOwnerships.appUserId, appUser.id)))

  const storeIdentityHints = await getOrCreateStoreIdentityHints(appId, appUser)

  return {
    appId,
    appUserId: appUser.appUserId,
    checkedAt,
    entitlements: entitlementsByKey,
    freshness: 'fresh',
    purchases: ownershipRows.map((ownership) => ({
      canClaim: false,
      conflict: false,
      expiresAt: ownership.expiresAt,
      ownership: 'current',
      status: ownership.status,
      store: ownership.store === 'apple' ? 'apple_app_store' : 'google_play',
      storeProductId: ownership.productIdentifier,
    })),
    storeIdentityHints,
    unclaimedPurchases: [],
  }
}

function emptyCustomerInfo(appId: string, appUserId: string, checkedAt: string): CustomerInfo {
  return { appId, appUserId, checkedAt, entitlements: {}, freshness: 'fresh', purchases: [], unclaimedPurchases: [] }
}

async function findRuntimeProduct(appId: string, store: StoreName, productIdentifier: string): Promise<RuntimeProductContext | null> {
  const [row] = await db
    .select({
      entitlementKey: entitlements.key,
      product: products,
    })
    .from(products)
    .innerJoin(entitlements, eq(entitlements.id, products.entitlementId))
    .where(
      and(
        eq(products.appId, appId),
        or(
          eq(products.identifier, productIdentifier),
          store === 'apple_app_store' ? eq(products.appStoreId, productIdentifier) : eq(products.playStoreId, productIdentifier),
        ),
      ),
    )
    .limit(1)
  return row ?? null
}

async function findStorePurchaseOwnership(appId: string, store: RuntimeStore, originalTransactionId: string): Promise<typeof storePurchaseOwnerships.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(storePurchaseOwnerships)
    .where(and(eq(storePurchaseOwnerships.appId, appId), eq(storePurchaseOwnerships.store, store), eq(storePurchaseOwnerships.originalTransactionId, originalTransactionId)))
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
  source: 'apple' | 'google'
  startsAt: string
  status: EntitlementGrantStatus
}): Promise<void> {
  const now = new Date()
  const [existing] = await db.select({ id: entitlementGrants.id }).from(entitlementGrants).where(eq(entitlementGrants.id, input.grantId)).limit(1)
  if (existing == null) {
    await db.insert(entitlementGrants).values({
      appId: input.appId,
      appUserId: input.appUserId,
      createdAt: now,
      entitlementId: input.entitlementId,
      expiresAt: null,
      id: input.grantId,
      note: 'SubKit runtime IAP reconcile · validation pending',
      ownershipSource: input.ownershipSource,
      productId: input.productId,
      revokedAt: null,
      source: input.source,
      storePurchaseId: input.ownershipId,
      startsAt: input.startsAt,
      status: input.status,
    })
    return
  }

  await db
    .update(entitlementGrants)
    .set({
      note: 'SubKit runtime IAP reconcile · validation pending',
      ownershipSource: input.ownershipSource,
      productId: input.productId,
      startsAt: input.startsAt,
      status: input.status,
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
  const [existing] = await db.select({ id: purchaseEvents.id }).from(purchaseEvents).where(eq(purchaseEvents.id, input.eventId)).limit(1)
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

async function insertRuntimeEvent(appId: string, appUserId: string | null, ownershipId: string | null, store: RuntimeStore, action: string, detail: string): Promise<void> {
  await db.insert(runtimeReconcileEvents).values({
    action,
    appId,
    appUserId,
    createdAt: new Date(),
    detail,
    id: `rre_${sha256Hex(`${appId}:${store}:${action}:${detail}:${Date.now()}`).slice(0, 24)}`,
    store,
    storePurchaseOwnershipId: ownershipId,
  })
}

async function getOrCreateStoreIdentityHints(appId: string, appUser: AppUserRow): Promise<StoreIdentityHints> {
  const now = new Date()
  const appleId = `${appId}:${appUser.id}:apple`
  const googleId = `${appId}:${appUser.id}:google`
  const existingRows = await db
    .select()
    .from(appUserStoreIdentities)
    .where(and(eq(appUserStoreIdentities.appId, appId), eq(appUserStoreIdentities.appUserId, appUser.id)))

  const existingApple = existingRows.find((row) => row.store === 'apple')
  const existingGoogle = existingRows.find((row) => row.store === 'google')
  const appleToken = existingApple?.appAccountToken ?? stableUuid(`${appId}:apple:${appUser.appUserId}`)
  const googleAccountId = existingGoogle?.obfuscatedAccountId ?? sha256Hex(`${appId}:google:${appUser.appUserId}`).slice(0, 64)

  if (existingApple == null) {
    await db.insert(appUserStoreIdentities).values({
      appAccountToken: appleToken,
      appId,
      appUserId: appUser.id,
      createdAt: now,
      id: appleId,
      lastSeenAt: now,
      obfuscatedAccountId: null,
      obfuscatedProfileId: null,
      store: 'apple',
    })
  } else {
    await db.update(appUserStoreIdentities).set({ lastSeenAt: now }).where(eq(appUserStoreIdentities.id, existingApple.id))
  }

  if (existingGoogle == null) {
    await db.insert(appUserStoreIdentities).values({
      appAccountToken: null,
      appId,
      appUserId: appUser.id,
      createdAt: now,
      id: googleId,
      lastSeenAt: now,
      obfuscatedAccountId: googleAccountId,
      obfuscatedProfileId: null,
      store: 'google',
    })
  } else {
    await db.update(appUserStoreIdentities).set({ lastSeenAt: now }).where(eq(appUserStoreIdentities.id, existingGoogle.id))
  }

  return {
    apple: { appAccountToken: appleToken },
    google: { obfuscatedAccountId: googleAccountId },
  }
}

function isGrantCurrentlyEffective(grant: { expiresAt: string | null; revokedAt: Date | null; startsAt: string; status: EntitlementGrantStatus }): boolean {
  if (grant.status !== 'active' && grant.status !== 'trialing' && grant.status !== 'billing_retry') return false
  if (grant.revokedAt != null) return false
  const now = Date.now()
  const startsAt = Date.parse(grant.startsAt)
  if (Number.isFinite(startsAt) && startsAt > now) return false
  if (grant.expiresAt == null) return true
  const expiresAt = Date.parse(grant.expiresAt)
  return !Number.isFinite(expiresAt) || expiresAt > now
}

function toRuntimeStore(store: StoreName): RuntimeStore {
  return store === 'apple_app_store' ? 'apple' : 'google'
}

function toGrantStatus(purchase: NormalizedStorePurchase): EntitlementGrantStatus {
  if (purchase.ownershipType === 'family_shared') return 'active'
  return 'active'
}

function rejectPurchase(purchase: NormalizedStorePurchase, code: RejectedPurchase['code'], message: string): RejectedPurchase {
  return { code, message, store: purchase.store, storeProductId: purchase.storeProductId, transactionId: purchase.transactionId ?? purchase.purchaseToken ?? null }
}

function runtimeAppUserId(appId: string, appUserId: string): string {
  return `${appId}:user:${encodeURIComponent(appUserId)}`
}

function storePurchaseOwnershipId(appId: string, store: RuntimeStore, originalTransactionId: string): string {
  return `${appId}:${store}:purchase:${encodeURIComponent(originalTransactionId)}`
}

function entitlementGrantId(appId: string, store: RuntimeStore, originalTransactionId: string): string {
  return `${appId}:${store}:grant:${encodeURIComponent(originalTransactionId)}`
}

function purchaseEventId(appId: string, store: RuntimeStore, transactionId: string): string {
  return `${appId}:${store}:event:${encodeURIComponent(transactionId)}`
}

function purchaseQueueId(purchase: NormalizedStorePurchase): string {
  const id = purchase.transactionId ?? purchase.originalTransactionId ?? purchase.purchaseToken ?? purchase.orderId ?? purchase.storeProductId
  return `${purchase.store}:${id}`
}

function stableUuid(value: string): string {
  const hex = sha256Hex(value)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function stringifyJson(value: unknown): string | null {
  if (value == null) return null
  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}
