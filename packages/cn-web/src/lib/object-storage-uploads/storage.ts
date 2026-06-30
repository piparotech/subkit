import { type S3Credentials, type S3Endpoint, presignS3Url } from './sigv4'

/**
 * The provider seam (acceptance: switching the S3 provider keeps the up-/download flow working with
 * no API change). The backend depends ONLY on this interface — every concrete provider (AWS S3,
 * Hetzner, MinIO, R2, or a Fake for tests) implements it. Pulling the abstraction here, isomorphic
 * and SDK-free, means a provider swap is a config change, never a code or API change.
 */
export type StoragePresigner = {
  /** A short-lived presigned URL the client uploads bytes to directly (server never sees them). */
  presignPut(args: {
    key: string
    contentType: string
    expiresInSeconds: number
  }): Promise<{ url: string; headers: Record<string, string> }>
  /** A short-lived presigned URL to read an object — the only access path to it. */
  presignGet(args: { key: string; expiresInSeconds: number }): Promise<string>
  /** Best-effort delete of the stored object (idempotent — absent object is success). */
  deleteObject(args: { key: string }): Promise<void>
}

export type S3PresignerOptions = S3Endpoint & {
  credentials: S3Credentials
  /** Injectable for deterministic tests; defaults to `globalThis.fetch`. */
  fetchImpl?: typeof fetch
}

/**
 * The S3-compatible presigner — works against AWS S3, Hetzner, MinIO, Cloudflare R2 (all speak the
 * S3 API). Built on the dependency-free SigV4 presigner; the only network call is the DELETE (itself
 * a presigned, time-boxed request), so no long-lived signing client is held open.
 */
export function createS3Presigner(opts: S3PresignerOptions): StoragePresigner {
  const endpoint: S3Endpoint = {
    endpoint: opts.endpoint,
    region: opts.region,
    bucket: opts.bucket,
    forcePathStyle: opts.forcePathStyle,
  }
  const doFetch = opts.fetchImpl ?? fetch

  return {
    async presignPut({ key, contentType, expiresInSeconds }) {
      const url = await presignS3Url(endpoint, opts.credentials, {
        method: 'PUT',
        key,
        expiresInSeconds,
        signedHeaders: { 'content-type': contentType },
      })
      return { url, headers: { 'content-type': contentType } }
    },

    async presignGet({ key, expiresInSeconds }) {
      return presignS3Url(endpoint, opts.credentials, { method: 'GET', key, expiresInSeconds })
    },

    async deleteObject({ key }) {
      const url = await presignS3Url(endpoint, opts.credentials, {
        method: 'DELETE',
        key,
        expiresInSeconds: 60,
      })
      const res = await doFetch(url, { method: 'DELETE' })
      // S3 returns 204 on delete; 404 means already gone — both are success for an idempotent delete.
      if (!res.ok && res.status !== 404) {
        throw new Error(`STORAGE_DELETE_FAILED_${res.status}`)
      }
    },
  }
}
