// In-memory seam for the pdf-reports-server Engine: a deterministic ReportsClient standing in for the
// platform's auth-gated `/reports` backend. The Engine normally POSTs a spec with the auth session's
// bearer and the server renders + stores the PDF; here we run the SAME deterministic writer
// (renderReport) and fingerprint (sha256Hex) in the browser, keyed to one demo user, so the audited
// schema + record contract run unchanged with no network.
//
// Seeded set mirrors the native showcase so both tell the same story: one ready-made quarterly report
// (heading, paragraph, table, bar chart) the visitor can list and download immediately, plus retained
// history. Generating a report re-validates the spec against the shared schema, renders bytes and
// returns a ReportRecord with the determinism hash; an empty title is rejected before render.
import {
  type ReportRecord,
  type ReportSpec,
  type ReportsClient,
  parseReportSpec,
  renderReport,
  sha256Hex,
} from '@/lib/pdf-reports-server'

export class MockReportsError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
    this.name = 'MockReportsError'
  }
}

/** A stored report: its metadata plus the rendered bytes (the real server keeps these on disk). */
type StoredReport = { record: ReportRecord; bytes: Uint8Array }

/** Parse a known-good spec literal, throwing if the seed ever drifts from the schema. */
function seed(input: unknown): ReportSpec {
  const parsed = parseReportSpec(input)
  if (!parsed.success) throw new Error('Seeded report spec is invalid')
  return parsed.data
}

/** The quarterly report seeded into the demo store, exercising every block type the engine supports. */
export const SEEDED_SPEC: ReportSpec = seed({
  title: 'Quartalsbericht Q2 2026',
  language: 'de',
  branding: {
    title: 'piparo Analytics',
    subtitle: 'Vertraulich, nur fuer interne Verteilung',
    footer: 'piparo GmbH, generiert am Stichtag',
    logoMonogram: 'PA',
  },
  blocks: [
    { type: 'heading', text: 'Zusammenfassung', level: 1 },
    {
      type: 'paragraph',
      text: 'Der Umsatz wuchs gegenueber dem Vorquartal um 18 Prozent. Wiederkehrende Erloese tragen erstmals mehr als die Haelfte des Gesamtumsatzes und stabilisieren die Planung fuer das zweite Halbjahr.',
    },
    { type: 'heading', text: 'Umsatz nach Segment', level: 2 },
    {
      type: 'table',
      columns: ['Segment', 'Q1', 'Q2', 'Trend'],
      rows: [
        ['Plattform', '120k', '152k', 'plus 27%'],
        ['Beratung', '64k', '71k', 'plus 11%'],
        ['Support', '22k', '24k', 'plus 9%'],
      ],
    },
    {
      type: 'barChart',
      title: 'Neukunden pro Monat',
      series: [
        { label: 'Apr', value: 14 },
        { label: 'Mai', value: 19 },
        { label: 'Jun', value: 23 },
      ],
    },
  ],
})

const delay = (ms = 160) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** A deterministic, offline ReportsClient backed by the real engine + an in-memory store. */
export function createMockReportsClient(): ReportsClient {
  const store: StoredReport[] = []
  let sequence = 0

  async function persist(spec: ReportSpec): Promise<ReportRecord> {
    const { bytes, pageCount } = renderReport(spec)
    const contentHash = await sha256Hex(bytes)
    const record: ReportRecord = {
      reportId: `rpt_${(++sequence).toString().padStart(4, '0')}`,
      title: spec.title,
      language: spec.language,
      contentHash,
      byteLength: bytes.length,
      pageCount,
      createdAt: new Date(2026, 5, 26, 9, sequence).toISOString(),
    }
    store.unshift({ record, bytes })
    return record
  }

  const seeded = persist(SEEDED_SPEC)

  return {
    async generate(spec) {
      const parsed = parseReportSpec(spec)
      if (!parsed.success) {
        await delay(60)
        throw new MockReportsError(422, 'INVALID_SPEC')
      }
      await delay()
      return persist(parsed.data)
    },

    async list() {
      await seeded
      await delay(80)
      return store.map((entry) => entry.record)
    },

    async download(reportId) {
      await seeded
      await delay(80)
      const entry = store.find((item) => item.record.reportId === reportId)
      if (!entry) throw new MockReportsError(404, 'NOT_FOUND')
      return entry.bytes
    },
  }
}
