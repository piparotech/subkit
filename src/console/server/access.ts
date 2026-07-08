import { and, eq, inArray } from 'drizzle-orm'
import { db } from '~/db/client'
import { apps, tenants, userTenants, users } from '~/db/schema'
import type {
  ConsoleUser,
  TenantMemberSummary,
  TenantRole,
  WorkspaceTenant,
} from '~/domain/tenants/types'
import { getRequiredCurrentUser } from '~/server/auth/current-user'
import { isSuperAdmin, requireTenantAccess } from '~/server/auth/tenant-access'
import type { AuthUser } from '~/server/auth/types'

import { formatDateTime } from './format'

export function toWorkspaceTenant(
  tenant: typeof tenants.$inferSelect,
  role: WorkspaceTenant['role'],
): WorkspaceTenant {
  return {
    color: tenant.color,
    id: tenant.id,
    initials: tenant.initials,
    name: tenant.name,
    role,
  }
}

export async function tenantRolesById(
  user: AuthUser,
  tenantIds: readonly string[],
): Promise<Map<string, WorkspaceTenant['role']>> {
  if (isSuperAdmin(user)) return new Map(tenantIds.map((tenantId) => [tenantId, 'super_admin']))
  if (tenantIds.length === 0) return new Map()

  const rows = await db
    .select({ role: userTenants.role, tenantId: userTenants.tenantId })
    .from(userTenants)
    .where(and(eq(userTenants.userId, user.id), inArray(userTenants.tenantId, [...tenantIds])))

  return new Map(rows.map((row) => [row.tenantId, row.role]))
}

export function roleForTenant(
  roleByTenantId: ReadonlyMap<string, WorkspaceTenant['role']>,
  tenantId: string,
): WorkspaceTenant['role'] {
  return roleByTenantId.get(tenantId) ?? 'developer'
}

export function canCreateTenants(
  user: AuthUser,
  roleByTenantId: ReadonlyMap<string, WorkspaceTenant['role']>,
): boolean {
  return isSuperAdmin(user) || [...roleByTenantId.values()].some((role) => role === 'admin')
}

export function toTenantMemberSummary(row: {
  createdAt: Date
  role: TenantRole
  tenantId: string
  user: typeof users.$inferSelect
}): TenantMemberSummary {
  return {
    createdAt: formatDateTime(row.createdAt),
    email: row.user.email,
    globalRole: row.user.globalRole,
    initials: row.user.initials,
    name: row.user.name,
    organization: row.user.organization,
    role: row.role,
    tenantId: row.tenantId,
    userId: row.user.id,
  }
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function canRemoveTenantMember(currentUser: AuthUser, userId: string): boolean {
  return currentUser.id !== userId || isSuperAdmin(currentUser)
}

export async function assertTenantKeepsAdmin(
  tenantId: string,
  excludedUserId: string,
): Promise<void> {
  const adminRows = await db
    .select({ userId: userTenants.userId })
    .from(userTenants)
    .where(and(eq(userTenants.tenantId, tenantId), eq(userTenants.role, 'admin')))
  const remainingAdmins = adminRows.filter((member) => member.userId !== excludedUserId)
  if (remainingAdmins.length === 0) throw new Error('Workspace needs at least one admin')
}

export function toConsoleUser(user: AuthUser, canCreateNewTenants: boolean): ConsoleUser {
  return {
    canCreateTenants: canCreateNewTenants,
    email: user.email,
    globalRole: isSuperAdmin(user) ? 'super_admin' : user.globalRole,
    id: user.id,
    initials: user.initials,
    name: user.name,
    operator: user.operator,
    organization: user.organization,
  }
}

export async function getCurrentConsoleUser(): Promise<AuthUser> {
  return getRequiredCurrentUser()
}

export async function requireAccessibleApp(
  user: AuthUser,
  appId: string,
): Promise<typeof apps.$inferSelect> {
  const [app] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1)
  if (app == null) throw new Error('App does not exist')
  await requireTenantAccess(user, app.tenantId)
  return app
}

export function normalizeTenantId(id: string): string {
  const normalized = id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!normalized) throw new Error('Workspace id is required')
  return normalized
}
