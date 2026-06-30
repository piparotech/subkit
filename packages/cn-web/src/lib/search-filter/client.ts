import { z } from 'zod'

import type { FacetCounts, FacetSelection } from './facets'

/**
 * The isomorphic backend-search client (Engine) — one fetch surface for web + native against the
 * Postgres-FTS endpoint (the "backend" variant of the capability). The host supplies a `getToken`
 * (the auth module's session controller, when the search is tenant-scoped); the client never owns
 * auth state. Responses are re-validated against the shared schema, so a drifted backend surfaces as
 * a typed error here, not a silent UI bug.
 */

/** One server-ranked hit. `id` keys the row; `data` is the projected, app-shaped payload. */
export const SearchHitDto = z.strictObject({
  id: z.string(),
  score: z.number(),
  data: z.record(z.string(), z.unknown()),
})
export type SearchHitDto = z.infer<typeof SearchHitDto>

export const SearchResponse = z.strictObject({
  hits: z.array(SearchHitDto),
  total: z.number().int().nonnegative(),
  facets: z.record(z.string(), z.record(z.string(), z.number())).default({}),
})
export type SearchResponse = z.infer<typeof SearchResponse>

export type SearchRequest = {
  query: string
  facets?: FacetSelection
  limit?: number
  offset?: number
}

export type SearchClientOptions = {
  baseUrl: string
  /** Returns a fresh access token (sync or async); null = unauthenticated/public search. */
  getToken?: () => Promise<string | null> | string | null
}

export type SearchClient = {
  search(request: SearchRequest): Promise<SearchResponse>
}

export class SearchError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
    this.name = 'SearchError'
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

/** Build the `GET /search` query string from a request (facets flattened as repeated `facet` params). */
export function buildSearchQuery(request: SearchRequest): string {
  const params = new URLSearchParams()
  params.set('q', request.query)
  if (request.limit != null) params.set('limit', String(request.limit))
  if (request.offset != null) params.set('offset', String(request.offset))
  for (const [key, values] of Object.entries(request.facets ?? {})) {
    for (const value of values) params.append('facet', `${key}:${value}`)
  }
  return params.toString()
}

export function createSearchClient(opts: SearchClientOptions): SearchClient {
  const base = opts.baseUrl.replace(/\/$/, '')

  async function authHeaders(): Promise<Record<string, string>> {
    const token = await opts.getToken?.()
    return token ? { authorization: `Bearer ${token}` } : {}
  }

  return {
    async search(request) {
      const qs = buildSearchQuery(request)
      const res = await fetch(`${base}/search?${qs}`, { headers: await authHeaders() })
      if (!res.ok) throw new SearchError(res.status, await codeOf(res))
      return SearchResponse.parse(await res.json())
    },
  }
}

/** Re-export for hosts that bridge server facet counts into the Shell's facet UI. */
export type { FacetCounts, FacetSelection }
