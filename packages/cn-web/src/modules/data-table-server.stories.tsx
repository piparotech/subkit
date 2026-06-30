import { type ReactNode, useMemo, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'
import { AlertTriangle, ArrowDown, ArrowUp, ChevronsUpDown, Inbox, Search } from 'lucide-react'

import {
  PUIBadge,
  PUIButton,
  PUIEmptyState,
  PUIErrorState,
  PUIInput,
  PUISelect,
  PUISpinner,
  PUIText,
} from '@/components/ui'
import { type ColumnDef, type SortDirection, useDataTable } from '@/lib/data-table-server'

import { type Order, createMockDataTableClient, orderColumns } from './mock-data-table-server'

type BadgeVariant = 'success' | 'info' | 'secondary' | 'warning'

const statusBadge: Record<Order['status'], { label: string; variant: BadgeVariant }> = {
  open: { label: 'Open', variant: 'warning' },
  paid: { label: 'Paid', variant: 'info' },
  shipped: { label: 'Shipped', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
}

const pageSizeOptions = [
  { value: '10', label: '10 per page' },
  { value: '25', label: '25 per page' },
]

const euros = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
const shortDate = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const alignClass: Record<ColumnDef['align'], string> = {
  start: 'text-left',
  center: 'text-center',
  end: 'text-right',
}

function formatCell(order: Order, field: string): ReactNode {
  switch (field) {
    case 'status': {
      const badge = statusBadge[order.status]
      return <PUIBadge variant={badge.variant}>{badge.label}</PUIBadge>
    }
    case 'total':
      return <span className="tabular-nums">{euros.format(order.total)}</span>
    case 'date':
      return <span className="tabular-nums">{shortDate.format(new Date(order.date))}</span>
    case 'id':
      return <span className="font-mono">{order.id}</span>
    default:
      return String(order[field as keyof Order])
  }
}

function SortIndicator({ active, dir }: { active: boolean; dir: SortDirection }) {
  if (!active)
    return <ChevronsUpDown aria-hidden className="text-muted-foreground/50 h-3.5 w-3.5" />
  return dir === 'asc' ? (
    <ArrowUp aria-hidden className="text-primary h-3.5 w-3.5" />
  ) : (
    <ArrowDown aria-hidden className="text-primary h-3.5 w-3.5" />
  )
}

function ColumnHeader({
  column,
  active,
  dir,
  onSort,
}: {
  column: ColumnDef
  active: boolean
  dir: SortDirection
  onSort: () => void
}) {
  const justify = column.align === 'end' ? 'justify-end' : 'justify-start'
  if (!column.sortable) {
    return (
      <span className={`text-muted-foreground flex items-center ${justify} font-medium`}>
        {column.header}
      </span>
    )
  }
  return (
    <button
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`text-muted-foreground hover:text-foreground focus-visible:ring-ring flex w-full items-center gap-1.5 rounded-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none ${justify}`}
      onClick={onSort}
      type="button"
    >
      <span>{column.header}</span>
      <SortIndicator active={active} dir={dir} />
    </button>
  )
}

function DataTableServerDemo() {
  const client = useMemo(() => createMockDataTableClient(), [])
  const table = useDataTable<Order>({
    client,
    initialQuery: { sortField: 'date', sortDir: 'desc', pageSize: 10 },
  })

  const [customer, setCustomer] = useState('')

  function applyCustomerFilter(value: string) {
    setCustomer(value)
    const trimmed = value.trim()
    if (trimmed) table.setFilter({ field: 'customer', op: 'contains', value: trimmed })
    else table.clearFilter('customer')
  }

  const pageSize = String(table.query.pageSize)
  const showingFrom = table.total === 0 ? 0 : (table.query.page - 1) * table.query.pageSize + 1
  const showingTo = Math.min(table.query.page * table.query.pageSize, table.total)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <PUIText as="h2" className="tracking-tight" variant="title3">
          Orders
        </PUIText>
        <PUIText className="max-w-prose" tone="muted" variant="subheadline">
          Every sort, filter and page is resolved server side. The client only requests one page at
          a time and trusts the total count it receives, so the list stays fast at any scale.
        </PUIText>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex w-full max-w-xs flex-col gap-1.5">
          <PUIText as="label" className="font-medium" variant="footnote">
            Filter by customer
          </PUIText>
          <PUIInput
            addonEnd={<Search aria-hidden className="text-muted-foreground mr-2 h-4 w-4" />}
            aria-label="Filter by customer"
            onChange={(event) => applyCustomerFilter(event.target.value)}
            placeholder="e.g. Forster"
            value={customer}
          />
        </div>
        <div className="flex w-40 flex-col gap-1.5">
          <PUIText as="label" className="font-medium" variant="footnote">
            Rows per page
          </PUIText>
          <PUISelect
            onValueChange={(value) => table.setPageSize(Number(value))}
            options={pageSizeOptions}
            value={pageSize}
          />
        </div>
      </div>

      <div className="border-border overflow-hidden rounded-xl border">
        <div className="relative overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-border bg-muted/40 border-b">
                {orderColumns.map((column) => (
                  <th
                    className={`text-footnote px-4 py-2.5 ${alignClass[column.align]}`}
                    key={column.field}
                    scope="col"
                  >
                    <ColumnHeader
                      active={table.query.sortField === column.field}
                      column={column}
                      dir={table.query.sortDir}
                      onSort={() => table.sortBy(column.field)}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((order) => (
                <tr
                  className="border-border/70 hover:bg-muted/30 border-b transition-colors last:border-0 motion-reduce:transition-none"
                  key={order.id}
                >
                  {orderColumns.map((column) => (
                    <td
                      className={`text-footnote text-foreground px-4 py-3 ${alignClass[column.align]}`}
                      key={column.field}
                    >
                      {formatCell(order, column.field)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {table.status === 'loading' ? (
            <div className="bg-background/60 absolute inset-0 flex items-center justify-center backdrop-blur-[1px]">
              <PUISpinner label="Loading orders" tone="brand" />
            </div>
          ) : null}
        </div>

        {table.status === 'empty' ? (
          <div className="px-4 py-12">
            <PUIEmptyState
              description="No orders match the current customer filter."
              icon={<Inbox className="text-muted-foreground h-6 w-6" />}
              title="No results"
            />
          </div>
        ) : null}

        {table.status === 'error' ? (
          <div className="px-4 py-12">
            <PUIErrorState
              action={
                <PUIButton onPress={table.reload} size="sm" variant="outline">
                  Try again
                </PUIButton>
              }
              description="The orders could not be loaded."
              icon={<AlertTriangle className="text-muted-foreground h-6 w-6" />}
              title="Something went wrong"
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PUIText tone="muted" variant="caption1">
          {table.total === 0
            ? 'No entries'
            : `Showing ${showingFrom}–${showingTo} of ${table.total} entries`}
        </PUIText>
        <div className="flex items-center gap-3">
          <PUIText tone="subtle" variant="caption1">
            Page {table.query.page} of {table.pageCount}
          </PUIText>
          <div className="flex items-center gap-1.5">
            <PUIButton
              disabled={table.query.page <= 1}
              onPress={table.prevPage}
              size="sm"
              variant="outline"
            >
              Previous
            </PUIButton>
            <PUIButton
              disabled={table.query.page >= table.pageCount}
              onPress={table.nextPage}
              size="sm"
              variant="outline"
            >
              Next
            </PUIButton>
          </div>
        </div>
      </div>
    </div>
  )
}

const meta = {
  title: 'Modules/Data Table (server-side)',
  component: DataTableServerDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Serve large datasets as a sortable, filterable, paginated table where fetching and aggregation happen server side, so backoffice and portal lists stay fast and consistent at scale, on the isomorphic data-table-server Engine (shared query contract plus the useDataTable controller). In-memory demo: 37 seeded orders across four statuses, sorted by date descending, ten per page. Click a column header to sort (a second click flips direction), type a customer to filter (only that column is filterable, exactly as the server whitelist allows), and page through the results, every change requests a single page and reads the total count back.',
      },
    },
  },
} satisfies Meta<typeof DataTableServerDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
