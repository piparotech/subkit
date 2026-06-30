import { PUIInput, cn } from '@piparo/cn-web'
import * as React from 'react'

import { inviteTenantMember, removeTenantMember, updateTenantMemberRole } from './server'
import { ViewTitle } from './ui'
import type { TenantMemberSummary, TenantRole, WorkspaceTenant } from './types'

export function TenantMembersView({
  onRefreshConsoleData,
  tenant,
  tenantMembers,
}: {
  onRefreshConsoleData: () => void
  tenant: WorkspaceTenant
  tenantMembers: TenantMemberSummary[]
}) {
  const [busy, setBusy] = React.useState<string | null>(null)
  const [feedback, setFeedback] = React.useState<string | null>(null)
  const [memberEmail, setMemberEmail] = React.useState('')
  const [memberRole, setMemberRole] = React.useState<TenantRole>('developer')
  const canManageTenant = tenant.role === 'admin' || tenant.role === 'super_admin'
  const tenantMemberRows = tenantMembers.filter((member) => member.tenantId === tenant.id)

  const runTask = (label: string, task: () => Promise<string>) => {
    setBusy(label)
    setFeedback(null)
    task()
      .then((message) => {
        setFeedback(message)
        onRefreshConsoleData()
      })
      .catch((error: unknown) => {
        setFeedback(error instanceof Error ? error.message : 'Tenant member operation failed')
      })
      .finally(() => setBusy(null))
  }

  const inviteMember = () => {
    const email = memberEmail.trim()
    runTask('invite-member', async () => {
      await inviteTenantMember({ data: { email, role: memberRole, tenantId: tenant.id } })
      setMemberEmail('')
      return `${email} has access as ${memberRole}.`
    })
  }

  const changeMemberRole = (member: TenantMemberSummary, role: TenantRole) => {
    runTask(`member-role-${member.userId}`, async () => {
      await updateTenantMemberRole({ data: { role, tenantId: tenant.id, userId: member.userId } })
      return `${member.name} is now ${role}.`
    })
  }

  const removeMember = (member: TenantMemberSummary) => {
    runTask(`remove-member-${member.userId}`, async () => {
      await removeTenantMember({ data: { tenantId: tenant.id, userId: member.userId } })
      return `${member.name} no longer has tenant access.`
    })
  }

  return (
    <section className="max-w-[1080px] animate-[subkit-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <ViewTitle
        description="Invite existing console users into this tenant and choose whether they are Admins or Developers."
        title="Tenant Members"
      />

      <div className="mt-[20px] rounded-[14px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] p-[20px]">
        <div className="grid grid-cols-[1fr_auto_auto] gap-[8px] max-md:grid-cols-1">
          <PUIInput
            className="font-mono"
            disabled={busy != null || !canManageTenant}
            onChange={(event) => setMemberEmail(event.target.value)}
            placeholder="user@example.com"
            type="email"
            value={memberEmail}
          />
          <RoleSelect disabled={busy != null || !canManageTenant} onChange={setMemberRole} value={memberRole} />
          <ActionButton disabled={busy != null || !canManageTenant || memberEmail.trim() === ''} label="Invite user" onPress={inviteMember} tone="primary" />
        </div>
        {!canManageTenant ? <Notice>Only tenant Admins and SuperAdmins can invite or change tenant members.</Notice> : null}
        {feedback != null ? <Notice>{feedback}</Notice> : null}
      </div>

      <div className="mt-[16px] overflow-hidden rounded-[14px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)]">
        {tenantMemberRows.length === 0 ? (
          <div className="px-[16px] py-[14px] text-[13px] text-[var(--subkit-faint)]">No tenant members yet.</div>
        ) : (
          tenantMemberRows.map((member) => (
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-[10px] border-b border-[var(--subkit-border)] px-[16px] py-[13px] text-[12px] last:border-b-0 max-md:grid-cols-1" key={member.userId}>
              <div className="min-w-0">
                <div className="truncate font-semibold text-[var(--subkit-text)]">{member.name}</div>
                <div className="truncate font-mono text-[11.5px] text-[var(--subkit-faint)]">{member.email ?? member.userId}</div>
                <div className="mt-[2px] truncate text-[11px] text-[var(--subkit-faint)]">{member.organization} · added {member.createdAt}</div>
              </div>
              <RoleSelect disabled={busy != null || !canManageTenant || member.globalRole === 'super_admin'} onChange={(role) => changeMemberRole(member, role)} value={member.role} />
              <ActionButton disabled={busy != null || !canManageTenant || member.globalRole === 'super_admin'} label="Remove" onPress={() => removeMember(member)} tone="danger" />
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function RoleSelect({ disabled, onChange, value }: { disabled: boolean; onChange: (role: TenantRole) => void; value: TenantRole }) {
  return (
    <select
      className="min-h-[36px] rounded-[9px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[10px] py-[7px] text-[12.5px] font-semibold text-[var(--subkit-text)] outline-none disabled:opacity-50"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value === 'admin' ? 'admin' : 'developer')}
      value={value}
    >
      <option value="developer">Developer</option>
      <option value="admin">Admin</option>
    </select>
  )
}

function ActionButton({ disabled, label, onPress, tone }: { disabled: boolean; label: string; onPress: () => void; tone: 'danger' | 'primary' }) {
  return (
    <button
      className={cn(
        'min-h-[36px] cursor-pointer rounded-[9px] px-[13px] py-[8px] text-[12.5px] font-semibold transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50',
        tone === 'primary' && 'bg-[var(--subkit-text)] text-white hover:bg-[color-mix(in_oklch,var(--subkit-text)_88%,white)]',
        tone === 'danger' && 'border border-[color-mix(in_oklch,var(--subkit-red)_30%,var(--subkit-border))] bg-white text-[var(--subkit-red)] hover:bg-[color-mix(in_oklch,var(--subkit-red)_7%,white)]',
      )}
      disabled={disabled}
      onClick={onPress}
      type="button"
    >
      {label}
    </button>
  )
}

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="mt-[12px] rounded-[10px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[12px] py-[10px] text-[12.5px] text-[var(--subkit-dim)]">{children}</div>
}
