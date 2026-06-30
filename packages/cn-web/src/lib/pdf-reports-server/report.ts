import { z } from 'zod'

/**
 * The shared report spec — the single schema validated on BOTH the client (before requesting) and the
 * server (authoritative re-validation). One schema, no drift. A report is a declarative document: an
 * ordered list of blocks (heading, paragraph, table, bar chart) plus the branding the engine stamps on
 * every page. The same spec always renders to the same PDF bytes (see ./pdf.ts) — the determinism
 * contract (capability AC-1).
 */

/** Branding stamped onto every page header/footer (capability AC-4). */
export const ReportBranding = z.strictObject({
  /** Header title (e.g. the customer / company name). */
  title: z.string().trim().min(1).max(120),
  /** Optional second header line (e.g. a report subtitle or department). */
  subtitle: z.string().trim().max(160).nullable().default(null),
  /** Footer line (e.g. a confidentiality notice or address). Page numbers are appended automatically. */
  footer: z.string().trim().max(160).default(''),
  /** Logo monogram drawn in the header corner (1–3 uppercase letters — a vector placeholder for a
   *  customer logo; a raster logo is wired by the host via the rendering options). */
  logoMonogram: z
    .string()
    .trim()
    .regex(/^[A-Z0-9]{1,3}$/, 'Monogram = 1–3 uppercase letters/digits')
    .default('PI'),
})
export type ReportBranding = z.infer<typeof ReportBranding>

const HeadingBlock = z.strictObject({
  type: z.literal('heading'),
  text: z.string().trim().min(1).max(200),
  /** 1 = section title, 2 = subsection. */
  level: z.union([z.literal(1), z.literal(2)]).default(1),
})

const ParagraphBlock = z.strictObject({
  type: z.literal('paragraph'),
  text: z.string().trim().min(1).max(4000),
})

const TableBlock = z.strictObject({
  type: z.literal('table'),
  columns: z.array(z.string().trim().max(60)).min(1).max(6),
  rows: z.array(z.array(z.string().trim().max(120)).min(1).max(6)).max(200),
})

/** A bar chart, rendered as deterministic vector path operators — print-ready (capability AC-2). */
const BarChartBlock = z.strictObject({
  type: z.literal('barChart'),
  title: z.string().trim().max(120).default(''),
  series: z
    .array(
      z.strictObject({
        label: z.string().trim().min(1).max(40),
        value: z.number().finite().nonnegative(),
      }),
    )
    .min(1)
    .max(24),
})

export const ReportBlock = z.discriminatedUnion('type', [
  HeadingBlock,
  ParagraphBlock,
  TableBlock,
  BarChartBlock,
])
export type ReportBlock = z.infer<typeof ReportBlock>

const ReportSpecInput = z.strictObject({
  /** Document title — also the PDF `/Title` metadata and the first page heading. */
  title: z.string().trim().min(1).max(200),
  /** Two-letter language hint, drives nothing in the engine but is recorded for auditing/i18n. */
  language: z
    .string()
    .trim()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Language like "de" or "de-DE"')
    .default('de'),
  /** Omit to derive branding from the document title (subtitle/footer/monogram take their defaults). */
  branding: ReportBranding.optional(),
  blocks: z.array(ReportBlock).min(1).max(500),
})

export const ReportSpec = ReportSpecInput.transform((spec) => ({
  ...spec,
  // No explicit branding → stamp the document title in the header (clamped to the branding title limit).
  branding: spec.branding ?? ReportBranding.parse({ title: spec.title.slice(0, 120) }),
}))
export type ReportSpec = z.infer<typeof ReportSpec>

/** Validate a report spec (client pre-check + server authoritative). */
export function parseReportSpec(input: unknown) {
  return ReportSpec.safeParse(input)
}

/** The response shape when a report's metadata is read back (the bytes are fetched separately). */
export const ReportRecord = z.strictObject({
  reportId: z.string(),
  title: z.string(),
  language: z.string(),
  /** Lowercase hex SHA-256 of the generated PDF bytes — the determinism fingerprint (AC-1). */
  contentHash: z.string(),
  byteLength: z.number().int().nonnegative(),
  pageCount: z.number().int().positive(),
  createdAt: z.string(),
})
export type ReportRecord = z.infer<typeof ReportRecord>
