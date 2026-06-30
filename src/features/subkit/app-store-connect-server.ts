import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '~/db/client'
import { ensureDatabaseReady } from '~/db/setup'
import { createRandomToken } from '~/server/auth/crypto'
import { getRequiredCurrentUser } from '~/server/auth/current-user'
import {
  appStoreConnectAuditEvents,
  appStoreConnectCapabilities,
  appStoreConnectCredentials,
  appStoreConnectSalesReports,
  apps,
  entitlements,
  products,
} from '~/db/schema'
import {
  downloadDailySalesReport,
  fetchAppleCatalogProducts,
  validateAppStoreConnectAccess,
  type AppStoreConnectCredentials,
} from '~/server/app-store-connect/client'
import { decryptSecret, encryptSecret, fingerprintSecret } from '~/server/secrets'
import { parseServerEnv } from '~/server/env'

import { previewProduct } from './app-store-connect-preview'
import type {
  AppStoreConnectImportResult,
  AppStoreConnectProductPreview,
  AppStoreConnectReportSyncResult,
} from './types'

const env = parseServerEnv(process.env)
const activeTenantId = env.TENANT_ID

const credentialInputSchema = z.object({
  issuerId: z.string().min(1),
  keyId: z.string().min(1),
  privateKey: z.string().optional(),
  vendorNumber: z.string().optional(),
})

const tenantCredentialInputSchema = z.object({})
const appInputSchema = z.object({ appId: z.string().min(1) })

const importInputSchema = z.object({
  appId: z.string().min(1),
  preview: z.array(
    z.object({
      action: z.enum(['create', 'update', 'unchanged', 'conflict']),
      appleName: z.string().min(1),
      appleProductId: z.string().min(1),
      appleState: z.string().min(1),
      duration: z.string().min(1),
      entitlement: z.string().min(1),
      kind: z.enum(['subscription', 'in_app_purchase']),
      localIdentifier: z.string().nullable(),
      localName: z.string().nullable(),
      note: z.string().min(1),
    }),
  ),
})

const salesReportInputSchema = z.object({
  appId: z.string().min(1),
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const saveAppStoreConnectCredential = createServerFn({ method: 'POST' })
  .validator((input: unknown) => credentialInputSchema.parse(input))
  .handler(async ({ data }) => {
    await ensureDatabaseReady()
    const currentUser = await getRequiredCurrentUser()

    const existing = await findCredential()
    const cleanPrivateKey = data.privateKey?.trim()
    if (!existing && (cleanPrivateKey == null || cleanPrivateKey === '')) {
      throw new Error('Private key is required for a new App Store Connect connection')
    }

    const encrypted = cleanPrivateKey != null && cleanPrivateKey !== '' ? encryptSecret(cleanPrivateKey) : null
    const credentialId = existing?.id ?? `asc_${createRandomToken(14)}`
    const now = new Date()

    await db
      .insert(appStoreConnectCredentials)
      .values({
        createdAt: now,
        disabledAt: null,
        id: credentialId,
        issuerId: data.issuerId.trim(),
        keyId: data.keyId.trim(),
        lastError: existing?.lastError ?? null,
        lastValidatedAt: existing?.lastValidatedAt ?? null,
        privateKeyAuthTag: encrypted?.authTag ?? existing?.privateKeyAuthTag ?? null,
        privateKeyCiphertext: encrypted?.ciphertext ?? existing?.privateKeyCiphertext ?? null,
        privateKeyIv: encrypted?.iv ?? existing?.privateKeyIv ?? null,
        privateKeySha256: cleanPrivateKey != null && cleanPrivateKey !== '' ? fingerprintSecret(cleanPrivateKey) : existing?.privateKeySha256 ?? null,
        status: 'needs_attention',
        tenantId: activeTenantId,
        updatedAt: now,
        vendorNumber: optionalTrim(data.vendorNumber),
      })
      .onConflictDoUpdate({
        set: {
          disabledAt: null,
          issuerId: data.issuerId.trim(),
          keyId: data.keyId.trim(),
          privateKeyAuthTag: encrypted?.authTag ?? existing?.privateKeyAuthTag ?? null,
          privateKeyCiphertext: encrypted?.ciphertext ?? existing?.privateKeyCiphertext ?? null,
          privateKeyIv: encrypted?.iv ?? existing?.privateKeyIv ?? null,
          privateKeySha256: cleanPrivateKey != null && cleanPrivateKey !== '' ? fingerprintSecret(cleanPrivateKey) : existing?.privateKeySha256 ?? null,
          status: 'needs_attention',
          updatedAt: now,
          vendorNumber: optionalTrim(data.vendorNumber),
        },
        target: appStoreConnectCredentials.tenantId,
      })

    await recordAudit({
      action: existing ? 'credential.updated' : 'credential.created',
      appId: null,
      credentialId,
      detail: 'Tenant credential metadata saved; private key redacted.',
      userId: currentUser.id,
    })
    await validateTenantCredential(currentUser.id)
    return { ok: true }
  })

export const validateAppStoreConnectCredential = createServerFn({ method: 'POST' })
  .validator((input: unknown) => tenantCredentialInputSchema.parse(input))
  .handler(async () => {
    await ensureDatabaseReady()
    const currentUser = await getRequiredCurrentUser()
    await validateTenantCredential(currentUser.id)
    return { ok: true }
  })

export const deleteAppStoreConnectCredential = createServerFn({ method: 'POST' })
  .validator((input: unknown) => tenantCredentialInputSchema.parse(input))
  .handler(async () => {
    await ensureDatabaseReady()
    const currentUser = await getRequiredCurrentUser()
    const credential = await requireCredential()
    const now = new Date()
    await db
      .update(appStoreConnectCredentials)
      .set({
        disabledAt: now,
        lastError: null,
        privateKeyAuthTag: null,
        privateKeyCiphertext: null,
        privateKeyIv: null,
        status: 'deleted',
        updatedAt: now,
      })
      .where(eq(appStoreConnectCredentials.id, credential.id))
    await recordAudit({
      action: 'credential.deleted',
      appId: null,
      credentialId: credential.id,
      detail: 'Encrypted private key material deleted locally. Revoke the key in App Store Connect too.',
      userId: currentUser.id,
    })
    return { ok: true }
  })

export const previewAppStoreConnectProducts = createServerFn({ method: 'POST' })
  .validator((input: unknown) => appInputSchema.parse(input))
  .handler(async ({ data }): Promise<AppStoreConnectProductPreview[]> => {
    await ensureDatabaseReady()
    const currentUser = await getRequiredCurrentUser()
    assertOwnedApp(data.appId)
    const { appleAppId, credential, credentials } = await requireActiveAppleCredential(data.appId)
    const appleProducts = await fetchAppleCatalogProducts(credentials, appleAppId)
    const localProducts = await db.select().from(products).where(eq(products.appId, data.appId))
    const preview = appleProducts.map((product) => previewProduct(product, localProducts))
    await recordAudit({
      action: 'products.previewed',
      appId: data.appId,
      credentialId: credential.id,
      detail: `${preview.length} Apple catalogue products compared locally.`,
      userId: currentUser.id,
    })
    return preview
  })

export const importAppStoreConnectProductPreview = createServerFn({ method: 'POST' })
  .validator((input: unknown) => importInputSchema.parse(input))
  .handler(async ({ data }): Promise<AppStoreConnectImportResult> => {
    await ensureDatabaseReady()
    const currentUser = await getRequiredCurrentUser()
    assertOwnedApp(data.appId)
    const credential = await requireCredential()
    let created = 0
    let updated = 0
    let skipped = 0

    for (const item of data.preview) {
      if (item.action === 'unchanged' || item.action === 'conflict') {
        skipped += 1
        continue
      }
      const entitlementId = entitlementRowId(data.appId, item.entitlement)
      await db
        .insert(entitlements)
        .values({
          appId: data.appId,
          description: `Imported from App Store Connect ${item.kind.replaceAll('_', ' ')}`,
          id: entitlementId,
          key: item.entitlement,
        })
        .onConflictDoUpdate({
          set: { description: `Imported from App Store Connect ${item.kind.replaceAll('_', ' ')}`, key: item.entitlement },
          target: entitlements.id,
        })

      const identifier = item.localIdentifier ?? item.appleProductId
      const productId = productRowId(data.appId, identifier)
      await db
        .insert(products)
        .values({
          activeSubscriberCount: 0,
          appId: data.appId,
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

    await recordAudit({
      action: 'products.imported',
      appId: data.appId,
      credentialId: credential.id,
      detail: `${created} created, ${updated} updated, ${skipped} skipped from Apple catalogue preview.`,
      userId: currentUser.id,
    })
    return { created, skipped, updated }
  })

export const syncAppStoreConnectSalesReport = createServerFn({ method: 'POST' })
  .validator((input: unknown) => salesReportInputSchema.parse(input))
  .handler(async ({ data }): Promise<AppStoreConnectReportSyncResult> => {
    await ensureDatabaseReady()
    const currentUser = await getRequiredCurrentUser()
    assertOwnedApp(data.appId)
    const { credential, credentials } = await requireActiveAppleCredential(data.appId)
    const vendorNumber = credential.vendorNumber?.trim()
    if (!vendorNumber) throw new Error('Vendor Number is required to sync Sales Reports')
    const reportDate = data.reportDate ?? defaultReportDate()

    try {
      const report = await downloadDailySalesReport({ credentials, reportDate, vendorNumber })
      await db.insert(appStoreConnectSalesReports).values({
        appId: data.appId,
        createdAt: new Date(),
        credentialId: credential.id,
        errorDetail: null,
        id: `asr_${createRandomToken(14)}`,
        rawText: report.rawText,
        reportDate,
        rowCount: report.rowCount,
        status: 'imported',
        vendorNumber,
      })
      await recordAudit({
        action: 'reports.synced',
        appId: data.appId,
        credentialId: credential.id,
        detail: `Daily Sales Report ${reportDate} imported with ${report.rowCount} rows.`,
        userId: currentUser.id,
      })
      return { reportDate, rowCount: report.rowCount, status: 'imported' }
    } catch (error) {
      const detail = safeErrorDetail(error)
      await db.insert(appStoreConnectSalesReports).values({
        appId: data.appId,
        createdAt: new Date(),
        credentialId: credential.id,
        errorDetail: detail,
        id: `asr_${createRandomToken(14)}`,
        rawText: null,
        reportDate,
        rowCount: 0,
        status: 'failed',
        vendorNumber,
      })
      await recordAudit({
        action: 'reports.failed',
        appId: data.appId,
        credentialId: credential.id,
        detail: `Daily Sales Report ${reportDate} failed: ${detail}`,
        userId: currentUser.id,
      })
      return { reportDate, rowCount: 0, status: 'failed' }
    }
  })

async function validateTenantCredential(userId: string): Promise<void> {
  const credential = await requireCredential()
  const credentials = decryptCredential(credential)
  const result = await validateAppStoreConnectAccess({
    bundleId: null,
    credentials,
    requestedAppleAppId: null,
    vendorNumber: credential.vendorNumber,
  })
  const now = new Date()
  await db
    .update(appStoreConnectCredentials)
    .set({
      lastError: result.lastError,
      lastValidatedAt: now,
      status: result.status,
      updatedAt: now,
    })
    .where(eq(appStoreConnectCredentials.id, credential.id))

  for (const capability of result.capabilities) {
    await db
      .insert(appStoreConnectCapabilities)
      .values({
        checkedAt: now,
        credentialId: credential.id,
        description: capability.description,
        detail: capability.detail,
        id: `${credential.id}:${capability.key}`,
        key: capability.key,
        label: capability.label,
        status: capability.status,
      })
      .onConflictDoUpdate({
        set: {
          checkedAt: now,
          description: capability.description,
          detail: capability.detail,
          label: capability.label,
          status: capability.status,
        },
        target: [appStoreConnectCapabilities.credentialId, appStoreConnectCapabilities.key],
      })
  }

  await recordAudit({
    action: 'credential.validated',
    appId: null,
    credentialId: credential.id,
    detail: `Tenant validation completed with status ${result.status}.`,
    userId,
  })
}

async function requireActiveAppleCredential(appId: string): Promise<{
  appleAppId: string
  credential: typeof appStoreConnectCredentials.$inferSelect
  credentials: AppStoreConnectCredentials
}> {
  const credential = await requireCredential()
  if (credential.status === 'deleted') throw new Error('App Store Connect credential was deleted')
  const app = await requireApp(appId)
  if (app.appleAppId == null || app.appleAppId.trim() === '') throw new Error('Select an App Store Connect app before syncing Apple app data')
  return { appleAppId: app.appleAppId, credential, credentials: decryptCredential(credential) }
}

async function requireApp(appId: string): Promise<typeof apps.$inferSelect> {
  const [app] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1)
  if (app == null || app.tenantId !== activeTenantId) throw new Error('App does not belong to the active tenant')
  return app
}

async function requireCredential(): Promise<typeof appStoreConnectCredentials.$inferSelect> {
  const credential = await findCredential()
  if (!credential) throw new Error('No tenant App Store Connect credential is configured')
  return credential
}

async function findCredential(): Promise<typeof appStoreConnectCredentials.$inferSelect | undefined> {
  const [credential] = await db
    .select()
    .from(appStoreConnectCredentials)
    .where(eq(appStoreConnectCredentials.tenantId, activeTenantId))
    .limit(1)
  return credential
}

function decryptCredential(credential: typeof appStoreConnectCredentials.$inferSelect): AppStoreConnectCredentials {
  if (credential.privateKeyCiphertext == null || credential.privateKeyIv == null || credential.privateKeyAuthTag == null) {
    throw new Error('Private key material is missing; upload a new .p8 key')
  }
  return {
    issuerId: credential.issuerId,
    keyId: credential.keyId,
    privateKey: decryptSecret({
      authTag: credential.privateKeyAuthTag,
      ciphertext: credential.privateKeyCiphertext,
      iv: credential.privateKeyIv,
    }),
  }
}

async function recordAudit({
  action,
  appId,
  credentialId,
  detail,
  userId,
}: {
  action: string
  appId: string | null
  credentialId: string
  detail: string
  userId: string
}): Promise<void> {
  await db.insert(appStoreConnectAuditEvents).values({
    action,
    appId,
    createdAt: new Date(),
    credentialId,
    detail: redactSecretLikeText(detail),
    id: `asa_${createRandomToken(14)}`,
    actorUserId: userId,
    tenantId: activeTenantId,
  })
}

function assertOwnedApp(appId: string): void {
  if (!appId.startsWith(`${activeTenantId}:`)) {
    throw new Error('App does not belong to the active tenant')
  }
}

function productRowId(appId: string, identifier: string): string {
  return `${appId}:${identifier}`
}

function entitlementRowId(appId: string, key: string): string {
  return `${appId}:${key}`
}

function optionalTrim(value: string | undefined): string | null {
  const clean = value?.trim()
  return clean ? clean : null
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
