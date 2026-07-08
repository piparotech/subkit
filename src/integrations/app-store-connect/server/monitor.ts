import { createServerFn } from '@tanstack/react-start'

import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~/db/client'
import { appStoreConnectAuditEvents, appStoreConnectCredentials, apps } from '~/db/schema'
import { ensureDatabaseReady } from '~/db/setup'
import type {
  AppStoreConnectMonitorItem,
  AppStoreConnectMonitorSection,
  AppStoreConnectMonitorSnapshot,
} from '~/integrations/app-store-connect/types'
import {
  type AppStoreConnectCredentials,
  type AppStoreConnectResource,
  getAppStoreConnectResourcePage,
} from '~/server/app-store-connect/client'
import { createRandomToken } from '~/server/auth/crypto'
import { getRequiredCurrentUser } from '~/server/auth/current-user'
import { requireTenantAccess } from '~/server/auth/tenant-access'
import type { AuthUser } from '~/server/auth/types'
import { decryptSecret } from '~/server/secrets'

interface ResourceResult {
  error: string | null
  resources: AppStoreConnectResource[]
}

const appInputSchema = z.object({ appId: z.string().min(1) })

export const inspectAppStoreConnectMonitoring = createServerFn({ method: 'POST' })
  .validator((input: unknown) => appInputSchema.parse(input))
  .handler(async ({ data }): Promise<AppStoreConnectMonitorSnapshot> => {
    await ensureDatabaseReady()
    const currentUser = await getRequiredCurrentUser()
    const app = await requireApp(currentUser, data.appId)
    const credential = await requireCredential(app.tenantId)
    const credentials = decryptCredential(credential)
    if (app.appleAppId == null || app.appleAppId.trim() === '') {
      throw new Error('Select an App Store Connect app before inspecting monitoring data')
    }

    const appleAppId = app.appleAppId
    const [versions, builds, reviews, bundleIds] = await Promise.all([
      readResources(
        credentials,
        `/v1/apps/${encodeURIComponent(appleAppId)}/appStoreVersions?limit=5`,
      ),
      readResources(credentials, `/v1/apps/${encodeURIComponent(appleAppId)}/builds?limit=5`),
      readResources(
        credentials,
        `/v1/apps/${encodeURIComponent(appleAppId)}/customerReviews?limit=5`,
      ),
      app.iosBundleId == null || app.iosBundleId.trim() === ''
        ? Promise.resolve({ error: 'Bundle ID is missing.', resources: [] })
        : readResources(
            credentials,
            `/v1/bundleIds?filter[identifier]=${encodeURIComponent(app.iosBundleId)}&limit=5`,
          ),
    ])

    await db.insert(appStoreConnectAuditEvents).values({
      action: 'monitoring.inspected',
      appId: data.appId,
      actorUserId: currentUser.id,
      createdAt: new Date(),
      credentialId: credential.id,
      detail: 'Read release, TestFlight, review, and provisioning monitoring snapshots.',
      id: `asa_${createRandomToken(14)}`,
      tenantId: app.tenantId,
    })

    return {
      checkedAt: new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date()),
      sections: [
        section('Release versions', versions, versionItem),
        section('TestFlight builds', builds, buildItem),
        section('Customer reviews', reviews, reviewItem),
        section('Provisioning bundle IDs', bundleIds, bundleItem),
      ],
    }
  })

async function readResources(
  credentials: AppStoreConnectCredentials,
  path: string,
): Promise<ResourceResult> {
  try {
    return { error: null, resources: await getAppStoreConnectResourcePage(credentials, path) }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown App Store Connect error',
      resources: [],
    }
  }
}

function section(
  title: string,
  result: ResourceResult,
  mapper: (resource: AppStoreConnectResource) => AppStoreConnectMonitorItem,
): AppStoreConnectMonitorSection {
  if (result.error != null) {
    return {
      items: [
        {
          detail: result.error,
          id: `${title}:error`,
          label: 'Access check failed',
          status: 'missing',
        },
      ],
      title,
    }
  }
  return { items: result.resources.map(mapper), title }
}

async function requireApp(user: AuthUser, appId: string): Promise<typeof apps.$inferSelect> {
  const [app] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1)
  if (app == null) throw new Error('App does not belong to an accessible workspace')
  await requireTenantAccess(user, app.tenantId)
  return app
}

async function requireCredential(
  tenantId: string,
): Promise<typeof appStoreConnectCredentials.$inferSelect> {
  const [credential] = await db
    .select()
    .from(appStoreConnectCredentials)
    .where(eq(appStoreConnectCredentials.tenantId, tenantId))
    .limit(1)
  if (!credential) throw new Error('No workspace App Store Connect credential is configured')
  if (credential.status === 'deleted') throw new Error('App Store Connect credential was deleted')
  return credential
}

function decryptCredential(
  credential: typeof appStoreConnectCredentials.$inferSelect,
): AppStoreConnectCredentials {
  if (
    credential.privateKeyCiphertext == null ||
    credential.privateKeyIv == null ||
    credential.privateKeyAuthTag == null
  ) {
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

function versionItem(resource: AppStoreConnectResource): AppStoreConnectMonitorItem {
  return {
    detail: `Platform ${readString(resource, 'platform') ?? 'unknown'} · release ${readString(resource, 'releaseType') ?? 'unknown'}`,
    id: resource.id,
    label: readString(resource, 'versionString') ?? resource.id,
    status: readString(resource, 'appStoreState') ?? 'unknown',
  }
}

function buildItem(resource: AppStoreConnectResource): AppStoreConnectMonitorItem {
  return {
    detail: `Uploaded ${readString(resource, 'uploadedDate') ?? 'unknown'} · version ${readString(resource, 'version') ?? 'unknown'}`,
    id: resource.id,
    label: `Build ${readString(resource, 'version') ?? resource.id}`,
    status: readString(resource, 'processingState') ?? 'unknown',
  }
}

function reviewItem(resource: AppStoreConnectResource): AppStoreConnectMonitorItem {
  return {
    detail: trimText(readString(resource, 'body') ?? 'No review text'),
    id: resource.id,
    label: `${readNumber(resource, 'rating') ?? '?'}★ ${readString(resource, 'reviewerNickname') ?? 'Reviewer'}`,
    status: readString(resource, 'territory') ?? 'unknown',
  }
}

function bundleItem(resource: AppStoreConnectResource): AppStoreConnectMonitorItem {
  return {
    detail: readString(resource, 'identifier') ?? resource.id,
    id: resource.id,
    label: readString(resource, 'name') ?? resource.id,
    status: readString(resource, 'platform') ?? 'unknown',
  }
}

function readString(resource: AppStoreConnectResource, key: string): string | undefined {
  const value = resource.attributes[key]
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function readNumber(resource: AppStoreConnectResource, key: string): number | undefined {
  const value = resource.attributes[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function trimText(value: string): string {
  return value.length > 140 ? `${value.slice(0, 137)}…` : value
}
