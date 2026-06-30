import { ExportRecord, type ReportDefinition, type RunReportRequest } from './report-def'

/**
 * The isomorphic exports client (Engine) — one fetch surface for web + native. The host supplies a
 * `getToken` (the auth module's session controller) so the client never owns auth state. Metadata
 * responses are re-validated against the shared schema; CSV bytes are returned raw for download.
 *
 * The showcase wires an in-memory `ExportsClient` against this contract instead of `createExportsClient`
 * (see mock-reporting-csv-exports.ts), so the demo runs the same client/record contract with no network.
 */
export type ExportsClientOptions = {
  baseUrl: string
  /** Returns a fresh access token (sync or async); null = unauthenticated. */
  getToken: () => Promise<string | null> | string | null
}

export type ExportsClient = {
  /** List the report definitions the backend exposes. */
  reports(): Promise<ReportDefinition[]>
  /** Run a report → returns the export metadata (incl. the content hash). */
  run(req: RunReportRequest): Promise<ExportRecord>
  /** List the caller's exports (newest first). */
  list(): Promise<ExportRecord[]>
  /** Fetch an export's CSV bytes for download. */
  download(exportId: string): Promise<Uint8Array>
}

export class ExportsError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
    this.name = 'ExportsError'
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

export function createExportsClient(opts: ExportsClientOptions): ExportsClient {
  const base = opts.baseUrl.replace(/\/$/, '')
  const url = (path: string) => `${base}${path}`

  async function authHeaders(): Promise<Record<string, string>> {
    const token = await opts.getToken()
    return token ? { authorization: `Bearer ${token}` } : {}
  }

  return {
    async reports() {
      const res = await fetch(url('/exports/reports'), { headers: await authHeaders() })
      if (!res.ok) throw new ExportsError(res.status, await codeOf(res))
      return (await res.json()) as ReportDefinition[]
    },

    async run(req) {
      const res = await fetch(url('/exports/run'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify(req),
      })
      if (!res.ok) throw new ExportsError(res.status, await codeOf(res))
      return ExportRecord.parse(await res.json())
    },

    async list() {
      const res = await fetch(url('/exports'), { headers: await authHeaders() })
      if (!res.ok) throw new ExportsError(res.status, await codeOf(res))
      return ExportRecord.array().parse(await res.json())
    },

    async download(exportId) {
      const res = await fetch(url(`/exports/${encodeURIComponent(exportId)}/csv`), {
        headers: await authHeaders(),
      })
      if (!res.ok) throw new ExportsError(res.status, await codeOf(res))
      return new Uint8Array(await res.arrayBuffer())
    },
  }
}
