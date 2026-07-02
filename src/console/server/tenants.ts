import { createServerFn } from '@tanstack/react-start'
import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '~/db/client'
import { ensureDatabaseReady } from '~/db/setup'
import { tenants, userTenants, users } from '~/db/schema'
import { isSuperAdmin, requireCanCreateTenant, requireTenantRole } from '~/server/auth/tenant-access'

import {
  assertTenantKeepsAdmin,
  canRemoveTenantMember,
  getCurrentConsoleUser,
  normalizeEmail,
  normalizeTenantId,
} from './access'

const tenantInputSchema = z.object({
  color: z.string().min(1),
  id: z.string().min(1),
  initials: z.string().min(1),
  name: z.string().min(1),
})

const tenantMemberInputSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'developer']),
  tenantId: z.string().min(1),
})

const tenantMemberUpdateInputSchema = z.object({
  role: z.enum(['admin', 'developer']),
  tenantId: z.string().min(1),
  userId: z.string().min(1),
})

const tenantMemberDeleteInputSchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1),
})

export const createTenantRecord = createServerFn({ method: 'POST' })
  .validator((input: unknown) => tenantInputSchema.parse(input))
  .handler(async ({ data }) => {
    await ensureDatabaseReady()
    const currentUser = await getCurrentConsoleUser()
    await requireCanCreateTenant(currentUser)
    const tenantId = normalizeTenantId(data.id)
    const now = new Date()

    await db.transaction(async (tx) => {
      await tx.insert(tenants).values({
        color: data.color,
        createdAt: now,
        id: tenantId,
        initials: data.initials.trim().slice(0, 4).toUpperCase(),
        name: data.name.trim(),
      })

      if (!isSuperAdmin(currentUser)) {
        await tx.insert(userTenants).values({
          createdAt: now,
          invitedByUserId: currentUser.id,
          role: 'admin',
          tenantId,
          userId: currentUser.id,
        })
      }
    })

    return { id: tenantId, ok: true }
  })

export const inviteTenantMember = createServerFn({ method: 'POST' })
  .validator((input: unknown) => tenantMemberInputSchema.parse(input))
  .handler(async ({ data }) => {
    await ensureDatabaseReady()
    const currentUser = await getCurrentConsoleUser()
    await requireTenantRole(currentUser, data.tenantId, ['admin'])
    const email = normalizeEmail(data.email)
    const [user] = await db.select().from(users).where(and(eq(users.email, email), isNull(users.disabledAt))).limit(1)
    if (user == null) throw new Error('User must sign in once before they can be invited')
    const now = new Date()

    await db
      .insert(userTenants)
      .values({
        createdAt: now,
        invitedByUserId: currentUser.id,
        role: data.role,
        tenantId: data.tenantId,
        userId: user.id,
      })
      .onConflictDoUpdate({
        set: {
          invitedByUserId: currentUser.id,
          role: data.role,
        },
        target: [userTenants.userId, userTenants.tenantId],
      })

    return { ok: true }
  })

export const updateTenantMemberRole = createServerFn({ method: 'POST' })
  .validator((input: unknown) => tenantMemberUpdateInputSchema.parse(input))
  .handler(async ({ data }) => {
    await ensureDatabaseReady()
    const currentUser = await getCurrentConsoleUser()
    await requireTenantRole(currentUser, data.tenantId, ['admin'])
    if (data.role === 'developer') await assertTenantKeepsAdmin(data.tenantId, data.userId)

    await db
      .update(userTenants)
      .set({ role: data.role })
      .where(and(eq(userTenants.tenantId, data.tenantId), eq(userTenants.userId, data.userId)))

    return { ok: true }
  })

export const removeTenantMember = createServerFn({ method: 'POST' })
  .validator((input: unknown) => tenantMemberDeleteInputSchema.parse(input))
  .handler(async ({ data }) => {
    await ensureDatabaseReady()
    const currentUser = await getCurrentConsoleUser()
    await requireTenantRole(currentUser, data.tenantId, ['admin'])
    if (!canRemoveTenantMember(currentUser, data.userId)) throw new Error('Admins cannot remove their own workspace access')
    await assertTenantKeepsAdmin(data.tenantId, data.userId)

    await db.delete(userTenants).where(and(eq(userTenants.tenantId, data.tenantId), eq(userTenants.userId, data.userId)))
    return { ok: true }
  })
