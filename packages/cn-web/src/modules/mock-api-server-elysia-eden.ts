// In-memory seam for the api-server-elysia-eden Engine: a deterministic ApiClient standing in for
// the platform's Elysia backend. The pure core (notes.ts) and the shared contract (contract.ts) run
// unchanged in the browser; this module is the authoritative server half. Every method validates its
// input against the Zod contract (AC1), runs the pure filter/sort/paginate core, maps thrown errors
// onto the contract's status table (AC4), and the OpenAPI document mirrors those exact routes (AC3).
// The bearer token is required, exactly as the auth-gated backend behaves, so an unauthenticated
// call fails with INVALID_TOKEN 401.
//
// Seeding: a fixed owner inbox of six notes with deterministic ids and timestamps, newest first, so
// the list, the `q` filter and cursor pagination all tell the same story on every run.
import {
  type ApiClient,
  ApiError,
  ApiErrorCode,
  type ApiServerConfig,
  type CreateNoteInput,
  type ListNotesQuery,
  type Note,
  errorStatus,
  newNoteId,
  parseApiServerConfig,
  parseCreateNoteInput,
  parseListNotesQuery,
  selectPage,
} from '@/lib/api-server-elysia-eden'

const VALID_TOKEN = 'demo-session-token'

const delay = (ms = 140) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function fail(code: ApiErrorCode): never {
  throw new ApiError(errorStatus[code], code)
}

/** A deterministic seed: six notes, fixed ids, descending minutes so the order is stable. */
function seedNotes(): Note[] {
  const day = '2026-06-26T'
  return [
    {
      id: 'note_seed_01',
      title: 'Sprint review notes',
      body: 'Demoed the typed API bridge end to end.',
      createdAt: `${day}09:05:00.000Z`,
    },
    {
      id: 'note_seed_02',
      title: 'OpenAPI contract published',
      body: 'Spec mirrors the live routes and their validation.',
      createdAt: `${day}09:18:00.000Z`,
    },
    {
      id: 'note_seed_03',
      title: 'Pagination guardrails',
      body: 'limit is capped server side; an out-of-range value is rejected.',
      createdAt: `${day}09:31:00.000Z`,
    },
    {
      id: 'note_seed_04',
      title: 'Error mapping table',
      body: 'Every thrown code maps onto one consistent status.',
      createdAt: `${day}09:47:00.000Z`,
    },
    {
      id: 'note_seed_05',
      title: 'Eden treaty client',
      body: 'Request and response types derive from the server, no duplication.',
      createdAt: `${day}10:02:00.000Z`,
    },
    {
      id: 'note_seed_06',
      title: 'Schema validation',
      body: 'Body, query and params are checked before any handler runs.',
      createdAt: `${day}10:20:00.000Z`,
    },
  ]
}

/** The module config the demo runs under; its pagination guardrails drive the list route. */
export const DEMO_CONFIG: ApiServerConfig = (() => {
  const parsed = parseApiServerConfig({
    openapi: { title: 'piparo Notes API', version: '1.0.0' },
    pagination: { defaultLimit: 3, maxLimit: 10 },
  })
  if (!parsed.success) throw new Error('invalid demo config')
  return parsed.data
})()

/** A minimal OpenAPI document generated from the live routes — what the backend exposes (AC3). */
export function openApiDocument(config: ApiServerConfig = DEMO_CONFIG) {
  return {
    openapi: '3.1.0',
    info: { title: config.openapi.title, version: config.openapi.version },
    paths: {
      '/notes': {
        get: { summary: 'List notes', parameters: ['limit', 'cursor', 'q'] },
        post: { summary: 'Create note', requestBody: 'CreateNoteInput' },
      },
      '/notes/{id}': {
        get: { summary: 'Get note', parameters: ['id'] },
        delete: { summary: 'Delete note', parameters: ['id'] },
      },
    },
  }
}

export type AuthMode = 'authenticated' | 'unauthenticated'

/**
 * A deterministic, offline ApiClient backed by an in-memory note table. It is the server: it
 * authenticates the bearer, validates against the contract, runs the pure core and maps failures to
 * the status table. `mode` lets the demo flip the injected token to provoke a 401.
 */
export function createMockApiClient(
  config: ApiServerConfig = DEMO_CONFIG,
  mode: AuthMode = 'authenticated',
): ApiClient {
  const table = new Map<string, Note>(seedNotes().map((note) => [note.id, note]))
  let sequence = 0

  function authenticate(): void {
    const token = mode === 'authenticated' ? VALID_TOKEN : null
    if (token !== VALID_TOKEN) fail(ApiErrorCode.Unauthorized)
  }

  return {
    async listNotes(query: ListNotesQuery = {}) {
      await delay()
      authenticate()
      const parsed = parseListNotesQuery(query)
      if (!parsed.success) fail(ApiErrorCode.Validation)
      const limit = parsed.data.limit ?? config.pagination.defaultLimit
      if (limit > config.pagination.maxLimit) fail(ApiErrorCode.Validation)
      return selectPage([...table.values()], {
        q: parsed.data.q,
        cursor: parsed.data.cursor,
        limit,
      })
    },

    async createNote(input: CreateNoteInput) {
      await delay()
      authenticate()
      const parsed = parseCreateNoteInput(input)
      if (!parsed.success) fail(ApiErrorCode.Validation)
      const note: Note = {
        id: newNoteId(Date.now(), () => (sequence++ % 997) / 997),
        title: parsed.data.title,
        body: parsed.data.body ?? '',
        createdAt: new Date().toISOString(),
      }
      table.set(note.id, note)
      return note
    },

    async getNote(id: string) {
      await delay()
      authenticate()
      const note = table.get(id)
      if (!note) fail(ApiErrorCode.NotFound)
      return note
    },

    async deleteNote(id: string) {
      await delay()
      authenticate()
      if (!table.delete(id)) fail(ApiErrorCode.NotFound)
    },
  }
}
