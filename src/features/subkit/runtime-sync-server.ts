import { createServerFn } from '@tanstack/react-start'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '~/db/client'
import { ensureDatabaseReady } from '~/db/setup'
import { apps, entitlements, products, runtimeSyncEvents, subscribers } from '~/db/schema'
import { createRandomToken } from '~/server/auth/crypto'
import { getRequiredCurrentUser } from '~/server/auth/current-user'
import { requireTenantAccess } from '~/server/auth/tenant-access'

const runtimeSubscriberStatusSchema = z.enum(['active', 'trial', 'billing_retry', 'expired'])

const runtimeSubscriberSchema = z.object({
  appUserId: z.string().min(1),
  country: z.string().optional(),
  countryCode: z.string().optional(),
  entitlement: z.string().optional(),
  lifetimeValueCents: z.number().int().optional(),
  plan: z.string().optional(),
  productIdentifier: z.string().optional(),
  since: z.string().optional(),
  status: runtimeSubscriberStatusSchema,
})

export const runtimeSyncInputSchema = z.object({
  appId: z.string().min(1),
  source: z.string().optional(),
  subscribers: z.array(runtimeSubscriberSchema).max(5000),
})

type RuntimeSubscriberInput = z.infer<typeof runtimeSubscriberSchema>

type RuntimeSyncResult = {
  created: number
  failed: number
  received: number
  updated: number
}

export const syncRuntimeSubscribers = createServerFn({ method: 'POST' })
  .validator((input: unknown) => runtimeSyncInputSchema.parse(input))
  .handler(async ({ data }): Promise<RuntimeSyncResult> => {
    await ensureDatabaseReady()
    const currentUser = await getRequiredCurrentUser()
    await requireAccessibleApp(currentUser, data.appId)
    return importRuntimeSubscribers(data.appId, data.subscribers, data.source ?? 'manual')
  })

export async function importRuntimeSubscribers(
  appId: string,
  items: readonly RuntimeSubscriberInput[],
  source: string,
): Promise<RuntimeSyncResult> {
  await ensureDatabaseReady()
  await requireExistingApp(appId)
  const cleanSource = source.trim() || 'runtime'
  let created = 0
  let updated = 0
  let failed = 0

  try {
    await db.transaction(async (tx) => {
      for (const item of items) {
        const appUserId = item.appUserId.trim()
        if (!appUserId) {
          failed += 1
          continue
        }

        const existing = await tx.select().from(subscribers).where(eq(subscribers.id, subscriberRowId(appId, appUserId))).limit(1)
        if (existing[0] == null) created += 1
        else updated += 1

        const entitlementId = await resolveEntitlementId(appId, item, tx)
        await tx
          .insert(subscribers)
          .values({
            appId,
            appUserId,
            country: item.country?.trim() || item.countryCode?.trim() || 'Unknown',
            countryCode: item.countryCode?.trim().toUpperCase() || 'XX',
            entitlementId,
            id: subscriberRowId(appId, appUserId),
            lifetimeValueCents: item.lifetimeValueCents ?? 0,
            plan: item.plan?.trim() || item.productIdentifier?.trim() || 'Unknown plan',
            status: item.status,
            subscriberSince: item.since?.trim() || new Date().toISOString().slice(0, 10),
          })
          .onConflictDoUpdate({
            set: {
              country: item.country?.trim() || item.countryCode?.trim() || 'Unknown',
              countryCode: item.countryCode?.trim().toUpperCase() || 'XX',
              entitlementId,
              lifetimeValueCents: item.lifetimeValueCents ?? 0,
              plan: item.plan?.trim() || item.productIdentifier?.trim() || 'Unknown plan',
              status: item.status,
              subscriberSince: item.since?.trim() || new Date().toISOString().slice(0, 10),
            },
            target: subscribers.id,
          })
      }

      await updateAppDerivedCounters(appId, tx)
      await tx.insert(runtimeSyncEvents).values({
        appId,
        created,
        createdAt: new Date(),
        detail: `${created} subscribers created, ${updated} updated, ${failed} failed from ${cleanSource}.`,
        failed,
        id: `rse_${createRandomToken(14)}`,
        received: items.length,
        source: cleanSource,
        status: failed > 0 ? 'failed' : 'imported',
        updated,
      })
    })
  } catch (error) {
    await db.insert(runtimeSyncEvents).values({
      appId,
      created,
      createdAt: new Date(),
      detail: error instanceof Error ? error.message : 'Runtime subscriber sync failed.',
      failed: Math.max(1, items.length - created - updated),
      id: `rse_${createRandomToken(14)}`,
      received: items.length,
      source: cleanSource,
      status: 'failed',
      updated,
    })
    throw error
  }

  return { created, failed, received: items.length, updated }
}

async function resolveEntitlementId(
  appId: string,
  item: RuntimeSubscriberInput,
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
): Promise<string | null> {
  const entitlementKey = item.entitlement?.trim()
  if (entitlementKey != null && entitlementKey !== '') {
    const id = entitlementRowId(appId, entitlementKey)
    await tx
      .insert(entitlements)
      .values({ appId, description: 'Imported from runtime subscriber sync', id, key: entitlementKey })
      .onConflictDoUpdate({
        set: { description: 'Imported from runtime subscriber sync', key: entitlementKey },
        target: entitlements.id,
      })
    return id
  }

  const productIdentifier = item.productIdentifier?.trim()
  if (productIdentifier == null || productIdentifier === '') return null
  const [product] = await tx.select().from(products).where(eq(products.id, productRowId(appId, productIdentifier))).limit(1)
  return product?.entitlementId ?? null
}

async function updateAppDerivedCounters(appId: string, tx: Parameters<Parameters<typeof db.transaction>[0]>[0]): Promise<void> {
  const countResult = await tx
    .select({ count: sql<number>`count(*)` })
    .from(subscribers)
    .where(sql`${subscribers.appId} = ${appId} and ${subscribers.status} in ('active', 'trial')`)
  await tx
    .update(apps)
    .set({
      activeSubscriberCount: Number(countResult[0]?.count ?? 0),
    })
    .where(eq(apps.id, appId))
}

async function requireAccessibleApp(user: Awaited<ReturnType<typeof getRequiredCurrentUser>>, appId: string): Promise<void> {
  const app = await requireExistingApp(appId)
  await requireTenantAccess(user, app.tenantId)
}

async function requireExistingApp(appId: string): Promise<{ tenantId: string }> {
  const [app] = await db.select({ tenantId: apps.tenantId }).from(apps).where(eq(apps.id, appId)).limit(1)
  if (app == null) throw new Error('App does not exist')
  return app
}

function subscriberRowId(appId: string, appUserId: string): string {
  return `${appId}:subscriber:${appUserId}`
}

function productRowId(appId: string, identifier: string): string {
  return `${appId}:${identifier}`
}

function entitlementRowId(appId: string, key: string): string {
  return `${appId}:${key}`
}
