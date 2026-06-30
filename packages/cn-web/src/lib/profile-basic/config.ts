import { z } from 'zod'

/**
 * The `profile-basic` module's `config.schema` — the contract for `modules[].config` in a Blueprint.
 * The typed, customer/cockpit-facing switch surface (which fields are shown, whether self-service
 * account deletion is offered, screen copy). Validated by generator-core.
 */

/** Which optional master-data fields the profile exposes (displayName is always present). */
export const ProfileFields = z.strictObject({
  bio: z.boolean().default(true),
  avatar: z.boolean().default(true),
  locale: z.boolean().default(true),
})
export type ProfileFields = z.infer<typeof ProfileFields>

/** Customer-editable copy (the Cockpit may edit these; see profileConfigRights). */
export const ProfileTexts = z.strictObject({
  profileTitle: z.string().default('Profil'),
  editTitle: z.string().default('Profil bearbeiten'),
  saveButton: z.string().default('Speichern'),
  deleteAccount: z.string().default('Konto löschen'),
  deleteConfirm: z.string().default('Wirklich löschen? Das kann nicht rückgängig gemacht werden.'),
})
export type ProfileTexts = z.infer<typeof ProfileTexts>

export const ProfileConfig = z.strictObject({
  fields: ProfileFields.default(() => ProfileFields.parse({})),
  /** Whether the Shell offers self-service account deletion (GDPR). Wired to the host seam. */
  allowAccountDeletion: z.boolean().default(true),
  texts: ProfileTexts.default(() => ProfileTexts.parse({})),
})
export type ProfileConfig = z.infer<typeof ProfileConfig>

/**
 * Rights model ("wer darf bedienen") — per config path: `customer` = editable in the Cockpit,
 * `piparo` = piparo-only.
 */
export type EditableBy = 'piparo' | 'customer'
export const profileConfigRights: Record<string, EditableBy> = {
  fields: 'piparo',
  allowAccountDeletion: 'piparo',
  texts: 'customer',
}

/** Parse + validate a profile-basic module config (returns the Zod safeParse result). */
export function parseProfileConfig(input: unknown) {
  return ProfileConfig.safeParse(input)
}
