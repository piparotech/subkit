import { and, eq, ne } from 'drizzle-orm'
import type { ServerProduct, ServerProductsRequest, ServerProductsResponse } from '@piparotech/subkit-core'

import { db } from '~/db/client'
import { ensureDatabaseReady } from '~/db/setup'
import { entitlements, prices, productEntitlements, productPlans, products } from '~/db/schema'

export async function listServerProducts(input: ServerProductsRequest): Promise<ServerProductsResponse> {
  await ensureDatabaseReady()

  const rows = await db
    .select({
      billingPeriod: productPlans.billingPeriodIso,
      displayName: products.name,
      entitlement: entitlements.key,
      planId: productPlans.id,
      planKey: productPlans.key,
      priceAmountMicros: prices.amountMicros,
      productId: products.id,
      productKey: products.key,
    })
    .from(productPlans)
    .innerJoin(products, eq(productPlans.productId, products.id))
    .innerJoin(productEntitlements, eq(productEntitlements.productId, products.id))
    .innerJoin(entitlements, eq(productEntitlements.entitlementId, entitlements.id))
    .leftJoin(prices, and(eq(prices.productPlanId, productPlans.id), eq(prices.status, 'active')))
    .where(
      input.entitlement == null
        ? and(eq(products.appId, input.appId), ne(products.status, 'archived'), ne(productPlans.status, 'archived'))
        : and(eq(products.appId, input.appId), eq(entitlements.key, input.entitlement), ne(products.status, 'archived'), ne(productPlans.status, 'archived')),
    )

  return { products: groupServerProducts(rows) }
}

function groupServerProducts(rows: readonly ProductRow[]): ServerProduct[] {
  const grouped = new Map<string, ServerProduct>()
  for (const row of rows) {
    const current = grouped.get(row.planId) ?? {
      billingPeriod: row.billingPeriod,
      displayName: row.displayName,
      entitlementKeys: [],
      id: row.productId,
      planId: row.planId,
      planKey: row.planKey,
      priceCents: amountMicrosToCents(row.priceAmountMicros),
      productKey: row.productKey,
    }
    if (!current.entitlementKeys.includes(row.entitlement)) current.entitlementKeys.push(row.entitlement)
    if (current.priceCents === 0 && row.priceAmountMicros != null) current.priceCents = amountMicrosToCents(row.priceAmountMicros)
    grouped.set(row.planId, current)
  }
  return [...grouped.values()]
}

interface ProductRow {
  billingPeriod: string | null
  displayName: string
  entitlement: string
  planId: string
  planKey: string
  priceAmountMicros: number | null
  productId: string
  productKey: string
}

function amountMicrosToCents(value: number | null): number {
  if (value == null) return 0
  return Math.round(value / 10_000)
}
