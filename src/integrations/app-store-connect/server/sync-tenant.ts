import { eq } from 'drizzle-orm'
import { db } from '~/db/client'
import { appStoreConnectCredentials, apps } from '~/db/schema'
import type { AppStoreConnectTenantSyncResult } from '~/integrations/app-store-connect/types'
import {
  type AppStoreConnectCredentials,
  type AppStoreConnectResource,
  getAllAppStoreConnectResources,
} from '~/server/app-store-connect/client'

import { syncAppStoreConnectCatalogForApp } from './sync-catalog'
import { syncAppStoreConnectSalesReportSnapshot } from './sync-reports'
import { recordAppStoreConnectAudit, safeErrorDetail } from './sync-shared'

interface AppleAppSummary {
  appleAppId: string
  bundleId: string
  name: string
  sku: string
}

const appColors = [
  'oklch(0.62 0.17 152)',
  'oklch(0.55 0.19 264)',
  'oklch(0.72 0.15 60)',
  'oklch(0.58 0.16 300)',
  'oklch(0.6 0.13 200)',
]

export async function syncTenantAppStoreConnectData({
  credential,
  credentials,
  tenantId,
  userId,
}: {
  credential: typeof appStoreConnectCredentials.$inferSelect
  credentials: AppStoreConnectCredentials
  tenantId: string
  userId: string
}): Promise<AppStoreConnectTenantSyncResult> {
  const result: AppStoreConnectTenantSyncResult = {
    appsCreated: 0,
    appsFailed: 0,
    appsFound: 0,
    appsSynced: 0,
    appsUpdated: 0,
    productsConflicts: 0,
    productsCreated: 0,
    productsSkipped: 0,
    productsUnchanged: 0,
    productsUpdated: 0,
    salesReport: null,
  }

  const appleApps = await fetchAccessibleAppleApps(credentials)
  result.appsFound = appleApps.length

  const localApps = await db.select().from(apps).where(eq(apps.tenantId, tenantId))
  const existingById = new Map(localApps.map((app) => [app.id, app]))
  const existingByAppleAppId = new Map(
    localApps.flatMap((app) => (app.appleAppId == null ? [] : [[app.appleAppId, app]])),
  )

  for (const appleApp of appleApps) {
    const generatedAppId = appRowId(tenantId, appleApp.appleAppId)
    const existingApp =
      existingByAppleAppId.get(appleApp.appleAppId) ?? existingById.get(generatedAppId)
    const appId = existingApp?.id ?? generatedAppId
    const color =
      existingApp?.color ??
      appColors[(localApps.length + result.appsCreated) % appColors.length] ??
      appColors[0]
    const initials = initialsForName(appleApp.name)

    await db
      .insert(apps)
      .values({
        activeAppUserCount: existingApp?.activeAppUserCount ?? 0,
        androidPackageName: existingApp?.androidPackageName ?? null,
        appleAppId: appleApp.appleAppId,
        bundleId: appleApp.bundleId,
        color,
        createdAt: existingApp?.createdAt ?? new Date(),
        id: appId,
        initials,
        iosBundleId: appleApp.bundleId || null,
        monthlyRevenueCents: existingApp?.monthlyRevenueCents ?? 0,
        name: appleApp.name,
        status: existingApp?.status ?? 'setup',
        tenantId,
      })
      .onConflictDoUpdate({
        set: {
          appleAppId: appleApp.appleAppId,
          bundleId: appleApp.bundleId,
          initials,
          iosBundleId: appleApp.bundleId || null,
          name: appleApp.name,
        },
        target: apps.id,
      })

    if (existingApp == null) result.appsCreated += 1
    else result.appsUpdated += 1

    try {
      const catalog = await syncAppStoreConnectCatalogForApp({
        appleAppId: appleApp.appleAppId,
        appId,
        credentials,
        userId,
      })
      result.appsSynced += 1
      result.productsConflicts += catalog.conflicts
      result.productsCreated += catalog.created
      result.productsSkipped += catalog.skipped
      result.productsUnchanged += catalog.unchanged
      result.productsUpdated += catalog.updated
      await recordAppStoreConnectAudit({
        action: 'products.catalog_inspected',
        appId,
        credentialId: credential.id,
        detail: `${catalog.created} store-only products, ${catalog.updated} local differences, ${catalog.unchanged} unchanged, ${catalog.conflicts} conflicts from automatic App Store Connect inspection. No SubKit products were changed.`,
        tenantId,
        userId,
      })
    } catch (error) {
      result.appsFailed += 1
      await recordAppStoreConnectAudit({
        action: 'products.sync_failed',
        appId,
        credentialId: credential.id,
        detail: `Automatic App Store Connect catalogue sync failed: ${safeErrorDetail(error)}`,
        tenantId,
        userId,
      })
    }
  }

  const vendorNumber = credential.vendorNumber?.trim()
  if (vendorNumber) {
    result.salesReport = await syncAppStoreConnectSalesReportSnapshot({
      appId: null,
      credentialId: credential.id,
      credentials,
      tenantId,
      userId,
      vendorNumber,
    })
  }

  await recordAppStoreConnectAudit({
    action: 'tenant.synced',
    appId: null,
    credentialId: credential.id,
    detail: `${result.appsFound} apps found, ${result.appsCreated} app rows created, ${result.appsUpdated} app rows updated, ${result.appsSynced} catalogues inspected, ${result.appsFailed} failed. Products: ${result.productsCreated} store-only, ${result.productsUpdated} different, ${result.productsUnchanged} unchanged, ${result.productsConflicts} conflicts. Product catalog inspection is read-only for SubKit products.`,
    tenantId,
    userId,
  })

  return result
}

async function fetchAccessibleAppleApps(
  credentials: AppStoreConnectCredentials,
): Promise<AppleAppSummary[]> {
  const resources = await getAllAppStoreConnectResources(credentials, '/v1/apps?limit=200')
  return resources.map(toAppleAppSummary)
}

function toAppleAppSummary(resource: AppStoreConnectResource): AppleAppSummary {
  return {
    appleAppId: resource.id,
    bundleId: readString(resource, 'bundleId') ?? '',
    name: readString(resource, 'name') ?? resource.id,
    sku: readString(resource, 'sku') ?? '',
  }
}

function readString(resource: AppStoreConnectResource, key: string): string | undefined {
  const value = resource.attributes[key]
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function initialsForName(name: string): string {
  const clean = name.trim()
  if (!clean) return 'AP'
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() ?? 'AP'
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function appRowId(tenantId: string, appleAppId: string): string {
  return `${tenantId}:ios:${appleAppId}`
}
