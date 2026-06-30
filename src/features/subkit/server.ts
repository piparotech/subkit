import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray } from 'drizzle-orm'
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
  entitlements,
  offeringPackages,
  offerings,
  products,
  purchaseEvents,
  runtimeSyncEvents,
  subscribers,
  tenants,
  userTenants,
} from '~/db/schema'
import { readAppStoreConnectConnectionForTenant } from './app-store-connect-read'
import type {
  ActivityEvent,
  AppTenant,
  ConsoleData,
  ConsoleUser,
  ConsoleStats,
  DashboardSummary,
  Entitlement,
  Metric,
  Offering,
  OfferingPackage,
  Platform,
  PurchaseHistoryEvent,
  RevenueBar,
  StatusTone,
  RuntimeSyncEventSummary,
  Subscriber,
  SubscriptionProduct,
  WorkspaceTenant,
} from './types'

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

function subscriberStatus(status: 'active' | 'trial' | 'billing_retry' | 'expired'): { label: string; tone: StatusTone } {
  switch (status) {
    case 'active':
      return { label: 'Active', tone: 'success' }
    case 'trial':
      return { label: 'Trial', tone: 'warning' }
    case 'billing_retry':
      return { label: 'Billing retry', tone: 'destructive' }
    case 'expired':
      return { label: 'Expired', tone: 'muted' }
  }
}

function amountTone(cents: number | null): StatusTone {
  if (cents == null || cents === 0) return 'muted'
  return cents > 0 ? 'success' : 'destructive'
}

function shortUserId(userId: string): string {
  const [firstPart] = userId.split('-')
  if (!firstPart) throw new Error('Subscriber user id is required')
  return firstPart
}

function readSubscriberPlan(subscriber: typeof subscribers.$inferSelect | undefined): string {
  if (subscriber == null) throw new Error('Purchase event references a missing subscriber')
  return subscriber.plan
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
    subscriberRowsAll,
    eventRowsAll,
    appStoreConnectConnections,
    runtimeSyncEventRowsAll,
  ] = await Promise.all([
    db.select().from(apps),
    db.select().from(products),
    db.select().from(entitlements),
    db.select().from(offerings),
    db.select().from(offeringPackages),
    db.select().from(subscribers),
    db.select().from(purchaseEvents),
    Promise.all(accessibleTenantRows.map((tenant) => readAppStoreConnectConnectionForTenant(tenant.id))),
    db.select().from(runtimeSyncEvents),
  ])

  const activeTenant = accessibleTenantRows[0]
  const appRows = appRowsAll.filter((app) => accessibleTenantIds.has(app.tenantId))
  const ownedAppIds = new Set(appRows.map((app) => app.id))
  const productRows = productRowsAll.filter((product) => isOwnedApp(product.appId, ownedAppIds))
  const entitlementRows = entitlementRowsAll.filter((entitlement) => isOwnedApp(entitlement.appId, ownedAppIds))
  const offeringRows = offeringRowsAll.filter((offering) => isOwnedApp(offering.appId, ownedAppIds))
  const subscriberRows = subscriberRowsAll.filter((subscriber) => isOwnedApp(subscriber.appId, ownedAppIds))
  const ownedSubscriberIds = new Set(subscriberRows.map((subscriber) => subscriber.id))
  const eventRows = eventRowsAll.filter((event) => ownedSubscriberIds.has(event.subscriberId))
  const runtimeSyncEventRows = runtimeSyncEventRowsAll.filter((event) => isOwnedApp(event.appId, ownedAppIds))

  const stats: ConsoleStats = {
    tenants: accessibleTenantRows.length,
    apps: appRows.length,
    products: productRows.length,
    entitlements: entitlementRows.length,
    subscribers: subscriberRows.length,
    purchaseEvents: eventRows.length,
  }

  const tenant: WorkspaceTenant = activeTenant == null
    ? { color: 'oklch(0.62 0.17 152)', id: 'none', initials: '—', name: 'No tenant access', role: 'developer' }
    : toWorkspaceTenant(activeTenant, roleForTenant(roleByTenantId, activeTenant.id))
  const accessibleTenants = accessibleTenantRows.map((tenantRow) => toWorkspaceTenant(tenantRow, roleForTenant(roleByTenantId, tenantRow.id)))
  const appStoreConnectConnectionsFiltered = appStoreConnectConnections.filter((connection) => connection != null)
  const appStoreConnectConnection = appStoreConnectConnectionsFiltered[0] ?? null

  const entitlementById = new Map(entitlementRows.map((row) => [row.id, row]))
  const productsByEntitlement = new Map<string, string[]>()
  for (const product of productRows) {
    const current = productsByEntitlement.get(product.entitlementId) ?? []
    current.push(product.identifier)
    productsByEntitlement.set(product.entitlementId, current)
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
      activeSubs: formatInteger(app.activeSubscriberCount),
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
      activeSubs: formatInteger(product.activeSubscriberCount),
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

  const eventsBySubscriber = new Map<string, PurchaseHistoryEvent[]>()
  for (const event of eventRows) {
    const current = eventsBySubscriber.get(event.subscriberId) ?? []
    current.push({
      type: event.type,
      date: event.occurredOn,
      store: event.store,
      amount: formatSignedCurrency(event.amountCents),
      amountTone: amountTone(event.amountCents),
    })
    eventsBySubscriber.set(event.subscriberId, current)
  }

  const consoleSubscribers: Subscriber[] = subscriberRows.map((subscriber) => {
    const status = subscriberStatus(subscriber.status)
    const entitlement = subscriber.entitlementId != null ? entitlementById.get(subscriber.entitlementId) : null
    return {
      appId: subscriber.appId,
      userId: subscriber.appUserId,
      countryCode: subscriber.countryCode,
      country: subscriber.country,
      plan: subscriber.plan,
      status: status.label,
      statusTone: status.tone,
      since: subscriber.subscriberSince,
      ltv: formatCurrency(subscriber.lifetimeValueCents),
      entitlement: entitlement?.key ?? '—',
      history: eventsBySubscriber.get(subscriber.id) ?? [],
    }
  })

  const subscriberById = new Map(subscriberRows.map((subscriber) => [subscriber.id, subscriber]))
  const runtimeSyncEventItems: RuntimeSyncEventSummary[] = runtimeSyncEventRows
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, 8)
    .map((event) => ({
      appId: event.appId,
      created: event.created,
      createdAt: formatDateTime(event.createdAt),
      detail: event.detail,
      failed: event.failed,
      id: event.id,
      received: event.received,
      source: event.source,
      status: event.status,
      updated: event.updated,
    }))

  const dashboards: DashboardSummary[] = appRows.map((app) => {
    const appSubscribers = subscriberRows.filter((subscriber) => subscriber.appId === app.id)
    const activeSubscriptions = app.activeSubscriberCount
    const activeTrials = appSubscribers.filter((subscriber) => subscriber.status === 'trial').length
    const expiredSubscribers = appSubscribers.filter((subscriber) => subscriber.status === 'expired').length
    const appEvents = eventRows.filter((event) => subscriberById.get(event.subscriberId)?.appId === app.id)
    const revenue30dCents = appEvents.reduce((total, event) => total + Math.max(event.amountCents ?? 0, 0), 0)
    const trialConversionBase = activeSubscriptions + activeTrials
    const trialConversion = trialConversionBase > 0 ? Math.round((activeSubscriptions / trialConversionBase) * 1000) / 10 : 0
    const churnRate = appSubscribers.length > 0 ? Math.round((expiredSubscribers / appSubscribers.length) * 1000) / 10 : 0
    const metrics: Metric[] = [
      { label: 'Monthly Recurring Revenue', value: formatCurrency(app.monthlyRevenueCents) },
      { label: 'Active Subscriptions', value: formatInteger(activeSubscriptions) },
      { label: 'Active Trials', value: formatInteger(activeTrials) },
      { label: 'Trial Conversion', value: `${trialConversion}%` },
      { label: 'Churn Rate', value: `${churnRate}%` },
      { label: 'Revenue (30d)', value: formatCurrency(revenue30dCents) },
    ]
    const activity: ActivityEvent[] = appEvents.slice(0, 6).map((event) => {
      const subscriber = subscriberById.get(event.subscriberId)
      return {
        type: event.type,
        user: subscriber != null ? shortUserId(subscriber.appUserId) : event.subscriberId,
        product: readSubscriberPlan(subscriber),
        amount: formatSignedCurrency(event.amountCents),
        amountTone: amountTone(event.amountCents),
        time: event.occurredOn,
        dotTone: amountTone(event.amountCents),
      }
    })
    return { appId: app.id, activity, metrics, revenueBars: revenueBarsForEvents(appEvents) }
  })

  return {
    accessibleTenants,
    appStoreConnect: appStoreConnectConnection,
    appStoreConnectConnections: appStoreConnectConnectionsFiltered,
    apps: appItems,
    currentUser: toConsoleUser(currentUser, canCreateTenants(currentUser, roleByTenantId)),
    dashboards,
    subscriptions: subscriptionProducts,
    entitlements: consoleEntitlements,
    offerings: consoleOfferings,
    runtimeSyncEvents: runtimeSyncEventItems,
    subscribers: consoleSubscribers,
    stats,
    tenant,
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
        activeSubscriberCount: 0,
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
      const subscriberRows = await tx.select({ id: subscribers.id }).from(subscribers).where(eq(subscribers.appId, data.appId))
      const offeringRows = await tx.select({ id: offerings.id }).from(offerings).where(eq(offerings.appId, data.appId))
      const subscriberIds = subscriberRows.map((subscriber) => subscriber.id)
      const offeringIds = offeringRows.map((offering) => offering.id)

      if (subscriberIds.length > 0) await tx.delete(purchaseEvents).where(inArray(purchaseEvents.subscriberId, subscriberIds))
      if (offeringIds.length > 0) await tx.delete(offeringPackages).where(inArray(offeringPackages.offeringId, offeringIds))

      await tx.delete(appStoreConnectSalesReports).where(eq(appStoreConnectSalesReports.appId, data.appId))
      await tx.delete(appStoreConnectAuditEvents).where(eq(appStoreConnectAuditEvents.appId, data.appId))
      await tx.delete(runtimeSyncEvents).where(eq(runtimeSyncEvents.appId, data.appId))
      await tx.delete(products).where(eq(products.appId, data.appId))
      await tx.delete(subscribers).where(eq(subscribers.appId, data.appId))
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
        activeSubscriberCount: 0,
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
