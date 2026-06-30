import type { z } from 'zod'

/**
 * The validation seam — one Zod schema, used on BOTH client (inline UX) and server (authoritative).
 * `revalidate` is the server's mandatory re-check: the client prediction is never trusted.
 */

/** First error message per top-level field (field-precise inline errors). */
export type FieldErrors = Record<string, string>

/** Collapse a ZodError into one message per field (the first issue wins). */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_')
    if (!(key in out)) out[key] = issue.message
  }
  return out
}

export type Validated<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors }

/**
 * Authoritative server-side re-validation against the shared schema. Returns the parsed data or
 * field-precise errors — the route accepts only `ok: true` data, independent of the client.
 */
export function revalidate<T>(schema: z.ZodType<T>, input: unknown): Validated<T> {
  const result = schema.safeParse(input)
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, errors: fieldErrors(result.error) }
}
