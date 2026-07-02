import { eq } from 'drizzle-orm'

import { db } from '~/db/client'
import { createRandomToken } from '~/server/auth/crypto'
import { appStoreConnectAuditEvents, syncRuns } from '~/db/schema'

export type AppleSyncMode = 'compare' | 'import'
export type AppleSyncRunStatus = 'failed' | 'partial' | 'succeeded'
export type SyncSummary = Record<string, string | number | boolean | null>

interface AuditInput {
  action: string
  appId: string | null
  credentialId: string
  detail: string
  tenantId: string
  userId: string
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

export async function startStoreSyncRun({
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

export async function finishStoreSyncRun({
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

export function syncRunRowId(appId: string, store: 'apple', mode: AppleSyncMode): string {
  return `${appId}:sync:${store}:${mode}:${createRandomToken(8)}`
}

export function safeErrorDetail(error: unknown): string {
  if (error instanceof Error) return redactSecretLikeText(error.message)
  return 'Unknown App Store Connect error'
}

export function redactSecretLikeText(value: string): string {
  return value
    .replace(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g, '[redacted-private-key]')
    .replace(/[A-Za-z0-9_-]{80,}/g, '[redacted-token]')
}
