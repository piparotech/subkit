import { createHash } from 'node:crypto'

import { and, eq, like } from 'drizzle-orm'

import { db } from '~/db/client'
import { createRandomToken } from '~/server/auth/crypto'
import {
  appPlatforms,
  appStoreConnectAuditEvents,
  appStoreConnectCredentials,
  appStoreConnectSalesReports,
  apps,
  entitlements,
  prices,
  productEntitlements,
  productPlans,
  products,
  storeCatalogDriftItems,
  storeCatalogSnapshots,
  storeIntegrations,
  storeProductBindings,
  syncRuns,
} from '~/db/schema'
import {
  downloadDailySalesReport,
  fetchAppleCatalogProducts,
  getAllAppStoreConnectResources,
  type AppleCatalogProduct,
  type AppStoreConnectCredentials,
  type AppStoreConnectResource,
} from '~/server/app-store-connect/client'
import { previewProduct, type ApplePreviewLocalProduct } from '~/integrations/app-store-connect/server/preview'
import type {
  AppStoreConnectCatalogSyncResult,
  AppStoreConnectImportResult,
  AppStoreConnectProductPreview,
  AppStoreConnectProductSyncAction,
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
      const catalog = await syncAppStoreConnectCatalogForApp({ appleAppId: appleApp.appleAppId, appId, credentials, userId })
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

export async function syncAppStoreConnectCatalogForApp({
  appleAppId,
  appId,
  credentials,
  userId = null,
}: {
  appleAppId: string
  appId: string
  credentials: AppStoreConnectCredentials
  userId?: string | null
}): Promise<AppStoreConnectCatalogSyncResult> {
  const syncRunId = syncRunRowId(appId, 'apple', 'import')
  await startStoreSyncRun({ appId, mode: 'import', store: 'apple', syncRunId, userId })
  try {
    const appleProducts = await fetchAppleCatalogProducts(credentials, appleAppId)
    const snapshotResult = await storeAppleCatalogSnapshot({ appId, appleAppId, appleProducts, syncRunId })
    await markAppleBindingsCompared(appId, snapshotResult.snapshotIdByExternalId)
    const preview = await buildAppleProductPreview(appId, appleProducts)
    await replaceAppleDriftItems(appId, preview, snapshotResult.snapshotIdByExternalId)
    const toCreate = preview.filter((item) => item.action === 'create').length
    const toUpdate = preview.filter((item) => item.action === 'update').length
    const unchanged = preview.filter((item) => item.action === 'unchanged').length
    const conflicts = preview.filter((item) => item.action === 'conflict').length
    await finishStoreSyncRun({
      errorDetail: null,
      status: conflicts > 0 ? 'partial' : 'succeeded',
      summary: { conflicts, snapshots: snapshotResult.snapshots, storeOnly: toCreate, unchanged, valueDifferences: toUpdate },
      syncRunId,
    })
    return { conflicts, created: toCreate, preview, skipped: 0, unchanged, updated: toUpdate }
  } catch (error) {
    await finishStoreSyncRun({ errorDetail: safeErrorDetail(error), status: 'failed', summary: { error: safeErrorDetail(error) }, syncRunId })
    throw error
  }
}

export async function readAppleProductPreview(appId: string, credentials: AppStoreConnectCredentials, appleAppId: string): Promise<AppStoreConnectProductPreview[]> {
  const syncRunId = syncRunRowId(appId, 'apple', 'compare')
  await startStoreSyncRun({ appId, mode: 'compare', store: 'apple', syncRunId, userId: null })
  try {
    const appleProducts = await fetchAppleCatalogProducts(credentials, appleAppId)
    const snapshotResult = await storeAppleCatalogSnapshot({ appId, appleAppId, appleProducts, syncRunId })
    await markAppleBindingsCompared(appId, snapshotResult.snapshotIdByExternalId)
    const preview = await buildAppleProductPreview(appId, appleProducts)
    await replaceAppleDriftItems(appId, preview, snapshotResult.snapshotIdByExternalId)
    const conflicts = preview.filter((item) => item.action === 'conflict').length
    const changed = preview.filter((item) => item.action === 'create' || item.action === 'update').length
    await finishStoreSyncRun({
      errorDetail: null,
      status: conflicts > 0 ? 'partial' : 'succeeded',
      summary: { changed, conflicts, products: preview.length, snapshots: snapshotResult.snapshots },
      syncRunId,
    })
    return preview
  } catch (error) {
    await finishStoreSyncRun({ errorDetail: safeErrorDetail(error), status: 'failed', summary: { error: safeErrorDetail(error) }, syncRunId })
    throw error
  }
}

async function buildAppleProductPreview(appId: string, appleProducts: readonly AppleCatalogProduct[]): Promise<AppStoreConnectProductPreview[]> {
  const rows = await db
    .select({
      appleProductId: storeProductBindings.externalProductId,
      billingPeriod: productPlans.billingPeriodIso,
      name: products.name,
      productKey: products.key,
    })
    .from(products)
    .innerJoin(productPlans, eq(productPlans.productId, products.id))
    .leftJoin(storeProductBindings, and(eq(storeProductBindings.productPlanId, productPlans.id), eq(storeProductBindings.store, 'apple')))
    .where(eq(products.appId, appId))
  const localProducts: ApplePreviewLocalProduct[] = rows.map((row) => ({
    appleProductId: row.appleProductId,
    billingPeriod: row.billingPeriod,
    name: row.name,
    productKey: row.productKey,
  }))
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
        set: { description: `Imported from App Store Connect ${item.kind.replaceAll('_', ' ')}`, key: item.entitlement, name: item.entitlement, updatedAt: now },
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
        set: { grantMode: item.kind === 'subscription' ? 'while_active' : 'lifetime', updatedAt: now },
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
        target: [storeProductBindings.appId, storeProductBindings.store, storeProductBindings.externalProductId, storeProductBindings.externalBasePlanId, storeProductBindings.environment],
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

type AppleSyncMode = 'compare' | 'import'
type AppleSyncRunStatus = 'failed' | 'partial' | 'succeeded'
type SyncSummary = Record<string, string | number | boolean | null>

interface AppleSnapshotResult {
  snapshotIdByExternalId: Map<string, string>
  snapshots: number
}

async function startStoreSyncRun({
  appId,
  mode,
  store,
  syncRunId,
  userId,
}: {
  appId: string
  mode: AppleSyncMode
  store: 'apple'
  syncRunId: string
  userId: string | null
}): Promise<void> {
  await db.insert(syncRuns).values({
    appId,
    appPlatformId: null,
    errorDetail: null,
    finishedAt: null,
    id: syncRunId,
    mode,
    startedAt: new Date(),
    startedByUserId: userId,
    status: 'running',
    store,
    summaryJson: null,
  })
}

async function finishStoreSyncRun({
  errorDetail,
  status,
  summary,
  syncRunId,
}: {
  errorDetail: string | null
  status: AppleSyncRunStatus
  summary: SyncSummary
  syncRunId: string
}): Promise<void> {
  await db
    .update(syncRuns)
    .set({
      errorDetail,
      finishedAt: new Date(),
      status,
      summaryJson: JSON.stringify(summary),
    })
    .where(eq(syncRuns.id, syncRunId))
}

async function storeAppleCatalogSnapshot({
  appId,
  appleAppId,
  appleProducts,
  syncRunId,
}: {
  appId: string
  appleAppId: string
  appleProducts: readonly AppleCatalogProduct[]
  syncRunId: string
}): Promise<AppleSnapshotResult> {
  const appPlatformId = await ensureAppleControlPlaneRecords(appId, appleAppId)
  const now = new Date()
  const snapshotIdByExternalId = new Map<string, string>()

  for (const product of appleProducts) {
    const normalizedJson = JSON.stringify(normalizedAppleProduct(product))
    const snapshotId = storeSnapshotRowId(appPlatformId, syncRunId, product.productId)
    await db
      .insert(storeCatalogSnapshots)
      .values({
        appPlatformId,
        contentHash: sha256Hex(normalizedJson),
        environment: 'production',
        externalId: product.productId,
        externalParentId: product.appleId,
        fetchedAt: now,
        id: snapshotId,
        normalizedJson,
        objectType: product.kind === 'subscription' ? 'subscription' : 'in_app_product',
        rawJson: JSON.stringify(product),
        store: 'apple',
        syncRunId,
      })
      .onConflictDoUpdate({
        set: {
          contentHash: sha256Hex(normalizedJson),
          fetchedAt: now,
          normalizedJson,
          rawJson: JSON.stringify(product),
          syncRunId,
        },
        target: storeCatalogSnapshots.id,
      })
    snapshotIdByExternalId.set(product.productId, snapshotId)
  }

  return { snapshotIdByExternalId, snapshots: appleProducts.length }
}

async function ensureAppleControlPlaneRecords(appId: string, appleAppId: string): Promise<string> {
  const [app] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1)
  if (app == null) throw new Error('App does not exist')

  const now = new Date()
  const appPlatformId = appleAppPlatformRowId(appId)
  const integrationId = appleIntegrationRowId(appId)
  const bundleId = app.iosBundleId ?? app.bundleId

  await db
    .insert(appPlatforms)
    .values({
      appId,
      bundleId,
      createdAt: now,
      environment: 'production',
      id: appPlatformId,
      packageName: null,
      platform: 'ios',
      status: 'connected',
      store: 'apple',
      storeAppId: appleAppId,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      set: {
        bundleId,
        platform: 'ios',
        status: 'connected',
        storeAppId: appleAppId,
        updatedAt: now,
      },
      target: [appPlatforms.appId, appPlatforms.store, appPlatforms.environment],
    })

  await db
    .insert(storeIntegrations)
    .values({
      appId,
      appPlatformId,
      capabilitiesJson: JSON.stringify({ catalogRead: true }),
      configJson: null,
      createdAt: now,
      displayName: 'Apple App Store',
      externalAppId: appleAppId,
      id: integrationId,
      lastPermissionCheckAt: null,
      lastSyncAt: now,
      status: 'connected',
      store: 'apple',
      updatedAt: now,
    })
    .onConflictDoUpdate({
      set: {
        appPlatformId,
        capabilitiesJson: JSON.stringify({ catalogRead: true }),
        displayName: 'Apple App Store',
        externalAppId: appleAppId,
        lastSyncAt: now,
        status: 'connected',
        updatedAt: now,
      },
      target: [storeIntegrations.appId, storeIntegrations.store],
    })

  return appPlatformId
}

async function markAppleBindingsCompared(appId: string, snapshotIdByExternalId: ReadonlyMap<string, string>): Promise<void> {
  const now = new Date()
  const appPlatformId = appleAppPlatformRowId(appId)
  const integrationId = appleIntegrationRowId(appId)
  const bindings = await db.select().from(storeProductBindings).where(and(eq(storeProductBindings.appId, appId), eq(storeProductBindings.store, 'apple')))

  for (const binding of bindings) {
    if (binding.bindingStatus === 'archived') continue
    const snapshotId = snapshotIdByExternalId.get(binding.externalProductId) ?? null
    await db
      .update(storeProductBindings)
      .set({
        appPlatformId,
        bindingStatus: snapshotId == null ? 'missing_in_store' : 'synced',
        lastComparedAt: now,
        lastSnapshotId: snapshotId,
        storeIntegrationId: integrationId,
        updatedAt: now,
      })
      .where(eq(storeProductBindings.id, binding.id))
  }
}

async function replaceAppleDriftItems(
  appId: string,
  preview: readonly AppStoreConnectProductPreview[],
  snapshotIdByExternalId: ReadonlyMap<string, string>,
): Promise<void> {
  await db.delete(storeCatalogDriftItems).where(and(eq(storeCatalogDriftItems.appId, appId), like(storeCatalogDriftItems.fieldPath, 'apple.%')))

  const bindings = await db.select().from(storeProductBindings).where(and(eq(storeProductBindings.appId, appId), eq(storeProductBindings.store, 'apple')))
  const bindingIdByExternalProductId = new Map(bindings.map((binding) => [binding.externalProductId, binding.id]))
  const now = new Date()

  for (const item of preview) {
    if (item.action === 'unchanged') continue
    const drift = applePreviewDrift(item)
    await db.insert(storeCatalogDriftItems).values({
      actualJson: drift.actualJson,
      appId,
      detectedAt: now,
      driftType: drift.driftType,
      expectedJson: drift.expectedJson,
      fieldPath: drift.fieldPath,
      id: driftItemRowId(appId, item.appleProductId, item.action),
      resolvedAt: null,
      severity: drift.severity,
      snapshotId: snapshotIdByExternalId.get(item.appleProductId) ?? null,
      status: 'open',
      storeProductBindingId: bindingIdByExternalProductId.get(item.appleProductId) ?? null,
    })
  }
}

function applePreviewDrift(item: AppStoreConnectProductPreview): {
  actualJson: string
  driftType: typeof storeCatalogDriftItems.$inferInsert.driftType
  expectedJson: string | null
  fieldPath: string
  severity: typeof storeCatalogDriftItems.$inferInsert.severity
} {
  const actualJson = JSON.stringify({ duration: item.duration, name: item.appleName, productId: item.appleProductId, state: item.appleState })
  if (item.action === 'create') {
    return {
      actualJson,
      driftType: 'missing_in_subkit',
      expectedJson: null,
      fieldPath: `apple.products.${item.appleProductId}`,
      severity: 'info',
    }
  }
  if (item.action === 'conflict') {
    return {
      actualJson,
      driftType: 'immutable_mismatch',
      expectedJson: JSON.stringify({ localName: item.localName, productKey: item.localIdentifier }),
      fieldPath: `apple.products.${item.appleProductId}`,
      severity: 'blocking',
    }
  }
  return {
    actualJson,
    driftType: 'value_mismatch',
    expectedJson: JSON.stringify({ localName: item.localName, productKey: item.localIdentifier }),
    fieldPath: `apple.products.${item.appleProductId}`,
    severity: 'warning',
  }
}

function normalizedAppleProduct(product: AppleCatalogProduct): Record<string, string> {
  return {
    appleId: product.appleId,
    duration: product.duration,
    entitlementKey: product.entitlementKey,
    kind: product.kind,
    name: product.name,
    productId: product.productId,
    state: product.state,
  }
}

function syncRunRowId(appId: string, store: 'apple', mode: AppleSyncMode): string {
  return `${appId}:sync:${store}:${mode}:${createRandomToken(8)}`
}

function storeSnapshotRowId(appPlatformId: string, syncRunId: string, externalId: string): string {
  return `${appPlatformId}:snapshot:${syncRunId}:${externalId}`
}

function driftItemRowId(appId: string, externalId: string, action: AppStoreConnectProductSyncAction): string {
  return `${appId}:drift:apple:${externalId}:${action}`
}

function appleAppPlatformRowId(appId: string): string {
  return `${appId}:platform:apple:production`
}

function appleIntegrationRowId(appId: string): string {
  return `${appId}:integration:apple`
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex')
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

function productRowId(appId: string, key: string): string {
  return `${appId}:product:${key}`
}

function productPlanRowId(productId: string, planKey: string): string {
  return `${productId}:plan:${planKey}`
}

function productEntitlementRowId(productId: string, entitlementId: string): string {
  return `${productId}:entitlement:${entitlementId}`
}

function priceRowId(productPlanId: string, currencyCode: string, countryCode: string | null): string {
  return `${productPlanId}:price:${currencyCode}:${countryCode ?? 'global'}`
}

function storeBindingRowId(productPlanId: string, store: 'apple', externalProductId: string, basePlanId: string): string {
  return `${productPlanId}:binding:${store}:${externalProductId}:${basePlanId || 'default'}`
}

function entitlementRowId(appId: string, key: string): string {
  return `${appId}:entitlement:${key}`
}

function durationToPlanKey(duration: string): string {
  return duration
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'default'
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
