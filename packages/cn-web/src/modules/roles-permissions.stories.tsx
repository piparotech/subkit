import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  PUIBadge,
  PUIButton,
  PUIDataTable,
  type PUIDataTableColumn,
  PUISegmentedControl,
  PUISelect,
  PUISeparator,
  PUISpinner,
  PUIText,
} from '@/components/ui'
import {
  type Grants,
  type RoleAssignment,
  RolesError,
  can,
  grantsAllow,
} from '@/lib/roles-permissions'
import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  ALL_PERMISSIONS,
  DEFAULT_SUBJECT,
  DEMO_CONFIG,
  DEMO_MATRIX,
  DEMO_ROLES,
  DEMO_USERS,
  createMockRolesStore,
} from './mock-roles-permissions'

const MANAGE = DEMO_CONFIG.manageRolesPermission
const ROLE_OPTIONS = DEMO_ROLES.map((role) => ({ label: role, value: role }))
const userName = (authSubject: string) =>
  DEMO_USERS.find((user) => user.authSubject === authSubject)?.name ?? authSubject

function errorCode(cause: unknown): string {
  if (cause instanceof RolesError) return cause.code
  return cause instanceof Error ? cause.message : 'UNKNOWN'
}

/**
 * The UI gate (capability AC-2): the same `can()` the server guard enforces decides, per permission,
 * whether the acting role may act. The screen offers exactly what the role is allowed to do.
 */
function GatePanel({ grants }: { grants: Grants }) {
  return (
    <section className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <PUIText as="h3" className="tracking-tight" variant="headline">
            Permissions
          </PUIText>
          <PUIBadge dot variant={grants.role ? 'success' : 'secondary'}>
            {grants.role ?? DEMO_CONFIG.texts.noRole}
          </PUIBadge>
        </div>
        <PUIText className="max-w-prose" tone="muted" variant="footnote">
          The client gate runs the same can() decision the server guard enforces, so the UI never
          offers an action the backend would reject with 403.
        </PUIText>
      </div>

      <ul className="border-border divide-border divide-y border-y">
        {ALL_PERMISSIONS.map((permission) => {
          const allowed = grantsAllow(grants, permission)
          return (
            <li className="flex items-center justify-between gap-4 py-2.5" key={permission}>
              <PUIText className="font-mono" variant="footnote">
                {permission}
              </PUIText>
              {allowed ? (
                <PUIBadge variant="success">allowed</PUIBadge>
              ) : (
                <PUIBadge variant="outline">blocked</PUIBadge>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/**
 * The admin surface (capability AC-3): assign or revoke a user's role. The mutation is stored on the
 * seam and applies on the target user's next read, so after a change that affects the acting user we
 * re-fetch their grants and the gate updates with no re-login.
 */
function ManagePanel({
  store,
  subject,
  onSelfChanged,
}: {
  store: ReturnType<typeof createMockRolesStore>
  subject: string
  onSelfChanged: () => void
}) {
  const { client } = store
  const [assignments, setAssignments] = useState<RoleAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string>()

  const fetchAssignments = useCallback(async () => {
    try {
      setAssignments(await client.listAssignments())
      setError(undefined)
    } catch (cause) {
      setError(errorCode(cause))
    } finally {
      setLoading(false)
    }
  }, [client])

  const reload = useCallback(async () => {
    setLoading(true)
    await fetchAssignments()
  }, [fetchAssignments])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const next = await client.listAssignments()
        if (!active) return
        setAssignments(next)
        setError(undefined)
      } catch (cause) {
        if (active) setError(errorCode(cause))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [client])

  const mutate = useCallback(
    async (target: string, action: () => Promise<unknown>) => {
      setBusy(target)
      setError(undefined)
      try {
        await action()
        await reload()
        if (target === subject) onSelfChanged()
      } catch (cause) {
        setError(errorCode(cause))
      } finally {
        setBusy(null)
      }
    },
    [reload, subject, onSelfChanged],
  )

  const columns: PUIDataTableColumn<RoleAssignment>[] = [
    {
      key: 'user',
      header: 'User',
      sortable: true,
      sortValue: (row) => userName(row.authSubject),
      cell: (row) => (
        <div className="flex flex-col">
          <PUIText className="font-medium" variant="footnote">
            {userName(row.authSubject)}
          </PUIText>
          <PUIText className="font-mono" tone="subtle" variant="caption2">
            {row.authSubject}
          </PUIText>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      width: '11rem',
      cell: (row) => (
        <PUISelect
          disabled={busy !== null}
          onValueChange={(role) =>
            void mutate(row.authSubject, () => client.assign(row.authSubject, role))
          }
          options={ROLE_OPTIONS}
          value={row.role}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'end',
      width: '7rem',
      cell: (row) => (
        <PUIButton
          loading={busy === row.authSubject}
          onPress={() => void mutate(row.authSubject, () => client.revoke(row.authSubject))}
          size="sm"
          variant="ghost"
        >
          Revoke
        </PUIButton>
      ),
    },
  ]

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <PUIText as="h3" className="tracking-tight" variant="headline">
          Role administration
        </PUIText>
        <PUIText className="max-w-prose" tone="muted" variant="footnote">
          Unlocked because the acting role holds {MANAGE}. Change a role inline or revoke it;
          revoking a role grants the default ({DEMO_CONFIG.defaultRole ?? 'none'}). A change to the
          acting user re-reads their grants above, so new rights apply without a re-login.
        </PUIText>
      </div>

      {error ? (
        <p role="alert">
          <PUIText className="text-destructive font-mono" variant="footnote">
            {error}
          </PUIText>
        </p>
      ) : null}

      <PUIDataTable
        caption="Role assignments"
        columns={columns}
        data={assignments}
        loading={loading}
        rowKey={(row) => row.authSubject}
      />
    </section>
  )
}

function RolesPermissionsDemo() {
  const store = useMemo(() => createMockRolesStore(), [])
  const [subject, setSubject] = useState<string>(DEFAULT_SUBJECT)
  const [grants, setGrants] = useState<Grants>(() => store.grantsOf(DEFAULT_SUBJECT))
  const [loading, setLoading] = useState(false)

  const loadGrants = useCallback(async () => {
    setLoading(true)
    setGrants(await store.client.getMyPermissions())
    setLoading(false)
  }, [store])

  const switchTo = useCallback(
    (next: string) => {
      store.setCurrentSubject(next)
      setSubject(next)
      void loadGrants()
    },
    [store, loadGrants],
  )

  const canManage = can(DEMO_MATRIX, grants.role, MANAGE)

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <PUIText as="h2" className="tracking-tight" variant="title3">
          Roles and permissions
        </PUIText>
        <PUIText className="max-w-prose" tone="muted" variant="subheadline">
          Impersonate a seeded user to see authorization resolve from one role to permission matrix,
          decided identically on the client and the server.
        </PUIText>
        <PUISegmentedControl
          className="mt-1 self-start"
          onValueChange={switchTo}
          options={DEMO_USERS.map((user) => ({ label: user.name, value: user.authSubject }))}
          value={subject}
        />
      </header>

      {loading ? (
        <div className="flex items-center gap-3 py-6" role="status">
          <PUISpinner size="sm" tone="muted" />
          <PUIText tone="muted" variant="subheadline">
            Resolving grants...
          </PUIText>
        </div>
      ) : (
        <GatePanel grants={grants} />
      )}

      {canManage ? (
        <>
          <PUISeparator />
          <ManagePanel onSelfChanged={loadGrants} store={store} subject={subject} />
        </>
      ) : null}
    </div>
  )
}

const seededDescription =
  `Role-based access control built on the framework-agnostic roles-permissions Engine: one role to ` +
  `permission matrix is the single authorization source of truth, decided by the same can() on the ` +
  `client UI gate and the server guard. In-memory demo: a mock seam seeds the smartcoach vocabulary ` +
  `(coach, assistant, manager, admin) with Amal as admin, Ben coach, Cara assistant, Dana manager. ` +
  `Impersonate a user to watch the gate hide disallowed actions, then act as Amal to assign or ` +
  `revoke a role and see the change apply on the next read without a re-login.`

const meta = {
  title: 'Modules/Roles & Permissions',
  component: RolesPermissionsDemo,
  parameters: {
    layout: 'padded',
    docs: { description: { component: seededDescription } },
  },
} satisfies Meta<typeof RolesPermissionsDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
