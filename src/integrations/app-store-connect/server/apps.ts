import { createServerFn } from '@tanstack/react-start'

import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~/db/client'
import { appStoreConnectCredentials } from '~/db/schema'
import { ensureDatabaseReady } from '~/db/setup'
import type { AppStoreConnectAccessibleApp } from '~/integrations/app-store-connect/types'
import {
  type AppStoreConnectCredentials,
  type AppStoreConnectResource,
  getAppStoreConnectResourcePage,
} from '~/server/app-store-connect/client'
import { getRequiredCurrentUser } from '~/server/auth/current-user'
import { requireTenantAccess } from '~/server/auth/tenant-access'
import { decryptSecret } from '~/server/secrets'

const listAppsInputSchema = z.object({
  issuerId: z.string().optional(),
  keyId: z.string().optional(),
  privateKey: z.string().optional(),
  tenantId: z.string().min(1),
})

export const listAppStoreConnectApps = createServerFn({ method: 'POST' })
  .validator((input: unknown) => listAppsInputSchema.parse(input))
  .handler(async ({ data }): Promise<AppStoreConnectAccessibleApp[]> => {
    await ensureDatabaseReady()
    const currentUser = await getRequiredCurrentUser()
    await requireTenantAccess(currentUser, data.tenantId)
    const credentials = await credentialsFromInputOrStored(data)
    const resources = await getAppStoreConnectResourcePage(credentials, '/v1/apps?limit=50')
    return resources.map(toAccessibleApp)
  })

async function credentialsFromInputOrStored(
  data: z.infer<typeof listAppsInputSchema>,
): Promise<AppStoreConnectCredentials> {
  if (data.keyId?.trim() && data.issuerId?.trim() && data.privateKey?.trim()) {
    return {
      issuerId: data.issuerId.trim(),
      keyId: data.keyId.trim(),
      privateKey: data.privateKey.trim(),
    }
  }

  const [credential] = await db
    .select()
    .from(appStoreConnectCredentials)
    .where(eq(appStoreConnectCredentials.tenantId, data.tenantId))
    .limit(1)
  if (!credential)
    throw new Error('Save or paste App Store Connect key details before listing apps')
  if (
    credential.privateKeyCiphertext == null ||
    credential.privateKeyIv == null ||
    credential.privateKeyAuthTag == null
  ) {
    throw new Error('Private key material is missing; paste a new .p8 key before listing apps')
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

function toAccessibleApp(resource: AppStoreConnectResource): AppStoreConnectAccessibleApp {
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
