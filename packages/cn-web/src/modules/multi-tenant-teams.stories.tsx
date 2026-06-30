import { useCallback, useEffect, useMemo, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  PUIBadge,
  PUIButton,
  PUIInput,
  PUISegmentedControl,
  PUISelect,
  PUISeparator,
  PUISpinner,
  PUIText,
} from '@/components/ui'
import {
  type MyTeam,
  type TeamItem,
  type TeamMember,
  TeamsConfig,
  TeamsError,
  roleIn,
  toMembership,
} from '@/lib/multi-tenant-teams'

import { JOINABLE_CODE, SELF, createMockTeamsClient, memberName } from './mock-multi-tenant-teams'

const CONFIG = TeamsConfig.parse({})
const MANAGE_ROLE = CONFIG.manageRole
const ROLE_OPTIONS = CONFIG.roles.map((role) => ({ label: role, value: role }))

function errorCode(cause: unknown): string {
  if (cause instanceof TeamsError) return cause.code
  return cause instanceof Error ? cause.message : 'UNKNOWN'
}

function FieldError({ children }: { children: string }) {
  return (
    <p role="alert">
      <PUIText className="text-destructive font-mono" variant="footnote">
        {children}
      </PUIText>
    </p>
  )
}

/**
 * The tenant-scoped resource (capability AC-1/AC-5): rows are read and written through one team the
 * caller belongs to. Switching the active team swaps this list entirely, so no team-foreign row is
 * ever shown. The team is keyed by the active membership, never typed by the user.
 */
function ScopedItems({
  team,
  client,
}: {
  team: MyTeam
  client: ReturnType<typeof createMockTeamsClient>
}) {
  const [items, setItems] = useState<TeamItem[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const reload = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      setItems(await client.listItems(team.teamId))
    } catch (cause) {
      setError(errorCode(cause))
    } finally {
      setLoading(false)
    }
  }, [client, team.teamId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reactive re-fetch: resets the spinner on each active-team change before awaiting
    void reload()
  }, [reload])

  const add = useCallback(async () => {
    const body = draft.trim()
    if (!body) return
    setBusy(true)
    setError(undefined)
    try {
      await client.addItem(team.teamId, body)
      setDraft('')
      await reload()
    } catch (cause) {
      setError(errorCode(cause))
    } finally {
      setBusy(false)
    }
  }, [client, draft, team.teamId, reload])

  return (
    <section className="flex max-w-md flex-col gap-3">
      <div className="flex flex-col gap-1">
        <PUIText className="font-medium" variant="headline">
          {team.name} records
        </PUIText>
        <PUIText className="max-w-prose" tone="muted" variant="footnote">
          Every row carries its team id, so this list can only hold {team.name} data. Switch teams
          to see the scope swap.
        </PUIText>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-3" role="status">
          <PUISpinner size="sm" tone="muted" />
          <PUIText tone="muted" variant="footnote">
            Loading scoped rows...
          </PUIText>
        </div>
      ) : items.length === 0 ? (
        <PUIText tone="subtle" variant="footnote">
          No records yet.
        </PUIText>
      ) : (
        <ul className="border-border divide-border divide-y border-y">
          {items.map((item) => (
            <li className="flex items-center justify-between gap-3 py-2.5" key={item.id}>
              <PUIText variant="footnote">{item.body}</PUIText>
              <PUIText className="font-mono" tone="subtle" variant="caption2">
                {item.teamId}
              </PUIText>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <PUIInput
          aria-label={`Add a record to ${team.name}`}
          className="flex-1"
          disabled={busy}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void add()
          }}
          placeholder="Add a record"
          value={draft}
        />
        <PUIButton disabled={!draft.trim()} loading={busy} onPress={() => void add()} size="sm">
          Add
        </PUIButton>
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </section>
  )
}

/**
 * Admin surface (capability AC-3/AC-4): unlocked only when the caller's role IN THIS team is the
 * manage role. List and remove members, or mint a join invite. Acting on a team where you are not a
 * manager is refused by the same gate the server enforces, surfaced as a typed code.
 */
function MemberAdmin({
  team,
  client,
}: {
  team: MyTeam
  client: ReturnType<typeof createMockTeamsClient>
}) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invite, setInvite] = useState<string>()
  const [inviteRole, setInviteRole] = useState<string>(CONFIG.defaultMemberRole)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string>()

  const reload = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    try {
      setMembers(await client.listMembers(team.teamId))
    } catch (cause) {
      setError(errorCode(cause))
    } finally {
      setLoading(false)
    }
  }, [client, team.teamId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reactive re-fetch: clears the prior invite and resets the spinner on each active-team change before awaiting
    setInvite(undefined)
    void reload()
  }, [reload])

  const remove = useCallback(
    async (authSubject: string) => {
      setBusy(authSubject)
      setError(undefined)
      try {
        await client.removeMember(team.teamId, authSubject)
        await reload()
      } catch (cause) {
        setError(errorCode(cause))
      } finally {
        setBusy(null)
      }
    },
    [client, team.teamId, reload],
  )

  const mintInvite = useCallback(async () => {
    setBusy('invite')
    setError(undefined)
    try {
      const created = await client.createInvite(team.teamId, inviteRole)
      setInvite(created.code)
    } catch (cause) {
      setError(errorCode(cause))
    } finally {
      setBusy(null)
    }
  }, [client, team.teamId, inviteRole])

  return (
    <section className="flex max-w-md flex-col gap-3">
      <div className="flex flex-col gap-1">
        <PUIText className="font-medium" variant="headline">
          {team.name} members
        </PUIText>
        <PUIText className="max-w-prose" tone="muted" variant="footnote">
          Visible because your role in {team.name} is {MANAGE_ROLE}. The same role lets you remove a
          member or mint an invite.
        </PUIText>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-3" role="status">
          <PUISpinner size="sm" tone="muted" />
          <PUIText tone="muted" variant="footnote">
            Loading members...
          </PUIText>
        </div>
      ) : (
        <ul className="border-border divide-border divide-y border-y">
          {members.map((member) => {
            const isSelf = member.authSubject === SELF
            return (
              <li
                className="flex items-center justify-between gap-3 py-2.5"
                key={member.authSubject}
              >
                <div className="flex items-center gap-2">
                  <PUIText variant="footnote">{memberName(member.authSubject)}</PUIText>
                  <PUIBadge variant={isSelf ? 'info' : 'secondary'}>{member.role}</PUIBadge>
                </div>
                <PUIButton
                  disabled={isSelf}
                  loading={busy === member.authSubject}
                  onPress={() => void remove(member.authSubject)}
                  size="sm"
                  variant="ghost"
                >
                  Remove
                </PUIButton>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <div className="w-40">
          <PUISelect onValueChange={setInviteRole} options={ROLE_OPTIONS} value={inviteRole} />
        </div>
        <PUIButton
          loading={busy === 'invite'}
          onPress={() => void mintInvite()}
          size="sm"
          variant="outline"
        >
          Create invite
        </PUIButton>
      </div>
      {invite ? (
        <PUIText className="font-mono" tone="muted" variant="footnote">
          Invite code: {invite} ({inviteRole})
        </PUIText>
      ) : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </section>
  )
}

/** Inline join/create affordances (capability AC-4): progressive, not a modal. */
function JoinCreate({
  client,
  onChanged,
}: {
  client: ReturnType<typeof createMockTeamsClient>
  onChanged: (team: MyTeam) => void
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState<'join' | 'create' | null>(null)
  const [error, setError] = useState<string>()

  const run = useCallback(
    async (kind: 'join' | 'create', action: () => Promise<MyTeam>) => {
      setBusy(kind)
      setError(undefined)
      try {
        onChanged(await action())
        setCode('')
        setName('')
      } catch (cause) {
        setError(errorCode(cause))
      } finally {
        setBusy(null)
      }
    },
    [onChanged],
  )

  return (
    <section className="flex max-w-md flex-col gap-3">
      <PUIText className="font-medium" variant="headline">
        Join or start a team
      </PUIText>
      <div className="flex items-end gap-2">
        <PUIInput
          aria-label="Join code"
          className="flex-1"
          disabled={busy !== null}
          onChange={(event) => setCode(event.target.value)}
          placeholder={`Join code (try ${JOINABLE_CODE})`}
          value={code}
        />
        <PUIButton
          disabled={!code.trim()}
          loading={busy === 'join'}
          onPress={() => void run('join', () => client.joinByCode(code))}
          size="sm"
        >
          Join
        </PUIButton>
      </div>
      <div className="flex items-end gap-2">
        <PUIInput
          aria-label="New team name"
          className="flex-1"
          disabled={busy !== null}
          onChange={(event) => setName(event.target.value)}
          placeholder="New team name"
          value={name}
        />
        <PUIButton
          disabled={!name.trim()}
          loading={busy === 'create'}
          onPress={() => void run('create', () => client.createTeam(name.trim()))}
          size="sm"
          variant="outline"
        >
          Create
        </PUIButton>
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </section>
  )
}

function MultiTenantTeamsDemo() {
  const client = useMemo(() => createMockTeamsClient(), [])
  const [teams, setTeams] = useState<MyTeam[]>([])
  const [activeId, setActiveId] = useState<string>()
  const [loading, setLoading] = useState(true)

  const loadTeams = useCallback(
    async (preferId?: string) => {
      const mine = await client.myTeams()
      setTeams(mine)
      setActiveId((current) => preferId ?? current ?? mine[0]?.teamId)
      setLoading(false)
    },
    [client],
  )

  useEffect(() => {
    let active = true
    void client.myTeams().then((mine) => {
      if (!active) return
      setTeams(mine)
      setActiveId((current) => current ?? mine[0]?.teamId)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [client])

  const activeTeam = teams.find((team) => team.teamId === activeId) ?? null
  const memberships = useMemo(() => teams.map((team) => toMembership(team, SELF)), [teams])
  const activeRole = activeTeam ? roleIn(memberships, activeTeam.teamId) : null
  const canManage = activeRole === MANAGE_ROLE

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <PUIText className="tracking-tight" variant="title3">
          Multi-tenant teams
        </PUIText>
        <PUIText className="max-w-prose" tone="muted" variant="subheadline">
          You belong to several teams and hold a separate role in each. Pick the active team to
          scope every read and write to that tenant, with no re-login.
        </PUIText>
        {loading ? (
          <div className="flex items-center gap-3 py-2" role="status">
            <PUISpinner size="sm" tone="muted" />
            <PUIText tone="muted" variant="footnote">
              Loading your teams...
            </PUIText>
          </div>
        ) : teams.length > 0 ? (
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <PUISegmentedControl
              className="self-start"
              onValueChange={setActiveId}
              options={teams.map((team) => ({ label: team.name, value: team.teamId }))}
              value={activeId ?? teams[0]!.teamId}
            />
            {activeRole ? (
              <PUIBadge dot variant={canManage ? 'success' : 'secondary'}>
                your role: {activeRole}
              </PUIBadge>
            ) : null}
          </div>
        ) : (
          <PUIText tone="muted" variant="footnote">
            {CONFIG.texts.noTeams}.
          </PUIText>
        )}
      </header>

      {activeTeam ? (
        <>
          <ScopedItems client={client} team={activeTeam} />
          {canManage ? (
            <>
              <PUISeparator />
              <MemberAdmin client={client} team={activeTeam} />
            </>
          ) : null}
        </>
      ) : null}

      <PUISeparator />
      <JoinCreate client={client} onChanged={(team) => void loadTeams(team.teamId)} />
    </div>
  )
}

const seededDescription =
  `Tenant isolation via teams and memberships: a user can belong to many teams and holds a separate ` +
  `role per team, with every data access scoped through a resolved tenant scope so a query can never ` +
  `return team-foreign rows. In-memory demo: a mock seam seeds you as manager of Falcons and ` +
  `assistant of Otters, each with its own scoped records. Switch the active team to watch the records ` +
  `swap, note member administration appears only where your role is manager, and join Eagles with the ` +
  `code ${JOINABLE_CODE} or create a team to gain a manager role.`

const meta = {
  title: 'Modules/Multi-Tenant Teams',
  component: MultiTenantTeamsDemo,
  parameters: {
    layout: 'padded',
    docs: { description: { component: seededDescription } },
  },
} satisfies Meta<typeof MultiTenantTeamsDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
