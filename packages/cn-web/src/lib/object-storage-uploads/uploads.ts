import { z } from 'zod'

/**
 * The shared upload schema + policy — the single source validated on BOTH client (instant inline
 * rejection, UX) and server (authoritative re-validation; the server NEVER trusts the client's
 * pre-check). One schema, no drift (the forms-validation principle). Consumed by the Shell hook, the
 * isomorphic client, and the backend.
 */

/** Lifecycle of a stored object. `pending` = presigned but not yet confirmed uploaded; `completed`
 *  = the client confirmed the direct PUT succeeded. Stale `pending` rows are the orphans the cleanup
 *  sweep removes (an aborted upload leaves a `pending` row + at most an unreferenced storage object). */
export const UploadStatus = z.enum(['pending', 'completed'])
export type UploadStatus = z.infer<typeof UploadStatus>

/** A safe filename: no path separators, control chars or traversal — the storage key is derived from
 *  it, so a hostile name must not be able to escape the owner's prefix. */
// eslint-disable-next-line no-control-regex -- intentionally rejects control chars in filenames
const FILENAME_RE = /^[^/\\\x00-\x1f]{1,255}$/
const hasTraversal = (name: string) => name === '.' || name === '..' || name.includes('..')

/**
 * The constraints the SERVER enforces before issuing a presigned URL (mirrors config.limits). A
 * violation is rejected with 400 BEFORE anything is stored — there is no presigned URL for a file
 * that breaks policy (acceptance: type/size violation rejected before saving).
 */
export type UploadPolicy = {
  /** Allowed MIME types. `['*']` (or empty) = any type allowed. */
  allowedContentTypes: string[]
  /** Hard cap on the declared object size in bytes. */
  maxSizeBytes: number
}

export function contentTypeAllowed(policy: UploadPolicy, contentType: string): boolean {
  const allow = policy.allowedContentTypes
  if (allow.length === 0 || allow.includes('*')) return true
  return allow.includes(contentType)
}

/**
 * The request the client sends to OBTAIN a presigned upload URL. It declares the file's identity
 * (name, type, size) and an idempotency key; the bytes themselves go DIRECT to storage, never through
 * this payload (acceptance: the file never traverses the app server).
 */
export const UploadRequest = z.strictObject({
  filename: z
    .string()
    .trim()
    .min(1, 'Dateiname fehlt')
    .max(255)
    .regex(FILENAME_RE, 'Ungültiger Dateiname')
    .refine((name) => !hasTraversal(name), 'Ungültiger Dateiname'),
  contentType: z.string().trim().min(1, 'Inhaltstyp fehlt').max(255),
  size: z.number().int().nonnegative('Größe ungültig'),
  /**
   * Idempotency key chosen by the client (stable per logical file, e.g. a content hash or a UUID the
   * client keeps across retries). A repeated request with the same key reuses the same object row +
   * storage key instead of creating a duplicate — so an aborted upload is retried, not duplicated
   * (acceptance: retry without duplicate/orphan).
   */
  clientKey: z.string().trim().min(1).max(200),
})
export type UploadRequest = z.infer<typeof UploadRequest>

/** What the server returns when an upload is granted: the row id + the short-lived presigned PUT URL
 *  the client uploads to directly. */
export const UploadGrant = z.strictObject({
  id: z.uuid(),
  /** Short-lived presigned PUT URL — the client uploads the bytes here, direct to storage. */
  uploadUrl: z.url(),
  /** Required request headers for the PUT (e.g. `content-type`) — the signature covers them. */
  uploadHeaders: z.record(z.string(), z.string()),
  /** ISO timestamp at which `uploadUrl` stops working. */
  expiresAt: z.iso.datetime(),
  /** The deterministic storage key the object lives under (owner-prefixed). */
  storageKey: z.string(),
})
export type UploadGrant = z.infer<typeof UploadGrant>

/** A short-lived presigned GET URL — the ONLY way to read an authorized object (acceptance: only a
 *  valid, expiring presigned URL grants access). */
export const DownloadGrant = z.strictObject({
  url: z.url(),
  expiresAt: z.iso.datetime(),
})
export type DownloadGrant = z.infer<typeof DownloadGrant>

/** An object as listed back to its owner (metadata only — never bytes, never a standing URL). */
export const UploadObject = z.strictObject({
  id: z.uuid(),
  filename: z.string(),
  contentType: z.string(),
  size: z.number().int().nonnegative(),
  status: UploadStatus,
  storageKey: z.string(),
  createdAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
})
export type UploadObject = z.infer<typeof UploadObject>

export const UploadList = z.array(UploadObject)
export type UploadList = z.infer<typeof UploadList>

/** Validate an upload request against the shared schema (client pre-check + server authoritative). */
export function parseUploadRequest(input: unknown) {
  return UploadRequest.safeParse(input)
}

/** Field-precise inline validation for the request form (client UX). */
export function validateRequestField<K extends keyof UploadRequest>(
  key: K,
  value: unknown,
): string | null {
  const result = UploadRequest.shape[key].safeParse(value)
  return result.success ? null : (result.error.issues[0]?.message ?? 'Ungültiger Wert')
}

/** Apply the size/type policy to a request. Returns a stable error code or null if it passes. The
 *  server runs this BEFORE issuing a presigned URL (no URL for a file that breaks policy). */
export function checkPolicy(
  policy: UploadPolicy,
  req: Pick<UploadRequest, 'contentType' | 'size'>,
): 'CONTENT_TYPE_NOT_ALLOWED' | 'FILE_TOO_LARGE' | null {
  if (!contentTypeAllowed(policy, req.contentType)) return 'CONTENT_TYPE_NOT_ALLOWED'
  if (req.size > policy.maxSizeBytes) return 'FILE_TOO_LARGE'
  return null
}

/**
 * Derive the deterministic, owner-prefixed storage key. Keyed by the verified owner subject + the
 * object id so an object can NEVER live outside its owner's prefix (no cross-tenant key collision)
 * and the same object id always maps to the same key (retry-stable, no orphan from a shifting key).
 * The id segment also means two different files with the same filename never collide.
 */
export function buildStorageKey(
  prefix: string,
  ownerSubject: string,
  id: string,
  filename: string,
) {
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, '')
  const ownerSegment = encodeURIComponent(ownerSubject)
  const base = cleanPrefix ? `${cleanPrefix}/${ownerSegment}` : ownerSegment
  return `${base}/${id}/${filename}`
}
