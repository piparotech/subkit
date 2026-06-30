/**
 * The tenant-scoping core (Engine) — the single, isomorphic multi-tenant decision shared by BOTH
 * the server store (authoritative isolation) and the client (active-team selection, role-per-team
 * gating). One model, no drift: a user can be a member of many teams, holds a SEPARATE role per
 * team, and every data access is scoped to one team the caller actually belongs to.
 *
 * The central guarantee (capability AC-1/AC-5): tenant access is only ever expressed through a
 * `TenantScope` — a `{ teamId, authSubject, role }` triple that is ONLY produced by `resolveScope`
 * after confirming the caller has a membership in that team. There is no way to name a team you are
 * not a member of, so a query without a valid scope cannot return team-foreign rows. The role lives
 * on the membership (not on the user, not in the token), so "Coach in Team A" never implies anything
 * in Team B (AC-3), and switching the active team (AC-2) is just choosing a different scope — no
 * re-authentication, because the bearer identifies the user, and the membership identifies the team.
 */

/** A team identifier. */
export type TeamId = string
/** A role identifier, scoped to ONE membership (e.g. `"coach"`, `"manager"`). */
export type TeamRole = string

/** One user's membership in one team — the (team, user) edge that also carries the per-team role. */
export type Membership = {
  teamId: TeamId
  authSubject: string
  role: TeamRole
}

/**
 * A resolved, authorized tenant scope — the ONLY token that grants access to a team's data. It is
 * produced exclusively by `resolveScope` from a verified `authSubject` + the caller's memberships,
 * so holding one structurally proves membership in `teamId`. Pass it to every scoped query.
 */
export type TenantScope = {
  teamId: TeamId
  authSubject: string
  /** The caller's role IN THIS team (per-team; unrelated to any other team's role). */
  role: TeamRole
}

/** Raised when a caller tries to act in a team they are not a member of (maps to HTTP 403). */
export class TenantScopeError extends Error {
  readonly code: string
  constructor(code: string = 'NOT_A_MEMBER') {
    super(code)
    this.code = code
    this.name = 'TenantScopeError'
  }
}

/** Find the caller's membership in `teamId` among their memberships (null if none). */
export function membershipIn(
  memberships: readonly Membership[],
  teamId: TeamId,
): Membership | null {
  return memberships.find((m) => m.teamId === teamId) ?? null
}

/** The team ids the caller belongs to (the switchable set for the app's team picker, AC-2). */
export function teamIdsOf(memberships: readonly Membership[]): TeamId[] {
  return memberships.map((m) => m.teamId)
}

/** The caller's role in `teamId`, or null if they are not a member. Per-team by construction (AC-3). */
export function roleIn(memberships: readonly Membership[], teamId: TeamId): TeamRole | null {
  return membershipIn(memberships, teamId)?.role ?? null
}

/**
 * Resolve a `TenantScope` for `teamId` from the caller's memberships — the ONE gate into a team's
 * data. Throws `TenantScopeError` if the caller has no membership in that team, so a scope can only
 * ever name a team the caller actually belongs to (the AC-1/AC-5 isolation guarantee). The role on
 * the returned scope is the caller's role IN THIS team (AC-3).
 */
export function resolveScope(
  authSubject: string,
  memberships: readonly Membership[],
  teamId: TeamId,
): TenantScope {
  const membership = membershipIn(memberships, teamId)
  if (!membership) throw new TenantScopeError('NOT_A_MEMBER')
  return { teamId, authSubject, role: membership.role }
}

/**
 * Choose the active team when none is explicitly requested (AC-2 default): the requested team if the
 * caller is a member, else their first membership, else null (no teams yet). The app persists the
 * user's last choice and passes it back as `requestedTeamId`.
 */
export function pickActiveTeam(
  memberships: readonly Membership[],
  requestedTeamId?: TeamId | null,
): TeamId | null {
  if (requestedTeamId && membershipIn(memberships, requestedTeamId)) return requestedTeamId
  return memberships[0]?.teamId ?? null
}

const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * Generate a human-shareable team join code (the "code" arm of invite/code/magic-link, AC-4).
 * Avoids ambiguous characters (no O/0/I/1). `randomInt` is injected so the Engine stays isomorphic
 * and deterministically testable; the backend passes a CSPRNG-backed implementation.
 */
export function generateJoinCode(randomInt: (maxExclusive: number) => number, length = 8): string {
  let code = ''
  for (let i = 0; i < length; i += 1) {
    code += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)] ?? 'A'
  }
  return code
}

/** True if an invite is still usable: not past its expiry and not exhausted. */
export function isInviteUsable(
  invite: { expiresAt: Date | null; maxUses: number | null; uses: number },
  now: Date = new Date(),
): boolean {
  if (invite.expiresAt && invite.expiresAt.getTime() <= now.getTime()) return false
  if (invite.maxUses !== null && invite.uses >= invite.maxUses) return false
  return true
}
