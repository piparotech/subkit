export type GlobalRole = 'user' | 'super_admin'
export type TenantRole = 'admin' | 'developer'

export interface WorkspaceTenant {
  color: string
  id: string
  initials: string
  name: string
  role: TenantRole | 'super_admin'
}

export interface ConsoleUser {
  canCreateTenants: boolean
  email?: string
  globalRole: GlobalRole
  id: string
  initials: string
  name: string
  organization: string
  operator: boolean
}

export interface TenantMemberSummary {
  createdAt: string
  email: string | null
  globalRole: GlobalRole
  initials: string
  name: string
  organization: string
  role: TenantRole
  tenantId: string
  userId: string
}

export interface TenantDraft {
  color: string
  id: string
  initials: string
  name: string
}

export type TenantDraftField = keyof TenantDraft
