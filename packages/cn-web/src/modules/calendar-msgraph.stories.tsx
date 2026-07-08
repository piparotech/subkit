import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  PUIBadge,
  PUIButton,
  PUIEmptyState,
  PUIInput,
  PUISeparator,
  PUISpinner,
  PUISwitch,
  PUIText,
} from '@/components/ui'
import {
  type CalendarEvent,
  type CalendarEventCreate,
  validateCreateField,
} from '@/lib/calendar-msgraph'
import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  type AgendaRow,
  type CalendarSyncReport,
  createMockCalendarStore,
} from './mock-calendar-msgraph'

type EventStatus = 'synced' | 'local' | 'dirty' | 'conflict'

function statusOf(row: AgendaRow): EventStatus {
  if (row.conflictSubject != null) return 'conflict'
  if (row.graphId == null) return 'local'
  if (row.revision > row.syncedRevision) return 'dirty'
  return 'synced'
}

const STATUS_BADGE: Record<
  EventStatus,
  { label: string; variant: 'success' | 'secondary' | 'warning' | 'destructive' }
> = {
  synced: { label: 'In Microsoft 365', variant: 'success' },
  local: { label: 'Nur lokal', variant: 'secondary' },
  dirty: { label: 'Lokal geändert', variant: 'warning' },
  conflict: { label: 'Konflikt', variant: 'destructive' },
}

const timeFmt = new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
})

function timeRange(row: CalendarEvent): string {
  if (row.isAllDay) return 'Ganztägig'
  return `${timeFmt.format(new Date(row.start))} bis ${timeFmt.format(new Date(row.end))}`
}

type DraftKey = 'subject' | 'start' | 'end' | 'location'
type Draft = Record<DraftKey, string> & { isAllDay: boolean }

const EMPTY_DRAFT: Draft = {
  subject: '',
  start: '2026-06-25T09:00',
  end: '2026-06-25T10:00',
  location: '',
  isAllDay: false,
}

function toCreate(draft: Draft): CalendarEventCreate {
  return {
    subject: draft.subject.trim(),
    body: null,
    location: draft.location.trim() === '' ? null : draft.location.trim(),
    start: new Date(draft.start).toISOString(),
    end: new Date(draft.end).toISOString(),
    isAllDay: draft.isAllDay,
  }
}

/** The new-event form, validated field by field against the same shared zod schema the server enforces. */
function NewEventForm({ onCreate }: { onCreate: (input: CalendarEventCreate) => Promise<void> }) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [submitting, setSubmitting] = useState(false)

  const subjectError = draft.subject === '' ? null : validateCreateField('subject', draft.subject)
  const orderError =
    new Date(draft.start) < new Date(draft.end) ? null : 'Ende muss nach dem Beginn liegen'
  const canSubmit = draft.subject.trim() !== '' && subjectError == null && orderError == null

  async function submit() {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await onCreate(toCreate(draft))
      setDraft(EMPTY_DRAFT)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <PUIInput
        error={subjectError}
        label="Titel"
        onChange={(event) => setDraft((prev) => ({ ...prev, subject: event.target.value }))}
        placeholder="Worum geht es?"
        value={draft.subject}
      />
      <div className="grid grid-cols-2 gap-3">
        <PUIInput
          label="Beginn"
          onChange={(event) => setDraft((prev) => ({ ...prev, start: event.target.value }))}
          type="datetime-local"
          value={draft.start}
        />
        <PUIInput
          error={orderError}
          label="Ende"
          onChange={(event) => setDraft((prev) => ({ ...prev, end: event.target.value }))}
          type="datetime-local"
          value={draft.end}
        />
      </div>
      <PUIInput
        label="Ort"
        onChange={(event) => setDraft((prev) => ({ ...prev, location: event.target.value }))}
        placeholder="Optional"
        value={draft.location}
      />
      <PUISwitch
        label="Ganztägig"
        onValueChange={(isAllDay) => setDraft((prev) => ({ ...prev, isAllDay }))}
        value={draft.isAllDay}
      />
      <PUIButton disabled={!canSubmit} fullWidth loading={submitting} type="submit">
        Termin anlegen
      </PUIButton>
      <PUIText className="max-w-prose" tone="subtle" variant="caption1">
        Neue Termine entstehen zunächst nur lokal. Erst eine Synchronisation legt sie in Microsoft
        365 an.
      </PUIText>
    </form>
  )
}

/** One agenda entry: time, title, location, its sync state, and the per-row demo actions. */
function AgendaItem({
  row,
  busy,
  onRename,
  onRemoteEdit,
  onProvokeConflict,
  onResolve,
}: {
  row: AgendaRow
  busy: boolean
  onRename: (id: string, subject: string) => void
  onRemoteEdit: (id: string) => void
  onProvokeConflict: (id: string) => void
  onResolve: (id: string) => void
}) {
  const status = statusOf(row)
  const badge = STATUS_BADGE[status]
  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <PUIText className="truncate font-medium" variant="callout">
            {row.subject}
          </PUIText>
          <PUIText className="tabular-nums" tone="muted" variant="footnote">
            {timeRange(row)}
            {row.location != null ? ` · ${row.location}` : ''}
          </PUIText>
        </div>
        <PUIBadge dot variant={badge.variant}>
          {badge.label}
        </PUIBadge>
      </div>

      {status === 'conflict' ? (
        <div className="border-destructive/40 bg-destructive/5 flex flex-col gap-2 rounded-lg border p-3">
          <PUIText className="text-destructive font-medium" variant="footnote">
            In beiden Kalendern geändert
          </PUIText>
          <div className="grid grid-cols-2 gap-2">
            <ConflictSide label="Diese App" value={row.subject} />
            <ConflictSide label="Microsoft 365" value={row.conflictSubject ?? ''} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PUIButton
              disabled={busy}
              onPress={() => onResolve(row.id)}
              size="sm"
              variant="outline"
            >
              Lokale Version behalten
            </PUIButton>
            <PUIText tone="subtle" variant="caption2">
              Danach erneut synchronisieren, um die Wahl zu übertragen.
            </PUIText>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <PUIButton
            disabled={busy}
            onPress={() => onRename(row.id, `${row.subject} (überarbeitet)`)}
            size="sm"
            variant="ghost"
          >
            Lokal umbenennen
          </PUIButton>
          {row.graphId != null ? (
            <PUIButton
              disabled={busy}
              onPress={() => onRemoteEdit(row.id)}
              size="sm"
              variant="ghost"
            >
              In Microsoft 365 ändern
            </PUIButton>
          ) : null}
          {row.graphId != null ? (
            <PUIButton
              disabled={busy}
              onPress={() => onProvokeConflict(row.id)}
              size="sm"
              variant="ghost"
            >
              Konflikt provozieren
            </PUIButton>
          ) : null}
        </div>
      )}
    </li>
  )
}

function ConflictSide({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <PUIText tone="subtle" variant="caption2">
        {label}
      </PUIText>
      <PUIText className="truncate" variant="footnote">
        {value}
      </PUIText>
    </div>
  )
}

function ReportLine({ report }: { report: CalendarSyncReport }) {
  const parts = [
    `${report.pushed} hochgeladen`,
    `${report.applied} übernommen`,
    `${report.conflicts} Konflikt${report.conflicts === 1 ? '' : 'e'}`,
  ]
  return (
    <PUIText className="tabular-nums" role="status" tone="muted" variant="caption1">
      Letzter Sync: {parts.join(' · ')}
    </PUIText>
  )
}

function CalendarMsgraphDemo() {
  const store = useMemo(() => createMockCalendarStore(), [])
  const [rows, setRows] = useState<AgendaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<CalendarSyncReport | null>(null)

  useEffect(() => {
    let active = true
    void store.load().then((seeded) => {
      if (active) {
        setRows(seeded)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [store])

  const run = useCallback(
    async (action: () => Promise<void>) => {
      setBusy(true)
      try {
        await action()
        setRows(store.list())
      } finally {
        setBusy(false)
      }
    },
    [store],
  )

  const create = useCallback(
    (input: CalendarEventCreate) => run(() => store.create(input).then(() => undefined)),
    [run, store],
  )
  const rename = useCallback(
    (id: string, subject: string) =>
      void run(() => store.update(id, { subject }).then(() => undefined)),
    [run, store],
  )
  const remoteEdit = useCallback(
    (id: string) => void run(() => store.remoteEdit(id, 'In Outlook verschoben')),
    [run, store],
  )
  const provokeConflict = useCallback(
    (id: string) =>
      void run(async () => {
        await store.update(id, { subject: 'Lokal überarbeitet' })
        await store.remoteEdit(id, 'In Outlook umbenannt')
      }),
    [run, store],
  )
  const resolve = useCallback(
    (id: string) => void run(() => store.resolveKeepLocal(id)),
    [run, store],
  )
  const sync = useCallback(() => void run(() => store.sync().then(setReport)), [run, store])

  const pending = rows.filter((row) => statusOf(row) !== 'synced').length

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <PUIText as="h2" className="tracking-tight" variant="title3">
            Neuer Termin
          </PUIText>
          <PUIText className="max-w-prose" tone="muted" variant="subheadline">
            Das geteilte Event-Schema prüft die Eingaben hier genauso wie später der Server.
          </PUIText>
        </div>
        <NewEventForm onCreate={create} />
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <PUIText as="h2" className="tracking-tight" variant="title3">
              Donnerstag, 25. Juni 2026
            </PUIText>
            <PUIText tone="muted" variant="footnote">
              {pending === 0
                ? 'Alle Termine sind mit Microsoft 365 synchron.'
                : `${pending} Termin${pending === 1 ? '' : 'e'} warten auf die nächste Synchronisation.`}
            </PUIText>
          </div>
          <div className="flex flex-col items-end gap-1">
            <PUIButton disabled={loading} loading={busy} onPress={sync} variant="secondary">
              Jetzt synchronisieren
            </PUIButton>
            {report != null ? <ReportLine report={report} /> : null}
          </div>
        </div>

        <PUISeparator />

        {loading ? (
          <div className="flex items-center gap-3 py-10" role="status">
            <PUISpinner size="sm" />
            <PUIText tone="muted" variant="footnote">
              Kalender wird geladen
            </PUIText>
          </div>
        ) : rows.length === 0 ? (
          <PUIEmptyState
            description="Lege links einen Termin an, um die bidirektionale Synchronisation zu sehen."
            title="Keine Termine"
          />
        ) : (
          <ul className="divide-border divide-y">
            {rows.map((row) => (
              <AgendaItem
                busy={busy}
                key={row.id}
                onProvokeConflict={provokeConflict}
                onRemoteEdit={remoteEdit}
                onRename={rename}
                onResolve={resolve}
                row={row}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const meta = {
  title: 'Modules/Calendar (Microsoft Graph)',
  component: CalendarMsgraphDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Bidirectional Microsoft 365 calendar sync over Microsoft Graph, on the isomorphic calendar-msgraph Engine wired to an in-memory Graph port. In-memory demo: a 25 June 2026 agenda is seeded with three events already in Microsoft 365 plus one local-only event. Try adding an event (validated by the shared schema), then synchronise to push it up; rename a synced event locally and edit the same one in Microsoft 365, or use "provoke a conflict", then synchronise to watch the delta merge flag the divergence instead of overwriting either side.',
      },
    },
  },
} satisfies Meta<typeof CalendarMsgraphDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
