import { z } from 'zod'

import { ReportDefinition } from './report-def'

/**
 * The `reporting-csv-exports` module's `config.schema` — the contract for `modules[].config` in a
 * Blueprint. The typed, customer/cockpit-facing switch surface: which report definitions exist, the CSV
 * output defaults (delimiter, BOM), generation guardrails, and screen copy. Validated by generator-core.
 */

/** CSV output defaults applied to every export unless the run request overrides them (AC-4). */
export const CsvDefaults = z.strictObject({
  /** Field delimiter (`,` default; `;` is friendlier for Excel-DE). */
  delimiter: z.enum([',', ';', '\t', '|']).default(','),
  /** Prepend a UTF-8 BOM so Excel detects UTF-8 and renders umlauts correctly (AC-4). */
  bom: z.boolean().default(true),
  /** The mask token written for `sensitive: 'mask'` columns (AC-3). */
  maskToken: z.string().trim().min(1).max(16).default('***'),
})
export type CsvDefaults = z.infer<typeof CsvDefaults>

/** Generation guardrails — bound the export size and how many runs are retained per user. */
export const ExportLimits = z.strictObject({
  /** Hard ceiling on rows per export (a bounded query keeps runs fast). */
  maxRows: z.number().int().min(1).max(1_000_000).default(50_000),
  /** How many of a user's most-recent exports are retained (older ones are pruned). */
  retainPerUser: z.number().int().min(1).max(1000).default(50),
})
export type ExportLimits = z.infer<typeof ExportLimits>

/** Customer-editable copy (the Cockpit may edit these; see reportingCsvExportsConfigRights). */
export const ExportTexts = z.strictObject({
  screenTitle: z.string().default('Reports & Exporte'),
  runButton: z.string().default('Report ausführen'),
  downloadButton: z.string().default('CSV herunterladen'),
  emptyState: z.string().default('Noch keine Exporte erzeugt'),
})
export type ExportTexts = z.infer<typeof ExportTexts>

export const ReportingCsvExportsConfig = z.strictObject({
  /** The catalog of report definitions exposed to this app (the backend resolves each `query`). */
  reports: z.array(ReportDefinition).max(200).default([]),
  csv: CsvDefaults.default(() => CsvDefaults.parse({})),
  limits: ExportLimits.default(() => ExportLimits.parse({})),
  texts: ExportTexts.default(() => ExportTexts.parse({})),
})
export type ReportingCsvExportsConfig = z.infer<typeof ReportingCsvExportsConfig>

/**
 * Rights model ("wer darf bedienen") — per config path: `customer` = editable in the Cockpit,
 * `piparo` = piparo-only.
 */
export type EditableBy = 'piparo' | 'customer'
export const reportingCsvExportsConfigRights: Record<string, EditableBy> = {
  // Report definitions bind to backend queries → piparo owns the catalog.
  reports: 'piparo',
  // Excel formatting + masking conventions are customer-facing choices.
  csv: 'customer',
  // Limits protect the runtime budget → piparo.
  limits: 'piparo',
  texts: 'customer',
}

/** Parse + validate a reporting-csv-exports module config (returns the Zod safeParse result). */
export function parseReportingCsvExportsConfig(input: unknown) {
  return ReportingCsvExportsConfig.safeParse(input)
}
