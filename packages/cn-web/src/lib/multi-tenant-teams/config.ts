import { z } from 'zod'

/**
 * The `multi-tenant-teams` module's `config.schema` — the contract for `modules[].config` in a
 * Blueprint, and the typed customer/cockpit-facing switch surface. It declares the per-team role
 * vocabulary, which role a team creator and an invited member receive, how teams may be joined
 * (open code vs invite-only), the invite lifetime, and the Shell copy. Validated by generator-core.
 */

const roleRe = /^[a-z][a-z0-9]*([:_-][a-z0-9]+)*$/

/** A per-team role identifier: lowercase, segments separated by `:` `_` `-` (e.g. `coach`). */
const TeamRoleId = z.string().regex(roleRe, 'Rollen-ID wie "coach" oder "team-lead"')

/** Customer-editable copy (the Cockpit may edit these; see teamsConfigRights). */
export const TeamsTexts = z.strictObject({
  teamsTitle: z.string().default('Teams'),
  switchTitle: z.string().default('Team wechseln'),
  joinTitle: z.string().default('Team beitreten'),
  joinCodeLabel: z.string().default('Beitrittscode'),
  joinButton: z.string().default('Beitreten'),
  manageTitle: z.string().default('Mitglieder verwalten'),
  inviteButton: z.string().default('Einladung erstellen'),
  removeButton: z.string().default('Entfernen'),
  noTeams: z.string().default('Du bist noch in keinem Team'),
  forbidden: z.string().default('Dafür fehlt dir die Berechtigung in diesem Team.'),
})
export type TeamsTexts = z.infer<typeof TeamsTexts>

export const TeamsConfig = z
  .strictObject({
    /**
     * The per-team roles a membership may hold. The FIRST role is the implicit fallback; the role a
     * member gets via a code/invite is set on the invite. Default mirrors the smartcoach reference.
     */
    roles: z
      .array(TeamRoleId)
      .min(1, 'Mindestens eine Rolle definieren')
      .default(['coach', 'assistant', 'manager']),
    /** The role the creator of a team receives (must be one of `roles`). */
    creatorRole: TeamRoleId.default('manager'),
    /** The role a member receives when none is specified on the invite (must be one of `roles`). */
    defaultMemberRole: TeamRoleId.default('assistant'),
    /** The role required to manage members + create invites within a team (must be one of `roles`). */
    manageRole: TeamRoleId.default('manager'),
    /** Whether anyone holding a valid join code may join (false = invite/magic-link only). */
    allowJoinByCode: z.boolean().default(true),
    /** Invite lifetime in hours (the magic-link/code TTL). */
    inviteTtlHours: z.number().int().positive().max(8760).default(72),
    texts: TeamsTexts.default(() => TeamsTexts.parse({})),
  })
  .refine((cfg) => cfg.roles.includes(cfg.creatorRole), {
    message: 'creatorRole muss in roles enthalten sein',
    path: ['creatorRole'],
  })
  .refine((cfg) => cfg.roles.includes(cfg.defaultMemberRole), {
    message: 'defaultMemberRole muss in roles enthalten sein',
    path: ['defaultMemberRole'],
  })
  .refine((cfg) => cfg.roles.includes(cfg.manageRole), {
    message: 'manageRole muss in roles enthalten sein',
    path: ['manageRole'],
  })
export type TeamsConfig = z.infer<typeof TeamsConfig>

/**
 * Rights model ("wer darf bedienen") — per config path: `customer` = editable in the Cockpit,
 * `piparo` = piparo-only. The role vocabulary and the manage-gate are security-critical, so they
 * stay piparo-owned; the join policy/TTL and the user-facing copy are customer-editable.
 */
export type EditableBy = 'piparo' | 'customer'
export const teamsConfigRights: Record<string, EditableBy> = {
  roles: 'piparo',
  creatorRole: 'piparo',
  defaultMemberRole: 'piparo',
  manageRole: 'piparo',
  allowJoinByCode: 'customer',
  inviteTtlHours: 'customer',
  texts: 'customer',
}

/** Parse + validate a multi-tenant-teams module config (returns the Zod safeParse result). */
export function parseTeamsConfig(input: unknown) {
  return TeamsConfig.safeParse(input)
}
