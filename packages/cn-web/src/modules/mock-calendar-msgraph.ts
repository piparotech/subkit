// In-memory seam for the calendar-msgraph demo. Instead of shimming the HTTP client, this wires the real
// vendored Engine straight to the in-memory FakeGraphCalendar port and drives sync through the actual pure
// engine (planInbound merge, pushCreate/pushUpdate with optimistic concurrency), so the demo exercises the
// capability's true behaviour with no server and no live Microsoft Graph.
//
// Seeded against a fixed clock (2026-06-25): three events already in Microsoft 365 (graphId set) plus one
// local-only event (graphId null, "Lokal" badge). A sync pushes local-only events to Graph, replays local
// edits with an If-Match etag, then pulls a delta and merges it. The "Microsoft 365 edit" action mutates an
// event directly on the Graph port; if you also edited it locally, the next sync flags it as a conflict (a
// 412 from Graph) instead of overwriting either side.
import {
  CalendarEvent,
  type CalendarEventCreate,
  type CalendarEvent as CalendarEventType,
  type CalendarEventUpdate,
  FakeGraphCalendar,
  type LocalEventState,
  planInbound,
  pushCreate,
  pushUpdate,
  toGraphCreate,
  toGraphUpdate,
} from '@/lib/calendar-msgraph'

const DAY = '2026-06-25'
const at = (time: string) => `${DAY}T${time}:00.000Z`

export type CalendarSyncReport = {
  /** Local-only rows pushed up to Microsoft 365 on this run. */
  pushed: number
  /** Inbound Graph changes merged into the local store (remote-originated upserts + deletes). */
  applied: number
  /** Rows where both sides changed since the last reconcile (surfaced, never overwritten). */
  conflicts: number
}

/** A local row plus the sync bookkeeping the engine reasons about, and any diverged remote subject. */
export type AgendaRow = CalendarEventType & {
  /** Revision Microsoft 365 last reflected; a higher `revision` means an un-synced local edit. */
  syncedRevision: number
  /** The remote subject when a sync detected a conflict on this row (cleared once resolved). */
  conflictSubject?: string
}

type SeedSpec = Pick<
  CalendarEventType,
  'subject' | 'body' | 'location' | 'start' | 'end' | 'isAllDay'
> & {
  /** When true the row is seeded only locally and gets a graphId on the first sync. */
  localOnly?: boolean
}

const SEED: SeedSpec[] = [
  {
    subject: 'Team-Standup',
    body: null,
    location: 'Teams',
    start: at('07:30'),
    end: at('07:45'),
    isAllDay: false,
  },
  {
    subject: 'Sprint Review',
    body: 'Demo der Showcase-Module',
    location: 'Raum Köln',
    start: at('13:00'),
    end: at('14:00'),
    isAllDay: false,
  },
  {
    subject: 'Offsite-Planung',
    body: null,
    location: null,
    start: at('00:00'),
    end: '2026-06-26T00:00:00.000Z',
    isAllDay: true,
  },
  {
    subject: 'Kundentermin Otto-Chemie',
    body: null,
    location: 'vor Ort',
    start: at('15:30'),
    end: at('16:30'),
    isAllDay: false,
    localOnly: true,
  },
]

const delay = (ms = 140) => new Promise((resolve) => setTimeout(resolve, ms))

/** A deterministic, offline calendar store backed by the real Engine + the in-memory Graph fake. */
export function createMockCalendarStore() {
  const graph = new FakeGraphCalendar()
  const token = 'demo-access-token'
  let rows: AgendaRow[] = []
  let nextLocalId = 1
  let deltaToken: string | null = null

  function newRow(spec: SeedSpec): AgendaRow {
    return {
      ...CalendarEvent.parse({
        id: `evt-${nextLocalId++}`,
        graphId: null,
        subject: spec.subject,
        body: spec.body,
        location: spec.location,
        start: spec.start,
        end: spec.end,
        isAllDay: spec.isAllDay,
        revision: 1,
        graphEtag: null,
        updatedAt: at('06:00'),
      }),
      syncedRevision: 0,
    }
  }

  function localState(): LocalEventState[] {
    return rows.map((row) => ({
      id: row.id,
      graphId: row.graphId,
      revision: row.revision,
      syncedRevision: row.syncedRevision,
      graphEtag: row.graphEtag,
    }))
  }

  async function pushRowCreate(row: AgendaRow): Promise<void> {
    const create: CalendarEventCreate = {
      subject: row.subject,
      body: row.body ?? null,
      location: row.location ?? null,
      start: row.start,
      end: row.end,
      isAllDay: row.isAllDay,
    }
    const fields = await pushCreate(graph, token, toGraphCreate(create))
    row.graphId = fields.graphId
    row.graphEtag = fields.graphEtag
    row.syncedRevision = row.revision
  }

  return {
    /** Seed the three pre-synced events plus one local-only event; returns the initial agenda. */
    async load(): Promise<AgendaRow[]> {
      await delay()
      rows = SEED.map(newRow)
      // The non-local seeds already round-tripped once: create them on the Graph port so they carry a
      // real graphId + etag and a later "Microsoft 365 edit" has a target to mutate.
      for (let i = 0; i < rows.length; i++) {
        if (!SEED[i]?.localOnly) await pushRowCreate(rows[i]!)
      }
      deltaToken = (await graph.listDelta(token, null)).deltaToken
      return [...rows]
    },

    list(): AgendaRow[] {
      return [...rows]
    },

    /** Validate + create a local-only event (no graphId until the next sync). */
    async create(input: CalendarEventCreate): Promise<AgendaRow> {
      await delay()
      const row = newRow({ ...input, localOnly: true })
      rows = [...rows, row]
      return row
    },

    /** Apply a local PATCH: bumps the revision while leaving syncedRevision behind (a dirty local edit). */
    async update(id: string, patch: CalendarEventUpdate): Promise<AgendaRow> {
      await delay()
      const row = rows.find((entry) => entry.id === id)
      if (!row) throw new Error(`no such event ${id}`)
      // Validate only the event fields: CalendarEvent is strict and would reject the row's
      // sync bookkeeping (syncedRevision, conflictSubject), which we deliberately carry through.
      const { syncedRevision, conflictSubject, ...event } = row
      Object.assign(row, CalendarEvent.parse({ ...event, ...patch, revision: row.revision + 1 }), {
        syncedRevision,
        conflictSubject,
      })
      return row
    },

    async remove(id: string): Promise<void> {
      await delay()
      rows = rows.filter((row) => row.id !== id)
    },

    /** Mutate an event directly in Microsoft 365 (out-of-band) to set up a conflict on the next sync. */
    async remoteEdit(id: string, subject: string): Promise<void> {
      await delay()
      const row = rows.find((entry) => entry.id === id)
      if (!row?.graphId) throw new Error('event is not yet synced to Microsoft 365')
      graph.remoteEdit(row.graphId, { subject })
    },

    /**
     * Resolve a flagged conflict by keeping the local version: rebase onto the current remote etag and
     * clear the conflict, leaving the row dirty so the next sync pushes the local subject up cleanly.
     */
    async resolveKeepLocal(id: string): Promise<void> {
      await delay()
      const row = rows.find((entry) => entry.id === id)
      if (!row?.graphId) return
      row.graphEtag = graph.etagOf(row.graphId) ?? row.graphEtag
      row.conflictSubject = undefined
    },

    /**
     * One bidirectional sync: push local-only rows, replay dirty local edits with an If-Match etag (a
     * concurrent remote change comes back as a 412 conflict, never an overwrite), then pull a delta page
     * and merge inbound remote changes with the real planInbound engine.
     */
    async sync(): Promise<CalendarSyncReport> {
      await delay()
      let pushed = 0
      const conflicted = new Set<string>()

      for (const row of rows) {
        if (row.graphId == null) {
          await pushRowCreate(row)
          pushed += 1
          continue
        }
        if (row.revision <= row.syncedRevision) continue
        const result = await pushUpdate(
          graph,
          token,
          row.graphId,
          toGraphUpdate({ subject: row.subject, body: row.body, location: row.location }),
          row.graphEtag,
        )
        if (result.ok) {
          row.graphEtag = result.fields.graphEtag
          row.syncedRevision = row.revision
          row.conflictSubject = undefined
        } else {
          conflicted.add(row.graphId)
        }
      }

      const page = await graph.listDelta(token, deltaToken)
      const plan = planInbound({ events: page.events, deltaToken: page.deltaToken }, localState())
      deltaToken = plan.nextDeltaToken

      const byGraphId = new Map(rows.filter((row) => row.graphId).map((row) => [row.graphId!, row]))
      let applied = 0
      for (const upsert of plan.upserts) {
        const row = byGraphId.get(upsert.graphId)
        if (!row) continue
        if (upsert.conflict || conflicted.has(upsert.graphId)) {
          conflicted.add(upsert.graphId)
          row.conflictSubject = upsert.fields.subject
          continue
        }
        applied += 1
        Object.assign(row, upsert.fields, { syncedRevision: row.revision })
      }
      for (const del of plan.deletes) {
        const row = byGraphId.get(del.graphId)
        if (row) {
          rows = rows.filter((entry) => entry.id !== row.id)
          applied += 1
        }
      }

      return { pushed, applied, conflicts: conflicted.size }
    },
  }
}

export type CalendarStore = ReturnType<typeof createMockCalendarStore>
