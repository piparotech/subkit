import { z } from 'zod'

/**
 * The shared, isomorphic query contract — validated on BOTH client (URL-state coupling, request
 * shaping) and server (authoritative re-validation before it ever touches the DB). One schema, no
 * drift. This file is PURE (zod only).
 *
 * The capability owns: server-side sort + filter + pagination over a large dataset, returning only
 * the requested page plus the total count, with a STABLE sort order (a unique tie-breaker so rows
 * never jump between pages) and row-level read permission enforced in the query, not the UI.
 */

/** A page is 1-based; the server clamps size to [1, maxPageSize] (default 25, hard cap 100). */
export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100

export const SortDirection = z.enum(['asc', 'desc'])
export type SortDirection = z.infer<typeof SortDirection>

/** Supported filter operators. `eq`/`ne` for exact match, `contains` for case-insensitive substring. */
export const FilterOperator = z.enum(['eq', 'ne', 'contains'])
export type FilterOperator = z.infer<typeof FilterOperator>

export const TableFilter = z.strictObject({
  field: z.string().min(1),
  op: FilterOperator,
  value: z.string().max(200),
})
export type TableFilter = z.infer<typeof TableFilter>

/**
 * A table query as it crosses the wire. `sortField` is validated against the table's allowed columns
 * server-side (an unknown column is rejected, not silently ignored) — see `resolveQuery`. Coercing
 * strings lets the same schema parse URL search params directly.
 */
export const TableQuery = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  sortField: z.string().min(1).nullable().default(null),
  sortDir: SortDirection.default('asc'),
  filters: z.array(TableFilter).max(20).default([]),
})
export type TableQuery = z.infer<typeof TableQuery>

/** A page of rows plus the total count of rows matching the filters (across all pages). */
export type TablePage<TRow> = {
  rows: TRow[]
  total: number
  page: number
  pageSize: number
  /** Total pages for the current filters (>= 1, even when empty), so the Shell can clamp navigation. */
  pageCount: number
}

/** Compute pageCount from a total + pageSize (>= 1 so the Shell always has a valid first page). */
export function pageCountOf(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
}

/** Parse + validate a table query (client pre-shape + server authoritative). */
export function parseTableQuery(input: unknown) {
  return TableQuery.safeParse(input)
}

/**
 * Decode a query from URL search params (the Shell couples table state to the URL). `filters` is a
 * JSON-encoded array under the `filters` key; everything else is a flat string param. Invalid input
 * falls back to the schema defaults rather than throwing, so a hand-edited URL never white-screens.
 */
export function tableQueryFromParams(params: URLSearchParams): TableQuery {
  const raw: Record<string, unknown> = {}
  const page = params.get('page')
  const pageSize = params.get('pageSize')
  const sortField = params.get('sortField')
  const sortDir = params.get('sortDir')
  const filters = params.get('filters')
  if (page != null) raw.page = page
  if (pageSize != null) raw.pageSize = pageSize
  if (sortField != null) raw.sortField = sortField
  if (sortDir != null) raw.sortDir = sortDir
  if (filters != null) {
    try {
      raw.filters = JSON.parse(filters)
    } catch {
      // Leave filters unset, schema default []. A corrupt URL must not throw.
    }
  }
  const parsed = TableQuery.safeParse(raw)
  return parsed.success ? parsed.data : TableQuery.parse({})
}

/** Encode a query back into URL search params (omit defaults to keep the URL clean). */
export function tableQueryToParams(query: TableQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.page !== 1) params.set('page', String(query.page))
  if (query.pageSize !== DEFAULT_PAGE_SIZE) params.set('pageSize', String(query.pageSize))
  if (query.sortField) {
    params.set('sortField', query.sortField)
    if (query.sortDir !== 'asc') params.set('sortDir', query.sortDir)
  }
  if (query.filters.length > 0) params.set('filters', JSON.stringify(query.filters))
  return params
}

/**
 * Resolve a validated query against a table's whitelist of sortable/filterable columns. Rejects an
 * unknown sort or filter column (defense-in-depth: the column set is closed, so no SQL-injection via
 * a column name and no leaking of a non-projected column). Returns the safe, normalized query.
 */
export function resolveQuery(
  query: TableQuery,
  allowed: { sortable: readonly string[]; filterable: readonly string[]; defaultSort: string },
): { ok: true; value: TableQuery } | { ok: false; error: string } {
  const sortable = new Set(allowed.sortable)
  const filterable = new Set(allowed.filterable)

  let sortField = query.sortField
  if (sortField != null && !sortable.has(sortField)) {
    return { ok: false, error: 'UNKNOWN_SORT_FIELD' }
  }
  if (sortField == null) sortField = allowed.defaultSort

  for (const filter of query.filters) {
    if (!filterable.has(filter.field)) return { ok: false, error: 'UNKNOWN_FILTER_FIELD' }
  }

  return { ok: true, value: { ...query, sortField } }
}
