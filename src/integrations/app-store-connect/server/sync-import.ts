import { db } from '~/db/client'
import {
  entitlements,
  prices,
  productEntitlements,
  productPlans,
  products,
  storeProductBindings,
} from '~/db/schema'
import type {
  AppStoreConnectImportResult,
  AppStoreConnectProductPreview,
} from '~/integrations/app-store-connect/types'

export async function applyProductPreview(
  appId: string,
  preview: readonly AppStoreConnectProductPreview[],
): Promise<AppStoreConnectImportResult> {
  let created = 0
  let updated = 0
  let skipped = 0

  for (const item of preview) {
    if (item.action === 'unchanged' || item.action === 'conflict') {
      skipped += 1
      continue
    }

    const now = new Date()
    const entitlementId = entitlementRowId(appId, item.entitlement)
    await db
      .insert(entitlements)
      .values({
        appId,
        createdAt: now,
        description: `Imported from App Store Connect ${item.kind.replaceAll('_', ' ')}`,
        id: entitlementId,
        key: item.entitlement,
        name: item.entitlement,
        status: 'active',
        updatedAt: now,
      })
      .onConflictDoUpdate({
        set: {
          description: `Imported from App Store Connect ${item.kind.replaceAll('_', ' ')}`,
          key: item.entitlement,
          name: item.entitlement,
          updatedAt: now,
        },
        target: entitlements.id,
      })

    const key = item.localIdentifier ?? item.appleProductId
    const productId = productRowId(appId, key)
    const planId = productPlanRowId(productId, durationToPlanKey(item.duration))
    await db
      .insert(products)
      .values({
        activeAppUserCount: 0,
        appId,
        createdAt: now,
        description: `Imported from App Store Connect ${item.kind.replaceAll('_', ' ')}`,
        id: productId,
        key,
        name: item.appleName,
        productType: item.kind === 'subscription' ? 'subscription' : 'non_consumable',
        status: 'active',
        updatedAt: now,
      })
      .onConflictDoUpdate({
        set: {
          description: `Imported from App Store Connect ${item.kind.replaceAll('_', ' ')}`,
          key,
          name: item.appleName,
          productType: item.kind === 'subscription' ? 'subscription' : 'non_consumable',
          updatedAt: now,
        },
        target: products.id,
      })

    await db
      .insert(productEntitlements)
      .values({
        createdAt: now,
        durationIso: null,
        entitlementId,
        grantMode: item.kind === 'subscription' ? 'while_active' : 'lifetime',
        id: productEntitlementRowId(productId, entitlementId),
        productId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        set: {
          grantMode: item.kind === 'subscription' ? 'while_active' : 'lifetime',
          updatedAt: now,
        },
        target: [productEntitlements.productId, productEntitlements.entitlementId],
      })

    await db
      .insert(productPlans)
      .values({
        billingKind: item.kind === 'subscription' ? 'recurring' : 'one_time',
        billingPeriodIso: item.kind === 'subscription' ? item.duration : null,
        createdAt: now,
        gracePeriodIso: null,
        id: planId,
        key: durationToPlanKey(item.duration),
        productId,
        status: 'active',
        updatedAt: now,
      })
      .onConflictDoUpdate({
        set: {
          billingKind: item.kind === 'subscription' ? 'recurring' : 'one_time',
          billingPeriodIso: item.kind === 'subscription' ? item.duration : null,
          status: 'active',
          updatedAt: now,
        },
        target: productPlans.id,
      })

    await db
      .insert(prices)
      .values({
        amountMicros: 0,
        countryCode: null,
        createdAt: now,
        currencyCode: 'USD',
        endsAt: null,
        id: priceRowId(planId, 'USD', null),
        productPlanId: planId,
        startsAt: null,
        status: 'draft',
        taxInclusive: null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        set: { status: 'draft', updatedAt: now },
        target: [prices.productPlanId, prices.currencyCode, prices.countryCode],
      })

    await db
      .insert(storeProductBindings)
      .values({
        appId,
        appPlatformId: null,
        bindingStatus: 'linked',
        createdAt: now,
        environment: 'production',
        externalBasePlanId: '',
        externalPackageName: null,
        externalProductId: item.appleProductId,
        externalSubscriptionGroupId: null,
        id: storeBindingRowId(planId, 'apple', item.appleProductId, ''),
        lastComparedAt: null,
        lastSnapshotId: null,
        productId,
        productPlanId: planId,
        store: 'apple',
        storeIntegrationId: null,
        syncDirection: 'store_to_subkit',
        updatedAt: now,
      })
      .onConflictDoUpdate({
        set: {
          bindingStatus: 'linked',
          productId,
          productPlanId: planId,
          syncDirection: 'store_to_subkit',
          updatedAt: now,
        },
        target: [
          storeProductBindings.appId,
          storeProductBindings.store,
          storeProductBindings.externalProductId,
          storeProductBindings.externalBasePlanId,
          storeProductBindings.environment,
        ],
      })

    if (item.action === 'create') created += 1
    if (item.action === 'update') updated += 1
  }

  return { created, skipped, updated }
}

function productRowId(appId: string, key: string): string {
  return `${appId}:product:${key}`
}

function productPlanRowId(productId: string, planKey: string): string {
  return `${productId}:plan:${planKey}`
}

function productEntitlementRowId(productId: string, entitlementId: string): string {
  return `${productId}:entitlement:${entitlementId}`
}

function priceRowId(
  productPlanId: string,
  currencyCode: string,
  countryCode: string | null,
): string {
  return `${productPlanId}:price:${currencyCode}:${countryCode ?? 'global'}`
}

function storeBindingRowId(
  productPlanId: string,
  store: 'apple',
  externalProductId: string,
  basePlanId: string,
): string {
  return `${productPlanId}:binding:${store}:${externalProductId}:${basePlanId || 'default'}`
}

function entitlementRowId(appId: string, key: string): string {
  return `${appId}:entitlement:${key}`
}

function durationToPlanKey(duration: string): string {
  return (
    duration
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'default'
  )
}
