import { EVENT_NAME, type ServerEvent, encodeServerEvent } from './protocol'

/**
 * Isomorphic SSE framing helpers shared by both ends. The client uses `buildStreamUrl` to open the
 * `EventSource` (carrying the bearer + the resume cursor as query params, because `EventSource`
 * cannot set request headers); the backend uses `formatSseFrame`/`formatSseComment` to serialize the
 * same protocol onto the wire. Keeping both here means the framing has exactly one definition.
 */

/** Query parameter names — the single place the wire param spelling is defined (client + server). */
export const TOKEN_PARAM = 'access_token' as const
export const RESUME_PARAM = 'after' as const

/**
 * Build the SSE handshake URL. The bearer travels in the URL because the browser `EventSource` API
 * cannot set an `Authorization` header; the backend reads it from the query during the request. When
 * `after` (the last *acked* sequence) is given, it is appended so the server replays only events
 * strictly after it — this is the resume-from-sequence guarantee. The token is never logged.
 */
export function buildStreamUrl(
  baseUrl: string,
  path: string,
  token: string,
  after?: number | null,
): string {
  const base = baseUrl.replace(/\/$/, '')
  const params = new URLSearchParams()
  params.set(TOKEN_PARAM, token)
  if (after != null && after > 0) params.set(RESUME_PARAM, String(after))
  const sep = path.includes('?') ? '&' : '?'
  return `${base}${path}${sep}${params.toString()}`
}

/** Parse the resume cursor out of the request query — a missing/invalid value means "from the start". */
export function parseResumeCursor(value: string | undefined | null): number {
  if (value == null) return 0
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : 0
}

/**
 * Serialize one domain event as an SSE frame: a fixed `event:` name (so the client binds one
 * listener), the protocol JSON on the `data:` line, and an `id:` set to the sequence so the browser's
 * own `Last-Event-ID` reconnect header mirrors our cursor as a belt-and-braces fallback. Terminated
 * by the blank line SSE requires.
 */
export function formatSseFrame(event: ServerEvent): string {
  return `id: ${event.seq}\nevent: ${EVENT_NAME}\ndata: ${encodeServerEvent(event)}\n\n`
}

/** An SSE comment line (`:`-prefixed) — used as a keep-alive that the client ignores. */
export function formatSseComment(text: string): string {
  return `: ${text}\n\n`
}
