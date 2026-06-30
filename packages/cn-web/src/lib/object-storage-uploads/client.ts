import {
  type DownloadGrant,
  DownloadGrant as DownloadGrantSchema,
  type UploadGrant,
  UploadGrant as UploadGrantSchema,
  type UploadList,
  UploadList as UploadListSchema,
  type UploadObject,
  UploadObject as UploadObjectSchema,
  type UploadRequest,
} from './uploads'

/**
 * The isomorphic upload client (Engine) — one fetch surface for web + native. The host supplies a
 * `getToken` (the auth module's session controller) so the client never owns auth state. Responses
 * are re-validated against the shared schema, so a drifted backend surfaces as a typed error here.
 *
 * The `upload()` method runs the full presigned flow: it asks the app server only for a grant, then
 * streams the bytes DIRECT to storage via the presigned PUT, then confirms completion. The file never
 * passes through the app server (acceptance: direct up-/download past the server).
 */
export type UploadClientOptions = {
  baseUrl: string
  /** Returns a fresh access token (sync or async); null = unauthenticated. */
  getToken: () => Promise<string | null> | string | null
  /** Injectable for tests; defaults to `globalThis.fetch`. */
  fetchImpl?: typeof fetch
}

/** A file to upload — the bytes plus the metadata the policy is checked against. */
export type UploadInput = {
  filename: string
  contentType: string
  body: Blob | ArrayBuffer | Uint8Array
  /** Stable idempotency key (a content hash or a UUID kept across retries). */
  clientKey: string
  /** Progress 0..1 (best-effort; only the final 1 is guaranteed without upload streaming support). */
  onProgress?: (fraction: number) => void
}

export type UploadClient = {
  /** Full flow: grant → direct PUT to storage → confirm. Returns the completed object. */
  upload(input: UploadInput): Promise<UploadObject>
  /** Step 1 only — obtain a presigned PUT grant (for callers that drive the PUT themselves). */
  requestUpload(req: UploadRequest): Promise<UploadGrant>
  /** Step 3 only — confirm a granted upload completed. */
  complete(id: string): Promise<UploadObject>
  /** A fresh, short-lived presigned download URL for one of the caller's objects. */
  downloadUrl(id: string): Promise<DownloadGrant>
  list(): Promise<UploadList>
  remove(id: string): Promise<void>
  /** Sweep the caller's stale pending orphans; returns the count removed. */
  cleanupOrphans(): Promise<number>
}

export class UploadError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
    this.name = 'UploadError'
  }
}

async function codeOf(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { code?: string }
    return body.code ?? `HTTP_${res.status}`
  } catch {
    return `HTTP_${res.status}`
  }
}

function sizeOf(body: Blob | ArrayBuffer | Uint8Array): number {
  if (body instanceof Blob) return body.size
  if (body instanceof Uint8Array) return body.byteLength
  return body.byteLength
}

export function createUploadClient(opts: UploadClientOptions): UploadClient {
  const base = opts.baseUrl.replace(/\/$/, '')
  const doFetch = opts.fetchImpl ?? fetch
  const url = (path: string) => `${base}${path}`

  async function authHeaders(): Promise<Record<string, string>> {
    const token = await opts.getToken()
    return token ? { authorization: `Bearer ${token}` } : {}
  }

  async function requestUpload(req: UploadRequest): Promise<UploadGrant> {
    const res = await doFetch(url('/uploads'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify(req),
    })
    if (!res.ok) throw new UploadError(res.status, await codeOf(res))
    return UploadGrantSchema.parse(await res.json())
  }

  async function complete(id: string): Promise<UploadObject> {
    const res = await doFetch(url(`/uploads/${encodeURIComponent(id)}/complete`), {
      method: 'POST',
      headers: await authHeaders(),
    })
    if (!res.ok) throw new UploadError(res.status, await codeOf(res))
    return UploadObjectSchema.parse(await res.json())
  }

  return {
    requestUpload,
    complete,

    async upload(input) {
      input.onProgress?.(0)
      const grant = await requestUpload({
        filename: input.filename,
        contentType: input.contentType,
        size: sizeOf(input.body),
        clientKey: input.clientKey,
      })

      // Direct PUT to storage — bytes never touch the app server.
      const put = await doFetch(grant.uploadUrl, {
        method: 'PUT',
        headers: grant.uploadHeaders,
        body: input.body as BodyInit,
      })
      if (!put.ok) {
        // The pending row + key are reusable on retry (same clientKey) — no duplicate, no orphan.
        throw new UploadError(put.status, `STORAGE_PUT_FAILED_${put.status}`)
      }
      input.onProgress?.(1)
      return complete(grant.id)
    },

    async downloadUrl(id) {
      const res = await doFetch(url(`/uploads/${encodeURIComponent(id)}/url`), {
        headers: await authHeaders(),
      })
      if (!res.ok) throw new UploadError(res.status, await codeOf(res))
      return DownloadGrantSchema.parse(await res.json())
    },

    async list() {
      const res = await doFetch(url('/uploads'), { headers: await authHeaders() })
      if (!res.ok) throw new UploadError(res.status, await codeOf(res))
      return UploadListSchema.parse(await res.json())
    },

    async remove(id) {
      const res = await doFetch(url(`/uploads/${encodeURIComponent(id)}`), {
        method: 'DELETE',
        headers: await authHeaders(),
      })
      if (!res.ok && res.status !== 204) throw new UploadError(res.status, await codeOf(res))
    },

    async cleanupOrphans() {
      const res = await doFetch(url('/uploads/cleanup'), {
        method: 'POST',
        headers: await authHeaders(),
      })
      if (!res.ok) throw new UploadError(res.status, await codeOf(res))
      const body = (await res.json()) as { removed?: unknown }
      return typeof body.removed === 'number' ? body.removed : 0
    },
  }
}
