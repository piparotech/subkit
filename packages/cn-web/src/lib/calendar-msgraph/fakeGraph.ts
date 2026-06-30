import {
  type GraphCalendarPort,
  type GraphDeltaPage,
  type GraphEvent,
  type GraphEventWrite,
} from './graph'
import { GraphPreconditionFailed } from './sync'

/**
 * An in-memory, deterministic Microsoft-Graph fake implementing GraphCalendarPort. Used by the unit
 * tests AND the bun acceptance suite so NOTHING ever hits a live graph.microsoft.com endpoint. It
 * models etag bumps on write, optimistic-concurrency 412s on a stale If-Match, tombstones on delete,
 * and a simple delta cursor (full window when deltaToken is null, then only events changed since).
 */
export class FakeGraphCalendar implements GraphCalendarPort {
  private seq = 0
  private etagSeq = 0
  private readonly events = new Map<string, GraphEvent>()
  private readonly removed = new Set<string>()
  /** Per-event change ordinal, so a delta cursor can return only newer changes. */
  private readonly changedAt = new Map<string, number>()
  private clock = 0

  private nextId(): string {
    this.seq += 1
    return `graph-${this.seq}`
  }

  private nextEtag(): string {
    this.etagSeq += 1
    return `W/"etag-${this.etagSeq}"`
  }

  private touch(id: string): void {
    this.clock += 1
    this.changedAt.set(id, this.clock)
  }

  /** Simulate an out-of-band edit made directly in Microsoft 365 (drives conflict tests). */
  remoteEdit(id: string, patch: Partial<GraphEventWrite>): GraphEvent {
    const current = this.events.get(id)
    if (!current) throw new Error(`no such event ${id}`)
    const next: GraphEvent = {
      ...current,
      ...applyWrite(current, patch),
      '@odata.etag': this.nextEtag(),
    }
    this.events.set(id, next)
    this.touch(id)
    return next
  }

  async listDelta(_accessToken: string, deltaToken: string | null): Promise<GraphDeltaPage> {
    const since = deltaToken ? Number(deltaToken) : 0
    const events: GraphEvent[] = []
    for (const [id, at] of this.changedAt) {
      if (at <= since) continue
      const removed = this.removed.has(id)
      const ev = this.events.get(id)
      if (removed) {
        events.push({
          id,
          start: { dateTime: '1970-01-01T00:00:00', timeZone: 'UTC' },
          end: { dateTime: '1970-01-01T00:00:01', timeZone: 'UTC' },
          '@removed': { reason: 'deleted' },
        })
      } else if (ev) {
        events.push(ev)
      }
    }
    return { events, deltaToken: String(this.clock) }
  }

  async create(_accessToken: string, write: GraphEventWrite): Promise<GraphEvent> {
    const id = this.nextId()
    const event: GraphEvent = {
      id,
      '@odata.etag': this.nextEtag(),
      start: write.start ?? { dateTime: '2026-01-01T09:00:00', timeZone: 'UTC' },
      end: write.end ?? { dateTime: '2026-01-01T10:00:00', timeZone: 'UTC' },
      ...applyWrite(undefined, write),
    }
    this.events.set(id, event)
    this.touch(id)
    return event
  }

  async update(
    _accessToken: string,
    graphId: string,
    write: GraphEventWrite,
    ifMatch: string | null,
  ): Promise<GraphEvent> {
    const current = this.events.get(graphId)
    if (!current) throw new Error(`no such event ${graphId}`)
    if (ifMatch != null && current['@odata.etag'] !== ifMatch) {
      throw new GraphPreconditionFailed()
    }
    const next: GraphEvent = {
      ...current,
      ...applyWrite(current, write),
      '@odata.etag': this.nextEtag(),
    }
    this.events.set(graphId, next)
    this.touch(graphId)
    return next
  }

  async remove(_accessToken: string, graphId: string): Promise<void> {
    if (!this.events.has(graphId)) return // idempotent
    this.removed.add(graphId)
    this.touch(graphId)
  }

  /** Test helper: the current etag of an event. */
  etagOf(graphId: string): string | undefined {
    return this.events.get(graphId)?.['@odata.etag']
  }
}

function applyWrite(current: GraphEvent | undefined, write: GraphEventWrite): Partial<GraphEvent> {
  const out: Partial<GraphEvent> = {}
  if (write.subject !== undefined) out.subject = write.subject
  if (write.body !== undefined)
    out.body = { contentType: write.body.contentType, content: write.body.content }
  if (write.location !== undefined) out.location = { displayName: write.location.displayName }
  if (write.start !== undefined) out.start = write.start
  if (write.end !== undefined) out.end = write.end
  if (write.isAllDay !== undefined) out.isAllDay = write.isAllDay
  void current
  return out
}
