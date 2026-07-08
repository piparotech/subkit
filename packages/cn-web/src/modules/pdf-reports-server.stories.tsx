import { useEffect, useMemo, useState } from 'react'

import { PUIBadge, PUIButton, PUIInput, PUIText, PUITextArea } from '@/components/ui'
import {
  type ReportBlock,
  type ReportRecord,
  type ReportsClient,
  parseReportSpec,
} from '@/lib/pdf-reports-server'
import type { Meta, StoryObj } from '@storybook/react-vite'

import { createMockReportsClient } from './mock-pdf-reports-server'

// --- the block palette: one toggle per supported block type, with seeded content ------------------

type BlockKind = ReportBlock['type']

const blockLabels: Record<BlockKind, string> = {
  heading: 'Heading',
  paragraph: 'Paragraph',
  table: 'Table',
  barChart: 'Bar chart',
}

const blockSummaries: Record<BlockKind, string> = {
  heading: 'Section title',
  paragraph: 'Wrapped body text',
  table: 'Up to 6 columns',
  barChart: 'Vector bars, print ready',
}

const paletteBlocks: Record<BlockKind, ReportBlock> = {
  heading: { type: 'heading', text: 'Kennzahlen', level: 1 },
  paragraph: {
    type: 'paragraph',
    text: 'Alle Werte stammen aus dem abgeschlossenen Quartal und werden serverseitig byte-deterministisch gerendert. Sonderzeichen wie Umlaute werden aus eingebetteten Schriften gesetzt.',
  },
  table: {
    type: 'table',
    columns: ['Kennzahl', 'Wert', 'Ziel'],
    rows: [
      ['Aktive Nutzer', '4.820', '4.500'],
      ['Churn', '1,9%', 'unter 3%'],
      ['NPS', '54', '50'],
    ],
  },
  barChart: {
    type: 'barChart',
    title: 'Umsatz nach Quartal (k EUR)',
    series: [
      { label: 'Q1', value: 206 },
      { label: 'Q2', value: 247 },
      { label: 'Q3', value: 271 },
    ],
  },
}

const blockOrder: BlockKind[] = ['heading', 'paragraph', 'table', 'barChart']

// --- helpers --------------------------------------------------------------------------------------

function formatBytes(byteLength: number): string {
  return byteLength < 1024 ? `${byteLength} B` : `${(byteLength / 1024).toFixed(1)} KB`
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 10)}..`
}

function downloadPdf(bytes: Uint8Array, filename: string): void {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  const blob = new Blob([buffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

// --- the report list: the records the server hands back, with the determinism fingerprint ---------

function ReportList({
  reports,
  busyId,
  onDownload,
}: {
  reports: ReportRecord[]
  busyId: string | null
  onDownload: (report: ReportRecord) => void
}) {
  if (reports.length === 0) {
    return (
      <PUIText tone="subtle" variant="footnote">
        No reports yet. Generate one to see its record and download the PDF.
      </PUIText>
    )
  }
  return (
    <ul className="divide-border divide-y">
      {reports.map((report) => (
        <li className="flex items-center justify-between gap-4 py-4" key={report.reportId}>
          <div className="flex min-w-0 flex-col gap-1">
            <PUIText className="truncate font-medium" variant="footnote">
              {report.title}
            </PUIText>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <PUIText className="font-mono" tone="muted" variant="caption2">
                {report.reportId}
              </PUIText>
              <PUIText tone="muted" variant="caption2">
                {report.pageCount} {report.pageCount === 1 ? 'page' : 'pages'} ·{' '}
                {formatBytes(report.byteLength)} · {report.language}
              </PUIText>
              <PUIBadge variant="outline">sha {shortHash(report.contentHash)}</PUIBadge>
            </div>
          </div>
          <PUIButton
            loading={busyId === report.reportId}
            onPress={() => onDownload(report)}
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

// --- the compose pane, wired to the real Engine seam ----------------------------------------------

function ComposeReport({ client }: { client: ReportsClient }) {
  const [title, setTitle] = useState('Quartalsbericht Q3 2026')
  const [monogram, setMonogram] = useState('PA')
  const [included, setIncluded] = useState<Record<BlockKind, boolean>>({
    heading: true,
    paragraph: true,
    table: true,
    barChart: true,
  })
  const [reports, setReports] = useState<ReportRecord[]>([])
  const [generating, setGenerating] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void client.list().then((seeded) => {
      if (active) setReports(seeded)
    })
    return () => {
      active = false
    }
  }, [client])

  const blocks = useMemo(
    () => blockOrder.filter((kind) => included[kind]).map((kind) => paletteBlocks[kind]),
    [included],
  )

  const draft = useMemo(() => {
    const candidate = {
      title: title.trim(),
      language: 'de',
      branding: monogram.trim()
        ? { title: title.trim() || 'piparo Report', logoMonogram: monogram.trim().toUpperCase() }
        : undefined,
      blocks,
    }
    return parseReportSpec(candidate)
  }, [title, monogram, blocks])

  async function onGenerate() {
    if (!draft.success) {
      setError('Add a title and at least one block.')
      return
    }
    setError(null)
    setGenerating(true)
    try {
      const record = await client.generate(draft.data)
      setReports((prev) => [record, ...prev])
    } catch {
      setError('Generation rejected by the engine.')
    } finally {
      setGenerating(false)
    }
  }

  async function onDownload(report: ReportRecord) {
    setDownloadingId(report.reportId)
    try {
      const bytes = await client.download(report.reportId)
      downloadPdf(bytes, `${report.reportId}.pdf`)
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <form
        className="flex flex-col gap-6"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void onGenerate()
        }}
      >
        <div className="flex flex-col gap-1.5">
          <PUIText as="h2" className="tracking-tight" variant="title3">
            Compose a report
          </PUIText>
          <PUIText className="max-w-prose" tone="muted" variant="subheadline">
            The form builds a report spec, validates it against the shared schema, then the engine
            renders deterministic PDF bytes in the browser. Identical input always yields the same
            content hash.
          </PUIText>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-4">
          <PUIInput
            label="Document title"
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
          <PUIInput
            className="w-24"
            label="Monogram"
            maxLength={3}
            onChange={(event) => setMonogram(event.target.value)}
            value={monogram}
          />
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend>
            <PUIText className="font-medium" variant="subheadline">
              Blocks
            </PUIText>
          </legend>
          <div className="grid grid-cols-2 gap-2.5">
            {blockOrder.map((kind) => {
              const on = included[kind]
              return (
                <button
                  aria-pressed={on}
                  className={[
                    'focus-visible:ring-ring rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none',
                    on ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50',
                  ].join(' ')}
                  key={kind}
                  onClick={() => setIncluded((prev) => ({ ...prev, [kind]: !prev[kind] }))}
                  type="button"
                >
                  <PUIText className="font-medium" variant="footnote">
                    {blockLabels[kind]}
                  </PUIText>
                  <PUIText tone="muted" variant="caption2">
                    {blockSummaries[kind]}
                  </PUIText>
                </button>
              )
            })}
          </div>
        </fieldset>

        <PUIButton disabled={!draft.success} fullWidth loading={generating} type="submit">
          Generate report
        </PUIButton>

        {error ? (
          <PUIText className="text-destructive" role="alert" variant="footnote">
            {error}
          </PUIText>
        ) : (
          <PUIText tone="subtle" variant="footnote">
            Clear the title or deselect every block to see the schema reject the spec before render.
          </PUIText>
        )}
      </form>

      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <PUIText as="h2" className="tracking-tight" variant="headline">
            Spec
          </PUIText>
          <PUITextArea
            aria-label="Report spec JSON"
            className="font-mono text-xs"
            readOnly
            rows={10}
            value={
              draft.success
                ? JSON.stringify(draft.data, null, 2)
                : 'Spec invalid: add a title and at least one block.'
            }
          />
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <PUIText as="h2" className="tracking-tight" variant="headline">
              Reports
            </PUIText>
            <PUIText tone="subtle" variant="caption2">
              newest first
            </PUIText>
          </div>
          <ReportList busyId={downloadingId} onDownload={onDownload} reports={reports} />
        </section>
      </div>
    </div>
  )
}

function PdfReportsServerDemo() {
  const client = useMemo(() => createMockReportsClient(), [])
  return <ComposeReport client={client} />
}

const meta = {
  title: 'Modules/PDF Reports (Server)',
  component: PdfReportsServerDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Generate formatted PDF reports with charts, embedded fonts and CI branding from a declarative spec, on the isomorphic pdf-reports-server Engine the platform ships server side. In-memory demo: the real deterministic writer renders PDF bytes in the browser and a mock store seeds one Q2 quarterly report (heading, paragraph, table, bar chart). Toggle blocks and generate to add reports, download any record as a real PDF, and clear the title to watch the shared schema reject the spec before render.',
      },
    },
  },
} satisfies Meta<typeof PdfReportsServerDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
