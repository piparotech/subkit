import { z } from 'zod'

import type { Grants } from './rbac'

/**
 * The isomorphic roles client (Engine) — one fetch surface for web + native. The host supplies a
 * `getToken` (the auth module's session controller) so the client never owns auth state. Responses
 * are re-validated against the shared wire schema, so a drifted backend surfaces as a typed error.
 *
 * Two concerns:
 *  - `getMyPermissions()` — what the CURRENT user may do (drives the UI gate; re-fetched after a
 *    role change so new rights apply without re-login).
 *  - `listAssignments()` / `assign()` / `revoke()` — the admin surface (itself permission-gated
 *    server-side; a non-admin caller gets 403).
 */

/** The current user's resolved grants (role + permissions). */
export const MyPermissions = z.strictObject({
  role: z.string().nullable(),
  permissions: z.array(z.string()),
})
export type MyPermissions = z.infer<typeof MyPermissions>

/** One user's role assignment (admin view). */
export const RoleAssignment = z.strictObject({
  authSubject: z.string(),
  role: z.string(),
})
export type RoleAssignment = z.infer<typeof RoleAssignment>

const RoleAssignmentList = z.array(RoleAssignment)

/** The assign payload (PUT /admin/roles) — shared so client and server validate it identically. */
export const AssignRequest = z.strictObject({
  authSubject: z.string().trim().min(1),
  role: z.string().trim().min(1),
})
export type AssignRequest = z.infer<typeof AssignRequest>

export function parseAssignRequest(input: unknown) {
  return AssignRequest.safeParse(input)
}

export type RolesClientOptions = {
  baseUrl: string
  /** Returns a fresh access token (sync or async); null = unauthenticated. */
  getToken: () => Promise<string | null> | string | null
}

export type RolesClient = {
  /** The current user's grants — drives the UI gate. */
  getMyPermissions(): Promise<Grants>
  /** Admin: list every user's role assignment. */
  listAssignments(): Promise<RoleAssignment[]>
  /** Admin: assign `role` to `authSubject` (idempotent upsert). */
  assign(authSubject: string, role: string): Promise<RoleAssignment>
  /** Admin: remove any role from `authSubject`. */
  revoke(authSubject: string): Promise<void>
}

export class RolesError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
    this.name = 'RolesError'
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

export function createRolesClient(opts: RolesClientOptions): RolesClient {
  const base = opts.baseUrl.replace(/\/$/, '')
  const url = (path: string) => `${base}${path}`

  async function authHeaders(): Promise<Record<string, string>> {
    const token = await opts.getToken()
    return token ? { authorization: `Bearer ${token}` } : {}
  }

  return {
    async getMyPermissions() {
      const res = await fetch(url('/me/permissions'), { headers: await authHeaders() })
      if (!res.ok) throw new RolesError(res.status, await codeOf(res))
      const parsed = MyPermissions.parse(await res.json())
      return { role: parsed.role ?? null, permissions: parsed.permissions }
    },

    async listAssignments() {
      const res = await fetch(url('/admin/roles'), { headers: await authHeaders() })
      if (!res.ok) throw new RolesError(res.status, await codeOf(res))
      return RoleAssignmentList.parse(await res.json())
    },

    async assign(authSubject, role) {
      const res = await fetch(url('/admin/roles'), {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ authSubject, role }),
      })
      if (!res.ok) throw new RolesError(res.status, await codeOf(res))
      return RoleAssignment.parse(await res.json())
    },

    async revoke(authSubject) {
      const res = await fetch(url(`/admin/roles/${encodeURIComponent(authSubject)}`), {
        method: 'DELETE',
        headers: await authHeaders(),
      })
      if (!res.ok && res.status !== 204) throw new RolesError(res.status, await codeOf(res))
    },
  }
}
