import { createServerFn } from '@tanstack/react-start'
import { getRequestUrl } from '@tanstack/react-start/server'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '~/db/client'
import { ensureDatabaseReady } from '~/db/setup'
import { getOptionalCurrentUser, getRequiredCurrentUser } from '~/server/auth/current-user'
import {
  isSuperAdmin,
  listAccessibleTenantRows,
  requireCanCreateTenant,
  requireTenantAccess,
  requireTenantRole,
} from '~/server/auth/tenant-access'
import type { AuthUser } from '~/server/auth/types'
import {
  apps,
  appStoreConnectAuditEvents,
  appStoreConnectSalesReports,
  appUsers,
  entitlementGrants,
  entitlements,
  offeringPackages,
  offerings,
  products,
  purchaseEvents,
  tenants,
  userTenants,
  users,
} from '~/db/schema'
import { readAppStoreConnectConnectionForTenant } from '~/integrations/app-store-connect/server/read'
import type { StatusTone } from '~/components/ui/types'
import type { AppUser, EntitlementGrantSummary, PurchaseHistoryEvent } from '~/domain/app-users/types'
import type { AppTenant, Platform } from '~/domain/apps/types'
import type { ActivityEvent, ConsoleStats, DashboardSummary, Metric, RevenueBar } from '~/domain/dashboard/types'
import type { Entitlement, EntitlementGrantStatus } from '~/domain/entitlements/types'
import type { Offering, OfferingPackage } from '~/domain/offerings/types'
import type { SubscriptionProduct } from '~/domain/subscriptions/types'
import type { ConsoleUser, TenantMemberSummary, TenantRole, WorkspaceTenant } from '~/domain/tenants/types'
import type { ConsoleData } from '~/console/types'

const appInputSchema = z.object({
  appleAppId: z.string().min(1),
  bundleId: z.string(),
  color: z.string().min(1),
  id: z.string().min(1),
  initials: z.string().min(1),
  name: z.string().min(1),
  tenantId: z.string().min(1),
})

const subscriptionInputSchema = z.object({
  androidId: z.string().optional(),
  appId: z.string().min(1),
  duration: z.string().min(1),
  entitlement: z.string().min(1),
  identifier: z.string().min(1),
  iosId: z.string().min(1),
  name: z.string().min(1),
  originalIdentifier: z.string().nullable(),
  price: z.string().min(1),
  trialOn: z.boolean(),
})

const deleteAppInputSchema = z.object({
  appId: z.string().min(1),
})

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

function parsePriceCents(price: string): number {
  const amount = Number(price.replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(amount)) throw new Error('Invalid subscription price')
  return Math.round(amount * 100)
}

function productRowId(appId: string, identifier: string): string {
  return `${appId}:${identifier}`
}

function entitlementRowId(appId: string, key: string): string {
  return `${appId}:${key}`
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', { currency: 'USD', maximumFractionDigits: 2, style: 'currency' }).format(cents / 100)
}

function formatSignedCurrency(cents: number | null): string {
  if (cents == null) return '—'
  if (cents === 0) return '$0.00'
  const sign = cents > 0 ? '+' : '-'
  return `${sign}${formatCurrency(Math.abs(cents))}`
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value)
}

function appStatus(status: 'setup' | 'live' | 'beta' | 'inactive'): { label: string; tone: StatusTone } {
  if (status === 'setup') return { label: 'Setup', tone: 'warning' }
  if (status === 'live') return { label: 'Live', tone: 'success' }
  if (status === 'beta') return { label: 'Beta', tone: 'warning' }
  return { label: 'Inactive', tone: 'muted' }
}

function consolePublicOrigin(): string {
  const configuredBaseUrl = parseConfiguredAuthBaseUrl()
  if (configuredBaseUrl != null) return configuredBaseUrl.origin

  const requestUrl = getRequestUrl({ xForwardedHost: true, xForwardedProto: true })
  return requestUrl.origin
}

function parseConfiguredAuthBaseUrl(): URL | null {
  try {
    return new URL(process.env.AUTH_BASE_URL ?? '')
  } catch {
    return null
  }
}

function grantStatus(status: EntitlementGrantStatus): { label: string; tone: StatusTone } {
  switch (status) {
    case 'active':
      return { label: 'Active', tone: 'success' }
    case 'trialing':
      return { label: 'Trialing', tone: 'warning' }
    case 'billing_retry':
      return { label: 'Billing retry', tone: 'destructive' }
    case 'expired':
      return { label: 'Expired', tone: 'muted' }
    case 'revoked':
      return { label: 'Revoked', tone: 'destructive' }
  }
}

function sourceLabel(source: string): string {
  if (source === 'apple') return 'Apple'
  if (source === 'google') return 'Google'
  if (source === 'voucher') return 'Voucher'
  if (source === 'promo') return 'Promo'
  if (source === 'manual') return 'Manual'
  if (source === 'lifetime') return 'Lifetime'
  if (source === 'migration') return 'Migration'
  return source
}

function amountTone(cents: number | null): StatusTone {
  if (cents == null || cents === 0) return 'muted'
  return cents > 0 ? 'success' : 'destructive'
}

function shortUserId(userId: string): string {
  const [firstPart] = userId.split('-')
  if (!firstPart) throw new Error('App User id is required')
  return firstPart
}

function isAccessGrant(status: EntitlementGrantStatus): boolean {
  return status === 'active' || status === 'trialing' || status === 'billing_retry'
}

function grantPriority(status: EntitlementGrantStatus): number {
  if (status === 'active') return 0
  if (status === 'trialing') return 1
  if (status === 'billing_retry') return 2
  if (status === 'expired') return 3
  return 4
}

function sortGrantsByRelevance<T extends { createdAt: Date; status: EntitlementGrantStatus }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => {
    const priorityDelta = grantPriority(left.status) - grantPriority(right.status)
    if (priorityDelta !== 0) return priorityDelta
    return right.createdAt.getTime() - left.createdAt.getTime()
  })
}

function revenueBarsForEvents(events: readonly typeof purchaseEvents.$inferSelect[]): RevenueBar[] {
  const revenueByMonth = new Map<string, number>()
  for (const event of events) {
    if (event.amountCents == null) continue
    const month = event.occurredOn.slice(0, 7)
    if (!month) continue
    revenueByMonth.set(month, (revenueByMonth.get(month) ?? 0) + event.amountCents)
  }

  const values = [...revenueByMonth.entries()].sort(([left], [right]) => left.localeCompare(right))
  const maxRevenue = Math.max(...values.map(([, cents]) => cents))
  if (!Number.isFinite(maxRevenue) || maxRevenue <= 0) return []

  return values.map(([month, cents]) => ({ month, height: `${Math.max(1, Math.round((cents * 100) / maxRevenue))}%` }))
}

function appPlatforms(appleAppId: string | null, iosBundleId: string | null, bundleId: string, androidPackageName: string | null): Platform[] {
  const platforms: Platform[] = []
  if (appleAppId != null && appleAppId.trim() !== '') platforms.push('iOS')
  else if (iosBundleId != null && iosBundleId.trim() !== '') platforms.push('iOS')
  else if (bundleId.trim() !== '') platforms.push('iOS')
  if (androidPackageName != null && androidPackageName.trim() !== '') platforms.push('Android')
  return platforms
}

function appStoreSummary(appleAppId: string | null, iosBundleId: string | null, bundleId: string, androidPackageName: string | null): string {
  const appleId = appleAppId?.trim()
  const ios = iosBundleId?.trim() || bundleId.trim()
  const android = androidPackageName?.trim()
  if (ios && android) return 'iOS + Android mapped'
  if (ios) return `iOS ${ios}`
  if (appleId) return `App Store Connect ${appleId}`
  if (android) return `Android ${android}`
  return 'Local app · no store mapping'
}

function isOwnedApp(appId: string, ownedAppIds: ReadonlySet<string>): boolean {
  return ownedAppIds.has(appId)
}

function toWorkspaceTenant(tenant: typeof tenants.$inferSelect, role: WorkspaceTenant['role']): WorkspaceTenant {
  return {
    color: tenant.color,
    id: tenant.id,
    initials: tenant.initials,
    name: tenant.name,
    role,
  }
}

async function tenantRolesById(user: AuthUser, tenantIds: readonly string[]): Promise<Map<string, WorkspaceTenant['role']>> {
  if (isSuperAdmin(user)) return new Map(tenantIds.map((tenantId) => [tenantId, 'super_admin']))
  if (tenantIds.length === 0) return new Map()

  const rows = await db
    .select({ role: userTenants.role, tenantId: userTenants.tenantId })
    .from(userTenants)
    .where(and(eq(userTenants.userId, user.id), inArray(userTenants.tenantId, [...tenantIds])))

  return new Map(rows.map((row) => [row.tenantId, row.role]))
}

function roleForTenant(roleByTenantId: ReadonlyMap<string, WorkspaceTenant['role']>, tenantId: string): WorkspaceTenant['role'] {
  return roleByTenantId.get(tenantId) ?? 'developer'
}

function canCreateTenants(user: AuthUser, roleByTenantId: ReadonlyMap<string, WorkspaceTenant['role']>): boolean {
  return isSuperAdmin(user) || [...roleByTenantId.values()].some((role) => role === 'admin')
}

function toTenantMemberSummary(row: { createdAt: Date; role: TenantRole; tenantId: string; user: typeof users.$inferSelect }): TenantMemberSummary {
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

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function canRemoveTenantMember(currentUser: AuthUser, userId: string): boolean {
  return currentUser.id !== userId || isSuperAdmin(currentUser)
}

async function assertTenantKeepsAdmin(tenantId: string, excludedUserId: string): Promise<void> {
  const adminRows = await db
    .select({ userId: userTenants.userId })
    .from(userTenants)
    .where(and(eq(userTenants.tenantId, tenantId), eq(userTenants.role, 'admin')))
  const remainingAdmins = adminRows.filter((member) => member.userId !== excludedUserId)
  if (remainingAdmins.length === 0) throw new Error('Tenant needs at least one admin')
}

function toConsoleUser(user: AuthUser, canCreateNewTenants: boolean): ConsoleUser {
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

async function getCurrentConsoleUser(): Promise<AuthUser> {
  return getRequiredCurrentUser()
}

async function requireAccessibleApp(user: AuthUser, appId: string): Promise<typeof apps.$inferSelect> {
  const [app] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1)
  if (app == null) throw new Error('App does not exist')
  await requireTenantAccess(user, app.tenantId)
  return app
}

function normalizeTenantId(id: string): string {
  const normalized = id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!normalized) throw new Error('Tenant id is required')
  return normalized
}

export const getAuthStatus = createServerFn({ method: 'GET' }).handler(async () => {
  await ensureDatabaseReady()
  const currentUser = await getOptionalCurrentUser()
  return { authenticated: Boolean(currentUser) }
})

export const getSubKitConsoleData = createServerFn({ method: 'GET' }).handler(async (): Promise<ConsoleData> => {
  await ensureDatabaseReady()
  const currentUser = await getCurrentConsoleUser()
  const accessibleTenantRows = await listAccessibleTenantRows(currentUser)
  const roleByTenantId = await tenantRolesById(currentUser, accessibleTenantRows.map((tenant) => tenant.id))
  const accessibleTenantIds = new Set(accessibleTenantRows.map((tenant) => tenant.id))

  const [
    appRowsAll,
    productRowsAll,
    entitlementRowsAll,
    offeringRowsAll,
    packageRows,
    appUserRowsAll,
    entitlementGrantRowsAll,
    eventRowsAll,
    appStoreConnectConnections,
    tenantMemberRowsAll,
  ] = await Promise.all([
    db.select().from(apps),
    db.select().from(products),
    db.select().from(entitlements),
    db.select().from(offerings),
    db.select().from(offeringPackages),
    db.select().from(appUsers),
    db.select().from(entitlementGrants),
    db.select().from(purchaseEvents),
    Promise.all(accessibleTenantRows.map((tenant) => readAppStoreConnectConnectionForTenant(tenant.id))),
    db
      .select({
        createdAt: userTenants.createdAt,
        role: userTenants.role,
        tenantId: userTenants.tenantId,
        user: users,
      })
      .from(userTenants)
      .innerJoin(users, eq(userTenants.userId, users.id))
      .where(isNull(users.disabledAt)),
  ])

  const activeTenant = accessibleTenantRows[0]
  const appRows = appRowsAll.filter((app) => accessibleTenantIds.has(app.tenantId))
  const ownedAppIds = new Set(appRows.map((app) => app.id))
  const productRows = productRowsAll.filter((product) => isOwnedApp(product.appId, ownedAppIds))
  const entitlementRows = entitlementRowsAll.filter((entitlement) => isOwnedApp(entitlement.appId, ownedAppIds))
  const offeringRows = offeringRowsAll.filter((offering) => isOwnedApp(offering.appId, ownedAppIds))
  const appUserRows = appUserRowsAll.filter((appUser) => isOwnedApp(appUser.appId, ownedAppIds))
  const ownedAppUserIds = new Set(appUserRows.map((appUser) => appUser.id))
  const entitlementGrantRows = entitlementGrantRowsAll.filter((grant) => isOwnedApp(grant.appId, ownedAppIds) && ownedAppUserIds.has(grant.appUserId))
  const eventRows = eventRowsAll.filter((event) => ownedAppUserIds.has(event.appUserId))
  const tenantMemberRows = tenantMemberRowsAll.filter((member) => accessibleTenantIds.has(member.tenantId))

  const stats: ConsoleStats = {
    appUsers: appUserRows.length,
    apps: appRows.length,
    products: productRows.length,
    entitlements: entitlementRows.length,
    purchaseEvents: eventRows.length,
    tenants: accessibleTenantRows.length,
  }

  const tenant: WorkspaceTenant = activeTenant == null
    ? { color: 'oklch(0.62 0.17 152)', id: 'none', initials: '—', name: 'No tenant access', role: 'developer' }
    : toWorkspaceTenant(activeTenant, roleForTenant(roleByTenantId, activeTenant.id))
  const accessibleTenants = accessibleTenantRows.map((tenantRow) => toWorkspaceTenant(tenantRow, roleForTenant(roleByTenantId, tenantRow.id)))
  const appStoreConnectConnectionsFiltered = appStoreConnectConnections.filter((connection) => connection != null)
  const appStoreConnectConnection = appStoreConnectConnectionsFiltered[0] ?? null
  const tenantMembers = tenantMemberRows.map(toTenantMemberSummary)

  const appUserById = new Map(appUserRows.map((appUser) => [appUser.id, appUser]))
  const entitlementById = new Map(entitlementRows.map((row) => [row.id, row]))
  const productById = new Map(productRows.map((row) => [row.id, row]))
  const grantById = new Map(entitlementGrantRows.map((row) => [row.id, row]))

  const productsByEntitlement = new Map<string, string[]>()
  for (const product of productRows) {
    const current = productsByEntitlement.get(product.entitlementId) ?? []
    current.push(product.identifier)
    productsByEntitlement.set(product.entitlementId, current)
  }

  const grantsByAppUser = new Map<string, Array<typeof entitlementGrants.$inferSelect>>()
  const activeAppUserIdsByApp = new Map<string, Set<string>>()
  const activeAppUserIdsByProduct = new Map<string, Set<string>>()
  for (const grant of entitlementGrantRows) {
    const current = grantsByAppUser.get(grant.appUserId) ?? []
    current.push(grant)
    grantsByAppUser.set(grant.appUserId, current)

    if (isAccessGrant(grant.status)) {
      const appSet = activeAppUserIdsByApp.get(grant.appId) ?? new Set<string>()
      appSet.add(grant.appUserId)
      activeAppUserIdsByApp.set(grant.appId, appSet)

      if (grant.productId != null) {
        const productSet = activeAppUserIdsByProduct.get(grant.productId) ?? new Set<string>()
        productSet.add(grant.appUserId)
        activeAppUserIdsByProduct.set(grant.productId, productSet)
      }
    }
  }

  const eventsByAppUser = new Map<string, PurchaseHistoryEvent[]>()
  const ltvByAppUser = new Map<string, number>()
  for (const event of eventRows) {
    const current = eventsByAppUser.get(event.appUserId) ?? []
    current.push({
      type: event.type,
      date: event.occurredOn,
      store: event.store,
      amount: formatSignedCurrency(event.amountCents),
      amountTone: amountTone(event.amountCents),
    })
    eventsByAppUser.set(event.appUserId, current)
    ltvByAppUser.set(event.appUserId, (ltvByAppUser.get(event.appUserId) ?? 0) + Math.max(event.amountCents ?? 0, 0))
  }

  const appItems: AppTenant[] = appRows.map((app) => {
    const status = appStatus(app.status)
    return {
      id: app.id,
      tenantId: app.tenantId,
      name: app.name,
      initials: app.initials,
      color: app.color,
      bundle: appStoreSummary(app.appleAppId, app.iosBundleId, app.bundleId, app.androidPackageName),
      appleAppId: app.appleAppId,
      iosBundleId: app.iosBundleId,
      androidPackageName: app.androidPackageName,
      platforms: appPlatforms(app.appleAppId, app.iosBundleId, app.bundleId, app.androidPackageName),
      mrr: formatCurrency(app.monthlyRevenueCents),
      activeAppUsers: formatInteger(activeAppUserIdsByApp.get(app.id)?.size ?? 0),
      status: status.label,
      statusTone: status.tone,
    }
  })

  const subscriptionProducts: SubscriptionProduct[] = productRows.map((product) => {
    const entitlement = entitlementById.get(product.entitlementId)
    return {
      appId: product.appId,
      name: product.displayName,
      identifier: product.identifier,
      iosId: product.appStoreId,
      androidId: product.playStoreId,
      duration: product.duration,
      price: formatCurrency(product.priceCents),
      activeAppUsers: formatInteger(activeAppUserIdsByProduct.get(product.id)?.size ?? 0),
      entitlement: entitlement?.key ?? product.entitlementId,
      trial: product.trialEnabled ? '7-day free trial' : 'No trial',
      trialOn: product.trialEnabled,
    }
  })

  const consoleEntitlements: Entitlement[] = entitlementRows.map((entitlement) => {
    const entitlementProducts = productsByEntitlement.get(entitlement.id) ?? []
    return {
      appId: entitlement.appId,
      id: entitlement.key,
      description: entitlement.description,
      productCount: `${entitlementProducts.length} ${entitlementProducts.length === 1 ? 'product' : 'products'}`,
      products: entitlementProducts,
    }
  })

  const packagesByOffering = new Map<string, OfferingPackage[]>()
  for (const pkg of packageRows) {
    const current = packagesByOffering.get(pkg.offeringId) ?? []
    current.push({
      label: pkg.label,
      productId: pkg.productId,
      price: pkg.priceLabel,
      badge: pkg.badge,
      hasBadge: pkg.badge.trim() !== '',
    })
    packagesByOffering.set(pkg.offeringId, current)
  }

  const consoleOfferings: Offering[] = offeringRows.map((offering) => ({
    appId: offering.appId,
    id: offering.key,
    name: offering.name,
    desc: offering.description,
    tag: offering.tag,
    tagTone: offering.tagTone,
    packages: packagesByOffering.get(offering.id) ?? [],
  }))

  const consoleAppUsers: AppUser[] = appUserRows.map((appUser) => {
    const relevantGrants = sortGrantsByRelevance(grantsByAppUser.get(appUser.id) ?? [])
    const primaryGrant = relevantGrants[0]
    const primaryStatus: { label: string; tone: StatusTone } = primaryGrant == null ? { label: 'No entitlement', tone: 'muted' } : grantStatus(primaryGrant.status)
    const grantSummaries: EntitlementGrantSummary[] = relevantGrants.map((grant) => {
      const status = grantStatus(grant.status)
      const entitlement = entitlementById.get(grant.entitlementId)
      const product = grant.productId == null ? null : productById.get(grant.productId)
      return {
        entitlement: entitlement?.key ?? grant.entitlementId,
        expiresAt: grant.expiresAt ?? '—',
        id: grant.id,
        product: product?.identifier ?? '—',
        source: sourceLabel(grant.source),
        startsAt: grant.startsAt,
        status: status.label,
        statusTone: status.tone,
      }
    })
    const primaryEntitlement = primaryGrant == null ? '—' : entitlementById.get(primaryGrant.entitlementId)?.key ?? primaryGrant.entitlementId

    return {
      appId: appUser.appId,
      appUserId: appUser.appUserId,
      countryCode: appUser.countryCode,
      country: appUser.country,
      createdAt: formatDateTime(appUser.createdAt),
      grants: grantSummaries,
      history: eventsByAppUser.get(appUser.id) ?? [],
      lastSeenAt: appUser.lastSeenAt == null ? '—' : formatDateTime(appUser.lastSeenAt),
      ltv: formatCurrency(ltvByAppUser.get(appUser.id) ?? 0),
      primaryEntitlement,
      primarySource: primaryGrant == null ? '—' : sourceLabel(primaryGrant.source),
      status: primaryStatus.label,
      statusTone: primaryStatus.tone,
    }
  })

  const dashboards: DashboardSummary[] = appRows.map((app) => {
    const appUsersForApp = appUserRows.filter((appUser) => appUser.appId === app.id)
    const appGrants = entitlementGrantRows.filter((grant) => grant.appId === app.id)
    const activeUserIds = activeAppUserIdsByApp.get(app.id) ?? new Set<string>()
    const trialUserIds = new Set(appGrants.filter((grant) => grant.status === 'trialing').map((grant) => grant.appUserId))
    const expiredUserIds = new Set(appGrants.filter((grant) => grant.status === 'expired').map((grant) => grant.appUserId))
    const appEvents = eventRows.filter((event) => appUserById.get(event.appUserId)?.appId === app.id)
    const revenue30dCents = appEvents.reduce((total, event) => total + Math.max(event.amountCents ?? 0, 0), 0)
    const trialConversionBase = activeUserIds.size + trialUserIds.size
    const trialConversion = trialConversionBase > 0 ? Math.round((activeUserIds.size / trialConversionBase) * 1000) / 10 : 0
    const churnRate = appUsersForApp.length > 0 ? Math.round((expiredUserIds.size / appUsersForApp.length) * 1000) / 10 : 0
    const metrics: Metric[] = [
      { label: 'Monthly Recurring Revenue', value: formatCurrency(app.monthlyRevenueCents) },
      { label: 'Active App Users', value: formatInteger(activeUserIds.size) },
      { label: 'Trialing Grants', value: formatInteger(trialUserIds.size) },
      { label: 'Trial Conversion', value: `${trialConversion}%` },
      { label: 'Expired Grants', value: `${churnRate}%` },
      { label: 'Revenue (30d)', value: formatCurrency(revenue30dCents) },
    ]
    const activity: ActivityEvent[] = appEvents.slice(0, 6).map((event) => {
      const appUser = appUserById.get(event.appUserId)
      const grant = event.entitlementGrantId == null ? null : grantById.get(event.entitlementGrantId)
      const entitlement = grant == null ? null : entitlementById.get(grant.entitlementId)
      const product = grant?.productId == null ? null : productById.get(grant.productId)
      return {
        type: event.type,
        user: appUser != null ? shortUserId(appUser.appUserId) : event.appUserId,
        product: product?.identifier ?? entitlement?.key ?? '—',
        amount: formatSignedCurrency(event.amountCents),
        amountTone: amountTone(event.amountCents),
        time: event.occurredOn,
        dotTone: amountTone(event.amountCents),
      }
    })
    return { appId: app.id, activity, metrics, revenueBars: revenueBarsForEvents(appEvents) }
  })

  const publicOrigin = consolePublicOrigin()

  return {
    accessibleTenants,
    appStoreConnect: appStoreConnectConnection,
    appStoreConnectConnections: appStoreConnectConnectionsFiltered,
    appUsers: consoleAppUsers,
    apps: appItems,
    currentUser: toConsoleUser(currentUser, canCreateTenants(currentUser, roleByTenantId)),
    dashboards,
    subscriptions: subscriptionProducts,
    entitlements: consoleEntitlements,
    offerings: consoleOfferings,
    runtime: {
      appleServerNotificationsUrl: `${publicOrigin}/api/stores/apple/notifications`,
      publicOrigin,
    },
    stats,
    tenant,
    tenantMembers,
  }
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
    if (!canRemoveTenantMember(currentUser, data.userId)) throw new Error('Admins cannot remove their own tenant access')
    await assertTenantKeepsAdmin(data.tenantId, data.userId)

    await db.delete(userTenants).where(and(eq(userTenants.tenantId, data.tenantId), eq(userTenants.userId, data.userId)))
    return { ok: true }
  })

export const createAppRecord = createServerFn({ method: 'POST' })
  .validator((input: unknown) => appInputSchema.parse(input))
  .handler(async ({ data }) => {
    await ensureDatabaseReady()
    const currentUser = await getCurrentConsoleUser()
    await requireTenantRole(currentUser, data.tenantId, ['admin'])
    if (!data.id.startsWith(`${data.tenantId}:`)) {
      throw new Error('Cannot create apps outside the requested tenant')
    }

    await db
      .insert(apps)
      .values({
        activeAppUserCount: 0,
        androidPackageName: null,
        appleAppId: data.appleAppId,
        bundleId: data.bundleId,
        color: data.color,
        createdAt: new Date(),
        id: data.id,
        initials: data.initials,
        iosBundleId: data.bundleId,
        monthlyRevenueCents: 0,
        name: data.name,
        status: 'setup',
        tenantId: data.tenantId,
      })
      .onConflictDoUpdate({
        set: {
          appleAppId: data.appleAppId,
          bundleId: data.bundleId,
          color: data.color,
          initials: data.initials,
          iosBundleId: data.bundleId,
          name: data.name,
        },
        target: apps.id,
      })
    return { ok: true }
  })

export const deleteAppRecord = createServerFn({ method: 'POST' })
  .validator((input: unknown) => deleteAppInputSchema.parse(input))
  .handler(async ({ data }) => {
    await ensureDatabaseReady()
    const currentUser = await getCurrentConsoleUser()
    const app = await requireAccessibleApp(currentUser, data.appId)
    await requireTenantRole(currentUser, app.tenantId, ['admin'])

    await db.transaction(async (tx) => {
      const appUserRows = await tx.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.appId, data.appId))
      const offeringRows = await tx.select({ id: offerings.id }).from(offerings).where(eq(offerings.appId, data.appId))
      const appUserIds = appUserRows.map((appUser) => appUser.id)
      const offeringIds = offeringRows.map((offering) => offering.id)

      if (appUserIds.length > 0) await tx.delete(purchaseEvents).where(inArray(purchaseEvents.appUserId, appUserIds))
      await tx.delete(entitlementGrants).where(eq(entitlementGrants.appId, data.appId))
      if (offeringIds.length > 0) await tx.delete(offeringPackages).where(inArray(offeringPackages.offeringId, offeringIds))

      await tx.delete(appStoreConnectSalesReports).where(eq(appStoreConnectSalesReports.appId, data.appId))
      await tx.delete(appStoreConnectAuditEvents).where(eq(appStoreConnectAuditEvents.appId, data.appId))
      await tx.delete(products).where(eq(products.appId, data.appId))
      await tx.delete(appUsers).where(eq(appUsers.appId, data.appId))
      await tx.delete(offerings).where(eq(offerings.appId, data.appId))
      await tx.delete(entitlements).where(eq(entitlements.appId, data.appId))
      await tx.delete(apps).where(eq(apps.id, data.appId))
    })

    return { ok: true }
  })

export const upsertSubscriptionRecord = createServerFn({ method: 'POST' })
  .validator((input: unknown) => subscriptionInputSchema.parse(input))
  .handler(async ({ data }) => {
    await ensureDatabaseReady()
    const currentUser = await getCurrentConsoleUser()
    await requireAccessibleApp(currentUser, data.appId)

    const entitlementId = entitlementRowId(data.appId, data.entitlement)
    await db
      .insert(entitlements)
      .values({
        appId: data.appId,
        description: `Access group ${data.entitlement}`,
        id: entitlementId,
        key: data.entitlement,
      })
      .onConflictDoUpdate({
        set: {
          appId: data.appId,
          key: data.entitlement,
        },
        target: entitlements.id,
      })

    if (data.originalIdentifier != null && data.originalIdentifier !== data.identifier) {
      await db.delete(products).where(eq(products.id, productRowId(data.appId, data.originalIdentifier)))
    }

    await db
      .insert(products)
      .values({
        activeAppUserCount: 0,
        appId: data.appId,
        appStoreId: data.iosId,
        displayName: data.name,
        duration: data.duration,
        entitlementId,
        id: productRowId(data.appId, data.identifier),
        identifier: data.identifier,
        playStoreId: data.androidId ?? '',
        priceCents: parsePriceCents(data.price),
        trialEnabled: data.trialOn,
      })
      .onConflictDoUpdate({
        set: {
          appId: data.appId,
          appStoreId: data.iosId,
          displayName: data.name,
          duration: data.duration,
          entitlementId,
          identifier: data.identifier,
          playStoreId: data.androidId ?? '',
          priceCents: parsePriceCents(data.price),
          trialEnabled: data.trialOn,
        },
        target: products.id,
      })
    return { ok: true }
  })
