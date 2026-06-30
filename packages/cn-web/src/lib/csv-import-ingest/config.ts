import { z } from 'zod'

import { TargetSchema } from './mapping'

/**
 * The `csv-import-ingest` module's `config.schema` — the contract for `modules[].config` in a
 * Blueprint. It declares the import target (the entity + its field catalog the import writes into),
 * upload limits, defaults, and the customer-editable wizard copy. Validated by generator-core.
 */

/** Upload constraints the Shell enforces before sending (defence-in-depth; the backend also caps). */
export const UploadLimits = z.strictObject({
  /** Max upload size in bytes (default 5 MiB). */
  maxBytes: z
    .number()
    .int()
    .positive()
    .default(5 * 1024 * 1024),
  /** Max data rows per import run (default 10 000). */
  maxRows: z.number().int().positive().default(10_000),
})
export type UploadLimits = z.infer<typeof UploadLimits>

/** Customer-editable wizard copy (the Cockpit may edit these; see csvImportConfigRights). */
export const ImportTexts = z.strictObject({
  wizardTitle: z.string().default('Daten importieren'),
  uploadStep: z.string().default('Datei hochladen'),
  mappingStep: z.string().default('Spalten zuordnen'),
  previewStep: z.string().default('Vorschau & Prüfung'),
  runButton: z.string().default('Import starten'),
  historyTitle: z.string().default('Import-Verlauf'),
})
export type ImportTexts = z.infer<typeof ImportTexts>

export const CsvImportConfig = z.strictObject({
  /** The entity + field catalog the import writes into (piparo-defined per app). */
  schema: TargetSchema,
  limits: UploadLimits.default(() => UploadLimits.parse({})),
  /** Offer saving/reusing mappings (capability: "wiederverwendbare Mappings persistieren"). */
  allowSavedMappings: z.boolean().default(true),
  texts: ImportTexts.default(() => ImportTexts.parse({})),
})
export type CsvImportConfig = z.infer<typeof CsvImportConfig>

/**
 * Rights model ("wer darf bedienen") — per config path: `customer` = editable in the Cockpit,
 * `piparo` = piparo-only. The target schema + limits are structural (piparo); copy is the customer's.
 */
export type EditableBy = 'piparo' | 'customer'
export const csvImportConfigRights: Record<string, EditableBy> = {
  schema: 'piparo',
  limits: 'piparo',
  allowSavedMappings: 'piparo',
  texts: 'customer',
}

/** Parse + validate a csv-import-ingest module config (returns the Zod safeParse result). */
export function parseCsvImportConfig(input: unknown) {
  return CsvImportConfig.safeParse(input)
}
