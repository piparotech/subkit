import { and, eq } from 'drizzle-orm'
import type { ServerProductsRequest, ServerProductsResponse } from '@piparotech/subkit-core'

import { db } from '~/db/client'
import { ensureDatabaseReady } from '~/db/setup'
import { entitlements, products } from '~/db/schema'

export async function listServerProducts(input: ServerProductsRequest): Promise<ServerProductsResponse> {
  await ensureDatabaseReady()

  const rows = await db
    .select({
      id: products.id,
      displayName: products.displayName,
      duration: products.duration,
      entitlement: entitlements.key,
      identifier: products.identifier,
      priceCents: products.priceCents,
    })
    .from(products)
    .innerJoin(entitlements, eq(products.entitlementId, entitlements.id))
    .where(input.entitlement == null ? eq(products.appId, input.appId) : and(eq(products.appId, input.appId), eq(entitlements.key, input.entitlement)))

  return {
    products: rows.map((row) => ({
      displayName: row.displayName,
      duration: row.duration,
      entitlement: row.entitlement,
      id: row.id,
      identifier: row.identifier,
      priceCents: row.priceCents,
    })),
  }
}
