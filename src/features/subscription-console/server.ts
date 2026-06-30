import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '~/db/client'
import { ensureDatabaseReady } from '~/db/setup'
import { getOptionalCurrentUser, getRequiredCurrentUser } from '~/server/auth/current-user'
import { parseServerEnv } from '~/server/env'
import { apps, entitlements, offeringPackages, offerings, products, purchaseEvents, subscribers, tenants } from '~/db/schema'
import { readAppStoreConnectConnectionsForTenant } from './app-store-connect-read'
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
  Subscriber,
  SubscriptionProduct,
  WorkspaceTenant,
} from './types'

const env = parseServerEnv(process.env)
const activeTenantId = env.TENANT_ID

const appInputSchema = z.object({
  androidPackage: z.string().optional(),
  bundle: z.string().min(1),
  color: z.string().min(1),
  id: z.string().min(1),
  initials: z.string().min(1),
  iosBundle: z.string().optional(),
  name: z.string().min(1),
  status: z.enum(['live', 'beta', 'inactive']),
  tenantId: z.string().min(1),
})

const subscriptionInputSchema = z.object({
  androidId: z.string().min(1),
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

function appStatus(status: 'live' | 'beta' | 'inactive'): { label: string; tone: StatusTone } {
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

function appPlatforms(iosBundleId: string | null, androidPackageName: string | null): Platform[] {
  const platforms: Platform[] = []
  if (iosBundleId != null && iosBundleId.trim() !== '') platforms.push('iOS')
  if (androidPackageName != null && androidPackageName.trim() !== '') platforms.push('Android')
  return platforms
}

function isOwnedApp(appId: string, ownedAppIds: ReadonlySet<string>): boolean {
  return ownedAppIds.has(appId)
}

function assertOwnedApp(appId: string): void {
  if (!appId.startsWith(`${activeTenantId}:`)) {
    throw new Error('App does not belong to the active tenant')
  }
}

function toConsoleUser(user: ConsoleUser): ConsoleUser {
  return {
    email: user.email,
    id: user.id,
    initials: user.initials,
    name: user.name,
    operator: user.operator,
    organization: user.organization,
  }
}

async function getCurrentConsoleUser(): Promise<ConsoleUser> {
  return getRequiredCurrentUser()
}

export const getAuthStatus = createServerFn({ method: 'GET' }).handler(async () => {
  await ensureDatabaseReady()
  const currentUser = await getOptionalCurrentUser()
  return { authenticated: Boolean(currentUser) }
})

export const getSubscriptionConsoleData = createServerFn({ method: 'GET' }).handler(async (): Promise<ConsoleData> => {
  await ensureDatabaseReady()
  const currentUser = await getCurrentConsoleUser()

  const [
    tenantRows,
    appRowsAll,
    productRowsAll,
    entitlementRowsAll,
    offeringRowsAll,
    packageRows,
    subscriberRowsAll,
    eventRowsAll,
    appStoreConnectConnections,
  ] = await Promise.all([
    db.select().from(tenants),
    db.select().from(apps),
    db.select().from(products),
    db.select().from(entitlements),
    db.select().from(offerings),
    db.select().from(offeringPackages),
    db.select().from(subscribers),
    db.select().from(purchaseEvents),
    readAppStoreConnectConnectionsForTenant(activeTenantId),
  ])

  const activeTenant = tenantRows.find((tenant) => tenant.id === activeTenantId)
  if (activeTenant == null) throw new Error('Active tenant is not configured')

  const appRows = appRowsAll.filter((app) => app.tenantId === activeTenant.id)
  const ownedAppIds = new Set(appRows.map((app) => app.id))
  const productRows = productRowsAll.filter((product) => isOwnedApp(product.appId, ownedAppIds))
  const entitlementRows = entitlementRowsAll.filter((entitlement) => isOwnedApp(entitlement.appId, ownedAppIds))
  const offeringRows = offeringRowsAll.filter((offering) => isOwnedApp(offering.appId, ownedAppIds))
  const subscriberRows = subscriberRowsAll.filter((subscriber) => isOwnedApp(subscriber.appId, ownedAppIds))
  const ownedSubscriberIds = new Set(subscriberRows.map((subscriber) => subscriber.id))
  const eventRows = eventRowsAll.filter((event) => ownedSubscriberIds.has(event.subscriberId))

  const stats: ConsoleStats = {
    tenants: tenantRows.length,
    apps: appRows.length,
    products: productRows.length,
    entitlements: entitlementRows.length,
    subscribers: subscriberRows.length,
    purchaseEvents: eventRows.length,
  }

  const tenant: WorkspaceTenant = {
    id: activeTenant.id,
    name: activeTenant.name,
    initials: activeTenant.initials,
    color: activeTenant.color,
  }

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
      bundle: app.bundleId,
      platforms: appPlatforms(app.iosBundleId, app.androidPackageName),
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
    appStoreConnect: appStoreConnectConnections,
    apps: appItems,
    currentUser: toConsoleUser(currentUser),
    dashboards,
    subscriptions: subscriptionProducts,
    entitlements: consoleEntitlements,
    offerings: consoleOfferings,
    subscribers: consoleSubscribers,
    stats,
    tenant,
  }
})

export const createAppRecord = createServerFn({ method: 'POST' })
  .validator((input: unknown) => appInputSchema.parse(input))
  .handler(async ({ data }) => {
    await ensureDatabaseReady()
    await getCurrentConsoleUser()
    if (data.tenantId !== activeTenantId || !data.id.startsWith(`${activeTenantId}:`)) {
      throw new Error('Cannot create apps outside the active tenant')
    }

    await db
      .insert(apps)
      .values({
        activeSubscriberCount: 0,
        androidPackageName: data.androidPackage?.trim() || null,
        bundleId: data.bundle,
        color: data.color,
        createdAt: new Date(),
        id: data.id,
        initials: data.initials,
        iosBundleId: data.iosBundle?.trim() || null,
        monthlyRevenueCents: 0,
        name: data.name,
        status: data.status,
        tenantId: activeTenantId,
      })
      .onConflictDoUpdate({
        set: {
          androidPackageName: data.androidPackage?.trim() || null,
          bundleId: data.bundle,
          color: data.color,
          initials: data.initials,
          iosBundleId: data.iosBundle?.trim() || null,
          name: data.name,
          status: data.status,
        },
        target: apps.id,
      })
    return { ok: true }
  })

export const upsertSubscriptionRecord = createServerFn({ method: 'POST' })
  .validator((input: unknown) => subscriptionInputSchema.parse(input))
  .handler(async ({ data }) => {
    await ensureDatabaseReady()
    await getCurrentConsoleUser()
    assertOwnedApp(data.appId)

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
        playStoreId: data.androidId,
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
          playStoreId: data.androidId,
          priceCents: parsePriceCents(data.price),
          trialEnabled: data.trialOn,
        },
        target: products.id,
      })
    return { ok: true }
  })
