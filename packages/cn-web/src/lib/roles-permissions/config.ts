import { z } from 'zod'

import type { Permission, RoleMatrix } from './rbac'

/**
 * The `roles-permissions` module's `config.schema` — the contract for `modules[].config` in a
 * Blueprint, and the typed customer/cockpit-facing switch surface. It declares the project's role
 * vocabulary, the role→permission matrix (the authorization source of truth), the default role new
 * users get, the permission that gates the admin role-management surface, and the Shell copy.
 *
 * The matrix here is the SAME object the Engine's `can()` decides against on both client and
 * server — define it once, no drift. Validated by generator-core.
 */

const idRe = /^[a-z][a-z0-9]*([:_-][a-z0-9]+)*$/

/** A role identifier: lowercase, segments separated by `:` `_` `-` (e.g. `manager`, `team-lead`). */
const RoleId = z.string().regex(idRe, 'Rollen-ID wie "manager" oder "team-lead"')
/** A permission identifier (e.g. `content:edit`, `roles:manage`). */
const PermissionId = z.string().regex(idRe, 'Rechte-ID wie "content:edit"')

/** Customer-editable copy (the Cockpit may edit these; see rolesConfigRights). */
export const RolesTexts = z.strictObject({
  manageTitle: z.string().default('Rollen & Rechte'),
  roleLabel: z.string().default('Rolle'),
  assignButton: z.string().default('Rolle zuweisen'),
  revokeButton: z.string().default('Rolle entziehen'),
  noRole: z.string().default('Keine Rolle'),
  forbidden: z.string().default('Dafür fehlt dir die Berechtigung.'),
})
export type RolesTexts = z.infer<typeof RolesTexts>

export const RolesConfig = z
  .strictObject({
    /**
     * role → granted permissions. The authorization matrix decided against on client AND server.
     * Default mirrors the smartcoach reference (Coach/Assistant/Manager) plus an `admin` role that
     * may manage roles.
     */
    matrix: z.record(RoleId, z.array(PermissionId)).default(() => ({
      coach: ['content:read', 'content:edit', 'roster:read'],
      assistant: ['content:read', 'roster:read'],
      manager: ['content:read', 'content:edit', 'roster:read', 'roster:edit'],
      admin: ['content:read', 'content:edit', 'roster:read', 'roster:edit', 'roles:manage'],
    })),
    /** The role assigned to a user who has none yet (null = no implicit role). */
    defaultRole: RoleId.nullable().default(null),
    /** The permission a caller must hold to assign/revoke roles via the admin endpoints. */
    manageRolesPermission: PermissionId.default('roles:manage'),
    texts: RolesTexts.default(() => RolesTexts.parse({})),
  })
  .refine((cfg) => cfg.defaultRole === null || cfg.defaultRole in cfg.matrix, {
    message: 'defaultRole muss eine in der Matrix definierte Rolle sein',
    path: ['defaultRole'],
  })
  .refine(
    (cfg) => Object.values(cfg.matrix).some((perms) => perms.includes(cfg.manageRolesPermission)),
    {
      message:
        'manageRolesPermission muss mindestens einer Rolle zugeordnet sein (sonst kann niemand Rollen verwalten)',
      path: ['manageRolesPermission'],
    },
  )
export type RolesConfig = z.infer<typeof RolesConfig>

/** The matrix shape the Engine's `can()` consumes (readonly view of `config.matrix`). */
export function toRoleMatrix(cfg: RolesConfig): RoleMatrix {
  return cfg.matrix as Record<string, readonly Permission[]>
}

/**
 * Rights model ("wer darf bedienen") — per config path: `customer` = editable in the Cockpit,
 * `piparo` = piparo-only. The authorization matrix and the manage-gate are security-critical, so
 * they stay piparo-owned; only the user-facing copy is customer-editable.
 */
export type EditableBy = 'piparo' | 'customer'
export const rolesConfigRights: Record<string, EditableBy> = {
  matrix: 'piparo',
  defaultRole: 'piparo',
  manageRolesPermission: 'piparo',
  texts: 'customer',
}

/** Parse + validate a roles-permissions module config (returns the Zod safeParse result). */
export function parseRolesConfig(input: unknown) {
  return RolesConfig.safeParse(input)
}
