import { type ReactNode } from 'react'

export type PUIDataTableAlign = 'start' | 'center' | 'end'

export type PUIDataTableSortDirection = 'asc' | 'desc'

export interface PUIDataTableSort {
  /** Key of the currently sorted column. */
  columnKey: string
  direction: PUIDataTableSortDirection
}

export interface PUIDataTableColumn<TRow> {
  /** Stable identifier; used for sort state, React keys and ARIA wiring. */
  key: string
  /** Header content (i18n-agnostic). */
  header: ReactNode
  /** Cell renderer for a row. Receives the row and its index in the (sorted) page. */
  cell: (row: TRow, rowIndex: number) => ReactNode
  /** Mark the column sortable. Provide `sortValue` for non-primitive cells. */
  sortable?: boolean
  /**
   * Value used to compare rows when this column is sorted. Defaults to the
   * `cell` result only when it is a string or number; supply this for anything else.
   */
  sortValue?: (row: TRow) => string | number | boolean | null | undefined
  /** Horizontal alignment of the header and its cells. Defaults to `start`. */
  align?: PUIDataTableAlign
  /** Fixed width (CSS length) applied via a `<colgroup>` so columns do not jump while sorting. */
  width?: string
}

export interface PUIDataTableProps<TRow> {
  columns: PUIDataTableColumn<TRow>[]
  data: TRow[]
  /** Stable key per row; falls back to the row index when omitted. */
  rowKey?: (row: TRow, index: number) => string
  /** Controlled sort state. Pair with `onSortChange`. */
  sort?: PUIDataTableSort | null
  /** Uncontrolled initial sort. */
  defaultSort?: PUIDataTableSort | null
  /** Called with the next sort (or `null` when sorting is cleared) on header activation. */
  onSortChange?: (sort: PUIDataTableSort | null) => void
  /** Client-side page size. Pagination is hidden when omitted or `>= data.length`. */
  pageSize?: number
  /** Controlled current page (1-based). Pair with `onPageChange`. */
  page?: number
  /** Uncontrolled initial page (1-based). Defaults to 1. */
  defaultPage?: number
  onPageChange?: (page: number) => void
  /** Accessible name for the table (`aria-label` / `<caption>`). */
  caption: ReactNode
  /** Visually hide the caption while keeping it for assistive tech. Defaults to true. */
  hideCaption?: boolean
  /** Pin the header row to the top of the scroll container. */
  stickyHeader?: boolean
  /** Show skeleton rows instead of data. */
  loading?: boolean
  /** Number of skeleton rows to render while `loading`. Defaults to `pageSize ?? 5`. */
  loadingRows?: number
  /** Content shown when `data` is empty and not loading. Defaults to a PUIEmptyState. */
  emptyState?: ReactNode
  /** Tonal zebra striping on alternate rows. Defaults to false (hover-only). */
  zebra?: boolean
  className?: string
}
