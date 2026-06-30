// In-memory mock of the multi-tenant-teams seam (the injected TeamsClient) so the module is fully
// interactive in the showcase without a live server. The Engine normally talks to `/teams/*` via
// fetch with the auth session's getToken; here that surface is a deterministic store scoped to one
// authenticated caller ("you").
//
// Seeded for the caller (SELF = "user:you"):
//  - Team "Falcons" (team-falcons) — role MANAGER   -> may manage members + create invites
//  - Team "Otters"  (team-otters)  — role ASSISTANT -> no manage rights (AC-3: role is per-team)
// Joinable code "DEMO2026" -> joins "Eagles" (team-eagles) as assistant (AC-4).
// Tenant isolation (AC-1/AC-5): listMembers/createInvite/removeMember on a team where you are not a
// manager throw 403 NOT_ALLOWED; any team you do not belong to throws 403 NOT_A_MEMBER.
import {
  type MyTeam,
  type TeamInvite,
  type TeamItem,
  type TeamMember,
  type TeamsClient,
  TeamsError,
} from '@/lib/multi-tenant-teams'

/** The authenticated caller of this demo. */
export const SELF = 'user:you'
/** The role that unlocks member management + invites in a team. */
export const MANAGE_ROLE = 'manager'
/** The code the join form accepts, surfaced so the demo can hint it without guessing. */
export const JOINABLE_CODE = 'DEMO2026'

/** Friendly display names for the seeded auth subjects (the wire only carries the subject). */
export const MEMBER_NAMES: Record<string, string> = {
  [SELF]: 'You',
  'user:lena': 'Lena',
  'user:marek': 'Marek',
  'user:sara': 'Sara',
  'user:owner': 'Owner',
}

export const memberName = (authSubject: string) => MEMBER_NAMES[authSubject] ?? authSubject

type SeedTeam = {
  team: MyTeam
  members: TeamMember[]
  items: TeamItem[]
}

const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms))

function initialTeams(): Map<string, SeedTeam> {
  const seed: SeedTeam[] = [
    {
      team: { teamId: 'team-falcons', name: 'Falcons', role: 'manager' },
      members: [
        { teamId: 'team-falcons', authSubject: SELF, role: 'manager' },
        { teamId: 'team-falcons', authSubject: 'user:lena', role: 'assistant' },
        { teamId: 'team-falcons', authSubject: 'user:marek', role: 'coach' },
      ],
      items: [{ id: 'i-1', teamId: 'team-falcons', body: 'Kickoff plan' }],
    },
    {
      team: { teamId: 'team-otters', name: 'Otters', role: 'assistant' },
      members: [
        { teamId: 'team-otters', authSubject: 'user:sara', role: 'manager' },
        { teamId: 'team-otters', authSubject: SELF, role: 'assistant' },
      ],
      items: [{ id: 'i-2', teamId: 'team-otters', body: 'Swim drills' }],
    },
  ]
  return new Map(seed.map((s) => [s.team.teamId, s]))
}

/** Teams the caller can join via a code (the invite/code/magic-link arm, AC-4). */
const JOINABLE: Record<string, MyTeam> = {
  [JOINABLE_CODE]: { teamId: 'team-eagles', name: 'Eagles', role: 'assistant' },
}

/** A deterministic, offline TeamsClient backed by an in-memory store for one caller. */
export function createMockTeamsClient(): TeamsClient {
  const store = initialTeams()
  let seq = 100
  const nextId = () => `gen-${(seq += 1)}`

  const requireMember = (teamId: string): SeedTeam => {
    const entry = store.get(teamId)
    if (!entry || !entry.members.some((m) => m.authSubject === SELF)) {
      throw new TeamsError(403, 'NOT_A_MEMBER')
    }
    return entry
  }

  const requireManager = (teamId: string): SeedTeam => {
    const entry = requireMember(teamId)
    if (entry.team.role !== MANAGE_ROLE) throw new TeamsError(403, 'NOT_ALLOWED')
    return entry
  }

  return {
    async myTeams() {
      await delay()
      return [...store.values()].map((s) => s.team)
    },

    async createTeam(name) {
      await delay()
      const teamId = `team-${nextId()}`
      const team: MyTeam = { teamId, name, role: MANAGE_ROLE }
      store.set(teamId, {
        team,
        members: [{ teamId, authSubject: SELF, role: MANAGE_ROLE }],
        items: [],
      })
      return team
    },

    async joinByCode(code) {
      await delay()
      const target = JOINABLE[code.trim().toUpperCase()]
      if (!target) throw new TeamsError(404, 'INVALID_CODE')
      if (!store.has(target.teamId)) {
        store.set(target.teamId, {
          team: target,
          members: [
            { teamId: target.teamId, authSubject: 'user:owner', role: 'manager' },
            { teamId: target.teamId, authSubject: SELF, role: target.role },
          ],
          items: [],
        })
      }
      return target
    },

    async listItems(teamId) {
      await delay()
      return requireMember(teamId).items
    },

    async addItem(teamId, body) {
      await delay()
      const entry = requireMember(teamId)
      const item: TeamItem = { id: nextId(), teamId, body }
      entry.items = [...entry.items, item]
      return item
    },

    async listMembers(teamId) {
      await delay()
      return requireManager(teamId).members
    },

    async createInvite(teamId, role) {
      await delay()
      requireManager(teamId)
      const invite: TeamInvite = {
        code: `INV-${nextId().toUpperCase()}`,
        teamId,
        role: role ?? 'assistant',
        expiresAt: null,
      }
      return invite
    },

    async removeMember(teamId, authSubject) {
      await delay()
      const entry = requireManager(teamId)
      entry.members = entry.members.filter((m) => m.authSubject !== authSubject)
    },
  }
}
