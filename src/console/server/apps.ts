import { createServerFn } from '@tanstack/react-start'
import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '~/db/client'
import { ensureDatabaseReady } from '~/db/setup'
import {
  apps,
  appStoreConnectAuditEvents,
  appStoreConnectSalesReports,
  appUsers,
  entitlementGrants,
  entitlements,
  offeringPackages,
  offerings,
  products,
  purchaseEvents,
  storeProductBindings,
} from '~/db/schema'
import { requireTenantRole } from '~/server/auth/tenant-access'

import { getCurrentConsoleUser, requireAccessibleApp } from './access'

const appInputSchema = z.object({
  appleAppId: z.string().min(1),
  bundleId: z.string(),
  color: z.string().min(1),
  id: z.string().min(1),
  initials: z.string().min(1),
  name: z.string().min(1),
  tenantId: z.string().min(1),
})

const deleteAppInputSchema = z.object({
  appId: z.string().min(1),
})

export const createAppRecord = createServerFn({ method: 'POST' })
  .validator((input: unknown) => appInputSchema.parse(input))
  .handler(async ({ data }) => {
    await ensureDatabaseReady()
    const currentUser = await getCurrentConsoleUser()
    await requireTenantRole(currentUser, data.tenantId, ['admin'])
    if (!data.id.startsWith(`${data.tenantId}:`)) {
      throw new Error('Cannot create apps outside the requested workspace')
    }

    await db
      .insert(apps)
      .values({
        activeAppUserCount: 0,
        androidPackageName: null,
        appleAppId: data.appleAppId,
        bundleId: data.bundleId,
        color: data.color,
        createdAt: new Date(),
        id: data.id,
        initials: data.initials,
        iosBundleId: data.bundleId,
        monthlyRevenueCents: 0,
        name: data.name,
        status: 'setup',
        tenantId: data.tenantId,
      })
      .onConflictDoUpdate({
        set: {
          appleAppId: data.appleAppId,
          bundleId: data.bundleId,
          color: data.color,
          initials: data.initials,
          iosBundleId: data.bundleId,
          name: data.name,
        },
        target: apps.id,
      })
    return { ok: true }
  })

export const deleteAppRecord = createServerFn({ method: 'POST' })
  .validator((input: unknown) => deleteAppInputSchema.parse(input))
  .handler(async ({ data }) => {
    await ensureDatabaseReady()
    const currentUser = await getCurrentConsoleUser()
    const app = await requireAccessibleApp(currentUser, data.appId)
    await requireTenantRole(currentUser, app.tenantId, ['admin'])

    await db.transaction(async (tx) => {
      const appUserRows = await tx.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.appId, data.appId))
      const offeringRows = await tx.select({ id: offerings.id }).from(offerings).where(eq(offerings.appId, data.appId))
      const appUserIds = appUserRows.map((appUser) => appUser.id)
      const offeringIds = offeringRows.map((offering) => offering.id)

      if (appUserIds.length > 0) await tx.delete(purchaseEvents).where(inArray(purchaseEvents.appUserId, appUserIds))
      await tx.delete(entitlementGrants).where(eq(entitlementGrants.appId, data.appId))
      if (offeringIds.length > 0) await tx.delete(offeringPackages).where(inArray(offeringPackages.offeringId, offeringIds))

      await tx.delete(appStoreConnectSalesReports).where(eq(appStoreConnectSalesReports.appId, data.appId))
      await tx.delete(appStoreConnectAuditEvents).where(eq(appStoreConnectAuditEvents.appId, data.appId))
      await tx.delete(storeProductBindings).where(eq(storeProductBindings.appId, data.appId))
      await tx.delete(products).where(eq(products.appId, data.appId))
      await tx.delete(appUsers).where(eq(appUsers.appId, data.appId))
      await tx.delete(offerings).where(eq(offerings.appId, data.appId))
      await tx.delete(entitlements).where(eq(entitlements.appId, data.appId))
      await tx.delete(apps).where(eq(apps.id, data.appId))
    })

    return { ok: true }
  })
