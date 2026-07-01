import { and, eq, gt, isNull, or } from 'drizzle-orm'

import { authEvents, authSessions, tenants, users, userTenants } from '~/db/schema'
import { db } from '~/db/client'

import { createRandomToken, sha256Hex } from './crypto'
import { getAppSession } from './session'
import type { AuthUser, OidcClaims } from './types'

export class AuthenticationRequiredError extends Error {
  constructor() {
    super('Authentication required')
  }
}

const defaultTenant = {
  color: 'oklch(0.62 0.17 152)',
  id: 'piparo',
  initials: 'PI',
  name: 'piparo.tech',
}

export async function getOptionalCurrentUser(): Promise<AuthUser | undefined> {
  const session = await getAppSession()

  if (!session.data.userId || !session.data.authSessionId || !session.data.sessionToken) return undefined

  const [row] = await db
    .select({ authSession: authSessions, user: users })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(
      and(
        eq(authSessions.id, session.data.authSessionId),
        eq(authSessions.tokenHash, sha256Hex(session.data.sessionToken)),
        eq(authSessions.userId, session.data.userId),
        gt(authSessions.expiresAt, new Date()),
        isNull(users.disabledAt),
      ),
    )
    .limit(1)

  if (!row) return undefined

  await db.update(authSessions).set({ lastSeenAt: new Date() }).where(eq(authSessions.id, row.authSession.id))
  await ensureDefaultTenantAccess(row.user)
  return toAuthUser(row.user)
}

export async function getRequiredCurrentUser(): Promise<AuthUser> {
  const currentUser = await getOptionalCurrentUser()
  if (!currentUser) throw new AuthenticationRequiredError()
  return currentUser
}

export async function findOrCreateUserFromClaims(claims: OidcClaims, identityProvider: string): Promise<AuthUser> {
  const email = normalizeEmail(claims.email)
  const loginName = claims.preferred_username ?? claims.login_name ?? email
  const existing = await findUserByClaims(claims.sub, email)
  const now = new Date()

  if (existing) {
    const [updated] = await db
      .update(users)
      .set({
        email: email ?? existing.email,
        globalRole: existing.globalRole,
        identityProvider,
        lastLoginAt: now,
        name: readDisplayName(claims),
        zitadelLoginName: loginName ?? existing.zitadelLoginName,
        zitadelSubject: claims.sub,
      })
      .where(eq(users.id, existing.id))
      .returning()

    if (!updated) throw new Error('Failed to update authenticated user')

    await ensureDefaultTenantAccess(updated)
    await recordAuthEvent(updated.id, 'login_success', identityProvider)
    return toAuthUser(updated)
  }

  if (!email) throw new Error('Verified email claim is required for new users')

  const [created] = await db
    .insert(users)
    .values({
      createdAt: now,
      email,
      id: `usr_${sha256Hex(claims.sub).slice(0, 24)}`,
      globalRole: 'user',
      identityProvider,
      initials: createInitials(readDisplayName(claims)),
      lastLoginAt: now,
      name: readDisplayName(claims),
      operator: email.endsWith('@piparo.tech'),
      organization: email.endsWith('@piparo.tech') ? 'piparo.tech' : 'External',
      zitadelLoginName: loginName,
      zitadelSubject: claims.sub,
    })
    .returning()

  if (!created) throw new Error('Failed to create authenticated user')

  await ensureDefaultTenantAccess(created)
  await recordAuthEvent(created.id, 'login_success', identityProvider)
  return toAuthUser(created)
}

async function ensureDefaultTenantAccess(user: typeof users.$inferSelect): Promise<void> {
  if (!shouldGrantDefaultTenantAccess(user)) return

  const [membership] = await db
    .select({ userId: userTenants.userId })
    .from(userTenants)
    .where(and(eq(userTenants.userId, user.id), eq(userTenants.tenantId, defaultTenant.id)))
    .limit(1)
  if (membership != null) return

  const now = new Date()
  await db.transaction(async (tx) => {
    await tx
      .insert(tenants)
      .values({
        color: defaultTenant.color,
        createdAt: now,
        id: defaultTenant.id,
        initials: defaultTenant.initials,
        name: defaultTenant.name,
      })
      .onConflictDoUpdate({
        set: {
          color: defaultTenant.color,
          initials: defaultTenant.initials,
          name: defaultTenant.name,
        },
        target: tenants.id,
      })

    await tx
      .insert(userTenants)
      .values({
        createdAt: now,
        invitedByUserId: null,
        role: 'admin',
        tenantId: defaultTenant.id,
        userId: user.id,
      })
      .onConflictDoNothing({ target: [userTenants.userId, userTenants.tenantId] })
  })
}

function shouldGrantDefaultTenantAccess(user: typeof users.$inferSelect): boolean {
  const email = user.email?.trim().toLowerCase()
  return user.operator || email?.endsWith('@piparo.tech') === true
}

async function findUserByClaims(zitadelSubject: string, email?: string) {
  const predicates = email ? or(eq(users.zitadelSubject, zitadelSubject), eq(users.email, email)) : eq(users.zitadelSubject, zitadelSubject)
  const [user] = await db.select().from(users).where(and(predicates, isNull(users.disabledAt))).limit(1)
  return user
}

async function recordAuthEvent(userId: string | undefined, type: string, detail: string): Promise<void> {
  await db.insert(authEvents).values({ detail, id: createRandomEventId(), type, userId })
}

function createRandomEventId(): string {
  return `evt_${createRandomToken(18)}`
}

function readDisplayName(claims: OidcClaims): string {
  const displayName = claims.name ?? claims.preferred_username ?? claims.email
  if (!displayName) throw new Error('OIDC profile name claim is required')
  return displayName
}

function createInitials(name: string): string {
  const parts = name.replaceAll('@', ' ').replaceAll('.', ' ').split(/\s+/).filter((part) => part.length > 0)
  const first = parts[0]?.at(0)
  const second = parts[1]?.at(0) ?? parts[0]?.at(1)
  if (!first || !second) throw new Error('OIDC profile name must contain at least two initials')
  return `${first}${second}`.toUpperCase()
}

function normalizeEmail(email: string | undefined): string | undefined {
  return email ? email.trim().toLowerCase() : undefined
}

function toAuthUser(user: typeof users.$inferSelect): AuthUser {
  return {
    email: user.email ?? undefined,
    globalRole: user.globalRole,
    id: user.id,
    identityProvider: user.identityProvider ?? undefined,
    initials: user.initials,
    name: user.name,
    operator: user.operator,
    organization: user.organization,
    zitadelSubject: user.zitadelSubject ?? undefined,
  }
}
