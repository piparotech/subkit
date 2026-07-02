import type { CustomerEntitlement, CustomerInfo, RuntimeCustomerInfoWithAppRequestInput, StoreIdentityHints } from '@piparotech/subkit-core'
import { and, eq } from 'drizzle-orm'

import { db } from '~/db/client'
import { ensureDatabaseReady } from '~/db/setup'
import { appUserStoreIdentities, entitlementGrants, entitlements, products, storePurchaseOwnerships } from '~/db/schema'

import { getOrCreateRuntimeAppUser } from './runtime-app-users'
import {
  type AppUserRow,
  assertAppExists,
  isGrantCurrentlyEffective,
  isGrantValidationPending,
  sha256Hex,
  stableUuid,
} from './runtime-shared'

export async function getRuntimeCustomerInfo(input: RuntimeCustomerInfoWithAppRequestInput): Promise<CustomerInfo> {
  await ensureDatabaseReady()
  await assertAppExists(input.appId)
  const { appUser } = await getOrCreateRuntimeAppUser(input.appId, input.appUserId)
  return buildCustomerInfo(input.appId, appUser)
}

export async function buildCustomerInfo(appId: string, appUser: AppUserRow): Promise<CustomerInfo> {
  const checkedAt = new Date().toISOString()
  const grantRows = await db
    .select({
      entitlementKey: entitlements.key,
      expiresAt: entitlementGrants.expiresAt,
      productIdentifier: products.key,
      source: entitlementGrants.source,
      startsAt: entitlementGrants.startsAt,
      status: entitlementGrants.status,
      revokedAt: entitlementGrants.revokedAt,
      note: entitlementGrants.note,
      createdAt: entitlementGrants.createdAt,
    })
    .from(entitlementGrants)
    .innerJoin(entitlements, eq(entitlements.id, entitlementGrants.entitlementId))
    .leftJoin(products, eq(products.id, entitlementGrants.productId))
    .where(and(eq(entitlementGrants.appId, appId), eq(entitlementGrants.appUserId, appUser.id)))

  const entitlementsByKey: Record<string, CustomerEntitlement> = {}
  for (const grant of [...grantRows].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())) {
    const entitlement: CustomerEntitlement = {
      active: isGrantCurrentlyEffective(grant),
      entitlementKey: grant.entitlementKey,
      expiresAt: grant.expiresAt,
      productIdentifier: grant.productIdentifier,
      source: grant.source,
      startsAt: grant.startsAt,
      status: grant.status,
      verifiedAt: isGrantValidationPending(grant) ? null : checkedAt,
    }
    const existing = entitlementsByKey[grant.entitlementKey]
    if (existing != null && (existing.active || !entitlement.active)) continue
    entitlementsByKey[grant.entitlementKey] = entitlement
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

export function emptyCustomerInfo(appId: string, appUserId: string, checkedAt: string): CustomerInfo {
  return { appId, appUserId, checkedAt, entitlements: {}, freshness: 'fresh', purchases: [], unclaimedPurchases: [] }
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
