import { createServerFn } from '@tanstack/react-start'

import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~/db/client'
import {
  entitlements,
  prices,
  productEntitlements,
  productOffers,
  productPlans,
  products,
  storeProductBindings,
} from '~/db/schema'
import { ensureDatabaseReady } from '~/db/setup'

import { getCurrentConsoleUser, requireAccessibleApp } from './access'
import { centsToAmountMicros } from './format'

const productInputSchema = z.object({
  appId: z.string().min(1),
  appleProductId: z.string().optional(),
  billingPeriod: z.string().min(1),
  description: z.string(),
  entitlement: z.string().min(1),
  googleBasePlanId: z.string().optional(),
  googleProductId: z.string().optional(),
  name: z.string().min(1),
  planId: z.string().optional(),
  planKey: z.string().min(1),
  price: z.string().min(1),
  productId: z.string().optional(),
  productKey: z.string().min(1),
  productType: z.enum(['subscription', 'non_consumable', 'consumable', 'voucher', 'manual']),
  status: z.enum(['draft', 'active', 'archived']),
  trialOn: z.boolean(),
})

function parsePriceCents(price: string): number {
  const amount = Number(price.replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(amount)) throw new Error('Invalid subscription price')
  return Math.round(amount * 100)
}

function productRowId(appId: string, key: string): string {
  return `${appId}:product:${key}`
}

function productPlanRowId(productId: string, planKey: string): string {
  return `${productId}:plan:${planKey}`
}

function priceRowId(
  productPlanId: string,
  currencyCode: string,
  countryCode: string | null,
): string {
  return `${productPlanId}:price:${currencyCode}:${countryCode ?? 'global'}`
}

function productEntitlementRowId(productId: string, entitlementId: string): string {
  return `${productId}:entitlement:${entitlementId}`
}

function storeBindingRowId(
  productPlanId: string,
  store: 'apple' | 'google',
  externalProductId: string,
  basePlanId: string,
): string {
  return `${productPlanId}:binding:${store}:${externalProductId}:${basePlanId || 'default'}`
}

function productOfferRowId(productPlanId: string, key: string): string {
  return `${productPlanId}:offer:${key}`
}

function entitlementRowId(appId: string, key: string): string {
  return `${appId}:entitlement:${key}`
}

export const upsertProductRecord = createServerFn({ method: 'POST' })
  .validator((input: unknown) => productInputSchema.parse(input))
  .handler(async ({ data }) => {
    await ensureDatabaseReady()
    const currentUser = await getCurrentConsoleUser()
    await requireAccessibleApp(currentUser, data.appId)

    const productId = data.productId ?? productRowId(data.appId, data.productKey)
    const planId = data.planId ?? productPlanRowId(productId, data.planKey)
    const entitlementId = entitlementRowId(data.appId, data.entitlement)
    const now = new Date()
    const priceCents = parsePriceCents(data.price)

    await db.transaction(async (tx) => {
      await tx
        .insert(entitlements)
        .values({
          appId: data.appId,
          createdAt: now,
          description: `Access group ${data.entitlement}`,
          id: entitlementId,
          key: data.entitlement,
          name: data.entitlement,
          status: 'active',
          updatedAt: now,
        })
        .onConflictDoUpdate({
          set: {
            description: `Access group ${data.entitlement}`,
            key: data.entitlement,
            name: data.entitlement,
            status: 'active',
            updatedAt: now,
          },
          target: entitlements.id,
        })

      await tx
        .insert(products)
        .values({
          activeAppUserCount: 0,
          appId: data.appId,
          createdAt: now,
          description: data.description,
          id: productId,
          key: data.productKey,
          name: data.name,
          productType: data.productType,
          status: data.status,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          set: {
            description: data.description,
            key: data.productKey,
            name: data.name,
            productType: data.productType,
            status: data.status,
            updatedAt: now,
          },
          target: products.id,
        })

      await tx
        .insert(productEntitlements)
        .values({
          createdAt: now,
          durationIso: null,
          entitlementId,
          grantMode: data.productType === 'non_consumable' ? 'lifetime' : 'while_active',
          id: productEntitlementRowId(productId, entitlementId),
          productId,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          set: {
            grantMode: data.productType === 'non_consumable' ? 'lifetime' : 'while_active',
            updatedAt: now,
          },
          target: [productEntitlements.productId, productEntitlements.entitlementId],
        })

      await tx
        .insert(productPlans)
        .values({
          billingKind: data.productType === 'subscription' ? 'recurring' : 'one_time',
          billingPeriodIso: data.productType === 'subscription' ? data.billingPeriod : null,
          createdAt: now,
          gracePeriodIso: null,
          id: planId,
          key: data.planKey,
          productId,
          status: data.status,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          set: {
            billingKind: data.productType === 'subscription' ? 'recurring' : 'one_time',
            billingPeriodIso: data.productType === 'subscription' ? data.billingPeriod : null,
            key: data.planKey,
            status: data.status,
            updatedAt: now,
          },
          target: productPlans.id,
        })

      await tx
        .insert(prices)
        .values({
          amountMicros: centsToAmountMicros(priceCents),
          countryCode: null,
          createdAt: now,
          currencyCode: 'USD',
          endsAt: null,
          id: priceRowId(planId, 'USD', null),
          productPlanId: planId,
          startsAt: null,
          status: 'active',
          taxInclusive: null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          set: {
            amountMicros: centsToAmountMicros(priceCents),
            status: 'active',
            updatedAt: now,
          },
          target: [prices.productPlanId, prices.currencyCode, prices.countryCode],
        })

      if (data.trialOn) {
        await tx
          .insert(productOffers)
          .values({
            billingPeriodCount: null,
            createdAt: now,
            durationIso: 'P7D',
            eligibility: 'new_customers',
            endsAt: null,
            id: productOfferRowId(planId, 'free-trial'),
            key: 'free-trial',
            offerType: 'free_trial',
            priceAmountMicros: null,
            priceCurrencyCode: null,
            productPlanId: planId,
            startsAt: null,
            status: 'active',
            updatedAt: now,
          })
          .onConflictDoUpdate({
            set: {
              durationIso: 'P7D',
              status: 'active',
              updatedAt: now,
            },
            target: [productOffers.productPlanId, productOffers.key],
          })
      } else {
        await tx
          .delete(productOffers)
          .where(and(eq(productOffers.productPlanId, planId), eq(productOffers.key, 'free-trial')))
      }

      if (data.appleProductId != null && data.appleProductId.trim() !== '') {
        await tx
          .insert(storeProductBindings)
          .values({
            appId: data.appId,
            appPlatformId: null,
            bindingStatus: 'linked',
            createdAt: now,
            environment: 'production',
            externalBasePlanId: '',
            externalPackageName: null,
            externalProductId: data.appleProductId.trim(),
            externalSubscriptionGroupId: null,
            id: storeBindingRowId(planId, 'apple', data.appleProductId.trim(), ''),
            lastComparedAt: null,
            lastSnapshotId: null,
            productId,
            productPlanId: planId,
            store: 'apple',
            storeIntegrationId: null,
            syncDirection: 'subkit_to_store',
            updatedAt: now,
          })
          .onConflictDoUpdate({
            set: {
              bindingStatus: 'linked',
              externalProductId: data.appleProductId.trim(),
              productId,
              productPlanId: planId,
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
      }

      if (data.googleProductId != null && data.googleProductId.trim() !== '') {
        const googleProductId = data.googleProductId.trim()
        const googleBasePlanId = data.googleBasePlanId?.trim() ?? ''
        await tx
          .insert(storeProductBindings)
          .values({
            appId: data.appId,
            appPlatformId: null,
            bindingStatus: 'linked',
            createdAt: now,
            environment: 'production',
            externalBasePlanId: googleBasePlanId,
            externalPackageName: null,
            externalProductId: googleProductId,
            externalSubscriptionGroupId: null,
            id: storeBindingRowId(planId, 'google', googleProductId, googleBasePlanId),
            lastComparedAt: null,
            lastSnapshotId: null,
            productId,
            productPlanId: planId,
            store: 'google',
            storeIntegrationId: null,
            syncDirection: 'subkit_to_store',
            updatedAt: now,
          })
          .onConflictDoUpdate({
            set: {
              bindingStatus: 'linked',
              externalBasePlanId: googleBasePlanId,
              externalProductId: googleProductId,
              productId,
              productPlanId: planId,
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
      }
    })
    return { ok: true }
  })
