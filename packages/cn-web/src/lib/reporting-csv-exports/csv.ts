/**
 * The deterministic CSV serializer (Engine) — the pure heart of the `reporting-csv-exports` capability.
 * Turns a fixed column definition + ordered rows into RFC-4180 CSV text and bytes. Pure and isomorphic
 * (no Node/bun/DOM APIs): the same engine runs in the browser preview, the Shell, and the backend's
 * authoritative serialization, so the output never drifts between surfaces.
 *
 * Pinned capability properties:
 *  - Determinism (AC-2): the bytes are a pure function of (columns, rows, options). Identical input
 *    yields identical bytes, byte-for-byte. No clock, no locale, no map-iteration order.
 *  - Excel/Umlaut safety (AC-4): a UTF-8 BOM is prepended by default and CRLF line endings are used,
 *    so Excel opens the file as UTF-8 and umlauts/special characters render correctly.
 *  - Sensitive-field handling (AC-3): columns marked `sensitive: 'mask'` are masked and
 *    `sensitive: 'exclude'` columns are dropped from the output entirely.
 */

/** How a column's values are treated in the export. */
export type CellSensitivity = 'none' | 'mask' | 'exclude'

/** A single output column: which row key it reads, its header label, and its sensitivity treatment. */
export type CsvColumn = {
  /** The row-object key this column reads. */
  key: string
  /** The header label written to the first CSV line (defaults to `key`). */
  header?: string
  /** `none` (default) = verbatim · `mask` = redacted in output · `exclude` = omitted from output. */
  sensitive?: CellSensitivity
}

export type CsvOptions = {
  /** Field delimiter (default `,`). Excel-DE users often prefer `;`. */
  delimiter?: string
  /** Prepend a UTF-8 BOM so Excel detects UTF-8 (default true — AC-4). */
  bom?: boolean
  /** Line terminator (default CRLF, the RFC-4180 + Excel convention). */
  newline?: '\r\n' | '\n'
  /** The mask token written for `sensitive: 'mask'` columns (default `***`). */
  maskToken?: string
}

/** A row is a flat record of cell values; non-string values are stringified deterministically. */
export type CsvRow = Record<string, unknown>

export const UTF8_BOM = '﻿'

const DEFAULTS = {
  delimiter: ',',
  bom: true,
  newline: '\r\n' as const,
  maskToken: '***',
}

/** The columns that actually reach the output (everything except `sensitive: 'exclude'`). */
export function outputColumns(columns: CsvColumn[]): CsvColumn[] {
  return columns.filter((c) => c.sensitive !== 'exclude')
}

/** Deterministic cell stringification: null/undefined → '', objects → stable JSON, everything else → String. */
export function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'bigint') {
    return String(value)
  }
  if (value instanceof Date) return value.toISOString()
  return JSON.stringify(value)
}

/**
 * Escape one field per RFC-4180: wrap in double quotes and double any embedded quote when the value
 * contains the delimiter, a quote, or a CR/LF.
 */
// eslint-disable-next-line no-control-regex
const NEEDS_QUOTING = /[",\x0d\x0a]/

export function escapeField(value: string, delimiter: string): string {
  const mustQuote = value.includes(delimiter) || NEEDS_QUOTING.test(value)
  if (!mustQuote) return value
  return `"${value.replace(/"/g, '""')}"`
}

/** Render the cell value for a column, applying mask treatment (exclude is handled by `outputColumns`). */
function renderCell(column: CsvColumn, row: CsvRow, maskToken: string): string {
  if (column.sensitive === 'mask') return maskToken
  return stringifyCell(row[column.key])
}

/** Serialize columns + rows into deterministic RFC-4180 CSV text (with BOM by default). */
export function serializeCsv(columns: CsvColumn[], rows: CsvRow[], opts: CsvOptions = {}): string {
  const o = { ...DEFAULTS, ...opts }
  const cols = outputColumns(columns)

  const headerLine = cols.map((c) => escapeField(c.header ?? c.key, o.delimiter)).join(o.delimiter)

  const dataLines = rows.map((row) =>
    cols.map((c) => escapeField(renderCell(c, row, o.maskToken), o.delimiter)).join(o.delimiter),
  )

  const body = [headerLine, ...dataLines].join(o.newline)
  return (o.bom ? UTF8_BOM : '') + body
}

/** Serialize to UTF-8 bytes — what the backend streams as the downloadable `text/csv` payload. */
export function serializeCsvBytes(
  columns: CsvColumn[],
  rows: CsvRow[],
  opts: CsvOptions = {},
): Uint8Array {
  return new TextEncoder().encode(serializeCsv(columns, rows, opts))
}

/** Lowercase-hex SHA-256 of the bytes — the determinism fingerprint (AC-2). Uses Web Crypto. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}
