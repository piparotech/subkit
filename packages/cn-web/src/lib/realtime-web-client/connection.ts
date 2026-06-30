import { type BackoffConfig, backoffDelay } from './config'
import { EVENT_NAME, type ServerEvent, decodeServerEvent } from './protocol'
import { buildStreamUrl } from './stream'

/**
 * The deterministic realtime web-stream state machine — the Engine. It owns the SSE `EventSource`
 * lifecycle, the auth handshake, exponential-backoff reconnect, and — critically — RESUME: it tracks
 * the last *acked* sequence and reconnects with `?after=<seq>` so no event is lost across a drop. It
 * is decoupled from any concrete runtime: the `EventSource` is created through an injected factory and
 * time runs through injected timer functions, so the whole thing is exercised offline with a fake
 * source and fake timers (no real network, no `setTimeout`). The Shell hook (`useRealtimeStream`) is
 * a thin React binding over this; the host wires the real factory + the auth session's `getToken`.
 */

/** The minimal `EventSource` surface the state machine drives — both the browser `EventSource` and
 *  the in-test fake satisfy it, so nothing here depends on a DOM global. */
export interface RealtimeEventSource {
  /** Add a listener for a named SSE event (we listen on the single protocol event name). */
  addEventListener(type: string, listener: (event: { data: string }) => void): void
  close(): void
  onopen: (() => void) | null
  onerror: ((error?: unknown) => void) | null
}

export type EventSourceFactory = (url: string) => RealtimeEventSource

/** Injectable timer seam (defaults to the host globals) — lets tests run on fake timers. */
export type Timers = {
  setTimeout: (handler: () => void, ms: number) => unknown
  clearTimeout: (handle: unknown) => void
}

const realTimers: Timers = {
  setTimeout: (handler, ms) => setTimeout(handler, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

export type ConnectionStatus = 'connecting' | 'online' | 'reconnecting' | 'offline'

export type RealtimeStreamOptions = {
  /** Base realtime URL, e.g. `https://api.example.com` (the `path` from config is appended). */
  baseUrl: string
  path: string
  backoff: BackoffConfig
  /** Returns a fresh access token for the handshake (sync or async); `null` = unauthenticated. */
  getToken: () => Promise<string | null> | string | null
  /** How the `EventSource` is created (DI seam). Defaults to the global `EventSource` if present. */
  eventSourceFactory?: EventSourceFactory
  timers?: Timers
  /** RNG for backoff jitter (DI seam for deterministic tests). */
  rand?: () => number
  /** Sequence to resume after on the FIRST connect (e.g. persisted across reloads). Default 0 = start. */
  resumeFrom?: number
  /** Notified on every status transition. */
  onStatus?: (status: ConnectionStatus) => void
  /** Notified for every validated, in-order domain event (invalid/out-of-order frames are dropped). */
  onEvent?: (event: ServerEvent) => void
  /** Error names only — never token bytes or payloads. */
  onError?: (name: string) => void
}

function defaultEventSourceFactory(): EventSourceFactory {
  const ctor = (globalThis as { EventSource?: new (url: string) => unknown }).EventSource
  if (!ctor) {
    throw new Error('no global EventSource — pass options.eventSourceFactory')
  }
  return (url) => new ctor(url) as unknown as RealtimeEventSource
}

export class RealtimeStream {
  private source: RealtimeEventSource | null = null
  private status: ConnectionStatus = 'offline'
  private attempt = 0
  private closedByUser = false
  private reconnectHandle: unknown = null

  /** The last sequence delivered to the consumer — the resume cursor carried on every reconnect. */
  private lastSeq: number

  private readonly timers: Timers
  private readonly rand: () => number
  private readonly factory: EventSourceFactory
  private readonly opts: RealtimeStreamOptions

  constructor(opts: RealtimeStreamOptions) {
    this.opts = opts
    this.timers = opts.timers ?? realTimers
    this.rand = opts.rand ?? Math.random
    this.factory = opts.eventSourceFactory ?? defaultEventSourceFactory()
    this.lastSeq = opts.resumeFrom && opts.resumeFrom > 0 ? opts.resumeFrom : 0
  }

  getStatus(): ConnectionStatus {
    return this.status
  }

  /** The last acked sequence — persist it to resume across a full reload. */
  getLastSeq(): number {
    return this.lastSeq
  }

  /** Open the stream (idempotent while already live). Resets the give-up counter. */
  open(): void {
    this.closedByUser = false
    if (this.source || this.status === 'connecting') return
    this.attempt = 0
    void this.dial()
  }

  /** Close the stream for good — cancels reconnect and tears down the source. */
  close(): void {
    this.closedByUser = true
    this.clearReconnect()
    this.teardownSource()
    this.setStatus('offline')
  }

  private async dial(): Promise<void> {
    this.setStatus(this.attempt === 0 ? 'connecting' : 'reconnecting')
    let token: string | null
    try {
      token = await this.opts.getToken()
    } catch (error) {
      this.report(error)
      this.scheduleReconnect()
      return
    }
    if (this.closedByUser) return
    if (!token) {
      // No credential → an unauthenticated stream would be refused; back off and retry.
      this.report(new Error('NO_TOKEN'))
      this.scheduleReconnect()
      return
    }

    let source: RealtimeEventSource
    try {
      source = this.factory(buildStreamUrl(this.opts.baseUrl, this.opts.path, token, this.lastSeq))
    } catch (error) {
      this.report(error)
      this.scheduleReconnect()
      return
    }
    this.source = source

    source.onopen = () => this.handleOpen()
    source.onerror = (error) => this.handleError(error)
    source.addEventListener(EVENT_NAME, (event) => this.handleMessage(event.data))
  }

  private handleOpen(): void {
    this.attempt = 0
    this.setStatus('online')
  }

  private handleMessage(raw: string): void {
    const event = decodeServerEvent(raw)
    if (!event) {
      // Malformed/off-schema frame — drop it; one bad frame never tears down a healthy stream.
      this.report(new Error('BAD_FRAME'))
      return
    }
    if (event.seq <= this.lastSeq) {
      // A replayed/duplicate event (e.g. overlap after a resume) — already delivered; ignore.
      return
    }
    // Ack BEFORE delivery so a consumer exception cannot rewind the cursor and replay forever.
    this.lastSeq = event.seq
    this.opts.onEvent?.(event)
  }

  /** Any SSE error (server reject, network drop) → reconnect with backoff unless the user closed. */
  private handleError(error?: unknown): void {
    if (error) this.report(error)
    if (this.closedByUser) {
      this.setStatus('offline')
      return
    }
    this.scheduleReconnect()
  }

  private scheduleReconnect(): void {
    this.teardownSource()
    const max = this.opts.backoff.maxRetries
    if (max !== null && this.attempt >= max) {
      this.setStatus('offline')
      return
    }
    this.setStatus('reconnecting')
    const delay = backoffDelay(this.attempt, this.opts.backoff, this.rand)
    this.attempt += 1
    this.clearReconnect()
    this.reconnectHandle = this.timers.setTimeout(() => {
      this.reconnectHandle = null
      if (!this.closedByUser) void this.dial()
    }, delay)
  }

  private teardownSource(): void {
    const source = this.source
    if (!source) return
    this.source = null
    source.onopen = null
    source.onerror = null
    try {
      source.close()
    } catch {
      // closing an already-dead source is a no-op for us
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return
    this.status = status
    this.opts.onStatus?.(status)
  }

  private clearReconnect(): void {
    if (this.reconnectHandle != null) {
      this.timers.clearTimeout(this.reconnectHandle)
      this.reconnectHandle = null
    }
  }

  private report(error: unknown): void {
    // Surface a short, non-sensitive code only — never token bytes or payloads. Our internal sentinel
    // errors carry the code as the message; foreign errors fall back to their class name.
    const code =
      error instanceof Error
        ? error.message && error.name === 'Error'
          ? error.message
          : error.name || 'UNKNOWN'
        : 'UNKNOWN'
    this.opts.onError?.(code)
  }
}
