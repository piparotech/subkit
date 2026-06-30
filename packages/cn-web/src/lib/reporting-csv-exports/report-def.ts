import { z } from 'zod'

import type { CsvColumn } from './csv'

/**
 * The shared report-definition schema — the contract for "which reports exist and what columns they
 * emit", validated identically on the client (before requesting) and the server (authoritative). One
 * schema, no drift.
 *
 * A report definition is a named, declarative spec: an id, a human title, the ordered output columns
 * (each with its sensitivity treatment), and which backend query feeds it. The actual SQL/Drizzle query
 * lives in the backend registry keyed by `query` — the definition is the safe, serializable surface the
 * client and Cockpit see (it never carries SQL).
 */

/** Per-column sensitivity treatment (mirrors csv.ts `CellSensitivity`). */
export const Sensitivity = z.enum(['none', 'mask', 'exclude'])
export type Sensitivity = z.infer<typeof Sensitivity>

export const ReportColumn = z.strictObject({
  /** The query-result key this column reads. */
  key: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'key must be an identifier'),
  /** The header label written to the CSV (defaults to `key` when omitted). */
  header: z.string().trim().min(1).max(120).optional(),
  /** `none` = verbatim · `mask` = redacted · `exclude` = omitted from output (AC-3). */
  sensitive: Sensitivity.default('none'),
})
export type ReportColumn = z.infer<typeof ReportColumn>

export const ReportDefinition = z.strictObject({
  /** Stable report id (referenced in run requests and CSV file names). */
  id: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9-]*$/, 'id must be kebab-case'),
  /** Human-readable report name shown in the Shell picker. */
  title: z.string().trim().min(1).max(120),
  /** Optional one-line description. */
  description: z.string().trim().max(240).default(''),
  /** The backend query key that produces this report's rows (resolved by the backend registry). */
  query: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9-]*$/, 'query must be kebab-case'),
  /** Ordered output columns. */
  columns: z.array(ReportColumn).min(1).max(64),
})
export type ReportDefinition = z.infer<typeof ReportDefinition>

/** Validate a single report definition. */
export function parseReportDefinition(input: unknown) {
  return ReportDefinition.safeParse(input)
}

/** Map a validated definition's columns to the CSV engine's column shape. */
export function toCsvColumns(def: ReportDefinition): CsvColumn[] {
  return def.columns.map((c) => ({
    key: c.key,
    ...(c.header ? { header: c.header } : {}),
    sensitive: c.sensitive,
  }))
}

/** A run request: which report, optional CSV formatting overrides. */
export const RunReportRequest = z.strictObject({
  reportId: z.string().trim().min(1).max(64),
  /** Field delimiter override (`,` default; `;` for Excel-DE). */
  delimiter: z.enum([',', ';', '\t', '|']).optional(),
})
export type RunReportRequest = z.infer<typeof RunReportRequest>

/** The metadata returned when a report run completes (the CSV bytes are fetched separately). */
export const ExportRecord = z.strictObject({
  exportId: z.string(),
  reportId: z.string(),
  title: z.string(),
  rowCount: z.number().int().nonnegative(),
  /** Lowercase hex SHA-256 of the generated CSV bytes — the determinism fingerprint (AC-2). */
  contentHash: z.string(),
  byteLength: z.number().int().nonnegative(),
  createdAt: z.string(),
})
export type ExportRecord = z.infer<typeof ExportRecord>
