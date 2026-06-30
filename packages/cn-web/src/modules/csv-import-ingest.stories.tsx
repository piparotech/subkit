import { useMemo, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIBadge, PUIButton, PUISegmentedControl, PUISelect, PUIText } from '@/components/ui'
import {
  type ColumnMapping,
  type ImportJobSummary,
  type ImportPreview,
  type ImportResult,
  type PreviewRow,
  type TargetField,
  applyMapping,
  buildPreview,
  parseTable,
  suggestMapping,
  upsertableRows,
} from '@/lib/csv-import-ingest'

import {
  PRODUCT_TARGET,
  SAMPLE_FILES,
  type SampleFile,
  createMockImportClient,
} from './mock-csv-import-ingest'

const UNMAPPED = '__none__'

const fieldTypeLabel: Record<TargetField['type'], string> = {
  string: 'Text',
  number: 'Number',
  integer: 'Integer',
  boolean: 'Boolean',
  email: 'Email',
  date: 'Date',
}

function rowStatus(row: PreviewRow): {
  label: string
  variant: 'success' | 'warning' | 'destructive'
} {
  if (row.errors.length > 0) return { label: 'invalid', variant: 'destructive' }
  if (row.duplicateOf !== null)
    return { label: `duplicate of #${row.duplicateOf}`, variant: 'warning' }
  return { label: 'valid', variant: 'success' }
}

/** The source headers offered per target field, plus the explicit "skip" option. */
function MappingEditor({
  headers,
  fields,
  mapping,
  onChange,
}: {
  headers: string[]
  fields: TargetField[]
  mapping: ColumnMapping
  onChange: (fieldKey: string, header: string | null) => void
}) {
  const options = [
    { label: 'Do not import', value: UNMAPPED },
    ...headers.map((header) => ({ label: header, value: header })),
  ]
  return (
    <ul className="flex flex-col gap-3">
      {fields.map((field) => (
        <li
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-4"
          key={field.key}
        >
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-2">
              <PUIText className="truncate font-medium" variant="footnote">
                {field.label}
              </PUIText>
              {field.required ? <PUIBadge variant="outline">required</PUIBadge> : null}
              {field.key_field ? <PUIBadge variant="info">key</PUIBadge> : null}
            </div>
            <PUIText className="font-mono" tone="subtle" variant="caption2">
              {field.key} · {fieldTypeLabel[field.type]}
            </PUIText>
          </div>
          <PUISelect
            onValueChange={(value) => onChange(field.key, value === UNMAPPED ? null : value)}
            options={options}
            value={mapping[field.key] ?? UNMAPPED}
          />
        </li>
      ))}
    </ul>
  )
}

/** The preview table: one row per data record, valid coerced values or the row-precise reason. */
function PreviewTable({ preview, fields }: { preview: ImportPreview; fields: TargetField[] }) {
  const labelOf = (key: string | null) =>
    fields.find((field) => field.key === key)?.label ?? key ?? 'row'
  return (
    <div className="border-border overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-border bg-muted/40 border-b">
            <th className="text-muted-foreground px-3 py-2 text-xs font-medium">#</th>
            <th className="text-muted-foreground px-3 py-2 text-xs font-medium">Status</th>
            {fields.map((field) => (
              <th className="text-muted-foreground px-3 py-2 text-xs font-medium" key={field.key}>
                {field.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.rows.map((row) => {
            const status = rowStatus(row)
            const reason = row.errors[0]
            return (
              <tr className="border-border/60 border-b last:border-b-0" key={row.rowNumber}>
                <td className="text-muted-foreground px-3 py-2 font-mono text-xs">
                  {row.rowNumber}
                </td>
                <td className="px-3 py-2">
                  <PUIBadge variant={status.variant}>{status.label}</PUIBadge>
                </td>
                {reason ? (
                  <td className="text-destructive px-3 py-2 text-xs" colSpan={fields.length}>
                    {labelOf(reason.field)}: {reason.message}
                  </td>
                ) : (
                  fields.map((field) => (
                    <td className="text-foreground px-3 py-2 text-xs" key={field.key}>
                      {formatValue(row.values[field.key])}
                    </td>
                  ))
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '·'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

function CsvImportIngestDemo() {
  const client = useMemo(() => createMockImportClient(), [])
  const fields = PRODUCT_TARGET.fields
  const labelOf = (key: string | null) =>
    fields.find((field) => field.key === key)?.label ?? key ?? 'row'

  const [fileId, setFileId] = useState<string>(SAMPLE_FILES[0]?.id ?? '')
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [history, setHistory] = useState<ImportJobSummary[]>([])

  const file = useMemo<SampleFile | undefined>(
    () => SAMPLE_FILES.find((entry) => entry.id === fileId),
    [fileId],
  )

  // The pure Engine: sniff format + delimiter, then parse the uploaded text into an aligned table.
  const table = useMemo(() => (file ? parseTable(file.text) : null), [file])

  // Re-suggest the column mapping whenever a new file is loaded, then let the user override per field.
  const effectiveMapping = useMemo<ColumnMapping>(() => {
    if (!table) return {}
    const suggested = suggestMapping(table, PRODUCT_TARGET)
    return { ...suggested, ...mapping }
  }, [table, mapping])

  // Map → validate → preview, all client-side and identical to the server's authoritative re-run.
  const preview = useMemo<ImportPreview | null>(() => {
    if (!table) return null
    return buildPreview(applyMapping(table, effectiveMapping), PRODUCT_TARGET)
  }, [table, effectiveMapping])

  function onSelectFile(id: string) {
    setFileId(id)
    setMapping({})
    setResult(null)
  }

  function onMap(fieldKey: string, header: string | null) {
    setMapping((prev) => ({ ...prev, [fieldKey]: header }))
  }

  async function onRun() {
    if (!preview) return
    setRunning(true)
    try {
      const errors = preview.rows
        .filter((row) => row.errors.length > 0)
        .map((row) => ({
          rowNumber: row.rowNumber,
          field: row.errors[0]?.field ?? null,
          message: row.errors[0]?.message ?? 'Invalid row',
        }))
      const runResult = await client.run({
        target: PRODUCT_TARGET.target,
        rows: upsertableRows(preview),
      })
      setResult({ ...runResult, errors })
      setHistory(await client.history())
    } finally {
      setRunning(false)
    }
  }

  const writableCount = preview ? preview.validCount : 0

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <PUIText as="h2" className="tracking-tight" variant="title3">
            Import wizard
          </PUIText>
          <PUIText className="max-w-prose" tone="muted" variant="subheadline">
            Load a source file, confirm how its columns map onto the product schema, then write the
            valid rows. The same pure engine parses, validates and previews the file here as the
            server does before it commits.
          </PUIText>
        </div>

        <div className="flex flex-col gap-2">
          <PUIText as="label" className="font-medium" variant="footnote">
            Source file
          </PUIText>
          <PUISegmentedControl
            onValueChange={onSelectFile}
            options={SAMPLE_FILES.map((entry) => ({ value: entry.id, label: entry.label }))}
            value={fileId}
          />
          {file ? (
            <PUIText className="max-w-prose" tone="subtle" variant="caption1">
              {file.description}
            </PUIText>
          ) : null}
        </div>

        {table ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <PUIText className="font-medium" variant="footnote">
                Column mapping
              </PUIText>
              <PUIText className="font-mono" tone="subtle" variant="caption2">
                {table.format} · {table.headers.length} columns
              </PUIText>
            </div>
            <MappingEditor
              fields={fields}
              headers={table.headers}
              mapping={effectiveMapping}
              onChange={onMap}
            />
          </div>
        ) : null}

        <PUIButton
          disabled={writableCount === 0}
          fullWidth
          loading={running}
          onPress={() => void onRun()}
        >
          Import {writableCount} {writableCount === 1 ? 'row' : 'rows'}
        </PUIButton>
      </div>

      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <PUIText as="h2" className="tracking-tight" variant="headline">
              Preview
            </PUIText>
            {preview ? (
              <div className="flex items-center gap-2">
                <PUIBadge variant="success">{preview.validCount} valid</PUIBadge>
                {preview.duplicateCount > 0 ? (
                  <PUIBadge variant="warning">{preview.duplicateCount} duplicate</PUIBadge>
                ) : null}
                {preview.invalidCount > 0 ? (
                  <PUIBadge variant="destructive">{preview.invalidCount} invalid</PUIBadge>
                ) : null}
              </div>
            ) : null}
          </div>
          {preview ? <PreviewTable fields={fields} preview={preview} /> : null}
          <PUIText className="max-w-prose" tone="subtle" variant="caption1">
            Invalid rows are skipped, never aborting the run. Duplicates within the batch are
            collapsed by the natural key, and re-importing a known SKU updates the row instead of
            inserting it.
          </PUIText>
        </section>

        {result ? (
          <section className="flex flex-col gap-3">
            <PUIText as="h2" className="tracking-tight" variant="headline">
              Last run
            </PUIText>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <ResultStat label="inserted" value={result.inserted} />
              <ResultStat label="updated" value={result.updated} />
              <ResultStat label="skipped" value={result.skipped} />
              <PUIText className="font-mono" tone="subtle" variant="caption2">
                {result.jobId}
              </PUIText>
            </div>
            {result.errors.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {result.errors.map((error) => (
                  <li className="text-destructive text-xs" key={error.rowNumber}>
                    Row {error.rowNumber} skipped: {labelOf(error.field)}: {error.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {history.length > 0 ? (
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <PUIText as="h2" className="tracking-tight" variant="headline">
                History
              </PUIText>
              <PUIText tone="subtle" variant="caption2">
                newest first
              </PUIText>
            </div>
            <ul className="divide-border divide-y">
              {history.map((job) => (
                <li className="flex items-center justify-between gap-4 py-2" key={job.jobId}>
                  <PUIText className="font-mono" tone="muted" variant="caption2">
                    {job.jobId}
                  </PUIText>
                  <PUIText tone="muted" variant="caption2">
                    {job.inserted} inserted · {job.updated} updated · {job.skipped} skipped
                  </PUIText>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}

function ResultStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <PUIText className="font-semibold tabular-nums" variant="headline">
        {value}
      </PUIText>
      <PUIText tone="muted" variant="caption1">
        {label}
      </PUIText>
    </div>
  )
}

const meta = {
  title: 'Modules/Data & CSV Import',
  component: CsvImportIngestDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Bring legacy and third-party data into a system under control: guided upload with column mapping, validation and preview, followed by an idempotent upsert with a per-row error log, on the isomorphic csv-import-ingest Engine. In-memory demo: a product target schema (SKU as the natural key) is seeded with three source files. Try the clean semicolon CSV, the comma file that reuses two SKUs and adds an invalid row, and the JSON export with differently named keys; adjust the auto-suggested mapping, watch the live preview flag valid, duplicate and invalid rows, then import to see inserted versus updated counts and the run history.',
      },
    },
  },
} satisfies Meta<typeof CsvImportIngestDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
