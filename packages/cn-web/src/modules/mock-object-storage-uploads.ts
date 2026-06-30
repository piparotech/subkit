// In-memory seam for the object-storage-uploads Engine: a deterministic `fetchImpl` that stands in for
// the platform's auth-gated /uploads backend AND the S3-compatible storage, so the REAL isomorphic
// `createUploadClient` runs its full presigned flow unchanged in the browser. The client asks this fake
// server for a grant, PUTs the bytes DIRECT to a presigned URL (here an in-memory blob store, never
// through the "app server" path), then confirms completion (AC-1). The server re-runs the SHARED policy
// before issuing any URL, so a type/size violation is rejected before anything is stored (AC-2). Reads
// are only ever a short-lived presigned GET (AC-3); a repeated clientKey reuses the same row and storage
// key (AC-4). The provider is reached only through this seam, so it would swap for a real S3 presigner
// with no API change (AC-5).
//
// Seeding: a single owner ("demo-user") already has two completed objects (a brief PDF and a logo PNG)
// plus one stale PENDING orphan from an aborted upload, so the list is non-empty and the orphan sweep has
// something to remove on first run.
import {
  ObjectStorageUploadsConfig,
  type UploadObject,
  buildStorageKey,
  checkPolicy,
  createUploadClient,
} from '@/lib/object-storage-uploads'

/** The verified subject every seeded and uploaded object is keyed under (the auth-module seam). */
const OWNER = 'demo-user'

/** A presigned URL is just a token into the in-memory blob store; bytes never touch the server path. */
const STORAGE_ORIGIN = 'https://demo-bucket.local'

/** Fixed clock so seeded timestamps and the orphan's age are deterministic across reloads. */
const NOW = new Date('2026-06-26T09:00:00.000Z')

/** A stored object as the fake backend persists it (metadata + the bytes' size). */
type StoredRow = UploadObject & { ownerSubject: string; size: number }

type Backend = {
  fetchImpl: typeof fetch
  config: ObjectStorageUploadsConfig
}

function uuidFrom(seed: number): string {
  const hex = seed.toString(16).padStart(12, '0')
  return `00000000-0000-4000-8000-${hex}`
}

function isoMinutesAgo(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString()
}

function decodeStorageKey(uploadUrl: string): string {
  return decodeURIComponent(new URL(uploadUrl).pathname.replace(/^\//, ''))
}

/**
 * Build the deterministic in-memory backend: an upload registry keyed by id, a blob store keyed by
 * storage key, and a `fetchImpl` that speaks exactly the routes the Engine's client calls. The same
 * `fetchImpl` is then injected into the real `createUploadClient`, so the demo exercises the production
 * client code path, not a re-implementation of it.
 */
function createBackend(config: ObjectStorageUploadsConfig): Backend {
  const rows = new Map<string, StoredRow>()
  const blobs = new Map<string, number>()
  const byClientKey = new Map<string, string>()
  let counter = 1

  const seed = (
    filename: string,
    contentType: string,
    size: number,
    minutesAgo: number,
    status: UploadObject['status'],
  ): void => {
    const id = uuidFrom(counter++)
    const storageKey = buildStorageKey(config.keyPrefix, OWNER, id, filename)
    const createdAt = isoMinutesAgo(minutesAgo)
    rows.set(id, {
      id,
      filename,
      contentType,
      size,
      status,
      storageKey,
      createdAt,
      completedAt: status === 'completed' ? createdAt : null,
      ownerSubject: OWNER,
    })
    if (status === 'completed') blobs.set(storageKey, size)
  }

  seed('Onboarding-Brief.pdf', 'application/pdf', 184_320, 60 * 26, 'completed')
  seed('piparo-logo.png', 'image/png', 41_984, 60 * 5, 'completed')
  // A stale pending row: an aborted upload older than the cleanup window, swept by cleanupOrphans.
  seed(
    'halber-scan.pdf',
    'application/pdf',
    0,
    60 * (config.orphanCleanupAfterHours + 4),
    'pending',
  )

  const json = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })

  const error = (status: number, code: string): Response => json({ code }, status)

  const ownObjects = (): UploadObject[] =>
    [...rows.values()]
      .filter((row) => row.ownerSubject === OWNER)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((row): UploadObject => {
        const object: StoredRow = { ...row }
        delete (object as Partial<StoredRow>).ownerSubject
        return object
      })

  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.toString())
    const method = (init?.method ?? 'GET').toUpperCase()
    const path = url.pathname

    // Direct PUT to "storage": the presigned URL carries the storage key; bytes land in the blob store.
    if (method === 'PUT' && url.origin === STORAGE_ORIGIN) {
      const storageKey = decodeStorageKey(url.toString())
      blobs.set(storageKey, byteLength(init?.body))
      return new Response(null, { status: 200 })
    }

    // Step 1: request an upload grant. Server re-runs the shared policy BEFORE issuing any URL.
    if (method === 'POST' && path === '/uploads') {
      const req = JSON.parse(String(init?.body ?? '{}')) as {
        filename: string
        contentType: string
        size: number
        clientKey: string
      }
      const violation = checkPolicy(config.limits, req)
      if (violation) return error(400, violation)

      // Idempotency: a repeated clientKey reuses the same row + storage key (no duplicate, no orphan).
      const existingId = byClientKey.get(req.clientKey)
      const id = existingId ?? uuidFrom(counter++)
      const storageKey = buildStorageKey(config.keyPrefix, OWNER, id, req.filename)
      if (!existingId) {
        rows.set(id, {
          id,
          filename: req.filename,
          contentType: req.contentType,
          size: req.size,
          status: 'pending',
          storageKey,
          createdAt: NOW.toISOString(),
          completedAt: null,
          ownerSubject: OWNER,
        })
        byClientKey.set(req.clientKey, id)
      }
      return json({
        id,
        uploadUrl: `${STORAGE_ORIGIN}/${encodeURIComponent(storageKey)}`,
        uploadHeaders: { 'content-type': req.contentType },
        expiresAt: new Date(NOW.getTime() + config.ttl.uploadSeconds * 1000).toISOString(),
        storageKey,
      })
    }

    const idMatch = path.match(/^\/uploads\/([^/]+)(\/complete|\/url)?$/)
    const id = idMatch ? decodeURIComponent(idMatch[1] ?? '') : null
    const row = id ? rows.get(id) : undefined

    // Step 3: confirm the direct PUT landed; the row flips pending -> completed.
    if (method === 'POST' && idMatch?.[2] === '/complete') {
      if (!row) return error(404, 'NOT_FOUND')
      if (!blobs.has(row.storageKey)) return error(409, 'OBJECT_NOT_STORED')
      row.status = 'completed'
      row.completedAt = NOW.toISOString()
      const object: StoredRow = { ...row }
      delete (object as Partial<StoredRow>).ownerSubject
      return json(object)
    }

    // The only read path: a fresh, short-lived presigned GET URL for one of the owner's objects.
    if (method === 'GET' && idMatch?.[2] === '/url') {
      if (!row || row.status !== 'completed') return error(404, 'NOT_FOUND')
      return json({
        url: `${STORAGE_ORIGIN}/${encodeURIComponent(row.storageKey)}?token=${id}`,
        expiresAt: new Date(NOW.getTime() + config.ttl.downloadSeconds * 1000).toISOString(),
      })
    }

    if (method === 'DELETE' && idMatch && !idMatch[2]) {
      if (row) {
        blobs.delete(row.storageKey)
        rows.delete(row.id)
        byClientKey.forEach((value, key) => {
          if (value === row.id) byClientKey.delete(key)
        })
      }
      return new Response(null, { status: 204 })
    }

    // Sweep the owner's stale pending orphans (older than the configured window).
    if (method === 'POST' && path === '/uploads/cleanup') {
      const cutoff = NOW.getTime() - config.orphanCleanupAfterHours * 3_600_000
      let removed = 0
      for (const candidate of [...rows.values()]) {
        const stale =
          candidate.status === 'pending' && new Date(candidate.createdAt).getTime() < cutoff
        if (stale) {
          blobs.delete(candidate.storageKey)
          rows.delete(candidate.id)
          removed++
        }
      }
      return json({ removed })
    }

    if (method === 'GET' && path === '/uploads') return json(ownObjects())

    return error(404, 'NOT_FOUND')
  }

  return { fetchImpl, config }
}

function byteLength(body: BodyInit | null | undefined): number {
  if (body instanceof Blob) return body.size
  if (body instanceof ArrayBuffer) return body.byteLength
  if (body instanceof Uint8Array) return body.byteLength
  if (typeof body === 'string') return new TextEncoder().encode(body).length
  return 0
}

/** A pre-built upload client wired to a fresh deterministic backend, plus the policy the UI mirrors. */
export function createMockUploadEnvironment() {
  const config = ObjectStorageUploadsConfig.parse({
    keyPrefix: 'uploads',
    limits: {
      allowedContentTypes: ['image/png', 'image/jpeg', 'application/pdf'],
      maxSizeBytes: 5 * 1024 * 1024,
    },
  })
  const backend = createBackend(config)
  const client = createUploadClient({
    baseUrl: 'https://app.demo.local',
    getToken: () => 'demo-session-token',
    fetchImpl: backend.fetchImpl,
  })
  return { client, config }
}
