import { and, eq, inArray } from 'drizzle-orm'
import { db } from '~/db/client'
import { tenants, userTenants } from '~/db/schema'

import type { AuthUser } from './types'

export type GlobalRole = 'user' | 'super_admin'
export type TenantRole = 'admin' | 'developer'

export class TenantAccessRequiredError extends Error {
  constructor() {
    super('Workspace access required')
  }
}

export class TenantRoleRequiredError extends Error {
  constructor() {
    super('Workspace role required')
  }
}

export function isSuperAdmin(user: Pick<AuthUser, 'globalRole'>): boolean {
  return user.globalRole === 'super_admin'
}

export async function listAccessibleTenantRows(
  user: AuthUser,
): Promise<Array<typeof tenants.$inferSelect>> {
  if (isSuperAdmin(user)) return db.select().from(tenants)

  const rows = await db
    .select({ tenant: tenants })
    .from(userTenants)
    .innerJoin(tenants, eq(userTenants.tenantId, tenants.id))
    .where(eq(userTenants.userId, user.id))

  return rows.map((row) => row.tenant)
}

export async function listAccessibleTenantIds(user: AuthUser): Promise<string[]> {
  if (isSuperAdmin(user)) {
    const rows = await db.select({ id: tenants.id }).from(tenants)
    return rows.map((tenant) => tenant.id)
  }

  const rows = await db
    .select({ tenantId: userTenants.tenantId })
    .from(userTenants)
    .where(eq(userTenants.userId, user.id))
  return rows.map((row) => row.tenantId)
}

export async function requireTenantAccess(user: AuthUser, tenantId: string): Promise<void> {
  if (isSuperAdmin(user)) return

  const [membership] = await db
    .select({ tenantId: userTenants.tenantId })
    .from(userTenants)
    .where(and(eq(userTenants.userId, user.id), eq(userTenants.tenantId, tenantId)))
    .limit(1)

  if (membership == null) throw new TenantAccessRequiredError()
}

export async function requireTenantRole(
  user: AuthUser,
  tenantId: string,
  roles: readonly TenantRole[],
): Promise<void> {
  if (isSuperAdmin(user)) return

  const [membership] = await db
    .select({ role: userTenants.role })
    .from(userTenants)
    .where(and(eq(userTenants.userId, user.id), eq(userTenants.tenantId, tenantId)))
    .limit(1)

  if (membership == null) throw new TenantAccessRequiredError()
  if (!roles.includes(membership.role)) throw new TenantRoleRequiredError()
}

export async function requireCanCreateTenant(user: AuthUser): Promise<void> {
  if (isSuperAdmin(user)) return

  const [membership] = await db
    .select({ tenantId: userTenants.tenantId })
    .from(userTenants)
    .where(and(eq(userTenants.userId, user.id), inArray(userTenants.role, ['admin'])))
    .limit(1)

  if (membership == null) throw new TenantRoleRequiredError()
}
