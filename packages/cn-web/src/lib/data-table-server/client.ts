import { type TablePage, type TableQuery, pageCountOf, tableQueryToParams } from './query'

/**
 * The isomorphic data-table client (Engine) — one fetch surface for web + native. The host supplies
 * a `getToken` (the auth session controller) so the client never owns auth state. The row shape is a
 * generic the host pins per table; the client only owns the envelope (rows + total + paging).
 */
export type DataTableClientOptions = {
  baseUrl: string
  /** Resource path the table backend is mounted at (default `/table`). */
  path?: string
  /** Returns a fresh access token (sync or async); null = unauthenticated. */
  getToken?: () => Promise<string | null> | string | null
}

export type DataTableClient<TRow> = {
  query(query: TableQuery, signal?: AbortSignal): Promise<TablePage<TRow>>
}

export class DataTableError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
    this.name = 'DataTableError'
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

type RawPage = {
  rows?: unknown
  total?: unknown
  page?: unknown
  pageSize?: unknown
  pageCount?: unknown
} & Record<string, unknown>

/** Normalize the server envelope into a TablePage, deriving pageCount if the server omitted it. */
function toPage<TRow>(raw: RawPage, query: TableQuery): TablePage<TRow> {
  const rows = Array.isArray(raw.rows) ? (raw.rows as TRow[]) : []
  const total = typeof raw.total === 'number' ? raw.total : rows.length
  const page = typeof raw.page === 'number' ? raw.page : query.page
  const pageSize = typeof raw.pageSize === 'number' ? raw.pageSize : query.pageSize
  const pageCount = typeof raw.pageCount === 'number' ? raw.pageCount : pageCountOf(total, pageSize)
  return { rows, total, page, pageSize, pageCount }
}

export function createDataTableClient<TRow>(opts: DataTableClientOptions): DataTableClient<TRow> {
  const base = opts.baseUrl.replace(/\/$/, '')
  const path = opts.path ?? '/table'

  async function authHeaders(): Promise<Record<string, string>> {
    const token = await opts.getToken?.()
    return token ? { authorization: `Bearer ${token}` } : {}
  }

  return {
    async query(query, signal) {
      const params = tableQueryToParams(query)
      const qs = params.toString()
      const url = `${base}${path}${qs ? `?${qs}` : ''}`
      const res = await fetch(url, { headers: await authHeaders(), signal })
      if (!res.ok) throw new DataTableError(res.status, await codeOf(res))
      return toPage<TRow>((await res.json()) as RawPage, query)
    },
  }
}
