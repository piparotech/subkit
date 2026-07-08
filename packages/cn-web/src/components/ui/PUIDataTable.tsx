import * as React from 'react'

import { ChevronDown, ChevronUp, ChevronsUpDown, Inbox } from 'lucide-react'

import { cn } from '../../lib/utils'
import { PUIButton } from './PUIButton'
import {
  type PUIDataTableAlign,
  type PUIDataTableColumn,
  type PUIDataTableProps,
  type PUIDataTableSort,
} from './PUIDataTable.types'
import { PUIEmptyState } from './PUIEmptyState'
import { PUISkeleton } from './PUISkeleton'

export type {
  PUIDataTableAlign,
  PUIDataTableColumn,
  PUIDataTableProps,
  PUIDataTableSort,
  PUIDataTableSortDirection,
} from './PUIDataTable.types'

const ALIGN_CELL: Record<PUIDataTableAlign, string> = {
  start: 'text-start',
  center: 'text-center',
  end: 'text-end',
}

const ALIGN_HEADER_BUTTON: Record<PUIDataTableAlign, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
}

function defaultSortValue<TRow>(column: PUIDataTableColumn<TRow>, row: TRow, index: number) {
  if (column.sortValue) return column.sortValue(row)
  const rendered = column.cell(row, index)
  return typeof rendered === 'string' || typeof rendered === 'number' ? rendered : null
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

/**
 * Sortable, client-paginated data table for B2B/web surfaces. Renders a semantic
 * `<table>` with `<th scope="col" aria-sort>`; sortable headers are buttons that
 * cycle ascending then descending then none, with a chevron reflecting state.
 * Flat at rest: tonal hover/zebra layering and hairline borders, no heavy shadows.
 * Sort and page can be controlled or internal; loading composes PUISkeleton rows and
 * empty composes PUIEmptyState. Mobile uses PUIList cards instead.
 *
 * @scope web-only
 */
export function PUIDataTable<TRow>({
  columns,
  data,
  rowKey,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  pageSize,
  page: pageProp,
  defaultPage = 1,
  onPageChange,
  caption,
  hideCaption = true,
  stickyHeader = false,
  loading = false,
  loadingRows,
  emptyState,
  zebra = false,
  className,
}: PUIDataTableProps<TRow>) {
  const baseId = React.useId()
  const captionId = `${baseId}-caption`
  const statusId = `${baseId}-status`

  const sortControlled = sortProp !== undefined
  const [sortState, setSortState] = React.useState<PUIDataTableSort | null>(defaultSort)
  const sort = sortControlled ? (sortProp ?? null) : sortState

  const pageControlled = pageProp !== undefined
  const [pageState, setPageState] = React.useState(defaultPage)
  const currentPage = pageControlled ? pageProp : pageState

  const setSort = (next: PUIDataTableSort | null) => {
    if (!sortControlled) setSortState(next)
    onSortChange?.(next)
  }

  const setPage = (next: number) => {
    if (!pageControlled) setPageState(next)
    onPageChange?.(next)
  }

  const toggleSort = (column: PUIDataTableColumn<TRow>) => {
    const isActive = sort?.columnKey === column.key
    let next: PUIDataTableSort | null
    if (!isActive) next = { columnKey: column.key, direction: 'asc' }
    else if (sort?.direction === 'asc') next = { columnKey: column.key, direction: 'desc' }
    else next = null
    setSort(next)
    if (!pageControlled) setPageState(1)
    onPageChange?.(1)
  }

  const sortedData = React.useMemo(() => {
    if (!sort) return data
    const column = columns.find((c) => c.key === sort.columnKey && c.sortable)
    if (!column) return data
    const factor = sort.direction === 'asc' ? 1 : -1
    return data
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const cmp = compareValues(
          defaultSortValue(column, a.row, a.index),
          defaultSortValue(column, b.row, b.index),
        )
        return cmp !== 0 ? cmp * factor : a.index - b.index
      })
      .map((entry) => entry.row)
  }, [data, columns, sort])

  const paginate = pageSize != null && pageSize > 0 && pageSize < sortedData.length
  const pageCount = paginate ? Math.max(1, Math.ceil(sortedData.length / pageSize)) : 1
  const safePage = Math.min(Math.max(1, currentPage), pageCount)

  const pageRows = React.useMemo(() => {
    if (!paginate || pageSize == null) return sortedData
    const start = (safePage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, paginate, pageSize, safePage])

  const skeletonRows = loadingRows ?? pageSize ?? 5
  const isEmpty = !loading && sortedData.length === 0
  const rangeStart = paginate && pageSize != null ? (safePage - 1) * pageSize + 1 : 1
  const rangeEnd =
    paginate && pageSize != null ? rangeStart + pageRows.length - 1 : sortedData.length

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'border-border bg-card w-full overflow-auto rounded-xl border',
          stickyHeader && 'max-h-[28rem]',
        )}
      >
        <table
          aria-describedby={statusId}
          aria-labelledby={captionId}
          className="w-full border-collapse text-start"
        >
          <caption className={cn('px-4 pt-3 text-start', hideCaption && 'sr-only')} id={captionId}>
            {caption}
          </caption>
          {columns.some((column) => column.width) ? (
            <colgroup>
              {columns.map((column) => (
                <col key={column.key} style={column.width ? { width: column.width } : undefined} />
              ))}
            </colgroup>
          ) : null}
          <thead>
            <tr className="border-border border-b">
              {columns.map((column) => {
                const align = column.align ?? 'start'
                const isActive = sort?.columnKey === column.key
                const ariaSort = column.sortable
                  ? isActive
                    ? sort?.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                  : undefined
                return (
                  <th
                    key={column.key}
                    aria-sort={ariaSort}
                    className={cn(
                      'text-label text-muted-foreground px-4 py-3 font-medium tracking-wide whitespace-nowrap uppercase',
                      ALIGN_CELL[align],
                      stickyHeader && 'bg-card sticky top-0 z-10',
                    )}
                    scope="col"
                  >
                    {column.sortable ? (
                      <button
                        className={cn(
                          'text-label duration-fast inline-flex min-h-11 w-full items-center gap-1.5 font-medium tracking-wide uppercase transition-colors motion-reduce:transition-none',
                          'hover:text-foreground focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset',
                          isActive ? 'text-foreground' : 'text-muted-foreground',
                          ALIGN_HEADER_BUTTON[align],
                        )}
                        onClick={() => toggleSort(column)}
                        type="button"
                      >
                        <span>{column.header}</span>
                        {isActive ? (
                          sort?.direction === 'asc' ? (
                            <ChevronUp aria-hidden className="size-3.5 shrink-0" />
                          ) : (
                            <ChevronDown aria-hidden className="size-3.5 shrink-0" />
                          )
                        ) : (
                          <ChevronsUpDown aria-hidden className="size-3.5 shrink-0 opacity-60" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, rowIndex) => (
                <tr
                  key={`skeleton-${rowIndex}`}
                  className={cn(rowIndex > 0 && 'border-border border-t')}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3">
                      <PUISkeleton className="h-4 w-full max-w-[12rem]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : isEmpty ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  {emptyState ?? (
                    <PUIEmptyState
                      description="There is nothing to show here yet."
                      icon={<Inbox aria-hidden className="text-muted-foreground size-8" />}
                      title="No data"
                    />
                  )}
                </td>
              </tr>
            ) : (
              pageRows.map((row, rowIndex) => {
                const key = rowKey ? rowKey(row, rowIndex) : String(rowIndex)
                return (
                  <tr
                    key={key}
                    className={cn(
                      'duration-fast hover:bg-muted transition-colors motion-reduce:transition-none',
                      rowIndex > 0 && 'border-border border-t',
                      zebra && rowIndex % 2 === 1 && 'bg-muted/40',
                    )}
                  >
                    {columns.map((column) => {
                      const align = column.align ?? 'start'
                      return (
                        <td
                          key={column.key}
                          className={cn(
                            'text-subheadline text-card-foreground px-4 py-3 align-middle',
                            ALIGN_CELL[align],
                          )}
                        >
                          {column.cell(row, rowIndex)}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <p aria-live="polite" className="sr-only" id={statusId} role="status">
        {loading
          ? 'Loading rows'
          : isEmpty
            ? 'No rows'
            : `Showing ${rangeStart} to ${rangeEnd} of ${sortedData.length}`}
      </p>

      {paginate && !loading && !isEmpty ? (
        <nav
          aria-label="Pagination"
          className="mt-3 flex flex-wrap items-center justify-between gap-3"
        >
          <span className="text-footnote text-muted-foreground">
            {rangeStart} to {rangeEnd} of {sortedData.length}
          </span>
          <div className="flex items-center gap-2">
            <PUIButton
              aria-label="Previous page"
              disabled={safePage <= 1}
              label="Previous"
              onPress={() => setPage(safePage - 1)}
              size="sm"
              variant="outline"
            />
            <span aria-hidden className="text-footnote text-muted-foreground px-1">
              {safePage} / {pageCount}
            </span>
            <PUIButton
              aria-label="Next page"
              disabled={safePage >= pageCount}
              label="Next"
              onPress={() => setPage(safePage + 1)}
              size="sm"
              variant="outline"
            />
          </div>
        </nav>
      ) : null}
    </div>
  )
}
