import { createHmac, randomBytes } from 'node:crypto'

import type { ServerCreateRuntimeSdkKeyRequest, ServerCreateRuntimeSdkKeyResponse } from '@piparotech/subkit-core'
import { eq } from 'drizzle-orm'

import { db } from '~/db/client'
import { ensureDatabaseReady } from '~/db/setup'
import { apps } from '~/db/schema'
import { parseServerEnv, resolveSecretEncryptionKey } from '~/server/env'

import { assertAppExists } from './runtime-shared'

export type RuntimeAuthResult = { appId: string; ok: true } | { ok: false; response: Response }

const RUNTIME_SDK_KEY_PREFIX = 'sk_rt_'

export async function authorizeRuntimeRequest(request: Request): Promise<RuntimeAuthResult> {
  await ensureDatabaseReady()
  const sdkKey = readBearerToken(request)
  if (sdkKey == null) return { ok: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) }

  const keyHash = hashRuntimeSdkKey(sdkKey)
  const [app] = await db.select({ appId: apps.id }).from(apps).where(eq(apps.runtimeSdkKeyHash, keyHash)).limit(1)

  if (app == null) return { ok: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  return { appId: app.appId, ok: true }
}

export async function createRuntimeSdkKey(input: ServerCreateRuntimeSdkKeyRequest): Promise<ServerCreateRuntimeSdkKeyResponse> {
  await ensureDatabaseReady()
  await assertAppExists(input.appId)

  const key = createRuntimeSdkKeySecret()
  await db.update(apps).set({ runtimeSdkKeyHash: hashRuntimeSdkKey(key) }).where(eq(apps.id, input.appId))
  return { appId: input.appId, key }
}

export function hashRuntimeSdkKey(sdkKey: string): string {
  return createHmac('sha256', runtimeSdkKeyPepper()).update(sdkKey).digest('hex')
}

function readBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (header == null) return null
  const prefix = 'Bearer '
  if (!header.startsWith(prefix)) return null
  const token = header.slice(prefix.length).trim()
  return token === '' ? null : token
}

function createRuntimeSdkKeySecret(): string {
  return `${RUNTIME_SDK_KEY_PREFIX}${randomBytes(32).toString('base64url')}`
}

function runtimeSdkKeyPepper(): string {
  const env = parseServerEnv(process.env)
  return resolveSecretEncryptionKey(env)
}
