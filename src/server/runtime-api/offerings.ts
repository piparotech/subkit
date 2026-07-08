import { and, eq, ne } from 'drizzle-orm'
import { db } from '~/db/client'
import {
  entitlements,
  offeringPackages,
  offerings,
  prices,
  productEntitlements,
  productPlans,
  products,
} from '~/db/schema'
import { ensureDatabaseReady } from '~/db/setup'

import type {
  ServerOffering,
  ServerOfferingPackage,
  ServerOfferingsRequest,
  ServerOfferingsResponse,
  ServerProduct,
} from '@piparotech/subkit-core'

export async function listServerOfferings(
  input: ServerOfferingsRequest,
): Promise<ServerOfferingsResponse> {
  await ensureDatabaseReady()

  const rows = await db
    .select({
      entitlementKey: entitlements.key,
      offeringDescription: offerings.description,
      offeringId: offerings.id,
      offeringKey: offerings.key,
      offeringName: offerings.name,
      packageId: offeringPackages.id,
      packageKey: offeringPackages.key,
      packageLabel: offeringPackages.label,
      packageSortOrder: offeringPackages.sortOrder,
      planBillingPeriod: productPlans.billingPeriodIso,
      planId: productPlans.id,
      planKey: productPlans.key,
      priceAmountMicros: prices.amountMicros,
      productId: products.id,
      productKey: products.key,
      productName: products.name,
    })
    .from(offerings)
    .leftJoin(offeringPackages, eq(offeringPackages.offeringId, offerings.id))
    .leftJoin(productPlans, eq(offeringPackages.productPlanId, productPlans.id))
    .leftJoin(products, eq(productPlans.productId, products.id))
    .leftJoin(productEntitlements, eq(productEntitlements.productId, products.id))
    .leftJoin(entitlements, eq(productEntitlements.entitlementId, entitlements.id))
    .leftJoin(prices, and(eq(prices.productPlanId, productPlans.id), eq(prices.status, 'active')))
    .where(eq(offerings.appId, input.appId))

  const grouped = new Map<string, OfferingAccumulator>()

  for (const row of rows) {
    const offering = grouped.get(row.offeringId) ?? {
      description: row.offeringDescription,
      id: row.offeringId,
      key: row.offeringKey,
      name: row.offeringName,
      packages: new Map<string, PackageAccumulator>(),
    }

    if (
      row.packageId != null &&
      row.packageKey != null &&
      row.packageLabel != null &&
      row.packageSortOrder != null &&
      row.planId != null &&
      row.planKey != null &&
      row.productId != null &&
      row.productKey != null &&
      row.productName != null
    ) {
      const currentPackage = offering.packages.get(row.packageId) ?? {
        id: row.packageId,
        label: row.packageLabel,
        product: {
          billingPeriod: row.planBillingPeriod,
          displayName: row.productName,
          entitlementKeys: [],
          id: row.productId,
          planId: row.planId,
          planKey: row.planKey,
          priceCents: amountMicrosToCents(row.priceAmountMicros),
          productKey: row.productKey,
        },
        sortOrder: row.packageSortOrder,
      }
      if (
        row.entitlementKey != null &&
        !currentPackage.product.entitlementKeys.includes(row.entitlementKey)
      ) {
        currentPackage.product.entitlementKeys.push(row.entitlementKey)
      }
      if (currentPackage.product.priceCents === 0 && row.priceAmountMicros != null) {
        currentPackage.product.priceCents = amountMicrosToCents(row.priceAmountMicros)
      }
      offering.packages.set(row.packageId, currentPackage)
    }

    grouped.set(row.offeringId, offering)
  }

  return {
    offerings: [...grouped.values()].map((offering) => ({
      description: offering.description,
      id: offering.id,
      key: offering.key,
      name: offering.name,
      packages: [...offering.packages.values()]
        .map(toServerOfferingPackage)
        .sort((left, right) => left.sortOrder - right.sortOrder),
    })),
  }
}

interface OfferingAccumulator {
  description: string
  id: string
  key: string
  name: string
  packages: Map<string, PackageAccumulator>
}

interface PackageAccumulator {
  id: string
  label: string
  product: ServerProduct
  sortOrder: number
}

function toServerOfferingPackage(item: PackageAccumulator): ServerOfferingPackage {
  return {
    id: item.id,
    label: item.label,
    product: item.product,
    sortOrder: item.sortOrder,
  }
}

function amountMicrosToCents(value: number | null): number {
  if (value == null) return 0
  return Math.round(value / 10_000)
}
