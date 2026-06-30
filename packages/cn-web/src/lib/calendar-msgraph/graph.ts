import { z } from 'zod'

import type { CalendarEvent, CalendarEventCreate, CalendarEventUpdate } from './event'

/**
 * Microsoft-Graph wire types + the mapping between a Graph calendar event and our local event shape,
 * plus the `GraphCalendarPort` — the narrow seam the backend depends on. The real adapter (HTTP to
 * graph.microsoft.com) implements this port; tests inject an in-memory fake (see graph.test.ts), so
 * NOTHING in this module ever hits a live Microsoft endpoint without an explicit, opt-in integration.
 */

/** Graph dateTimeTimeZone — Graph returns local-naive datetime + a timeZone string. */
export const GraphDateTimeTimeZone = z.object({
  dateTime: z.string(),
  timeZone: z.string(),
})
export type GraphDateTimeTimeZone = z.infer<typeof GraphDateTimeTimeZone>

/** The subset of a Graph `event` resource we read/write. */
export const GraphEvent = z.object({
  id: z.string(),
  '@odata.etag': z.string().optional(),
  subject: z.string().nullable().optional(),
  bodyPreview: z.string().nullable().optional(),
  body: z.object({ contentType: z.string(), content: z.string() }).nullable().optional(),
  location: z.object({ displayName: z.string().nullable().optional() }).nullable().optional(),
  start: GraphDateTimeTimeZone,
  end: GraphDateTimeTimeZone,
  isAllDay: z.boolean().nullable().optional(),
  /** Present on a delta page when the event was deleted/removed from the window. */
  '@removed': z.object({ reason: z.string() }).optional(),
})
export type GraphEvent = z.infer<typeof GraphEvent>

/** The body shape Graph expects on create/update (PATCH-friendly: all keys optional). */
export type GraphEventWrite = {
  subject?: string
  body?: { contentType: 'text'; content: string }
  location?: { displayName: string }
  start?: GraphDateTimeTimeZone
  end?: GraphDateTimeTimeZone
  isAllDay?: boolean
}

/** One page of a Graph delta query: changed events + the link to fetch the NEXT delta. */
export type GraphDeltaPage = {
  events: GraphEvent[]
  /** The `@odata.deltaLink`'s token, persisted to drive the next incremental sync. */
  deltaToken: string
}

/**
 * The seam the backend depends on. A caller passes an access token per call (the backend refreshes it
 * via the OAuth port before every batch, so this port never owns token state). Implementations:
 *  - the real HTTP adapter (graph.microsoft.com) — not part of this module's test surface,
 *  - the in-memory fake used by unit + acceptance tests.
 */
export type GraphCalendarPort = {
  /** Incremental read. `deltaToken === null` ⇒ initial full window; otherwise only changes since it. */
  listDelta(accessToken: string, deltaToken: string | null): Promise<GraphDeltaPage>
  /** Create an event in Microsoft 365; returns the created Graph event (with id + etag). */
  create(accessToken: string, write: GraphEventWrite): Promise<GraphEvent>
  /** Update an event; `ifMatch` is the etag we expect — Graph rejects (412) on a concurrent change. */
  update(
    accessToken: string,
    graphId: string,
    write: GraphEventWrite,
    ifMatch: string | null,
  ): Promise<GraphEvent>
  /** Delete an event in Microsoft 365 (idempotent — a 404 is treated as already-gone). */
  remove(accessToken: string, graphId: string): Promise<void>
}

function graphTime(iso: string): GraphDateTimeTimeZone {
  // Normalize to UTC; Graph stores the naive datetime + an explicit zone.
  const d = new Date(iso)
  const dateTime = d.toISOString().replace('Z', '')
  return { dateTime, timeZone: 'UTC' }
}

/** Map a Graph dateTimeTimeZone to a UTC ISO instant (our canonical storage form). */
export function fromGraphTime(value: GraphDateTimeTimeZone): string {
  // Graph emits a zone-less local datetime + a timeZone. UTC zone ⇒ append Z; otherwise trust the
  // datetime as already-offset (Graph also accepts offset strings) and let Date normalize it.
  const raw =
    value.timeZone === 'UTC' && !/[Zz]|[+-]\d{2}:\d{2}$/.test(value.dateTime)
      ? `${value.dateTime}Z`
      : value.dateTime
  return new Date(raw).toISOString()
}

/** Build the Graph write body for a freshly created local event. */
export function toGraphCreate(input: CalendarEventCreate): GraphEventWrite {
  return {
    subject: input.subject,
    body: { contentType: 'text', content: input.body ?? '' },
    location: { displayName: input.location ?? '' },
    start: graphTime(input.start),
    end: graphTime(input.end),
    isAllDay: input.isAllDay,
  }
}

/** Build the Graph PATCH body for a local update (only provided keys are sent). */
export function toGraphUpdate(patch: CalendarEventUpdate): GraphEventWrite {
  const write: GraphEventWrite = {}
  if (patch.subject !== undefined) write.subject = patch.subject
  if (patch.body !== undefined) write.body = { contentType: 'text', content: patch.body ?? '' }
  if (patch.location !== undefined) write.location = { displayName: patch.location ?? '' }
  if (patch.start !== undefined) write.start = graphTime(patch.start)
  if (patch.end !== undefined) write.end = graphTime(patch.end)
  if (patch.isAllDay !== undefined) write.isAllDay = patch.isAllDay
  return write
}

/** The fields of a local event a Graph event maps onto (id/revision are owned locally). */
export type GraphMappedFields = Pick<
  CalendarEvent,
  'subject' | 'body' | 'location' | 'start' | 'end' | 'isAllDay' | 'graphId' | 'graphEtag'
>

/** Map an inbound Graph event onto our local event fields. */
export function fromGraphEvent(graph: GraphEvent): GraphMappedFields {
  return {
    graphId: graph.id,
    graphEtag: graph['@odata.etag'] ?? null,
    subject: (graph.subject ?? '').trim() || '(kein Titel)',
    body: graph.body?.content ?? graph.bodyPreview ?? null,
    location: graph.location?.displayName ?? null,
    start: fromGraphTime(graph.start),
    end: fromGraphTime(graph.end),
    isAllDay: graph.isAllDay ?? false,
  }
}

/** Whether a Graph delta entry signals a deletion (tombstone) rather than an upsert. */
export function isRemoved(graph: GraphEvent): boolean {
  return graph['@removed'] !== undefined
}
