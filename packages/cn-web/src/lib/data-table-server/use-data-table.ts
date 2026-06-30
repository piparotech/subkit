import { useCallback, useEffect, useRef, useState } from 'react'

import { type DataTableClient, DataTableError } from './client'
import {
  type SortDirection,
  type TableFilter,
  type TablePage,
  type TableQuery,
  TableQuery as TableQuerySchema,
} from './query'

export type DataTableStatus = 'loading' | 'ready' | 'empty' | 'error'

/**
 * Optional URL-state coupling. The host passes its router's current query + a setter; the hook reads
 * the initial state from it and writes every change back, so the table is deep-linkable and the back
 * button restores sort/filter/page. Omit it for a self-contained table (state lives in memory only).
 */
export type DataTableUrlState = {
  initial: Partial<TableQuery>
  onChange: (query: TableQuery) => void
}

export type UseDataTableOptions<TRow> = {
  client: DataTableClient<TRow>
  /** Initial query overrides (e.g. config.defaultSortField/pageSize). */
  initialQuery?: Partial<TableQuery>
  urlState?: DataTableUrlState
}

export type UseDataTable<TRow> = {
  query: TableQuery
  rows: TRow[]
  total: number
  pageCount: number
  status: DataTableStatus
  error: string | null
  /** Toggle/sort by a column: same field flips direction, a new field sorts ascending. */
  sortBy: (field: string) => void
  setFilter: (filter: TableFilter) => void
  clearFilter: (field: string) => void
  setPage: (page: number) => void
  /** Change the page size (resets to page 1, so no row is skipped). */
  setPageSize: (pageSize: number) => void
  nextPage: () => void
  prevPage: () => void
  reload: () => void
}

function messageOf(error: unknown): string {
  if (error instanceof DataTableError) return error.code
  return error instanceof Error ? error.message : 'UNKNOWN'
}

function withoutFilter(filters: TableFilter[], field: string): TableFilter[] {
  return filters.filter((f) => f.field !== field)
}

/**
 * The isomorphic table controller: holds the validated query, fetches the matching page through the
 * injected client, and exposes intent handlers (sort, filter, paginate, reload). All sort/filter
 * changes reset to page 1, in-flight requests are aborted, and an unmounted component never sets
 * state — so it behaves identically against a live backend or an in-memory client.
 */
export function useDataTable<TRow>(opts: UseDataTableOptions<TRow>): UseDataTable<TRow> {
  const { client, urlState } = opts

  // Compute the initial query once from the first render's inputs (the URL/in-memory state is the
  // source of truth after mount) via a lazy useState initializer.
  const [query, setQuery] = useState<TableQuery>(() =>
    TableQuerySchema.parse({ ...opts.initialQuery, ...urlState?.initial }),
  )
  const [page, setPageState] = useState<TablePage<TRow> | null>(null)
  const [status, setStatus] = useState<DataTableStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  const onUrlChange = urlState?.onChange
  const update = useCallback(
    (next: TableQuery) => {
      setQuery(next)
      onUrlChange?.(next)
    },
    [onUrlChange],
  )

  // Cancel an in-flight request when the query changes or the component unmounts.
  const abortRef = useRef<AbortController | null>(null)
  const reloadTick = useRef(0)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller
    let active = true

    const run = async () => {
      setStatus('loading')
      setError(null)
      try {
        const result = await client.query(query, controller.signal)
        if (!active) return
        setPageState(result)
        setStatus(result.rows.length === 0 ? 'empty' : 'ready')
      } catch (e: unknown) {
        if (!active || controller.signal.aborted) return
        setError(messageOf(e))
        setStatus('error')
      }
    }
    void run()

    return () => {
      active = false
      controller.abort()
    }
  }, [client, query, tick])

  const sortBy = useCallback(
    (field: string) => {
      const sameField = query.sortField === field
      const nextDir: SortDirection = sameField && query.sortDir === 'asc' ? 'desc' : 'asc'
      update({ ...query, sortField: field, sortDir: nextDir, page: 1 })
    },
    [query, update],
  )

  const setFilter = useCallback(
    (filter: TableFilter) => {
      update({
        ...query,
        filters: [...withoutFilter(query.filters, filter.field), filter],
        page: 1,
      })
    },
    [query, update],
  )

  const clearFilter = useCallback(
    (field: string) => {
      update({ ...query, filters: withoutFilter(query.filters, field), page: 1 })
    },
    [query, update],
  )

  const setPage = useCallback(
    (next: number) => {
      const clamped = Math.max(1, Math.min(next, page?.pageCount ?? next))
      if (clamped !== query.page) update({ ...query, page: clamped })
    },
    [page?.pageCount, query, update],
  )

  const setPageSize = useCallback(
    (pageSize: number) => {
      if (pageSize !== query.pageSize) update({ ...query, pageSize, page: 1 })
    },
    [query, update],
  )

  const nextPage = useCallback(() => setPage(query.page + 1), [query.page, setPage])
  const prevPage = useCallback(() => setPage(query.page - 1), [query.page, setPage])

  const reload = useCallback(() => {
    reloadTick.current += 1
    setTick(reloadTick.current)
  }, [])

  return {
    query,
    rows: page?.rows ?? [],
    total: page?.total ?? 0,
    pageCount: page?.pageCount ?? 1,
    status,
    error,
    sortBy,
    setFilter,
    clearFilter,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    reload,
  }
}
