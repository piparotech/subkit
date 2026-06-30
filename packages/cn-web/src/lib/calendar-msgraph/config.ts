import { z } from 'zod'

/**
 * The `calendar-msgraph` module's `config.schema` — the contract for `modules[].config` in a
 * Blueprint. The typed, customer/cockpit-facing switch surface: which optional scopes are requested,
 * sync cadence, conflict policy, and screen copy. Secrets (Azure client secret, token-encryption key)
 * are NEVER config — they come from server env. Validated by generator-core.
 */

/** Optional Graph scopes beyond the always-on Calendars.ReadWrite (capability default + extensions). */
export const GraphScopes = z.strictObject({
  /** Mail.Read — surface the mail-derived use-case. Default off. */
  mail: z.boolean().default(false),
  /** User.Read — read the signed-in user's profile. Default off. */
  profile: z.boolean().default(false),
})
export type GraphScopes = z.infer<typeof GraphScopes>

export const ConflictPolicy = z.enum(['flag', 'preferLocal', 'preferRemote'])
export type ConflictPolicy = z.infer<typeof ConflictPolicy>

/** Customer-editable copy (the Cockpit may edit these; see calendarMsgraphConfigRights). */
export const CalendarTexts = z.strictObject({
  calendarTitle: z.string().default('Kalender'),
  connectButton: z.string().default('Mit Microsoft 365 verbinden'),
  syncButton: z.string().default('Jetzt synchronisieren'),
  conflictBanner: z.string().default('Termin wurde in beiden Kalendern geändert'),
  emptyTitle: z.string().default('Keine Termine'),
  emptyBody: z.string().default('Verbinde deinen Microsoft-365-Kalender, um Termine zu sehen.'),
})
export type CalendarTexts = z.infer<typeof CalendarTexts>

export const CalendarMsgraphConfig = z.strictObject({
  scopes: GraphScopes.default(() => GraphScopes.parse({})),
  /**
   * How conflicting edits (changed in app AND Microsoft 365 since the last sync) are handled. The
   * capability mandates detect+log; `flag` (default) surfaces them for resolution, the others apply a
   * deterministic last-writer policy. None of them silently lose data without a record.
   */
  conflictPolicy: ConflictPolicy.default('flag'),
  /** Minimum minutes between automatic background syncs (manual sync always allowed). */
  syncIntervalMinutes: z.number().int().min(5).max(1440).default(15),
  texts: CalendarTexts.default(() => CalendarTexts.parse({})),
})
export type CalendarMsgraphConfig = z.infer<typeof CalendarMsgraphConfig>

/**
 * Rights model ("wer darf bedienen") — per config path: `customer` = editable in the Cockpit,
 * `piparo` = piparo-only.
 */
export type EditableBy = 'piparo' | 'customer'
export const calendarMsgraphConfigRights: Record<string, EditableBy> = {
  scopes: 'piparo',
  conflictPolicy: 'piparo',
  syncIntervalMinutes: 'customer',
  texts: 'customer',
}

/** Parse + validate a calendar-msgraph module config (returns the Zod safeParse result). */
export function parseCalendarMsgraphConfig(input: unknown) {
  return CalendarMsgraphConfig.safeParse(input)
}
