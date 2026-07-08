import { and, eq } from 'drizzle-orm'
import { db } from '~/db/client'
import { appUsers, apps, entitlementGrants, entitlements, products } from '~/db/schema'
import { ensureDatabaseReady } from '~/db/setup'

import type { RuntimeEntitlementCheckWithAppRequestInput } from '@piparotech/subkit-core'

type RuntimeGrantStatus = typeof entitlementGrants.$inferSelect.status

const RUNTIME_IAP_VALIDATION_PENDING_NOTE = 'SubKit runtime IAP reconcile · validation pending'

interface RuntimeGrantResult {
  entitlement: string
  expiresAt: string | null
  id: string
  productIdentifier: string | null
  source: string
  startsAt: string
  status: RuntimeGrantStatus
}

export interface RuntimeEntitlementCheckResult {
  allowed: boolean
  appId: string
  appUserId: string
  checkedAt: string
  entitlement: string
  grants: RuntimeGrantResult[]
  reason:
    'allowed' | 'app_not_found' | 'app_user_not_found' | 'entitlement_not_found' | 'no_active_grant'
  status: RuntimeGrantStatus | 'not_found'
}

export async function checkRuntimeEntitlement(
  input: RuntimeEntitlementCheckWithAppRequestInput,
): Promise<RuntimeEntitlementCheckResult> {
  await ensureDatabaseReady()
  const checkedAt = new Date().toISOString()
  const baseResult = {
    appId: input.appId,
    appUserId: input.appUserId,
    checkedAt,
    entitlement: input.entitlement,
    grants: [],
    status: 'not_found',
  } satisfies Omit<RuntimeEntitlementCheckResult, 'allowed' | 'reason'>

  const [[app], [appUser], [entitlement]] = await Promise.all([
    db.select({ id: apps.id }).from(apps).where(eq(apps.id, input.appId)).limit(1),
    db
      .select({ id: appUsers.id })
      .from(appUsers)
      .where(and(eq(appUsers.appId, input.appId), eq(appUsers.appUserId, input.appUserId)))
      .limit(1),
    db
      .select({ id: entitlements.id, key: entitlements.key })
      .from(entitlements)
      .where(and(eq(entitlements.appId, input.appId), eq(entitlements.key, input.entitlement)))
      .limit(1),
  ])
  if (app == null) return { ...baseResult, allowed: false, reason: 'app_not_found' }
  if (appUser == null) return { ...baseResult, allowed: false, reason: 'app_user_not_found' }
  if (entitlement == null) return { ...baseResult, allowed: false, reason: 'entitlement_not_found' }

  const grantRows = await db
    .select({
      entitlementKey: entitlements.key,
      expiresAt: entitlementGrants.expiresAt,
      id: entitlementGrants.id,
      productIdentifier: products.key,
      revokedAt: entitlementGrants.revokedAt,
      note: entitlementGrants.note,
      source: entitlementGrants.source,
      startsAt: entitlementGrants.startsAt,
      status: entitlementGrants.status,
      createdAt: entitlementGrants.createdAt,
    })
    .from(entitlementGrants)
    .innerJoin(entitlements, eq(entitlementGrants.entitlementId, entitlements.id))
    .leftJoin(products, eq(entitlementGrants.productId, products.id))
    .where(
      and(
        eq(entitlementGrants.appId, input.appId),
        eq(entitlementGrants.appUserId, appUser.id),
        eq(entitlementGrants.entitlementId, entitlement.id),
      ),
    )

  const sortedGrants = [...grantRows].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  )
  const grants: RuntimeGrantResult[] = sortedGrants.map((grant) => ({
    entitlement: grant.entitlementKey,
    expiresAt: grant.expiresAt,
    id: grant.id,
    productIdentifier: grant.productIdentifier,
    source: grant.source,
    startsAt: grant.startsAt,
    status: grant.status,
  }))
  const activeGrant = sortedGrants.find(isGrantCurrentlyEffective)

  if (activeGrant == null) {
    return {
      ...baseResult,
      allowed: false,
      grants,
      reason: 'no_active_grant',
      status: sortedGrants[0]?.status ?? 'not_found',
    }
  }

  return {
    ...baseResult,
    allowed: true,
    grants,
    reason: 'allowed',
    status: activeGrant.status,
  }
}

function isGrantCurrentlyEffective(grant: {
  expiresAt: string | null
  note?: string | null
  revokedAt: Date | null
  startsAt: string
  status: RuntimeGrantStatus
}): boolean {
  if (grant.note === RUNTIME_IAP_VALIDATION_PENDING_NOTE) return false
  if (grant.status !== 'active' && grant.status !== 'trialing' && grant.status !== 'billing_retry')
    return false
  if (grant.revokedAt != null) return false

  const now = Date.now()
  const startsAt = parseTimestamp(grant.startsAt)
  if (startsAt != null && startsAt > now) return false

  const expiresAt = parseTimestamp(grant.expiresAt)
  if (expiresAt != null && expiresAt <= now) return false

  return true
}

function parseTimestamp(value: string | null): number | null {
  if (value == null || value.trim() === '') return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}
