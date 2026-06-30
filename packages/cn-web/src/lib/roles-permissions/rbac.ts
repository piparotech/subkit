/**
 * The RBAC core (Engine) — the single, isomorphic authorization decision shared by BOTH the
 * server guard (authoritative HTTP 403) and the client UI gate (hide disallowed actions). One
 * matrix, one `can()`, no drift: the screen never offers what the server would reject, and the
 * server never relies on the client having hidden it.
 *
 * A `RoleMatrix` maps each role to the set of permission strings it grants. Roles and permissions
 * are plain strings (declared in the module config), so a project picks its own vocabulary
 * (e.g. coach/assistant/manager + content:edit) without touching the Engine.
 *
 * Authorization is decided against the role currently stored for the user (read fresh on every
 * request, NOT carried in the token) — so an admin granting/revoking a role takes effect on the
 * user's very next request, with no re-login (capability AC-3).
 */

/** A role identifier (e.g. `"manager"`). */
export type Role = string
/** A permission identifier (e.g. `"content:edit"`, `"roles:manage"`). */
export type Permission = string

/** role → the permissions it grants. The authorization source of truth. */
export type RoleMatrix = Record<Role, readonly Permission[]>

/** A resolved view of one user's authorization: their role plus the permissions it grants. */
export type Grants = {
  role: Role | null
  permissions: readonly Permission[]
}

/** True if `matrix` defines `role` as a known role. */
export function isKnownRole(matrix: RoleMatrix, role: string): boolean {
  return Object.prototype.hasOwnProperty.call(matrix, role)
}

/** The permissions a role grants (empty for an unknown or null role). */
export function permissionsFor(matrix: RoleMatrix, role: Role | null): readonly Permission[] {
  if (role === null || !isKnownRole(matrix, role)) return []
  return matrix[role] ?? []
}

/** Resolve a user's full grants from their stored role. */
export function grantsFor(matrix: RoleMatrix, role: Role | null): Grants {
  return { role, permissions: permissionsFor(matrix, role) }
}

/**
 * The core decision: does this user (by role) hold `permission`? Used identically client- and
 * server-side. A null/unknown role holds nothing.
 */
export function can(matrix: RoleMatrix, role: Role | null, permission: Permission): boolean {
  return permissionsFor(matrix, role).includes(permission)
}

/** `can` for a list of permissions — true only if the role holds EVERY one (AND semantics). */
export function canAll(
  matrix: RoleMatrix,
  role: Role | null,
  permissions: readonly Permission[],
): boolean {
  return permissions.every((permission) => can(matrix, role, permission))
}

/** `can` for a list of permissions — true if the role holds ANY one (OR semantics). */
export function canAny(
  matrix: RoleMatrix,
  role: Role | null,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((permission) => can(matrix, role, permission))
}

/** Decide against an already-resolved permission set (e.g. the `/me/permissions` response). */
export function grantsAllow(grants: Grants, permission: Permission): boolean {
  return grants.permissions.includes(permission)
}
