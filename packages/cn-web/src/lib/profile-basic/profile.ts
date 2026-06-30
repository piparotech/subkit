import { z } from 'zod'

/**
 * The shared profile schema — the single source validated on BOTH client (inline form errors, UX)
 * and server (authoritative re-validation). One schema, no drift (the forms-validation principle).
 * Consumed by the Shell screens, the isomorphic client, and the backend.
 */

const localeRe = /^[a-z]{2}(-[A-Z]{2})?$/

/** A user's editable master data. All optional/nullable so a freshly created profile is valid. */
export const ProfileData = z.strictObject({
  displayName: z.string().trim().min(1, 'Name darf nicht leer sein').max(80).nullable(),
  bio: z.string().trim().max(500).nullable(),
  locale: z.string().regex(localeRe, 'Sprachcode wie "de" oder "de-DE"'),
  avatarUrl: z.url('Bitte eine gültige URL angeben').nullable(),
})
export type ProfileData = z.infer<typeof ProfileData>

/** The update payload (PUT /profile) — any subset of the editable fields. */
export const ProfileUpdate = ProfileData.partial()
export type ProfileUpdate = z.infer<typeof ProfileUpdate>

/** The defaults a never-edited profile reads back as. */
export const emptyProfile: ProfileData = {
  displayName: null,
  bio: null,
  locale: 'de',
  avatarUrl: null,
}

/** Validate a single field against the shared schema → field-precise error message (client inline). */
export function validateField<K extends keyof ProfileData>(key: K, value: unknown): string | null {
  const result = ProfileData.shape[key].safeParse(value)
  return result.success ? null : (result.error.issues[0]?.message ?? 'Ungültiger Wert')
}

/** Validate an update payload (client pre-check + server authoritative). */
export function parseProfileUpdate(input: unknown) {
  return ProfileUpdate.safeParse(input)
}
