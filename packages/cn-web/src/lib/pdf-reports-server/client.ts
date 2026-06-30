import { ReportRecord, type ReportSpec } from './report'

/**
 * The isomorphic reports client (Engine) — one fetch surface for web + native. The host supplies a
 * `getToken` (the auth module's session controller) so the client never owns auth state. Metadata
 * responses are re-validated against the shared schema; PDF bytes are returned raw for download.
 */
export type ReportsClientOptions = {
  baseUrl: string
  /** Returns a fresh access token (sync or async); null = unauthenticated. */
  getToken: () => Promise<string | null> | string | null
}

export type ReportsClient = {
  /** Request server-side generation of a report; returns its metadata (incl. the content hash). */
  generate(spec: ReportSpec): Promise<ReportRecord>
  /** List the caller's reports (newest first). */
  list(): Promise<ReportRecord[]>
  /** Fetch a report's PDF bytes for download/preview. */
  download(reportId: string): Promise<Uint8Array>
}

export class ReportsError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
    this.name = 'ReportsError'
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

export function createReportsClient(opts: ReportsClientOptions): ReportsClient {
  const base = opts.baseUrl.replace(/\/$/, '')
  const url = (path: string) => `${base}${path}`

  async function authHeaders(): Promise<Record<string, string>> {
    const token = await opts.getToken()
    return token ? { authorization: `Bearer ${token}` } : {}
  }

  return {
    async generate(spec) {
      const res = await fetch(url('/reports'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify(spec),
      })
      if (!res.ok) throw new ReportsError(res.status, await codeOf(res))
      return ReportRecord.parse(await res.json())
    },

    async list() {
      const res = await fetch(url('/reports'), { headers: await authHeaders() })
      if (!res.ok) throw new ReportsError(res.status, await codeOf(res))
      return ReportRecord.array().parse(await res.json())
    },

    async download(reportId) {
      const res = await fetch(url(`/reports/${encodeURIComponent(reportId)}/pdf`), {
        headers: await authHeaders(),
      })
      if (!res.ok) throw new ReportsError(res.status, await codeOf(res))
      return new Uint8Array(await res.arrayBuffer())
    },
  }
}
