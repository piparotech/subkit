import { z } from 'zod'

/**
 * The shared resource contract for the reference API (a minimal owner-scoped "notes" resource). It
 * exists to demonstrate the four capability guarantees on a real surface:
 *   - typed, schema-validated body / query / params (AC1),
 *   - an end-to-end typed client bridge with no manual type duplication (AC2),
 *   - an OpenAPI document that mirrors the live validation (AC3),
 *   - consistent error to status mapping (AC4).
 *
 * On the platform the route validation is expressed once in Elysia's schemas so it drives
 * validation + OpenAPI + the Eden types from a single source. These Zod mirrors are the isomorphic,
 * node-runnable half: they make the pure shape rules testable offline, and the error codes are the
 * contract both sides agree on.
 */

/** Stable error codes the server returns and the client maps — one vocabulary, no magic strings. */
export const ApiErrorCode = {
  Validation: 'VALIDATION',
  Unauthorized: 'INVALID_TOKEN',
  NotFound: 'NOT_FOUND',
  Internal: 'INTERNAL_SERVER_ERROR',
} as const
export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode]

/** The HTTP status each error code maps to — the server's consistent error to status table (AC4). */
export const errorStatus: Record<ApiErrorCode, number> = {
  [ApiErrorCode.Validation]: 422,
  [ApiErrorCode.Unauthorized]: 401,
  [ApiErrorCode.NotFound]: 404,
  [ApiErrorCode.Internal]: 500,
}

/** The persisted shape of a note as returned by the API. */
export const Note = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  body: z.string(),
  createdAt: z.string(), // ISO-8601
})
export type Note = z.infer<typeof Note>

/** A page of notes with an opaque cursor for the next page (null = last page). */
export const NotePage = z.strictObject({
  items: z.array(Note),
  nextCursor: z.string().nullable(),
})
export type NotePage = z.infer<typeof NotePage>

/** Create-note body — the title is required and bounded; the body is optional free text. */
export const CreateNoteInput = z.strictObject({
  title: z.string().trim().min(1).max(120),
  body: z.string().max(10_000).optional(),
})
export type CreateNoteInput = z.infer<typeof CreateNoteInput>

/** List query — all optional, but each bounded; an out-of-range `limit` is a 4xx (AC1). */
export const ListNotesQuery = z.strictObject({
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().min(1).optional(),
  q: z.string().trim().min(1).max(120).optional(),
})
export type ListNotesQuery = z.infer<typeof ListNotesQuery>

/** Parse helpers (Zod safeParse results) — used by the client and the in-memory route handler. */
export const parseCreateNoteInput = (input: unknown) => CreateNoteInput.safeParse(input)
export const parseListNotesQuery = (input: unknown) => ListNotesQuery.safeParse(input)
export const parseNote = (input: unknown) => Note.parse(input)
export const parseNotePage = (input: unknown) => NotePage.parse(input)
