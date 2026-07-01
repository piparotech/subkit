import { eq } from 'drizzle-orm'

import { db } from '~/db/client'
import { createRandomToken } from '~/server/auth/crypto'
import {
  appStoreConnectAuditEvents,
  appStoreConnectCredentials,
  appStoreConnectSalesReports,
  apps,
  entitlements,
  products,
} from '~/db/schema'
import {
  downloadDailySalesReport,
  fetchAppleCatalogProducts,
  getAllAppStoreConnectResources,
  type AppStoreConnectCredentials,
  type AppStoreConnectResource,
} from '~/server/app-store-connect/client'
import { previewProduct } from '~/integrations/app-store-connect/server/preview'
import type {
  AppStoreConnectCatalogSyncResult,
  AppStoreConnectImportResult,
  AppStoreConnectProductPreview,
  AppStoreConnectReportSyncResult,
  AppStoreConnectTenantSyncResult,
} from '~/integrations/app-store-connect/types'

interface AppleAppSummary {
  appleAppId: string
  bundleId: string
  name: string
  sku: string
}

interface AuditInput {
  action: string
  appId: string | null
  credentialId: string
  detail: string
  tenantId: string
  userId: string
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
  const existingByAppleAppId = new Map(localApps.flatMap((app) => (app.appleAppId == null ? [] : [[app.appleAppId, app]])))

  for (const appleApp of appleApps) {
    const generatedAppId = appRowId(tenantId, appleApp.appleAppId)
    const existingApp = existingByAppleAppId.get(appleApp.appleAppId) ?? existingById.get(generatedAppId)
    const appId = existingApp?.id ?? generatedAppId
    const color = existingApp?.color ?? appColors[(localApps.length + result.appsCreated) % appColors.length] ?? appColors[0]
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
      const catalog = await syncAppStoreConnectCatalogForApp({ appleAppId: appleApp.appleAppId, appId, credentials })
      result.appsSynced += 1
      result.productsConflicts += catalog.conflicts
      result.productsCreated += catalog.created
      result.productsSkipped += catalog.skipped
      result.productsUnchanged += catalog.unchanged
      result.productsUpdated += catalog.updated
      await recordAppStoreConnectAudit({
        action: 'products.synced',
        appId,
        credentialId: credential.id,
        detail: `${catalog.created} created, ${catalog.updated} updated, ${catalog.unchanged} unchanged, ${catalog.conflicts} conflicts from automatic App Store Connect sync.`,
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
    detail: `${result.appsFound} apps found, ${result.appsCreated} created, ${result.appsUpdated} updated, ${result.appsSynced} catalogues synced, ${result.appsFailed} failed. Products: ${result.productsCreated} created, ${result.productsUpdated} updated, ${result.productsUnchanged} unchanged, ${result.productsConflicts} conflicts.`,
    tenantId,
    userId,
  })

  return result
}

export async function syncAppStoreConnectCatalogForApp({
  appleAppId,
  appId,
  credentials,
}: {
  appleAppId: string
  appId: string
  credentials: AppStoreConnectCredentials
}): Promise<AppStoreConnectCatalogSyncResult> {
  const preview = await readAppleProductPreview(appId, credentials, appleAppId)
  const result = await applyProductPreview(appId, preview)
  const unchanged = preview.filter((item) => item.action === 'unchanged').length
  const conflicts = preview.filter((item) => item.action === 'conflict').length
  return { ...result, conflicts, preview, unchanged }
}

export async function readAppleProductPreview(appId: string, credentials: AppStoreConnectCredentials, appleAppId: string): Promise<AppStoreConnectProductPreview[]> {
  const appleProducts = await fetchAppleCatalogProducts(credentials, appleAppId)
  const localProducts = await db.select().from(products).where(eq(products.appId, appId))
  return appleProducts.map((product) => previewProduct(product, localProducts))
}

export async function applyProductPreview(appId: string, preview: readonly AppStoreConnectProductPreview[]): Promise<AppStoreConnectImportResult> {
  let created = 0
  let updated = 0
  let skipped = 0

  for (const item of preview) {
    if (item.action === 'unchanged' || item.action === 'conflict') {
      skipped += 1
      continue
    }
    const entitlementId = entitlementRowId(appId, item.entitlement)
    await db
      .insert(entitlements)
      .values({
        appId,
        description: `Imported from App Store Connect ${item.kind.replaceAll('_', ' ')}`,
        id: entitlementId,
        key: item.entitlement,
      })
      .onConflictDoUpdate({
        set: { description: `Imported from App Store Connect ${item.kind.replaceAll('_', ' ')}`, key: item.entitlement },
        target: entitlements.id,
      })

    const identifier = item.localIdentifier ?? item.appleProductId
    const productId = productRowId(appId, identifier)
    await db
      .insert(products)
      .values({
        activeAppUserCount: 0,
        appId,
        appStoreId: item.appleProductId,
        displayName: item.appleName,
        duration: item.duration,
        entitlementId,
        id: productId,
        identifier,
        playStoreId: '',
        priceCents: 0,
        trialEnabled: false,
      })
      .onConflictDoUpdate({
        set: {
          appStoreId: item.appleProductId,
          displayName: item.appleName,
          duration: item.duration,
          entitlementId,
        },
        target: products.id,
      })

    if (item.action === 'create') created += 1
    if (item.action === 'update') updated += 1
  }

  return { created, skipped, updated }
}

export async function syncAppStoreConnectSalesReportSnapshot({
  appId,
  credentialId,
  credentials,
  reportDate = defaultReportDate(),
  tenantId,
  userId,
  vendorNumber,
}: {
  appId: string | null
  credentialId: string
  credentials: AppStoreConnectCredentials
  reportDate?: string
  tenantId: string
  userId: string
  vendorNumber: string
}): Promise<AppStoreConnectReportSyncResult> {
  try {
    const report = await downloadDailySalesReport({ credentials, reportDate, vendorNumber })
    await db.insert(appStoreConnectSalesReports).values({
      appId,
      createdAt: new Date(),
      credentialId,
      errorDetail: null,
      id: `asr_${createRandomToken(14)}`,
      rawText: report.rawText,
      reportDate,
      rowCount: report.rowCount,
      status: 'imported',
      vendorNumber,
    })
    await recordAppStoreConnectAudit({
      action: 'reports.synced',
      appId,
      credentialId,
      detail: `Daily Sales Report ${reportDate} imported with ${report.rowCount} rows.`,
      tenantId,
      userId,
    })
    return { reportDate, rowCount: report.rowCount, status: 'imported' }
  } catch (error) {
    const detail = safeErrorDetail(error)
    await db.insert(appStoreConnectSalesReports).values({
      appId,
      createdAt: new Date(),
      credentialId,
      errorDetail: detail,
      id: `asr_${createRandomToken(14)}`,
      rawText: null,
      reportDate,
      rowCount: 0,
      status: 'failed',
      vendorNumber,
    })
    await recordAppStoreConnectAudit({
      action: 'reports.failed',
      appId,
      credentialId,
      detail: `Daily Sales Report ${reportDate} failed: ${detail}`,
      tenantId,
      userId,
    })
    return { reportDate, rowCount: 0, status: 'failed' }
  }
}

export async function recordAppStoreConnectAudit({
  action,
  appId,
  credentialId,
  detail,
  tenantId,
  userId,
}: AuditInput): Promise<void> {
  await db.insert(appStoreConnectAuditEvents).values({
    action,
    appId,
    createdAt: new Date(),
    credentialId,
    detail: redactSecretLikeText(detail),
    id: `asa_${createRandomToken(14)}`,
    actorUserId: userId,
    tenantId,
  })
}

async function fetchAccessibleAppleApps(credentials: AppStoreConnectCredentials): Promise<AppleAppSummary[]> {
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

function productRowId(appId: string, identifier: string): string {
  return `${appId}:${identifier}`
}

function entitlementRowId(appId: string, key: string): string {
  return `${appId}:${key}`
}

function defaultReportDate(): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

function safeErrorDetail(error: unknown): string {
  if (error instanceof Error) return redactSecretLikeText(error.message)
  return 'Unknown App Store Connect error'
}

function redactSecretLikeText(value: string): string {
  return value
    .replace(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g, '[redacted-private-key]')
    .replace(/[A-Za-z0-9_-]{80,}/g, '[redacted-token]')
}
