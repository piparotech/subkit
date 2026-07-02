import { createHash } from 'node:crypto'

import { and, eq, like } from 'drizzle-orm'

import { db } from '~/db/client'
import {
  appPlatforms,
  apps,
  productPlans,
  products,
  storeCatalogDriftItems,
  storeCatalogSnapshots,
  storeIntegrations,
  storeProductBindings,
} from '~/db/schema'
import {
  fetchAppleCatalogProducts,
  type AppleCatalogProduct,
  type AppStoreConnectCredentials,
} from '~/server/app-store-connect/client'
import { previewProduct, type ApplePreviewLocalProduct } from '~/integrations/app-store-connect/server/preview'
import type {
  AppStoreConnectCatalogSyncResult,
  AppStoreConnectProductPreview,
  AppStoreConnectProductSyncAction,
} from '~/integrations/app-store-connect/types'

import { finishStoreSyncRun, safeErrorDetail, startStoreSyncRun, syncRunRowId } from './sync-shared'

interface AppleSnapshotResult {
  snapshotIdByExternalId: Map<string, string>
  snapshots: number
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
