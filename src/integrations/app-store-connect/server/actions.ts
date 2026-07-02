import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '~/db/client'
import { ensureDatabaseReady } from '~/db/setup'
import { createRandomToken } from '~/server/auth/crypto'
import { getRequiredCurrentUser } from '~/server/auth/current-user'
import { requireTenantAccess, requireTenantRole } from '~/server/auth/tenant-access'
import type { AuthUser } from '~/server/auth/types'
import {
  appStoreConnectCapabilities,
  appStoreConnectCredentials,
  apps,
} from '~/db/schema'
import {
  validateAppStoreConnectAccess,
  type AppStoreConnectCredentials,
} from '~/server/app-store-connect/client'
import { decryptSecret, encryptSecret, fingerprintSecret } from '~/server/secrets'
import {
  applyProductPreview,
  readAppleProductPreview,
  recordAppStoreConnectAudit as recordAudit,
  syncAppStoreConnectCatalogForApp,
  syncAppStoreConnectSalesReportSnapshot,
  syncTenantAppStoreConnectData,
} from '~/integrations/app-store-connect/server/sync'
import type {
  AppStoreConnectCatalogSyncResult,
  AppStoreConnectCredentialSaveResult,
  AppStoreConnectImportResult,
  AppStoreConnectProductPreview,
  AppStoreConnectReportSyncResult,
} from '~/integrations/app-store-connect/types'

const credentialInputSchema = z.object({
  issuerId: z.string().min(1),
  keyId: z.string().min(1),
  privateKey: z.string().optional(),
  tenantId: z.string().min(1),
  vendorNumber: z.string().optional(),
})

const tenantCredentialInputSchema = z.object({ tenantId: z.string().min(1) })
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
  .handler(async ({ data }): Promise<AppStoreConnectCredentialSaveResult> => {
    await ensureDatabaseReady()
    const currentUser = await getRequiredCurrentUser()

    await requireTenantRole(currentUser, data.tenantId, ['admin'])
    const existing = await findCredential(data.tenantId)
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
        tenantId: data.tenantId,
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
      detail: 'Workspace credential metadata saved; private key redacted.',
      tenantId: data.tenantId,
      userId: currentUser.id,
    })
    await validateTenantCredential(currentUser, data.tenantId)
    const credential = await requireCredential(data.tenantId)
    const sync = await syncTenantAppStoreConnectData({
      credential,
      credentials: decryptCredential(credential),
      tenantId: data.tenantId,
      userId: currentUser.id,
    })
    return { ok: true, sync }
  })

export const validateAppStoreConnectCredential = createServerFn({ method: 'POST' })
  .validator((input: unknown) => tenantCredentialInputSchema.parse(input))
  .handler(async ({ data }) => {
    await ensureDatabaseReady()
    const currentUser = await getRequiredCurrentUser()
    await requireTenantRole(currentUser, data.tenantId, ['admin'])
    await validateTenantCredential(currentUser, data.tenantId)
    return { ok: true }
  })

export const deleteAppStoreConnectCredential = createServerFn({ method: 'POST' })
  .validator((input: unknown) => tenantCredentialInputSchema.parse(input))
  .handler(async ({ data }) => {
    await ensureDatabaseReady()
    const currentUser = await getRequiredCurrentUser()
    await requireTenantRole(currentUser, data.tenantId, ['admin'])
    const credential = await requireCredential(data.tenantId)
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
      tenantId: data.tenantId,
      userId: currentUser.id,
    })
    return { ok: true }
  })

export const previewAppStoreConnectProducts = createServerFn({ method: 'POST' })
  .validator((input: unknown) => appInputSchema.parse(input))
  .handler(async ({ data }): Promise<AppStoreConnectProductPreview[]> => {
    await ensureDatabaseReady()
    const currentUser = await getRequiredCurrentUser()
    const { appleAppId, app, credential, credentials } = await requireActiveAppleCredential(currentUser, data.appId)
    const preview = await readAppleProductPreview(data.appId, credentials, appleAppId)
    await recordAudit({
      action: 'products.previewed',
      appId: data.appId,
      credentialId: credential.id,
      detail: `${preview.length} Apple catalog products compared locally.`,
      tenantId: app.tenantId,
      userId: currentUser.id,
    })
    return preview
  })

export const importAppStoreConnectProductPreview = createServerFn({ method: 'POST' })
  .validator((input: unknown) => importInputSchema.parse(input))
  .handler(async ({ data }): Promise<AppStoreConnectImportResult> => {
    await ensureDatabaseReady()
    const currentUser = await getRequiredCurrentUser()
    const app = await requireApp(currentUser, data.appId)
    const credential = await requireCredential(app.tenantId)
    const result = await applyProductPreview(data.appId, data.preview)

    await recordAudit({
      action: 'products.imported',
      appId: data.appId,
      credentialId: credential.id,
      detail: `${result.created} created, ${result.updated} updated, ${result.skipped} skipped from Apple catalog preview.`,
      tenantId: app.tenantId,
      userId: currentUser.id,
    })
    return result
  })

export const syncAppStoreConnectCatalog = createServerFn({ method: 'POST' })
  .validator((input: unknown) => appInputSchema.parse(input))
  .handler(async ({ data }): Promise<AppStoreConnectCatalogSyncResult> => {
    await ensureDatabaseReady()
    const currentUser = await getRequiredCurrentUser()
    const { appleAppId, app, credential, credentials } = await requireActiveAppleCredential(currentUser, data.appId)
    const result = await syncAppStoreConnectCatalogForApp({ appleAppId, appId: data.appId, credentials })

    await recordAudit({
      action: 'products.synced',
      appId: data.appId,
      credentialId: credential.id,
      detail: `${result.created} created, ${result.updated} updated, ${result.unchanged} unchanged, ${result.conflicts} conflicts from Apple catalog sync.`,
      tenantId: app.tenantId,
      userId: currentUser.id,
    })
    return result
  })

export const syncAppStoreConnectSalesReport = createServerFn({ method: 'POST' })
  .validator((input: unknown) => salesReportInputSchema.parse(input))
  .handler(async ({ data }): Promise<AppStoreConnectReportSyncResult> => {
    await ensureDatabaseReady()
    const currentUser = await getRequiredCurrentUser()
    const { app, credential, credentials } = await requireActiveAppleCredential(currentUser, data.appId)
    const vendorNumber = credential.vendorNumber?.trim()
    if (!vendorNumber) throw new Error('Vendor Number is required to sync Sales Reports')
    return syncAppStoreConnectSalesReportSnapshot({
      appId: data.appId,
      credentialId: credential.id,
      credentials,
      reportDate: data.reportDate,
      tenantId: app.tenantId,
      userId: currentUser.id,
      vendorNumber,
    })
  })

async function validateTenantCredential(user: AuthUser, tenantId: string): Promise<void> {
  await requireTenantRole(user, tenantId, ['admin'])
  const credential = await requireCredential(tenantId)
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
    detail: `Workspace validation completed with status ${result.status}.`,
    tenantId,
    userId: user.id,
  })
}

async function requireActiveAppleCredential(user: AuthUser, appId: string): Promise<{
  appleAppId: string
  app: typeof apps.$inferSelect
  credential: typeof appStoreConnectCredentials.$inferSelect
  credentials: AppStoreConnectCredentials
}> {
  const app = await requireApp(user, appId)
  const credential = await requireCredential(app.tenantId)
  if (credential.status === 'deleted') throw new Error('App Store Connect credential was deleted')
  if (app.appleAppId == null || app.appleAppId.trim() === '') throw new Error('Select an App Store Connect app before syncing Apple app data')
  return { appleAppId: app.appleAppId, app, credential, credentials: decryptCredential(credential) }
}

async function requireApp(user: AuthUser, appId: string): Promise<typeof apps.$inferSelect> {
  const [app] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1)
  if (app == null) throw new Error('App does not belong to an accessible workspace')
  await requireTenantAccess(user, app.tenantId)
  return app
}

async function requireCredential(tenantId: string): Promise<typeof appStoreConnectCredentials.$inferSelect> {
  const credential = await findCredential(tenantId)
  if (!credential) throw new Error('No workspace App Store Connect credential is configured')
  return credential
}

async function findCredential(tenantId: string): Promise<typeof appStoreConnectCredentials.$inferSelect | undefined> {
  const [credential] = await db
    .select()
    .from(appStoreConnectCredentials)
    .where(eq(appStoreConnectCredentials.tenantId, tenantId))
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

function optionalTrim(value: string | undefined): string | null {
  const clean = value?.trim()
  return clean ? clean : null
}
