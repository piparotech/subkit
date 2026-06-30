// In-memory mock of the data-table-server seam (the injected DataTableClient) so the module is fully
// interactive in the showcase without a live server. The Engine normally talks to `GET /table` via
// fetch with the auth session's getToken; here we replace that surface with a deterministic store
// that reproduces the real contract: server-side filter -> sort (stable, with an id tie-breaker) ->
// paginate, returning only the requested page plus the total count. Seeded with 37 orders across 4
// statuses, sorted by date desc by default; the "customer" column is the only filterable one. This
// mirrors the native showcase mock so both tell the same story.
import {
  type ColumnDef,
  type DataTableClient,
  type TableFilter,
  type TablePage,
  type TableQuery,
  pageCountOf,
} from '@/lib/data-table-server'

/** One demo row — an order line in a back-office list. `id` is the unique stable sort tie-breaker. */
export type Order = {
  id: string
  customer: string
  status: 'open' | 'paid' | 'shipped' | 'cancelled'
  total: number
  date: string
}

export const orderColumns: ColumnDef[] = [
  { field: 'id', header: 'Order no.', align: 'start', sortable: true, filterable: false },
  { field: 'customer', header: 'Customer', align: 'start', sortable: true, filterable: true },
  { field: 'status', header: 'Status', align: 'start', sortable: true, filterable: false },
  { field: 'total', header: 'Total', align: 'end', sortable: true, filterable: false },
  { field: 'date', header: 'Date', align: 'end', sortable: true, filterable: false },
]

const CUSTOMERS = [
  'Aigner GmbH',
  'Bär & Co.',
  'Conrad AG',
  'Delius KG',
  'Eberle Handel',
  'Forster Bau',
  'Gruber Logistik',
  'Hofmann Werke',
  'Iberer Solar',
  'Jahn Medien',
]
const STATUSES: Order['status'][] = ['open', 'paid', 'shipped', 'cancelled']

/** Deterministic seed: 37 orders (enough for multiple pages), values derived from the index. */
export const orders: Order[] = Array.from({ length: 37 }, (_, i) => {
  const n = i + 1
  const day = ((i * 7) % 28) + 1
  return {
    id: `ORD-${String(1000 + n)}`,
    customer: CUSTOMERS[i % CUSTOMERS.length]!,
    status: STATUSES[i % STATUSES.length]!,
    total: 100 + ((i * 137) % 900),
    date: `2026-05-${String(day).padStart(2, '0')}`,
  }
})

function matchesFilter(row: Order, filter: TableFilter): boolean {
  const value = String(row[filter.field as keyof Order] ?? '').toLowerCase()
  const needle = filter.value.toLowerCase()
  switch (filter.op) {
    case 'eq':
      return value === needle
    case 'ne':
      return value !== needle
    case 'contains':
      return value.includes(needle)
  }
}

function compare(a: Order, b: Order, field: string): number {
  const av = a[field as keyof Order]
  const bv = b[field as keyof Order]
  if (typeof av === 'number' && typeof bv === 'number') return av - bv
  return String(av).localeCompare(String(bv))
}

/**
 * A deterministic, offline DataTableClient — reproduces the server's filter -> stable-sort ->
 * paginate pipeline over the seeded orders. The sort always falls back to the `id` tie-breaker so
 * rows never jump between pages, mirroring the real capability's stable-order guarantee.
 */
export function createMockDataTableClient(): DataTableClient<Order> {
  const delay = (ms = 240) => new Promise((resolve) => setTimeout(resolve, ms))

  return {
    async query(query: TableQuery): Promise<TablePage<Order>> {
      await delay()

      const filtered = orders.filter((row) =>
        query.filters.every((filter) => matchesFilter(row, filter)),
      )

      const sortField = query.sortField ?? 'date'
      const dir = query.sortDir === 'desc' ? -1 : 1
      const sorted = [...filtered].sort((a, b) => {
        const primary = compare(a, b, sortField) * dir
        return primary !== 0 ? primary : a.id.localeCompare(b.id)
      })

      const total = sorted.length
      const pageCount = pageCountOf(total, query.pageSize)
      const start = (query.page - 1) * query.pageSize
      const rows = sorted.slice(start, start + query.pageSize)

      return { rows, total, page: query.page, pageSize: query.pageSize, pageCount }
    },
  }
}
