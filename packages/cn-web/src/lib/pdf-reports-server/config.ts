import { z } from 'zod'

/**
 * The `pdf-reports-server` module's `config.schema` — the contract for `modules[].config` in a
 * Blueprint. The typed, customer/cockpit-facing switch surface: default branding for generated reports,
 * generation limits, and screen copy. Validated by generator-core.
 */

/** Default CI branding applied to a report when the request omits its own (capability AC-4). */
export const DefaultBranding = z.strictObject({
  title: z.string().trim().min(1).max(120).default('piparo Report'),
  subtitle: z.string().trim().max(160).default(''),
  footer: z.string().trim().max(160).default(''),
  logoMonogram: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{1,3}$/, 'Monogram = 1–3 uppercase letters/digits')
    .default('PI'),
})
export type DefaultBranding = z.infer<typeof DefaultBranding>

/** Generation guardrails — protect the render budget (capability AC-5: per-report under 5 s). */
export const ReportLimits = z.strictObject({
  /** Max blocks per report (a hard ceiling on document size → bounded render time). */
  maxBlocks: z.number().int().min(1).max(2000).default(500),
  /** How many of a user's most-recent reports are retained (older ones are pruned). */
  retainPerUser: z.number().int().min(1).max(1000).default(50),
})
export type ReportLimits = z.infer<typeof ReportLimits>

/** Customer-editable copy (the Cockpit may edit these; see pdfReportsConfigRights). */
export const ReportTexts = z.strictObject({
  screenTitle: z.string().default('Berichte'),
  generateButton: z.string().default('Bericht erzeugen'),
  downloadButton: z.string().default('PDF herunterladen'),
  emptyState: z.string().default('Noch keine Berichte erzeugt'),
})
export type ReportTexts = z.infer<typeof ReportTexts>

export const PdfReportsConfig = z.strictObject({
  branding: DefaultBranding.default(() => DefaultBranding.parse({})),
  limits: ReportLimits.default(() => ReportLimits.parse({})),
  texts: ReportTexts.default(() => ReportTexts.parse({})),
})
export type PdfReportsConfig = z.infer<typeof PdfReportsConfig>

/**
 * Rights model ("wer darf bedienen") — per config path: `customer` = editable in the Cockpit,
 * `piparo` = piparo-only.
 */
export type EditableBy = 'piparo' | 'customer'
export const pdfReportsConfigRights: Record<string, EditableBy> = {
  branding: 'customer',
  limits: 'piparo',
  texts: 'customer',
}

/** Parse + validate a pdf-reports-server module config (returns the Zod safeParse result). */
export function parsePdfReportsConfig(input: unknown) {
  return PdfReportsConfig.safeParse(input)
}
