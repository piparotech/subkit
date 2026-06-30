// In-memory mock of the roles-permissions seam (the injected RolesClient) so the RBAC module is
// fully interactive in the showcase without a live server. The Engine normally talks to
// `/me/permissions` + `/admin/roles` via fetch with the auth session's getToken; here that surface
// is a deterministic in-memory store backed by the default config matrix.
//
// Seeded matrix (smartcoach vocabulary): coach / assistant / manager / admin.
// Seeded assignments: u-amal -> admin, u-ben -> coach, u-cara -> assistant, u-dana -> manager.
// The acting user is whoever the demo currently impersonates; getMyPermissions() resolves their
// grants FRESH from the store, so an admin grant/revoke applies on the next read without re-login
// (capability AC-3).
import {
  type Grants,
  type RolesClient,
  RolesConfig,
  RolesError,
  grantsFor,
  toRoleMatrix,
} from '@/lib/roles-permissions'

export const DEMO_CONFIG = RolesConfig.parse({})
export const DEMO_MATRIX = toRoleMatrix(DEMO_CONFIG)
export const DEMO_ROLES = Object.keys(DEMO_MATRIX)

/** Every permission the matrix grants, sorted and de-duplicated, for the gate panel. */
export const ALL_PERMISSIONS = [...new Set(Object.values(DEMO_MATRIX).flat())].sort()

export type DemoUser = { authSubject: string; name: string }

/** The demo identities; the first one (admin) is the default acting user. */
export const DEMO_USERS = [
  { authSubject: 'u-amal', name: 'Amal' },
  { authSubject: 'u-ben', name: 'Ben' },
  { authSubject: 'u-cara', name: 'Cara' },
  { authSubject: 'u-dana', name: 'Dana' },
] as const satisfies readonly DemoUser[]

/** The default acting user (admin) — explicit so its presence is not index-narrowed away. */
export const DEFAULT_SUBJECT = 'u-amal'

const seededRoles: Record<string, string> = {
  'u-amal': 'admin',
  'u-ben': 'coach',
  'u-cara': 'assistant',
  'u-dana': 'manager',
}

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms))

export type MockRolesStore = {
  /** A RolesClient bound to a live acting user — getMyPermissions resolves that user's grants. */
  client: RolesClient
  /** Switch the acting user (the demo's identity selector). */
  setCurrentSubject: (authSubject: string) => void
  /** A user's resolved grants, read straight from the store (no network). */
  grantsOf: (authSubject: string) => Grants
}

/** A deterministic, offline RolesClient backed by an in-memory role map. */
export function createMockRolesStore(): MockRolesStore {
  const roles = new Map<string, string>(Object.entries(seededRoles))
  let current = DEFAULT_SUBJECT

  const grantsOf = (authSubject: string): Grants =>
    grantsFor(DEMO_MATRIX, roles.get(authSubject) ?? DEMO_CONFIG.defaultRole)

  const requireManager = () => {
    if (!grantsOf(current).permissions.includes(DEMO_CONFIG.manageRolesPermission)) {
      throw new RolesError(403, 'FORBIDDEN')
    }
  }

  const client: RolesClient = {
    async getMyPermissions() {
      await delay()
      return grantsOf(current)
    },

    async listAssignments() {
      await delay()
      requireManager()
      return [...roles.entries()]
        .map(([authSubject, role]) => ({ authSubject, role }))
        .sort((a, b) => a.authSubject.localeCompare(b.authSubject))
    },

    async assign(authSubject, role) {
      await delay()
      requireManager()
      if (!(role in DEMO_MATRIX)) throw new RolesError(400, 'UNKNOWN_ROLE')
      roles.set(authSubject, role)
      return { authSubject, role }
    },

    async revoke(authSubject) {
      await delay()
      requireManager()
      roles.delete(authSubject)
    },
  }

  return {
    client,
    setCurrentSubject: (authSubject) => {
      current = authSubject
    },
    grantsOf,
  }
}
