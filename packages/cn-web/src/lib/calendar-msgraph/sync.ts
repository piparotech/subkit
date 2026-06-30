import {
  type GraphCalendarPort,
  type GraphEvent,
  type GraphMappedFields,
  fromGraphEvent,
  isRemoved,
} from './graph'

/**
 * The pure, side-effect-free sync engine. It decides — given the local rows, an incoming Graph delta
 * page, and the previously stored revisions/etags — what to upsert, delete, and which events are in
 * CONFLICT (changed on both sides since the last reconcile). The backend store applies the resulting
 * plan transactionally; the engine itself never touches the DB or the network, so it is fully unit-
 * testable offline and deterministic.
 *
 * Conflict rule (capability AC-4): an event is a conflict when the LOCAL revision advanced past the
 * last-synced revision AND the Graph etag changed from the last-synced etag — i.e. both worlds edited
 * it independently. Conflicts are surfaced (status `conflict`) and logged, never silently overwritten.
 */

/** The minimal local-row view the engine reasons about (the store maps full rows to this). */
export type LocalEventState = {
  id: string
  graphId: string | null
  /** Current local revision. */
  revision: number
  /** Revision at the time of the last successful sync (what Graph last reflected). */
  syncedRevision: number
  /** Etag we last reconciled against (null until first synced). */
  graphEtag: string | null
}

export type SyncStatus = 'synced' | 'conflict'

/** An inbound Graph change to apply to the local store (upsert). */
export type InboundUpsert = {
  graphId: string
  fields: GraphMappedFields
  /** When true the local + remote diverged → mark conflict instead of overwriting. */
  conflict: boolean
}

/** A Graph tombstone — the event was removed in Microsoft 365. */
export type InboundDelete = { graphId: string }

/** The deterministic outcome of merging one delta page against the local store. */
export type InboundPlan = {
  upserts: InboundUpsert[]
  deletes: InboundDelete[]
  /** Graph ids detected as conflicts (subset of upserts where conflict === true). */
  conflicts: string[]
  /** The delta token to persist for the next incremental sync. */
  nextDeltaToken: string
}

/**
 * Merge an incoming Graph delta page into a plan, against the local rows indexed by graphId. An
 * incoming change conflicts when the matching local row has un-synced local edits (revision >
 * syncedRevision) AND its etag differs from what we last reconciled — both sides moved.
 */
export function planInbound(page: GraphDeltaInput, local: LocalEventState[]): InboundPlan {
  const byGraphId = new Map<string, LocalEventState>()
  for (const row of local) if (row.graphId) byGraphId.set(row.graphId, row)

  const upserts: InboundUpsert[] = []
  const deletes: InboundDelete[] = []
  const conflicts: string[] = []

  for (const graph of page.events) {
    if (isRemoved(graph)) {
      deletes.push({ graphId: graph.id })
      continue
    }
    const fields = fromGraphEvent(graph)
    const existing = byGraphId.get(graph.id)
    const locallyDirty = existing != null && existing.revision > existing.syncedRevision
    const etagChanged = existing != null && existing.graphEtag !== fields.graphEtag
    const conflict = Boolean(locallyDirty && etagChanged)
    if (conflict) conflicts.push(graph.id)
    upserts.push({ graphId: graph.id, fields, conflict })
  }

  return { upserts, deletes, conflicts, nextDeltaToken: page.deltaToken }
}

/** Narrow input shape for planInbound (decoupled from the port's Promise return). */
export type GraphDeltaInput = { events: GraphEvent[]; deltaToken: string }

/**
 * The OAuth refresh seam (capability AC-3). The backend stores ONLY a sealed refresh token; before
 * every sync batch it obtains a fresh access token through this port. A real adapter exchanges the
 * refresh token at the Microsoft token endpoint; the fake returns a deterministic token. On refresh
 * the access token (and possibly a rotated refresh token) come back — the store re-seals + persists.
 */
export type OAuthRefreshResult = {
  accessToken: string
  /** Microsoft rotates refresh tokens; persist this if present, else keep the old one. */
  refreshToken?: string
  /** Seconds until the access token expires. */
  expiresInSec: number
}

export type OAuthRefreshPort = {
  refresh(refreshToken: string): Promise<OAuthRefreshResult>
}

/**
 * Ensure a usable access token: returns the cached one while it is comfortably valid, otherwise
 * refreshes. `now`/`skewSec` are injectable for deterministic tests. Never throws on an *expired*
 * access token — that is the normal refresh path; it only propagates a hard refresh failure.
 */
export async function ensureAccessToken(
  port: OAuthRefreshPort,
  state: { accessToken: string | null; accessExpiresAt: number | null; refreshToken: string },
  opts: { now?: number; skewSec?: number } = {},
): Promise<{ accessToken: string; refreshed: boolean; result?: OAuthRefreshResult }> {
  const now = opts.now ?? Date.now()
  const skewMs = (opts.skewSec ?? 60) * 1000
  if (state.accessToken && state.accessExpiresAt && state.accessExpiresAt - skewMs > now) {
    return { accessToken: state.accessToken, refreshed: false }
  }
  const result = await port.refresh(state.refreshToken)
  return { accessToken: result.accessToken, refreshed: true, result }
}

/**
 * Push a local create through the Graph port and return the fields to persist back (graphId/etag +
 * the synced revision). Outbound creates never conflict (no remote counterpart yet).
 */
export async function pushCreate(
  graph: GraphCalendarPort,
  accessToken: string,
  write: Parameters<GraphCalendarPort['create']>[1],
): Promise<GraphMappedFields> {
  const created = await graph.create(accessToken, write)
  return fromGraphEvent(created)
}

/**
 * Push a local update through the Graph port using optimistic concurrency (`If-Match` = last etag).
 * A 412 from Graph (etag mismatch) means Microsoft 365 changed underneath us → surfaced as a conflict
 * for the caller to record, not a silent overwrite.
 */
export async function pushUpdate(
  graph: GraphCalendarPort,
  accessToken: string,
  graphId: string,
  write: Parameters<GraphCalendarPort['update']>[2],
  ifMatch: string | null,
): Promise<{ ok: true; fields: GraphMappedFields } | { ok: false; conflict: true }> {
  try {
    const updated = await graph.update(accessToken, graphId, write, ifMatch)
    return { ok: true, fields: fromGraphEvent(updated) }
  } catch (error) {
    if (error instanceof GraphPreconditionFailed) return { ok: false, conflict: true }
    throw error
  }
}

/** Raised by a Graph adapter when an `If-Match` precondition fails (HTTP 412) — a concurrent edit. */
export class GraphPreconditionFailed extends Error {
  constructor() {
    super('GRAPH_PRECONDITION_FAILED')
    this.name = 'GraphPreconditionFailed'
  }
}
