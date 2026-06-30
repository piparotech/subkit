// In-memory seam for the reporting-csv-exports Engine: a deterministic ExportsClient standing in for the
// platform's auth-gated `/exports` backend. The Engine normally lists report definitions, POSTs a run
// request with the auth session's bearer, and the server resolves the report's Drizzle query, serializes
// the rows with the CSV engine and stores the bytes keyed to the verified auth subject. Here we hold the
// same report definitions plus a fixed row source per query and run the SAME pure engine (serializeCsv +
// sha256Hex) in the browser, keyed to one demo user, so the audited schema + record contract run
// unchanged with no network.
//
// Seeding: two report definitions exercise every sensitivity treatment. `customers` masks the email and
// excludes the internal note; `revenue` is verbatim. Identical (report, delimiter) input always yields
// the same content hash (AC-2). One export is pre-generated so the history is non-empty on first render.
import {
  type CsvRow,
  type ExportRecord,
  type ExportsClient,
  type ReportDefinition,
  type RunReportRequest,
  parseReportDefinition,
  serializeCsvBytes,
  sha256Hex,
  toCsvColumns,
} from '@/lib/reporting-csv-exports'

export class MockExportsError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
    this.name = 'MockExportsError'
  }
}

/** Parse a known-good definition literal, throwing if a seed ever drifts from the shared schema. */
function seed(input: unknown): ReportDefinition {
  const parsed = parseReportDefinition(input)
  if (!parsed.success) throw new Error('Seeded report definition is invalid')
  return parsed.data
}

/** The report catalog the demo backend exposes (the platform resolves each `query` to a Drizzle query). */
export const SEEDED_REPORTS: ReportDefinition[] = [
  seed({
    id: 'customers',
    title: 'Kundenliste',
    description: 'Aktive Kunden mit maskierter E-Mail; die interne Notiz wird ausgeschlossen.',
    query: 'active-customers',
    columns: [
      { key: 'name', header: 'Name' },
      { key: 'company', header: 'Firma' },
      { key: 'email', header: 'E-Mail', sensitive: 'mask' },
      { key: 'plan', header: 'Tarif' },
      { key: 'note', header: 'Interne Notiz', sensitive: 'exclude' },
    ],
  }),
  seed({
    id: 'revenue',
    title: 'Umsatz nach Segment',
    description: 'Quartalsumsatz je Segment, vollständig verbatim.',
    query: 'revenue-by-segment',
    columns: [
      { key: 'segment', header: 'Segment' },
      { key: 'q1', header: 'Q1 (k EUR)' },
      { key: 'q2', header: 'Q2 (k EUR)' },
      { key: 'trend', header: 'Trend' },
    ],
  }),
]

/** The fixed rows each report's backend query would return (umlauts + a comma exercise the escaping). */
export const ROWS: Record<string, CsvRow[]> = {
  'active-customers': [
    {
      name: 'Anja Müller',
      company: 'Bäckerei Süd, GmbH',
      email: 'anja@baeckerei-sued.de',
      plan: 'Pro',
      note: 'Upsell offen',
    },
    {
      name: 'Tomáš Novák',
      company: 'Grünwald AG',
      email: 'tomas@gruenwald.at',
      plan: 'Team',
      note: 'Referenzkunde',
    },
    {
      name: 'Léa Fischer',
      company: 'Fischer & Söhne',
      email: 'lea@fischer-soehne.ch',
      plan: 'Starter',
      note: 'Pilotphase',
    },
    {
      name: 'Jürgen Weiß',
      company: 'Weiß Logistik',
      email: 'j.weiss@weiss-log.de',
      plan: 'Pro',
      note: 'Vertrag verlängert',
    },
  ],
  'revenue-by-segment': [
    { segment: 'Plattform', q1: '120', q2: '152', trend: 'plus 27%' },
    { segment: 'Beratung', q1: '64', q2: '71', trend: 'plus 11%' },
    { segment: 'Support', q1: '22', q2: '24', trend: 'plus 9%' },
  ],
}

/** The exact rows the mock serializes for a report — the preview reads these so it can never drift. */
export function previewRowsFor(report: ReportDefinition): CsvRow[] {
  return ROWS[report.query] ?? []
}

const delay = (ms = 140) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** A stored export: its metadata plus the rendered bytes (the real server keeps these per auth subject). */
type StoredExport = { record: ExportRecord; bytes: Uint8Array }

/** A deterministic, offline ExportsClient backed by the real CSV engine + an in-memory store. */
export function createMockExportsClient(): ExportsClient {
  const store: StoredExport[] = []
  let sequence = 0

  async function persist(req: Required<Pick<RunReportRequest, 'reportId'>> & RunReportRequest) {
    const def = SEEDED_REPORTS.find((r) => r.id === req.reportId)
    if (!def) throw new MockExportsError(404, 'REPORT_NOT_FOUND')

    const rows = ROWS[def.query] ?? []
    const bytes = serializeCsvBytes(toCsvColumns(def), rows, { delimiter: req.delimiter })
    const contentHash = await sha256Hex(bytes)
    const record: ExportRecord = {
      exportId: `exp_${(++sequence).toString().padStart(4, '0')}`,
      reportId: def.id,
      title: def.title,
      rowCount: rows.length,
      contentHash,
      byteLength: bytes.length,
      createdAt: new Date(2026, 5, 26, 9, sequence).toISOString(),
    }
    store.unshift({ record, bytes })
    return record
  }

  const seeded = persist({ reportId: 'revenue' })

  return {
    async reports() {
      await delay(80)
      return SEEDED_REPORTS
    },

    async run(req) {
      await delay()
      return persist({ ...req, reportId: req.reportId })
    },

    async list() {
      await seeded
      await delay(80)
      return store.map((entry) => entry.record)
    },

    async download(exportId) {
      await seeded
      await delay(80)
      const entry = store.find((item) => item.record.exportId === exportId)
      if (!entry) throw new MockExportsError(404, 'EXPORT_NOT_FOUND')
      return entry.bytes
    },
  }
}
