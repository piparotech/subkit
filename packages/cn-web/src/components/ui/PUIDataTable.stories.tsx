import { useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIBadge } from './PUIBadge'
import { PUIDataTable } from './PUIDataTable'
import { type PUIDataTableColumn, type PUIDataTableSort } from './PUIDataTable.types'

interface Invoice {
  id: string
  client: string
  amount: number
  status: 'paid' | 'pending' | 'overdue'
  issued: string
}

const INVOICES: Invoice[] = [
  { id: 'INV-001', client: 'Otto Chemie', amount: 4200, status: 'paid', issued: '2026-01-12' },
  {
    id: 'INV-002',
    client: 'Rudolf Müller',
    amount: 34900,
    status: 'pending',
    issued: '2026-02-03',
  },
  { id: 'INV-003', client: 'Bolzfieber', amount: 1800, status: 'overdue', issued: '2026-01-28' },
  { id: 'INV-004', client: 'Stadt Aachen', amount: 12600, status: 'paid', issued: '2026-03-15' },
  { id: 'INV-005', client: 'Piparo Party', amount: 980, status: 'pending', issued: '2026-03-22' },
  { id: 'INV-006', client: 'Showcase GmbH', amount: 7400, status: 'paid', issued: '2026-04-01' },
  { id: 'INV-007', client: 'FeuerTrutz', amount: 2200, status: 'overdue', issued: '2026-04-09' },
  { id: 'INV-008', client: 'Cockpit AG', amount: 15300, status: 'paid', issued: '2026-04-18' },
]

const STATUS_VARIANT = {
  paid: 'success',
  pending: 'secondary',
  overdue: 'destructive',
} as const

const euros = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(cents)

const columns: PUIDataTableColumn<Invoice>[] = [
  { key: 'id', header: 'Invoice', cell: (row) => row.id, sortable: true, width: '7rem' },
  { key: 'client', header: 'Client', cell: (row) => row.client, sortable: true },
  {
    key: 'amount',
    header: 'Amount',
    cell: (row) => euros(row.amount),
    sortValue: (row) => row.amount,
    sortable: true,
    align: 'end',
  },
  {
    key: 'status',
    header: 'Status',
    cell: (row) => <PUIBadge variant={STATUS_VARIANT[row.status]}>{row.status}</PUIBadge>,
    sortValue: (row) => row.status,
    sortable: true,
  },
  { key: 'issued', header: 'Issued', cell: (row) => row.issued, sortable: true, align: 'end' },
]

const meta = {
  title: 'PUI/Data/DataTable',
  component: PUIDataTable,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: { caption: 'Recent invoices', columns, data: INVOICES, rowKey: (row: Invoice) => row.id },
} satisfies Meta<typeof PUIDataTable<Invoice>>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <PUIDataTable<Invoice>
      caption="Recent invoices"
      columns={columns}
      data={INVOICES}
      defaultSort={{ columnKey: 'amount', direction: 'desc' }}
      rowKey={(row) => row.id}
    />
  ),
}

export const Paginated: Story = {
  render: () => (
    <PUIDataTable<Invoice>
      caption="Recent invoices, paginated"
      columns={columns}
      data={INVOICES}
      pageSize={3}
      rowKey={(row) => row.id}
    />
  ),
}

export const Zebra: Story = {
  render: () => (
    <PUIDataTable<Invoice>
      caption="Recent invoices with zebra striping"
      columns={columns}
      data={INVOICES}
      rowKey={(row) => row.id}
      zebra
    />
  ),
}

export const StickyHeader: Story = {
  render: () => (
    <PUIDataTable<Invoice>
      caption="Scrollable table with a pinned header"
      columns={columns}
      data={[...INVOICES, ...INVOICES.map((row) => ({ ...row, id: `${row.id}-b` }))]}
      rowKey={(row) => row.id}
      stickyHeader
    />
  ),
}

export const ControlledSort: Story = {
  render: function ControlledSortStory() {
    const [sort, setSort] = useState<PUIDataTableSort | null>({
      columnKey: 'client',
      direction: 'asc',
    })
    return (
      <PUIDataTable<Invoice>
        caption="Externally controlled sort state"
        columns={columns}
        data={INVOICES}
        onSortChange={setSort}
        rowKey={(row) => row.id}
        sort={sort}
      />
    )
  },
}

export const Loading: Story = {
  render: () => (
    <PUIDataTable<Invoice>
      caption="Loading invoices"
      columns={columns}
      data={[]}
      loading
      loadingRows={5}
    />
  ),
}

export const Empty: Story = {
  render: () => (
    <PUIDataTable<Invoice>
      caption="No invoices"
      columns={columns}
      data={[]}
      rowKey={(row) => row.id}
    />
  ),
}
