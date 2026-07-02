import type { StoreIdentityHints } from '@piparotech/subkit-core'
import { and, eq } from 'drizzle-orm'

import { db } from '~/db/client'
import { appUserStoreIdentities, appUsers } from '~/db/schema'

import { type AppUserRow, type RuntimeAppUserContext, type RuntimeStore, runtimeAppUserId } from './runtime-shared'

export async function getOrCreateRuntimeAppUser(appId: string, appUserId: string): Promise<RuntimeAppUserContext> {
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

export async function resolveRuntimeAppUser(appId: string, appUserId: string | undefined, storeIdentities: StoreIdentityHints | undefined): Promise<RuntimeAppUserContext | null> {
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
