import {
  type ColumnMapping,
  type SavedMapping,
  SavedMapping as SavedMappingSchema,
} from './mapping'
import { type UpsertRow } from './validate'

/**
 * The isomorphic import client (Engine) — one fetch surface for web + native. Parsing, mapping and
 * preview are PURE (parse.ts / mapping.ts / validate.ts) and run client-side; this client only talks
 * to the backend for the authoritative write, the per-row error log, and reusable mappings. The host
 * supplies a `getToken` (the auth module's session) so the client never owns auth state.
 */
export type ImportClientOptions = {
  baseUrl: string
  /** Returns a fresh access token (sync or async); null = unauthenticated. */
  getToken: () => Promise<string | null> | string | null
}

/** A row that failed the authoritative server re-validation (the per-row error log entry). */
export type RowError = {
  rowNumber: number
  field: string | null
  message: string
}

/** The outcome of an import run. Idempotent: re-running the same rows yields updated, not inserted. */
export type ImportResult = {
  jobId: string
  target: string
  inserted: number
  updated: number
  skipped: number
  errors: RowError[]
}

/** A summary of one past import run (history). */
export type ImportJobSummary = {
  jobId: string
  target: string
  inserted: number
  updated: number
  skipped: number
  errorCount: number
  createdAt: string
}

export type RunImportInput = {
  target: string
  rows: UpsertRow[]
}

export type ImportClient = {
  run(input: RunImportInput): Promise<ImportResult>
  history(): Promise<ImportJobSummary[]>
  jobErrors(jobId: string): Promise<RowError[]>
  listMappings(target: string): Promise<SavedMapping[]>
  saveMapping(name: string, target: string, mapping: ColumnMapping): Promise<SavedMapping>
  deleteMapping(name: string, target: string): Promise<void>
}

export class ImportError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
    this.name = 'ImportError'
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

export function createImportClient(opts: ImportClientOptions): ImportClient {
  const base = opts.baseUrl.replace(/\/$/, '')
  const url = (path: string) => `${base}${path}`

  async function authHeaders(): Promise<Record<string, string>> {
    const token = await opts.getToken()
    return token ? { authorization: `Bearer ${token}` } : {}
  }

  async function send<T>(path: string, init: RequestInit): Promise<T> {
    const res = await fetch(url(path), {
      ...init,
      headers: {
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(await authHeaders()),
        ...init.headers,
      },
    })
    if (!res.ok) throw new ImportError(res.status, await codeOf(res))
    return (await res.json()) as T
  }

  return {
    run(input) {
      return send<ImportResult>('/imports/run', { method: 'POST', body: JSON.stringify(input) })
    },

    history() {
      return send<ImportJobSummary[]>('/imports', { method: 'GET' })
    },

    jobErrors(jobId) {
      return send<RowError[]>(`/imports/${encodeURIComponent(jobId)}/errors`, { method: 'GET' })
    },

    async listMappings(target) {
      const list = await send<unknown[]>(`/mappings?target=${encodeURIComponent(target)}`, {
        method: 'GET',
      })
      return list.map((item) => SavedMappingSchema.parse(item))
    },

    async saveMapping(name, target, mapping) {
      const saved = await send<unknown>('/mappings', {
        method: 'POST',
        body: JSON.stringify({ name, target, mapping }),
      })
      return SavedMappingSchema.parse(saved)
    },

    async deleteMapping(name, target) {
      const res = await fetch(
        url(`/mappings/${encodeURIComponent(name)}?target=${encodeURIComponent(target)}`),
        { method: 'DELETE', headers: await authHeaders() },
      )
      if (!res.ok && res.status !== 204) throw new ImportError(res.status, await codeOf(res))
    },
  }
}
