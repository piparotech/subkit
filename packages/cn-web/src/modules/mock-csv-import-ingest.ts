// In-memory seam for the csv-import-ingest Engine: a deterministic ImportClient standing in for the
// platform's auth-gated /imports backend. Parsing, column mapping, type validation and the preview are
// PURE (parse.ts / mapping.ts / validate.ts) and run unchanged in the browser; the real client only
// talks to the server for the authoritative write, the per-row error log and reusable mappings. Here an
// in-memory store performs the SAME idempotent upsert keyed by each row's natural-key hash, so re-running
// an import updates instead of inserting (AC-5) and never owns auth state.
//
// Seeding: one target schema (a product catalog) with two natural-key fields (sku). Three sample source
// files exercise the Engine: a clean semicolon CSV with German umlauts, a comma CSV that reuses two SKUs
// (idempotent re-import) and adds one invalid row, and a JSON export with differently named keys (the
// auto-mapper still resolves them). One prior import sits in the history so it is non-empty on first run.
import {
  type ColumnMapping,
  type ImportClient,
  type ImportJobSummary,
  type ImportResult,
  type RowError,
  type RunImportInput,
  type SavedMapping,
  type TargetSchema,
} from '@/lib/csv-import-ingest'

/** The entity the import writes into. `sku` is the natural key, so re-imports collapse by SKU. */
export const PRODUCT_TARGET: TargetSchema = {
  target: 'products',
  fields: [
    { key: 'sku', label: 'Artikelnummer', type: 'string', required: true, key_field: true },
    { key: 'name', label: 'Bezeichnung', type: 'string', required: true, key_field: false },
    { key: 'price', label: 'Preis', type: 'number', required: true, key_field: false },
    { key: 'stock', label: 'Bestand', type: 'integer', required: false, key_field: false },
    { key: 'active', label: 'Aktiv', type: 'boolean', required: false, key_field: false },
    { key: 'email', label: 'Lieferant', type: 'email', required: false, key_field: false },
  ],
}

/** A selectable source file the demo can load into the wizard, mirroring an uploaded file. */
export type SampleFile = {
  id: string
  label: string
  description: string
  text: string
}

export const SAMPLE_FILES: SampleFile[] = [
  {
    id: 'catalog-semicolon',
    label: 'katalog.csv',
    description: 'Semicolon delimited, German umlauts, all rows valid.',
    text: [
      'Artikelnummer;Bezeichnung;Preis;Bestand;Aktiv;Lieferant',
      'A-100;Büro-Stuhl Köln;129,90;42;ja;einkauf@moebel-sued.de',
      'A-101;Tisch "Lärche";249,00;8;ja;einkauf@moebel-sued.de',
      'A-102;Regal Größe L;89,50;0;nein;einkauf@moebel-sued.de',
      'A-103;Lampe Süd;34,95;120;ja;',
    ].join('\n'),
  },
  {
    id: 'reimport-comma',
    label: 'nachlieferung.csv',
    description: 'Comma delimited, reuses two SKUs (idempotent) and contains one invalid row.',
    text: [
      'sku,name,price,stock,active,email',
      'A-101,Tisch Lärche überarbeitet,259.00,15,yes,',
      'A-104,Beistelltisch,59.00,30,yes,nachschub@holzwerk.de',
      'A-102,Regal Größe L,89.50,5,no,',
      'A-105,Defektzeile,nicht-numerisch,,ja,keine-email',
    ].join('\n'),
  },
  {
    id: 'export-json',
    label: 'export.json',
    description: 'JSON array with differently named keys; the auto-mapper still resolves them.',
    text: JSON.stringify(
      [
        {
          Artikelnummer: 'A-200',
          Bezeichnung: 'Monitor 27"',
          Preis: 199,
          Bestand: 17,
          Aktiv: true,
        },
        { Artikelnummer: 'A-201', Bezeichnung: 'Tastatur', Preis: 49.9, Bestand: 64, Aktiv: true },
      ],
      null,
      2,
    ),
  },
]

const SEEDED_MAPPING: SavedMapping = {
  name: 'Standard-Katalog',
  target: 'products',
  mapping: {
    sku: 'Artikelnummer',
    name: 'Bezeichnung',
    price: 'Preis',
    stock: 'Bestand',
    active: 'Aktiv',
    email: 'Lieferant',
  },
}

export class MockImportError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
    this.name = 'MockImportError'
  }
}

const delay = (ms = 160) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** A persisted row in the demo's product table, identified by its idempotency hash. */
type StoredRow = { keyHash: string; values: Record<string, unknown> }

/**
 * A deterministic, offline ImportClient backed by an in-memory product table. `run` upserts by
 * `keyHash`: a known hash updates the existing row, an unknown one inserts. The same input therefore
 * stays idempotent across runs, exactly as the audited backend behaves.
 */
export function createMockImportClient(): ImportClient {
  const table = new Map<string, StoredRow>()
  const jobs: ImportJobSummary[] = []
  const jobErrorLog = new Map<string, RowError[]>()
  const mappings: SavedMapping[] = [SEEDED_MAPPING]
  let sequence = 0

  function persist(input: RunImportInput, errors: RowError[]): ImportResult {
    let inserted = 0
    let updated = 0
    for (const row of input.rows) {
      if (table.has(row.keyHash)) updated++
      else inserted++
      table.set(row.keyHash, { keyHash: row.keyHash, values: row.values })
    }
    const jobId = `job_${(++sequence).toString().padStart(4, '0')}`
    const result: ImportResult = {
      jobId,
      target: input.target,
      inserted,
      updated,
      skipped: errors.length,
      errors,
    }
    jobs.unshift({
      jobId,
      target: input.target,
      inserted,
      updated,
      skipped: errors.length,
      errorCount: errors.length,
      createdAt: new Date(2026, 5, 26, 9, sequence).toISOString(),
    })
    jobErrorLog.set(jobId, errors)
    return result
  }

  // Seed one prior run so the history is non-empty: import the clean catalog once.
  persist(
    {
      target: 'products',
      rows: [
        { keyHash: 'seed-a100', values: { sku: 'A-100', name: 'Büro-Stuhl Köln', price: 129.9 } },
        { keyHash: 'seed-a101', values: { sku: 'A-101', name: 'Tisch "Lärche"', price: 249 } },
        { keyHash: 'seed-a102', values: { sku: 'A-102', name: 'Regal Größe L', price: 89.5 } },
        { keyHash: 'seed-a103', values: { sku: 'A-103', name: 'Lampe Süd', price: 34.95 } },
      ],
    },
    [],
  )

  return {
    async run(input) {
      await delay()
      return persist(input, [])
    },

    async history() {
      await delay(80)
      return jobs
    },

    async jobErrors(jobId) {
      await delay(80)
      return jobErrorLog.get(jobId) ?? []
    },

    async listMappings(target) {
      await delay(80)
      return mappings.filter((mapping) => mapping.target === target)
    },

    async saveMapping(name: string, target: string, mapping: ColumnMapping) {
      await delay(80)
      const saved: SavedMapping = { name, target, mapping }
      const index = mappings.findIndex((m) => m.name === name && m.target === target)
      if (index >= 0) mappings[index] = saved
      else mappings.push(saved)
      return saved
    },

    async deleteMapping(name: string, target: string) {
      await delay(80)
      const index = mappings.findIndex((m) => m.name === name && m.target === target)
      if (index >= 0) mappings.splice(index, 1)
    },
  }
}
