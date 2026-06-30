import { z } from 'zod'

import type { Membership, TeamRole } from './tenant'

/**
 * The isomorphic teams client (Engine) — one fetch surface for web + native. The host supplies a
 * `getToken` (the auth module's session controller) so the client never owns auth state. Responses
 * are re-validated against the shared wire schemas, so a drifted backend surfaces as a typed error.
 *
 * Concerns:
 *  - `myTeams()` — the teams the caller belongs to + their role per team (drives the team switcher,
 *    AC-2/AC-3). No `teamId` needed: keyed by the verified `sub`.
 *  - `createTeam()` / `joinByCode()` — start or join a team (AC-4).
 *  - per-team scoped data: `listItems(teamId)` / `addItem(teamId, body)` — the representative
 *    tenant-scoped resource (AC-1/AC-5). `teamId` is checked against membership server-side.
 *  - admin (needs `manageRole` in the team): `listMembers` / `createInvite` / `removeMember`.
 */

/** A team the caller belongs to, with their role in it (AC-3: role is per-team). */
export const MyTeam = z.strictObject({
  teamId: z.string(),
  name: z.string(),
  role: z.string(),
})
export type MyTeam = z.infer<typeof MyTeam>

const MyTeamList = z.array(MyTeam)

/** One member of a team (admin view). */
export const TeamMember = z.strictObject({
  teamId: z.string(),
  authSubject: z.string(),
  role: z.string(),
})
export type TeamMember = z.infer<typeof TeamMember>

const TeamMemberList = z.array(TeamMember)

/** A tenant-scoped data row — proves isolation: it always carries the `teamId` it belongs to. */
export const TeamItem = z.strictObject({
  id: z.string(),
  teamId: z.string(),
  body: z.string(),
})
export type TeamItem = z.infer<typeof TeamItem>

const TeamItemList = z.array(TeamItem)

/** A created invite (the code/magic-link arm of joining, AC-4). */
export const TeamInvite = z.strictObject({
  code: z.string(),
  teamId: z.string(),
  role: z.string(),
  expiresAt: z.string().nullable(),
})
export type TeamInvite = z.infer<typeof TeamInvite>

/** Create-team payload — shared so client and server validate it identically. */
export const CreateTeamRequest = z.strictObject({
  name: z.string().trim().min(1).max(120),
})
export type CreateTeamRequest = z.infer<typeof CreateTeamRequest>

export function parseCreateTeamRequest(input: unknown) {
  return CreateTeamRequest.safeParse(input)
}

/** Join-by-code payload. */
export const JoinRequest = z.strictObject({
  code: z.string().trim().min(1).max(64),
})
export type JoinRequest = z.infer<typeof JoinRequest>

export function parseJoinRequest(input: unknown) {
  return JoinRequest.safeParse(input)
}

/** Add-item payload (the scoped resource). */
export const AddItemRequest = z.strictObject({
  body: z.string().trim().min(1).max(1000),
})
export type AddItemRequest = z.infer<typeof AddItemRequest>

export function parseAddItemRequest(input: unknown) {
  return AddItemRequest.safeParse(input)
}

/** Create-invite payload — `role` optional (falls back to the config default member role). */
export const CreateInviteRequest = z.strictObject({
  role: z.string().trim().min(1).max(64).optional(),
})
export type CreateInviteRequest = z.infer<typeof CreateInviteRequest>

export function parseCreateInviteRequest(input: unknown) {
  return CreateInviteRequest.safeParse(input)
}

export type TeamsClientOptions = {
  baseUrl: string
  /** Returns a fresh access token (sync or async); null = unauthenticated. */
  getToken: () => Promise<string | null> | string | null
}

export type TeamsClient = {
  /** The caller's teams + per-team role — drives the team switcher (AC-2/AC-3). */
  myTeams(): Promise<MyTeam[]>
  /** Create a new team; the caller becomes its first member with the configured creator role. */
  createTeam(name: string): Promise<MyTeam>
  /** Join a team via a code/magic-link (AC-4) — returns the new membership. */
  joinByCode(code: string): Promise<MyTeam>
  /** List the caller's rows in `teamId` (tenant-scoped; 403 if not a member). */
  listItems(teamId: string): Promise<TeamItem[]>
  /** Add a row to `teamId` (tenant-scoped; 403 if not a member). */
  addItem(teamId: string, body: string): Promise<TeamItem>
  /** Admin: list `teamId`'s members (needs `manageRole` in that team). */
  listMembers(teamId: string): Promise<TeamMember[]>
  /** Admin: create a join invite for `teamId` (needs `manageRole`). */
  createInvite(teamId: string, role?: string): Promise<TeamInvite>
  /** Admin: remove a member from `teamId` (needs `manageRole`). */
  removeMember(teamId: string, authSubject: string): Promise<void>
}

export class TeamsError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
    this.name = 'TeamsError'
  }
}

async function codeOf(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { code?: string }
    return body.code ?? `HTTP_${res.status}`
  } catch {
    return `HTTP_${res.status}`
  }
}

/** Map a `MyTeam` to the Engine `Membership` shape (for `resolveScope`/`roleIn`). */
export function toMembership(team: MyTeam, authSubject: string): Membership {
  return { teamId: team.teamId, authSubject, role: team.role as TeamRole }
}

export function createTeamsClient(opts: TeamsClientOptions): TeamsClient {
  const base = opts.baseUrl.replace(/\/$/, '')
  const url = (path: string) => `${base}${path}`

  async function authHeaders(): Promise<Record<string, string>> {
    const token = await opts.getToken()
    return token ? { authorization: `Bearer ${token}` } : {}
  }

  async function jsonOrThrow<T>(res: Response, schema: z.ZodType<T>): Promise<T> {
    if (!res.ok) throw new TeamsError(res.status, await codeOf(res))
    return schema.parse(await res.json())
  }

  const seg = (teamId: string) => `/teams/${encodeURIComponent(teamId)}`

  return {
    async myTeams() {
      const res = await fetch(url('/teams'), { headers: await authHeaders() })
      return jsonOrThrow(res, MyTeamList)
    },

    async createTeam(name) {
      const res = await fetch(url('/teams'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ name }),
      })
      return jsonOrThrow(res, MyTeam)
    },

    async joinByCode(code) {
      const res = await fetch(url('/teams/join'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ code }),
      })
      return jsonOrThrow(res, MyTeam)
    },

    async listItems(teamId) {
      const res = await fetch(url(`${seg(teamId)}/items`), { headers: await authHeaders() })
      return jsonOrThrow(res, TeamItemList)
    },

    async addItem(teamId, body) {
      const res = await fetch(url(`${seg(teamId)}/items`), {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ body }),
      })
      return jsonOrThrow(res, TeamItem)
    },

    async listMembers(teamId) {
      const res = await fetch(url(`${seg(teamId)}/members`), { headers: await authHeaders() })
      return jsonOrThrow(res, TeamMemberList)
    },

    async createInvite(teamId, role) {
      const res = await fetch(url(`${seg(teamId)}/invites`), {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify(role ? { role } : {}),
      })
      return jsonOrThrow(res, TeamInvite)
    },

    async removeMember(teamId, authSubject) {
      const res = await fetch(url(`${seg(teamId)}/members/${encodeURIComponent(authSubject)}`), {
        method: 'DELETE',
        headers: await authHeaders(),
      })
      if (!res.ok && res.status !== 204) throw new TeamsError(res.status, await codeOf(res))
    },
  }
}
