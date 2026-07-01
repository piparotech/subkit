import { eq } from 'drizzle-orm'
import type { ServerOfferingsRequest, ServerOfferingsResponse } from '@piparotech/subkit-core'

import { db } from '~/db/client'
import { ensureDatabaseReady } from '~/db/setup'
import { entitlements, offeringPackages, offerings, products } from '~/db/schema'

export async function listServerOfferings(input: ServerOfferingsRequest): Promise<ServerOfferingsResponse> {
  await ensureDatabaseReady()

  const rows = await db
    .select({
      offeringId: offerings.id,
      offeringKey: offerings.key,
      offeringName: offerings.name,
      offeringDescription: offerings.description,
      packageId: offeringPackages.id,
      packageLabel: offeringPackages.label,
      packageSortOrder: offeringPackages.sortOrder,
      productId: products.id,
      productDisplayName: products.displayName,
      productDuration: products.duration,
      productIdentifier: products.identifier,
      productPriceCents: products.priceCents,
      entitlementKey: entitlements.key,
    })
    .from(offerings)
    .leftJoin(offeringPackages, eq(offeringPackages.offeringId, offerings.id))
    .leftJoin(products, eq(offeringPackages.productId, products.id))
    .leftJoin(entitlements, eq(products.entitlementId, entitlements.id))
    .where(eq(offerings.appId, input.appId))

  const grouped = new Map<string, ServerOfferingsResponse['offerings'][number]>()

  for (const row of rows) {
    const offering = grouped.get(row.offeringId) ?? {
      description: row.offeringDescription,
      id: row.offeringId,
      key: row.offeringKey,
      name: row.offeringName,
      packages: [],
    }

    if (row.packageId != null && row.productId != null && row.productDisplayName != null && row.productDuration != null && row.productIdentifier != null && row.productPriceCents != null && row.entitlementKey != null) {
      offering.packages.push({
        id: row.packageId,
        label: row.packageLabel ?? row.productDisplayName,
        product: {
          displayName: row.productDisplayName,
          duration: row.productDuration,
          entitlement: row.entitlementKey,
          id: row.productId,
          identifier: row.productIdentifier,
          priceCents: row.productPriceCents,
        },
        sortOrder: row.packageSortOrder ?? 0,
      })
    }

    grouped.set(row.offeringId, offering)
  }

  return {
    offerings: [...grouped.values()].map((offering) => ({
      ...offering,
      packages: [...offering.packages].sort((left, right) => left.sortOrder - right.sortOrder),
    })),
  }
}
