import { z } from 'zod'

/**
 * The shared calendar-event schema — the single source validated on BOTH client (inline form errors,
 * UX) and server (authoritative re-validation). One schema, no drift. This is the app-side ("local")
 * representation; the Microsoft-Graph wire shape is mapped to/from it in `graph.ts`.
 */

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/

/** A timezone-aware instant accepted as an ISO-8601 string (with or without offset/zone). */
const isoInstant = z.string().regex(ISO_DATETIME, 'Datum/Uhrzeit als ISO-8601 angeben')

/**
 * A user's editable event. `start` must precede `end`. `id` is the local row id; `graphId` links to
 * the Microsoft-365 event (null until first pushed). All times are stored UTC ISO strings.
 */
export const CalendarEvent = z
  .strictObject({
    id: z.string().min(1),
    graphId: z.string().min(1).nullable(),
    subject: z.string().trim().min(1, 'Titel darf nicht leer sein').max(255),
    body: z.string().trim().max(8000).nullable(),
    location: z.string().trim().max(255).nullable(),
    start: isoInstant,
    end: isoInstant,
    isAllDay: z.boolean(),
    /** Monotonic local revision; bumped on every local edit. Drives conflict detection vs. Graph. */
    revision: z.number().int().nonnegative(),
    /** ETag of the Graph event we last reconciled against (null until first synced). */
    graphEtag: z.string().min(1).nullable(),
    updatedAt: isoInstant,
  })
  .refine((e) => Date.parse(e.start) < Date.parse(e.end), {
    message: 'Ende muss nach dem Beginn liegen',
    path: ['end'],
  })
export type CalendarEvent = z.infer<typeof CalendarEvent>

/** The create payload's field shapes (no cross-field refinement) — reused for inline field checks. */
export const CalendarEventCreateShape = z.strictObject({
  subject: z.string().trim().min(1, 'Titel darf nicht leer sein').max(255),
  body: z.string().trim().max(8000).nullable().default(null),
  location: z.string().trim().max(255).nullable().default(null),
  start: isoInstant,
  end: isoInstant,
  isAllDay: z.boolean().default(false),
})

/** The payload to create a local event (client → server). Server assigns id/revision/graph fields. */
export const CalendarEventCreate = CalendarEventCreateShape.refine(
  (e) => Date.parse(e.start) < Date.parse(e.end),
  { message: 'Ende muss nach dem Beginn liegen', path: ['end'] },
)
export type CalendarEventCreate = z.infer<typeof CalendarEventCreate>

/** A partial update to an existing local event (PATCH semantics; only provided keys change). */
export const CalendarEventUpdate = z.strictObject({
  subject: z.string().trim().min(1, 'Titel darf nicht leer sein').max(255).optional(),
  body: z.string().trim().max(8000).nullable().optional(),
  location: z.string().trim().max(255).nullable().optional(),
  start: isoInstant.optional(),
  end: isoInstant.optional(),
  isAllDay: z.boolean().optional(),
})
export type CalendarEventUpdate = z.infer<typeof CalendarEventUpdate>

export function parseCalendarEventCreate(input: unknown) {
  return CalendarEventCreate.safeParse(input)
}

export function parseCalendarEventUpdate(input: unknown) {
  return CalendarEventUpdate.safeParse(input)
}

/** Validate a single create-field against the shared schema → field-precise message (client inline). */
export function validateCreateField<K extends keyof CalendarEventCreate>(
  key: K,
  value: unknown,
): string | null {
  const field = CalendarEventCreateShape.shape[key]
  const result = field.safeParse(value)
  return result.success ? null : (result.error.issues[0]?.message ?? 'Ungültiger Wert')
}
