import { useEffect, useMemo, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIBadge, PUIButton, PUISegmentedControl, PUIText } from '@/components/ui'
import {
  type ExportRecord,
  type ExportsClient,
  type ReportDefinition,
  type Sensitivity,
  outputColumns,
  serializeCsv,
  toCsvColumns,
} from '@/lib/reporting-csv-exports'

import { createMockExportsClient, previewRowsFor } from './mock-reporting-csv-exports'

type Delimiter = ',' | ';' | '\t' | '|'

const delimiterOptions: { value: Delimiter; label: string }[] = [
  { value: ',', label: 'Comma' },
  { value: ';', label: 'Semicolon' },
  { value: '\t', label: 'Tab' },
  { value: '|', label: 'Pipe' },
]

const sensitivityBadge: Record<
  Sensitivity,
  { label: string; variant: 'outline' | 'warning' | 'secondary' }
> = {
  none: { label: 'verbatim', variant: 'outline' },
  mask: { label: 'masked', variant: 'warning' },
  exclude: { label: 'excluded', variant: 'secondary' },
}

function formatBytes(byteLength: number): string {
  return byteLength < 1024 ? `${byteLength} B` : `${(byteLength / 1024).toFixed(1)} KB`
}

function downloadCsv(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/** The column contract for the active report: which keys are emitted, masked, or dropped (AC-3). */
function ColumnSchema({ report }: { report: ReportDefinition }) {
  return (
    <ul className="flex flex-col gap-px">
      {report.columns.map((column) => {
        const badge = sensitivityBadge[column.sensitive]
        return (
          <li className="flex items-center justify-between gap-3 py-1.5" key={column.key}>
            <div className="flex min-w-0 flex-col">
              <PUIText className="truncate font-medium" variant="footnote">
                {column.header ?? column.key}
              </PUIText>
              <PUIText className="font-mono" tone="subtle" variant="caption2">
                {column.key}
              </PUIText>
            </div>
            <PUIBadge variant={badge.variant}>{badge.label}</PUIBadge>
          </li>
        )
      })}
    </ul>
  )
}

/** The exports the backend hands back, newest first, each carrying the determinism fingerprint (AC-2). */
function ExportHistory({
  exports,
  busyId,
  onDownload,
}: {
  exports: ExportRecord[]
  busyId: string | null
  onDownload: (record: ExportRecord) => void
}) {
  if (exports.length === 0) {
    return (
      <PUIText tone="subtle" variant="footnote">
        No exports yet. Run a report to generate one.
      </PUIText>
    )
  }
  return (
    <ul className="divide-border divide-y">
      {exports.map((record) => (
        <li className="flex items-center justify-between gap-4 py-3" key={record.exportId}>
          <div className="flex min-w-0 flex-col gap-1">
            <PUIText className="truncate font-medium" variant="footnote">
              {record.title}
            </PUIText>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <PUIText className="font-mono" tone="muted" variant="caption2">
                {record.exportId}
              </PUIText>
              <PUIText tone="muted" variant="caption2">
                {record.rowCount} {record.rowCount === 1 ? 'row' : 'rows'} ·{' '}
                {formatBytes(record.byteLength)}
              </PUIText>
              <PUIBadge variant="outline">sha {record.contentHash.slice(0, 10)}</PUIBadge>
            </div>
          </div>
          <PUIButton
            loading={busyId === record.exportId}
            onPress={() => onDownload(record)}
            size="sm"
            variant="outline"
          >
            Download
          </PUIButton>
        </li>
      ))}
    </ul>
  )
}

function ReportingCsvExportsDemo() {
  const client = useMemo<ExportsClient>(() => createMockExportsClient(), [])

  const [reports, setReports] = useState<ReportDefinition[]>([])
  const [reportId, setReportId] = useState<string>('')
  const [delimiter, setDelimiter] = useState<Delimiter>(',')
  const [exports, setExports] = useState<ExportRecord[]>([])
  const [running, setRunning] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void Promise.all([client.reports(), client.list()]).then(([defs, history]) => {
      if (!active) return
      setReports(defs)
      setReportId(defs[0]?.id ?? '')
      setExports(history)
    })
    return () => {
      active = false
    }
  }, [client])

  const activeReport = useMemo(
    () => reports.find((report) => report.id === reportId),
    [reports, reportId],
  )

  // The real engine renders the same bytes the backend would, so the preview is the export itself.
  const preview = useMemo(() => {
    if (!activeReport) return ''
    const text = serializeCsv(toCsvColumns(activeReport), previewRowsFor(activeReport), {
      delimiter,
      bom: false,
    })
    return text.replace(/\r\n/g, '\n')
  }, [activeReport, delimiter])

  const emittedColumns = activeReport ? outputColumns(toCsvColumns(activeReport)).length : 0

  async function onRun() {
    if (!activeReport) return
    setRunning(true)
    try {
      const record = await client.run({ reportId: activeReport.id, delimiter })
      setExports((prev) => [record, ...prev])
    } finally {
      setRunning(false)
    }
  }

  async function onDownload(record: ExportRecord) {
    setDownloadingId(record.exportId)
    try {
      const bytes = await client.download(record.exportId)
      const text = new TextDecoder().decode(bytes)
      downloadCsv(text, `${record.reportId}.csv`)
    } finally {
      setDownloadingId(null)
    }
  }

  if (reports.length === 0) {
    return (
      <PUIText tone="muted" variant="footnote">
        Loading report catalog…
      </PUIText>
    )
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <PUIText as="h2" className="tracking-tight" variant="title3">
            Run an export
          </PUIText>
          <PUIText className="max-w-prose" tone="muted" variant="subheadline">
            Pick a named report and a delimiter. The pure CSV engine serializes its rows
            deterministically, so identical input always yields the same content hash.
          </PUIText>
        </div>

        <div className="flex flex-col gap-2">
          <PUIText as="label" className="font-medium" variant="footnote">
            Report
          </PUIText>
          <PUISegmentedControl
            onValueChange={setReportId}
            options={reports.map((report) => ({ value: report.id, label: report.title }))}
            value={reportId}
          />
          {activeReport ? (
            <PUIText className="max-w-prose" tone="subtle" variant="caption1">
              {activeReport.description}
            </PUIText>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <PUIText as="label" className="font-medium" variant="footnote">
            Delimiter
          </PUIText>
          <PUISegmentedControl
            onValueChange={(value) => setDelimiter(value as Delimiter)}
            options={delimiterOptions}
            value={delimiter}
          />
        </div>

        {activeReport ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <PUIText className="font-medium" variant="footnote">
                Columns
              </PUIText>
              <PUIText tone="subtle" variant="caption2">
                {emittedColumns} of {activeReport.columns.length} emitted
              </PUIText>
            </div>
            <ColumnSchema report={activeReport} />
          </div>
        ) : null}

        <PUIButton fullWidth loading={running} onPress={() => void onRun()}>
          Run report
        </PUIButton>
      </div>

      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <PUIText as="h2" className="tracking-tight" variant="headline">
              Preview
            </PUIText>
            <PUIText tone="subtle" variant="caption2">
              UTF-8 BOM and CRLF added on download
            </PUIText>
          </div>
          <pre className="bg-muted/40 border-border text-foreground overflow-x-auto rounded-lg border p-4 font-mono text-xs leading-relaxed">
            {preview}
          </pre>
          <PUIText tone="subtle" variant="caption1">
            Masked columns show the token, excluded columns never reach the file, and any value with
            a comma or umlaut is RFC-4180 escaped.
          </PUIText>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <PUIText as="h2" className="tracking-tight" variant="headline">
              Exports
            </PUIText>
            <PUIText tone="subtle" variant="caption2">
              newest first
            </PUIText>
          </div>
          <ExportHistory busyId={downloadingId} exports={exports} onDownload={onDownload} />
        </section>
      </div>
    </div>
  )
}

const meta = {
  title: 'Modules/Reports & CSV Exports',
  component: ReportingCsvExportsDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Provide business data as reproducible CSV reports without a BI tool, on the isomorphic reporting-csv-exports Engine the platform serializes server side. In-memory demo: two report definitions are seeded (a customer list that masks the email and excludes the internal note, and a verbatim revenue table) and one revenue export is pre-generated. Switch report or delimiter to see the real engine re-serialize the live preview, run a report to add a record with its SHA-256 determinism hash, and download any export as a real UTF-8 CSV file.',
      },
    },
  },
} satisfies Meta<typeof ReportingCsvExportsDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
