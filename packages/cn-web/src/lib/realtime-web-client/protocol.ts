import { z } from 'zod'

/**
 * The Server-Sent-Events wire protocol shared by BOTH ends — the single source the browser client and
 * the Elysia backend validate against (no drift). Every domain message is a JSON `data:` payload on
 * the SSE stream carrying a strictly-monotonic `seq` (the resume cursor) plus a `channel` and an
 * opaque `payload`. Server→client frames are re-validated on arrival so a drifted backend surfaces as
 * a typed parse error, never as a silently-wrong payload reaching a consumer.
 *
 * SSE (not WebSocket) is the transport: it is uni-directional (server→client), rides plain HTTP, and
 * the browser's native `EventSource` already auto-reconnects — but auto-reconnect alone LOSES events,
 * so this protocol carries an explicit `seq` and the client resumes from the last *acked* one via the
 * `after` query parameter (see `buildStreamUrl`). The `EventSource` SSE event NAME is fixed to
 * `EVENT_NAME` so the client binds one listener; the JSON `data:` body is what we validate here.
 */

/** The SSE `event:` name every domain frame is delivered under (the client adds one listener). */
export const EVENT_NAME = 'piparo' as const

/**
 * A single domain event pushed by the server. `seq` is the strictly-increasing resume cursor
 * (1-based, gap-free per subject); `channel` is the domain topic a consumer subscribes to; `payload`
 * is left as `unknown` here so the transport stays domain-agnostic — a consumer narrows it with its
 * own per-channel Zod schema (see `defineEvent`).
 */
export const ServerEvent = z.strictObject({
  /** Strictly-monotonic, gap-free per-subject sequence number — the resume cursor. */
  seq: z.number().int().positive(),
  /** Domain event channel (e.g. `'activity'`, `'presence'`) — consumers subscribe by channel. */
  channel: z.string().min(1),
  payload: z.unknown(),
})
export type ServerEvent = z.infer<typeof ServerEvent>

/**
 * Decode + validate a raw SSE `data:` body into a typed event. Returns `null` for anything that is not
 * a well-formed event (malformed JSON, bad shape, non-positive/duplicate-shaped seq) — the client
 * DROPS it rather than crashing the stream, so one bad frame never tears down a healthy connection.
 */
export function decodeServerEvent(raw: string): ServerEvent | null {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return null
  }
  const parsed = ServerEvent.safeParse(json)
  return parsed.success ? parsed.data : null
}

/** Serialize a domain event for the SSE `data:` line (single choke-point so framing stays consistent). */
export function encodeServerEvent(event: ServerEvent): string {
  return JSON.stringify(event)
}

/**
 * A typed event channel binding — pairs a channel name with its payload schema so a consumer reads
 * `ServerEvent.payload` as a fully-typed value (and an off-schema payload is rejected, not coerced).
 */
export type EventChannel<TName extends string, TPayload> = {
  channel: TName
  parse: (payload: unknown) => TPayload
}

/** Define a typed event channel from a Zod payload schema. */
export function defineEvent<TName extends string, TSchema extends z.ZodType>(
  channel: TName,
  schema: TSchema,
): EventChannel<TName, z.infer<TSchema>> {
  return { channel, parse: (payload) => schema.parse(payload) }
}

/**
 * Narrow a domain event's payload through a typed channel. Returns `null` when the event is for a
 * different channel OR when its payload is off-schema (validated, never coerced) — so an invalid
 * payload is DROPPED, not surfaced to the consumer.
 */
export function readEvent<TName extends string, TPayload>(
  event: ServerEvent,
  channel: EventChannel<TName, TPayload>,
): TPayload | null {
  if (event.channel !== channel.channel) return null
  try {
    return channel.parse(event.payload)
  } catch {
    return null
  }
}
