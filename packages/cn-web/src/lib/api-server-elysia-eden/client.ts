import type { CreateNoteInput, ListNotesQuery, Note, NotePage } from './contract'

/**
 * The isomorphic API client surface (Engine) — one fetch surface for web + native. On the platform
 * it is `treaty<App>`, typed END-TO-END from the server's exported `App` type via Eden Treaty so
 * request and response types cannot drift from the live routes (AC2). That binding pulls in the
 * backend `App` type, which is not vendored into the showcase; here the same surface is typed from
 * the shared contract instead, so the in-memory seam plugs into the exact methods the Eden façade
 * exposes. The host supplies `getToken` (the auth module's session); the client never owns auth
 * state, the bearer is injected per request.
 */
export type ApiClientOptions = {
  baseUrl: string
  /** Returns a fresh access token (sync or async); null = unauthenticated. */
  getToken?: () => Promise<string | null> | string | null
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
    this.name = 'ApiError'
  }
}

/** The throw-on-error façade over the typed routes — the single surface a host consumes. */
export type ApiClient = {
  listNotes(query?: ListNotesQuery): Promise<NotePage>
  createNote(input: CreateNoteInput): Promise<Note>
  getNote(id: string): Promise<Note>
  deleteNote(id: string): Promise<void>
}
