import { z } from 'zod'

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './query'

/**
 * The `data-table-server` module's `config.schema` — the contract for `modules[].config` in a
 * Blueprint. The typed, customer/cockpit-facing switch surface: which columns the table shows, the
 * default sort, the page-size options, and the visible copy. Validated by generator-core.
 */

export const ColumnAlign = z.enum(['start', 'center', 'end'])
export type ColumnAlign = z.infer<typeof ColumnAlign>

/**
 * A column the Shell renders. `field` must match a column the backend projects; `sortable`/
 * `filterable` only enable the UI affordance — the server still enforces its own whitelist (the
 * config can never widen what the server exposes, only narrow what the UI offers).
 */
export const ColumnDef = z.strictObject({
  field: z.string().min(1),
  header: z.string().min(1),
  align: ColumnAlign.default('start'),
  sortable: z.boolean().default(true),
  filterable: z.boolean().default(false),
})
export type ColumnDef = z.infer<typeof ColumnDef>

/** Customer-editable copy (the Cockpit may edit these; see dataTableConfigRights). */
export const DataTableTexts = z.strictObject({
  title: z.string().default('Tabelle'),
  searchPlaceholder: z.string().default('Filtern …'),
  empty: z.string().default('Keine Einträge gefunden'),
  emptyHint: z.string().default('Passen Sie Filter oder Suche an.'),
  errorTitle: z.string().default('Daten konnten nicht geladen werden'),
  retry: z.string().default('Erneut versuchen'),
  loading: z.string().default('Lädt …'),
  previous: z.string().default('Zurück'),
  next: z.string().default('Weiter'),
  pageLabel: z.string().default('Seite {page} von {pageCount}'),
  totalLabel: z.string().default('{total} Einträge'),
})
export type DataTableTexts = z.infer<typeof DataTableTexts>

export const DataTableConfig = z.strictObject({
  /** The columns rendered, in order. At least one is required for a meaningful table. */
  columns: z.array(ColumnDef).min(1),
  /** Initial sort. `field` should be one of `columns[].field`; direction defaults to ascending. */
  defaultSortField: z.string().min(1),
  defaultSortDir: z.enum(['asc', 'desc']).default('asc'),
  pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  /** Page-size choices offered to the user (the first that is <= MAX_PAGE_SIZE wins as default UI). */
  pageSizeOptions: z.array(z.number().int().min(1).max(MAX_PAGE_SIZE)).default([10, 25, 50]),
  texts: DataTableTexts.default(() => DataTableTexts.parse({})),
})
export type DataTableConfig = z.infer<typeof DataTableConfig>

/**
 * Rights model ("wer darf bedienen") — per config path: `customer` = editable in the Cockpit,
 * `piparo` = piparo-only. Columns/sort/pagination shape the data surface (piparo-owned); copy is
 * customer-owned.
 */
export type EditableBy = 'piparo' | 'customer'
export const dataTableConfigRights: Record<string, EditableBy> = {
  columns: 'piparo',
  defaultSortField: 'piparo',
  defaultSortDir: 'piparo',
  pageSize: 'piparo',
  pageSizeOptions: 'piparo',
  texts: 'customer',
}

/** Parse + validate a data-table-server module config (returns the Zod safeParse result). */
export function parseDataTableConfig(input: unknown) {
  return DataTableConfig.safeParse(input)
}
