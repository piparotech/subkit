import { and, eq } from 'drizzle-orm'
import { db } from '~/db/client'
import { appUsers, entitlementGrants, entitlements, products } from '~/db/schema'
import { ensureDatabaseReady } from '~/db/setup'

import type { ServerCustomerInfoRequest, ServerCustomerInfoResponse } from '@piparotech/subkit-core'

export async function getServerCustomerInfo(
  input: ServerCustomerInfoRequest,
): Promise<ServerCustomerInfoResponse> {
  await ensureDatabaseReady()
  const checkedAt = new Date().toISOString()

  const [appUser] = await db
    .select({ id: appUsers.id })
    .from(appUsers)
    .where(and(eq(appUsers.appId, input.appId), eq(appUsers.appUserId, input.appUserId)))
    .limit(1)

  if (appUser == null) {
    return {
      appId: input.appId,
      appUserId: input.appUserId,
      checkedAt,
      entitlements: {},
    }
  }

  const rows = await db
    .select({
      entitlementKey: entitlements.key,
      expiresAt: entitlementGrants.expiresAt,
      productIdentifier: products.key,
      source: entitlementGrants.source,
      startsAt: entitlementGrants.startsAt,
      status: entitlementGrants.status,
    })
    .from(entitlementGrants)
    .innerJoin(entitlements, eq(entitlementGrants.entitlementId, entitlements.id))
    .leftJoin(products, eq(entitlementGrants.productId, products.id))
    .where(
      and(eq(entitlementGrants.appId, input.appId), eq(entitlementGrants.appUserId, appUser.id)),
    )

  return {
    appId: input.appId,
    appUserId: input.appUserId,
    checkedAt,
    entitlements: Object.fromEntries(
      rows.map((row) => [
        row.entitlementKey,
        {
          entitlement: row.entitlementKey,
          expiresAt: row.expiresAt,
          productIdentifier: row.productIdentifier,
          source: row.source,
          startsAt: row.startsAt,
          status: row.status,
        },
      ]),
    ),
  }
}
