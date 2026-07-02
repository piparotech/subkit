import type { Offering, RuntimeOfferingsResponse, RuntimeOfferingsWithAppRequestInput } from '@piparotech/subkit-core'
import { and, eq, inArray } from 'drizzle-orm'

import { db } from '~/db/client'
import { ensureDatabaseReady } from '~/db/setup'
import {
  entitlements,
  offeringPackages,
  offerings,
  prices,
  productEntitlements,
  productOffers,
  productPlans,
  products,
  storeProductBindings,
} from '~/db/schema'

import { type ProductRow, amountMicrosToCents, assertAppExists, toRuntimeProductKind } from './runtime-shared'

interface RuntimeOfferingRow {
  appleProductId: string | null
  badge: string
  billingPeriod: string | null
  entitlementKey: string | null
  googleBasePlanId: string | null
  googleProductId: string | null
  offeringDescription: string
  offeringId: string
  offeringKey: string
  offeringName: string
  packageKey: string
  packageLabel: string
  packageSortOrder: number
  planId: string
  planKey: string
  priceAmountMicros: number | null
  productDescription: string
  productId: string
  productKey: string
  productName: string
  productType: ProductRow['productType']
  trialEnabled: boolean
}

export async function listRuntimeOfferings(input: RuntimeOfferingsWithAppRequestInput): Promise<RuntimeOfferingsResponse> {
  await ensureDatabaseReady()
  await assertAppExists(input.appId)

  const packageRows = await db
    .select({
      badge: offeringPackages.badge,
      billingPeriod: productPlans.billingPeriodIso,
      offeringDescription: offerings.description,
      offeringId: offerings.id,
      offeringKey: offerings.key,
      offeringName: offerings.name,
      packageKey: offeringPackages.key,
      packageLabel: offeringPackages.label,
      packageSortOrder: offeringPackages.sortOrder,
      planId: productPlans.id,
      planKey: productPlans.key,
      priceAmountMicros: prices.amountMicros,
      productDescription: products.description,
      productId: products.id,
      productKey: products.key,
      productName: products.name,
      productType: products.productType,
    })
    .from(offerings)
    .innerJoin(offeringPackages, eq(offeringPackages.offeringId, offerings.id))
    .innerJoin(productPlans, eq(productPlans.id, offeringPackages.productPlanId))
    .innerJoin(products, eq(products.id, productPlans.productId))
    .leftJoin(prices, and(eq(prices.productPlanId, productPlans.id), eq(prices.status, 'active')))
    .where(eq(offerings.appId, input.appId))

  const planIds = [...new Set(packageRows.map((row) => row.planId))]
  const entitlementKeysByProductId = await readEntitlementKeysByProductId([...new Set(packageRows.map((row) => row.productId))])
  const trialEnabledByPlanId = await readTrialEnabledByPlanId(planIds)
  const bindingIdsByPlanId = await readRuntimeStoreProductIdsByPlanId(planIds)

  const rows: RuntimeOfferingRow[] = packageRows.map((row) => ({
    ...row,
    appleProductId: bindingIdsByPlanId.get(row.planId)?.apple ?? null,
    entitlementKey: entitlementKeysByProductId.get(row.productId)?.[0] ?? null,
    googleBasePlanId: bindingIdsByPlanId.get(row.planId)?.googleBasePlanId ?? null,
    googleProductId: bindingIdsByPlanId.get(row.planId)?.google ?? null,
    trialEnabled: trialEnabledByPlanId.get(row.planId) ?? false,
  }))

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
      identifier: row.packageKey,
      label: row.packageLabel,
      product: {
        billingPeriod: row.billingPeriod,
        description: row.productDescription,
        displayName: row.productName,
        entitlementKeys: entitlementKeysByProductId.get(row.productId) ?? [],
        kind: toRuntimeProductKind(row.productType),
        planKey: row.planKey,
        priceCents: amountMicrosToCents(row.priceAmountMicros),
        productKey: row.productKey,
        storeProductIds: {
          apple: row.appleProductId ?? undefined,
          google: row.googleProductId ?? undefined,
        },
        trialEnabled: row.trialEnabled,
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

async function readEntitlementKeysByProductId(productIds: readonly string[]): Promise<Map<string, string[]>> {
  if (productIds.length === 0) return new Map()
  const rows = await db
    .select({ entitlementKey: entitlements.key, productId: productEntitlements.productId })
    .from(productEntitlements)
    .innerJoin(entitlements, eq(entitlements.id, productEntitlements.entitlementId))
    .where(inArray(productEntitlements.productId, [...productIds]))
  const map = new Map<string, string[]>()
  for (const row of rows) {
    const list = map.get(row.productId) ?? []
    list.push(row.entitlementKey)
    map.set(row.productId, list)
  }
  return map
}

async function readTrialEnabledByPlanId(planIds: readonly string[]): Promise<Map<string, boolean>> {
  if (planIds.length === 0) return new Map()
  const rows = await db
    .select({ planId: productOffers.productPlanId })
    .from(productOffers)
    .where(and(inArray(productOffers.productPlanId, [...planIds]), eq(productOffers.status, 'active'), eq(productOffers.offerType, 'free_trial')))
  return new Map(rows.map((row) => [row.planId, true]))
}

async function readRuntimeStoreProductIdsByPlanId(planIds: readonly string[]): Promise<Map<string, { apple?: string; google?: string; googleBasePlanId?: string }>> {
  if (planIds.length === 0) return new Map()
  const rows = await db
    .select({
      externalBasePlanId: storeProductBindings.externalBasePlanId,
      externalProductId: storeProductBindings.externalProductId,
      planId: storeProductBindings.productPlanId,
      store: storeProductBindings.store,
    })
    .from(storeProductBindings)
    .where(and(inArray(storeProductBindings.productPlanId, [...planIds]), inArray(storeProductBindings.bindingStatus, ['linked', 'synced', 'drifted'])))
  const map = new Map<string, { apple?: string; google?: string; googleBasePlanId?: string }>()
  for (const row of rows) {
    if (row.planId == null) continue
    const value = map.get(row.planId) ?? {}
    if (row.store === 'apple') value.apple = row.externalProductId
    if (row.store === 'google') {
      value.google = row.externalProductId
      if (row.externalBasePlanId != null) value.googleBasePlanId = row.externalBasePlanId
    }
    map.set(row.planId, value)
  }
  return map
}
