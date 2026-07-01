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
  appPlatforms,
  appStoreConnectAuditEvents,
  appStoreConnectSalesReports,
  appUsers,
  entitlementGrants,
  entitlements,
  offeringPackages,
  offerings,
  prices,
  productEntitlements,
  productOffers,
  productPlans,
  products,
  purchaseEvents,
  storeCatalogDriftItems,
  storeCatalogSnapshots,
  storeIntegrations,
  storeMutationPlans,
  storeProductBindings,
  syncRuns,
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
import type { CatalogProduct, ProductStatus, ProductType } from '~/domain/products/types'
import type {
  StoreBindingStatus,
  StoreDriftSeverity,
  StoreDriftStatus,
  StoreMutationPlanStatus,
  StoreMutationRisk,
  StoreSyncAppSummary,
  StoreSyncDirection,
  StoreSyncRunMode,
  StoreSyncRunStatus,
  StoreSyncStore,
} from '~/domain/stores/types'
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

const productInputSchema = z.object({
  appId: z.string().min(1),
  appleProductId: z.string().optional(),
  billingPeriod: z.string().min(1),
  description: z.string(),
  entitlement: z.string().min(1),
  googleBasePlanId: z.string().optional(),
  googleProductId: z.string().optional(),
  name: z.string().min(1),
  planId: z.string().optional(),
  planKey: z.string().min(1),
  price: z.string().min(1),
  productId: z.string().optional(),
  productKey: z.string().min(1),
  productType: z.enum(['subscription', 'non_consumable', 'consumable', 'voucher', 'manual']),
  status: z.enum(['draft', 'active', 'archived']),
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

function productRowId(appId: string, key: string): string {
  return `${appId}:product:${key}`
}

function productPlanRowId(productId: string, planKey: string): string {
  return `${productId}:plan:${planKey}`
}

function priceRowId(productPlanId: string, currencyCode: string, countryCode: string | null): string {
  return `${productPlanId}:price:${currencyCode}:${countryCode ?? 'global'}`
}

function productEntitlementRowId(productId: string, entitlementId: string): string {
  return `${productId}:entitlement:${entitlementId}`
}

function storeBindingRowId(productPlanId: string, store: 'apple' | 'google', externalProductId: string, basePlanId: string): string {
  return `${productPlanId}:binding:${store}:${externalProductId}:${basePlanId || 'default'}`
}

function productOfferRowId(productPlanId: string, key: string): string {
  return `${productPlanId}:offer:${key}`
}

function entitlementRowId(appId: string, key: string): string {
  return `${appId}:entitlement:${key}`
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', { currency: 'USD', maximumFractionDigits: 2, style: 'currency' }).format(cents / 100)
}

function amountMicrosToCents(value: number | null): number {
  if (value == null) return 0
  return Math.round(value / 10_000)
}

function centsToAmountMicros(cents: number): number {
  return cents * 10_000
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

function formatOptionalDateTime(value: Date | null): string {
  return value == null ? '—' : formatDateTime(value)
}

function formatJsonSummary(value: string | null): string {
  if (value == null || value.trim() === '') return '—'
  try {
    const parsed: unknown = JSON.parse(value)
    if (isStringRecord(parsed)) {
      const entries = Object.entries(parsed)
      if (entries.length === 0) return '{}'
      return entries.slice(0, 3).map(([key, entryValue]) => `${key}: ${formatJsonScalar(entryValue)}`).join(' · ')
    }
    return formatJsonScalar(parsed)
  } catch {
    return value
  }
}

function formatJsonScalar(value: unknown): string {
  if (value == null) return 'null'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `${value.length} items`
  if (isStringRecord(value)) return `${Object.keys(value).length} fields`
  return 'value'
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value)
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

function storeSyncObjectLabel(
  binding: typeof storeProductBindings.$inferSelect | null | undefined,
  snapshot: typeof storeCatalogSnapshots.$inferSelect | null | undefined,
): string {
  if (binding != null) {
    const basePlan = binding.externalBasePlanId.trim()
    return basePlan === '' ? `${binding.store}:${binding.externalProductId}` : `${binding.store}:${binding.externalProductId}:${basePlan}`
  }
  if (snapshot != null) return `${snapshot.store}:${snapshot.externalId}`
  return 'unbound store object'
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

function appPlatformLabels(appleAppId: string | null, iosBundleId: string | null, bundleId: string, androidPackageName: string | null): Platform[] {
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
    productPlanRowsAll,
    productEntitlementRowsAll,
    priceRowsAll,
    productOfferRowsAll,
    storeProductBindingRowsAll,
    storeIntegrationRowsAll,
    appPlatformRowsAll,
    storeCatalogSnapshotRowsAll,
    storeCatalogDriftRowsAll,
    syncRunRowsAll,
    storeMutationPlanRowsAll,
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
    db.select().from(productPlans),
    db.select().from(productEntitlements),
    db.select().from(prices),
    db.select().from(productOffers),
    db.select().from(storeProductBindings),
    db.select().from(storeIntegrations),
    db.select().from(appPlatforms),
    db.select().from(storeCatalogSnapshots),
    db.select().from(storeCatalogDriftItems),
    db.select().from(syncRuns),
    db.select().from(storeMutationPlans),
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
  const ownedProductIds = new Set(productRows.map((product) => product.id))
  const productPlanRows = productPlanRowsAll.filter((plan) => ownedProductIds.has(plan.productId))
  const ownedProductPlanIds = new Set(productPlanRows.map((plan) => plan.id))
  const productEntitlementRows = productEntitlementRowsAll.filter((row) => ownedProductIds.has(row.productId))
  const priceRows = priceRowsAll.filter((price) => ownedProductPlanIds.has(price.productPlanId))
  const productOfferRows = productOfferRowsAll.filter((offer) => ownedProductPlanIds.has(offer.productPlanId))
  const storeProductBindingRows = storeProductBindingRowsAll.filter((binding) => isOwnedApp(binding.appId, ownedAppIds))
  const storeIntegrationRows = storeIntegrationRowsAll.filter((integration) => isOwnedApp(integration.appId, ownedAppIds))
  const appPlatformRows = appPlatformRowsAll.filter((platform) => isOwnedApp(platform.appId, ownedAppIds))
  const ownedAppPlatformIds = new Set(appPlatformRows.map((platform) => platform.id))
  const storeCatalogSnapshotRows = storeCatalogSnapshotRowsAll.filter((snapshot) => snapshot.appPlatformId != null && ownedAppPlatformIds.has(snapshot.appPlatformId))
  const storeCatalogDriftRows = storeCatalogDriftRowsAll.filter((drift) => isOwnedApp(drift.appId, ownedAppIds))
  const syncRunRows = syncRunRowsAll.filter((run) => isOwnedApp(run.appId, ownedAppIds))
  const storeMutationPlanRows = storeMutationPlanRowsAll.filter((plan) => isOwnedApp(plan.appId, ownedAppIds))
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
  const planById = new Map(productPlanRows.map((row) => [row.id, row]))
  const bindingById = new Map(storeProductBindingRows.map((row) => [row.id, row]))
  const snapshotById = new Map(storeCatalogSnapshotRows.map((row) => [row.id, row]))
  const grantById = new Map(entitlementGrantRows.map((row) => [row.id, row]))

  const entitlementKeysByProductId = new Map<string, string[]>()
  const productsByEntitlement = new Map<string, string[]>()
  for (const row of productEntitlementRows) {
    const entitlement = entitlementById.get(row.entitlementId)
    const product = productById.get(row.productId)
    if (entitlement != null) {
      const keys = entitlementKeysByProductId.get(row.productId) ?? []
      keys.push(entitlement.key)
      entitlementKeysByProductId.set(row.productId, keys)
    }
    if (product != null) {
      const productsForEntitlement = productsByEntitlement.get(row.entitlementId) ?? []
      productsForEntitlement.push(product.key)
      productsByEntitlement.set(row.entitlementId, productsForEntitlement)
    }
  }

  const priceByPlanId = new Map(priceRows.filter((price) => price.status === 'active').map((price) => [price.productPlanId, price]))
  const trialEnabledByPlanId = new Map(productOfferRows.filter((offer) => offer.status === 'active' && offer.offerType === 'free_trial').map((offer) => [offer.productPlanId, true]))
  const bindingsByPlanId = new Map<string, Array<typeof storeProductBindings.$inferSelect>>()
  for (const binding of storeProductBindingRows) {
    if (binding.productPlanId == null) continue
    const current = bindingsByPlanId.get(binding.productPlanId) ?? []
    current.push(binding)
    bindingsByPlanId.set(binding.productPlanId, current)
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
      platforms: appPlatformLabels(app.appleAppId, app.iosBundleId, app.bundleId, app.androidPackageName),
      mrr: formatCurrency(app.monthlyRevenueCents),
      activeAppUsers: formatInteger(activeAppUserIdsByApp.get(app.id)?.size ?? 0),
      status: status.label,
      statusTone: status.tone,
    }
  })

  const catalogProducts: CatalogProduct[] = productPlanRows.flatMap((plan) => {
    const product = productById.get(plan.productId)
    if (product == null) return []
    const planBindings = bindingsByPlanId.get(plan.id) ?? []
    const appleBinding = planBindings.find((binding) => binding.store === 'apple')
    const googleBinding = planBindings.find((binding) => binding.store === 'google')
    const price = priceByPlanId.get(plan.id)
    const trialOn = trialEnabledByPlanId.get(plan.id) ?? false
    const entitlementKeys = entitlementKeysByProductId.get(product.id) ?? []
    return [{
      activeAppUsers: formatInteger(activeAppUserIdsByProduct.get(product.id)?.size ?? 0),
      appId: product.appId,
      appleProductId: appleBinding?.externalProductId ?? '',
      billingKind: plan.billingKind,
      billingPeriod: plan.billingPeriodIso ?? '',
      description: product.description,
      entitlement: entitlementKeys[0] ?? '',
      googleBasePlanId: googleBinding?.externalBasePlanId ?? '',
      googleProductId: googleBinding?.externalProductId ?? '',
      name: product.name,
      planId: plan.id,
      planKey: plan.key,
      price: formatCurrency(amountMicrosToCents(price?.amountMicros ?? null)),
      productId: product.id,
      productKey: product.key,
      productType: product.productType,
      status: product.status,
      trial: trialOn ? '7-day free trial' : 'No trial',
      trialOn,
    }]
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
    const plan = planById.get(pkg.productPlanId)
    const product = plan == null ? null : productById.get(plan.productId)
    const price = priceByPlanId.get(pkg.productPlanId)
    current.push({
      badge: pkg.badge,
      hasBadge: pkg.badge.trim() !== '',
      label: pkg.label,
      productId: product == null ? pkg.productPlanId : `${product.key}:${plan?.key ?? 'plan'}`,
      price: formatCurrency(amountMicrosToCents(price?.amountMicros ?? null)),
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

  const storeSync: StoreSyncAppSummary[] = appRows.map((app) => {
    const appBindingRows = storeProductBindingRows.filter((binding) => binding.appId === app.id)
    const appPlatformIds = new Set(appPlatformRows.filter((platform) => platform.appId === app.id).map((platform) => platform.id))
    const appSnapshotRows = storeCatalogSnapshotRows
      .filter((snapshot) => snapshot.appPlatformId != null && appPlatformIds.has(snapshot.appPlatformId))
      .sort((left, right) => right.fetchedAt.getTime() - left.fetchedAt.getTime())
    const appSyncRunRows = syncRunRows
      .filter((run) => run.appId === app.id)
      .sort((left, right) => right.startedAt.getTime() - left.startedAt.getTime())
    const appMutationPlanRows = storeMutationPlanRows
      .filter((plan) => plan.appId === app.id)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())

    return {
      appId: app.id,
      bindings: appBindingRows.map((binding) => {
        const plan = planById.get(binding.productPlanId)
        const product = productById.get(binding.productId) ?? (plan == null ? undefined : productById.get(plan.productId))
        return {
          appId: app.id,
          bindingStatus: binding.bindingStatus,
          environment: binding.environment,
          externalBasePlanId: binding.externalBasePlanId,
          externalProductId: binding.externalProductId,
          id: binding.id,
          lastComparedAt: formatOptionalDateTime(binding.lastComparedAt),
          planKey: plan?.key ?? binding.productPlanId,
          productKey: product?.key ?? binding.productId,
          store: binding.store,
          syncDirection: binding.syncDirection,
        }
      }),
      driftItems: storeCatalogDriftRows
        .filter((drift) => drift.appId === app.id)
        .sort((left, right) => right.detectedAt.getTime() - left.detectedAt.getTime())
        .map((drift) => {
          const binding = drift.storeProductBindingId == null ? null : bindingById.get(drift.storeProductBindingId)
          const snapshot = drift.snapshotId == null ? null : snapshotById.get(drift.snapshotId)
          return {
            actual: formatJsonSummary(drift.actualJson),
            bindingLabel: storeSyncObjectLabel(binding, snapshot),
            detectedAt: formatDateTime(drift.detectedAt),
            driftType: drift.driftType.replaceAll('_', ' '),
            expected: formatJsonSummary(drift.expectedJson),
            fieldPath: drift.fieldPath,
            id: drift.id,
            severity: drift.severity,
            status: drift.status,
          }
        }),
      integrations: storeIntegrationRows
        .filter((integration) => integration.appId === app.id)
        .map((integration) => ({
          displayName: integration.displayName,
          externalAppId: integration.externalAppId,
          id: integration.id,
          lastSyncAt: formatOptionalDateTime(integration.lastSyncAt),
          status: integration.status.replaceAll('_', ' '),
          store: integration.store,
        })),
      mutationPlans: appMutationPlanRows.slice(0, 8).map((plan) => ({
        createdAt: formatDateTime(plan.createdAt),
        id: plan.id,
        previewHash: plan.previewHash,
        risk: plan.risk,
        status: plan.status,
        store: plan.store,
        summary: formatJsonSummary(plan.summaryJson),
      })),
      snapshots: appSnapshotRows.slice(0, 10).map((snapshot) => ({
        contentHash: snapshot.contentHash,
        externalId: snapshot.externalId,
        fetchedAt: formatDateTime(snapshot.fetchedAt),
        id: snapshot.id,
        objectType: snapshot.objectType.replaceAll('_', ' '),
        store: snapshot.store,
      })),
      syncRuns: appSyncRunRows.slice(0, 10).map((run) => ({
        errorDetail: run.errorDetail,
        finishedAt: formatOptionalDateTime(run.finishedAt),
        id: run.id,
        mode: run.mode,
        startedAt: formatDateTime(run.startedAt),
        status: run.status,
        store: run.store,
        summary: formatJsonSummary(run.summaryJson),
      })),
    }
  })

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
        product: product?.key ?? '—',
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
        product: product?.key ?? entitlement?.key ?? '—',
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
    products: catalogProducts,
    entitlements: consoleEntitlements,
    offerings: consoleOfferings,
    runtime: {
      appleServerNotificationsUrl: `${publicOrigin}/api/stores/apple/notifications`,
      publicOrigin,
    },
    stats,
    storeSync,
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
      await tx.delete(storeProductBindings).where(eq(storeProductBindings.appId, data.appId))
      await tx.delete(products).where(eq(products.appId, data.appId))
      await tx.delete(appUsers).where(eq(appUsers.appId, data.appId))
      await tx.delete(offerings).where(eq(offerings.appId, data.appId))
      await tx.delete(entitlements).where(eq(entitlements.appId, data.appId))
      await tx.delete(apps).where(eq(apps.id, data.appId))
    })

    return { ok: true }
  })

export const upsertProductRecord = createServerFn({ method: 'POST' })
  .validator((input: unknown) => productInputSchema.parse(input))
  .handler(async ({ data }) => {
    await ensureDatabaseReady()
    const currentUser = await getCurrentConsoleUser()
    await requireAccessibleApp(currentUser, data.appId)

    const productId = data.productId ?? productRowId(data.appId, data.productKey)
    const planId = data.planId ?? productPlanRowId(productId, data.planKey)
    const entitlementId = entitlementRowId(data.appId, data.entitlement)
    const now = new Date()
    const priceCents = parsePriceCents(data.price)

    await db.transaction(async (tx) => {
      await tx
        .insert(entitlements)
        .values({
          appId: data.appId,
          createdAt: now,
          description: `Access group ${data.entitlement}`,
          id: entitlementId,
          key: data.entitlement,
          name: data.entitlement,
          status: 'active',
          updatedAt: now,
        })
        .onConflictDoUpdate({
          set: {
            description: `Access group ${data.entitlement}`,
            key: data.entitlement,
            name: data.entitlement,
            status: 'active',
            updatedAt: now,
          },
          target: entitlements.id,
        })

      await tx
        .insert(products)
        .values({
          activeAppUserCount: 0,
          appId: data.appId,
          createdAt: now,
          description: data.description,
          id: productId,
          key: data.productKey,
          name: data.name,
          productType: data.productType,
          status: data.status,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          set: {
            description: data.description,
            key: data.productKey,
            name: data.name,
            productType: data.productType,
            status: data.status,
            updatedAt: now,
          },
          target: products.id,
        })

      await tx
        .insert(productEntitlements)
        .values({
          createdAt: now,
          durationIso: null,
          entitlementId,
          grantMode: data.productType === 'non_consumable' ? 'lifetime' : 'while_active',
          id: productEntitlementRowId(productId, entitlementId),
          productId,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          set: {
            grantMode: data.productType === 'non_consumable' ? 'lifetime' : 'while_active',
            updatedAt: now,
          },
          target: [productEntitlements.productId, productEntitlements.entitlementId],
        })

      await tx
        .insert(productPlans)
        .values({
          billingKind: data.productType === 'subscription' ? 'recurring' : 'one_time',
          billingPeriodIso: data.productType === 'subscription' ? data.billingPeriod : null,
          createdAt: now,
          gracePeriodIso: null,
          id: planId,
          key: data.planKey,
          productId,
          status: data.status,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          set: {
            billingKind: data.productType === 'subscription' ? 'recurring' : 'one_time',
            billingPeriodIso: data.productType === 'subscription' ? data.billingPeriod : null,
            key: data.planKey,
            status: data.status,
            updatedAt: now,
          },
          target: productPlans.id,
        })

      await tx
        .insert(prices)
        .values({
          amountMicros: centsToAmountMicros(priceCents),
          countryCode: null,
          createdAt: now,
          currencyCode: 'USD',
          endsAt: null,
          id: priceRowId(planId, 'USD', null),
          productPlanId: planId,
          startsAt: null,
          status: 'active',
          taxInclusive: null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          set: {
            amountMicros: centsToAmountMicros(priceCents),
            status: 'active',
            updatedAt: now,
          },
          target: [prices.productPlanId, prices.currencyCode, prices.countryCode],
        })

      if (data.trialOn) {
        await tx
          .insert(productOffers)
          .values({
            billingPeriodCount: null,
            createdAt: now,
            durationIso: 'P7D',
            eligibility: 'new_customers',
            endsAt: null,
            id: productOfferRowId(planId, 'free-trial'),
            key: 'free-trial',
            offerType: 'free_trial',
            priceAmountMicros: null,
            priceCurrencyCode: null,
            productPlanId: planId,
            startsAt: null,
            status: 'active',
            updatedAt: now,
          })
          .onConflictDoUpdate({
            set: {
              durationIso: 'P7D',
              status: 'active',
              updatedAt: now,
            },
            target: [productOffers.productPlanId, productOffers.key],
          })
      } else {
        await tx.delete(productOffers).where(and(eq(productOffers.productPlanId, planId), eq(productOffers.key, 'free-trial')))
      }

      if (data.appleProductId != null && data.appleProductId.trim() !== '') {
        await tx
          .insert(storeProductBindings)
          .values({
            appId: data.appId,
            appPlatformId: null,
            bindingStatus: 'linked',
            createdAt: now,
            environment: 'production',
            externalBasePlanId: '',
            externalPackageName: null,
            externalProductId: data.appleProductId.trim(),
            externalSubscriptionGroupId: null,
            id: storeBindingRowId(planId, 'apple', data.appleProductId.trim(), ''),
            lastComparedAt: null,
            lastSnapshotId: null,
            productId,
            productPlanId: planId,
            store: 'apple',
            storeIntegrationId: null,
            syncDirection: 'subkit_to_store',
            updatedAt: now,
          })
          .onConflictDoUpdate({
            set: {
              bindingStatus: 'linked',
              externalProductId: data.appleProductId.trim(),
              productId,
              productPlanId: planId,
              updatedAt: now,
            },
            target: [storeProductBindings.appId, storeProductBindings.store, storeProductBindings.externalProductId, storeProductBindings.externalBasePlanId, storeProductBindings.environment],
          })
      }

      if (data.googleProductId != null && data.googleProductId.trim() !== '') {
        const googleProductId = data.googleProductId.trim()
        const googleBasePlanId = data.googleBasePlanId?.trim() ?? ''
        await tx
          .insert(storeProductBindings)
          .values({
            appId: data.appId,
            appPlatformId: null,
            bindingStatus: 'linked',
            createdAt: now,
            environment: 'production',
            externalBasePlanId: googleBasePlanId,
            externalPackageName: null,
            externalProductId: googleProductId,
            externalSubscriptionGroupId: null,
            id: storeBindingRowId(planId, 'google', googleProductId, googleBasePlanId),
            lastComparedAt: null,
            lastSnapshotId: null,
            productId,
            productPlanId: planId,
            store: 'google',
            storeIntegrationId: null,
            syncDirection: 'subkit_to_store',
            updatedAt: now,
          })
          .onConflictDoUpdate({
            set: {
              bindingStatus: 'linked',
              externalBasePlanId: googleBasePlanId,
              externalProductId: googleProductId,
              productId,
              productPlanId: planId,
              updatedAt: now,
            },
            target: [storeProductBindings.appId, storeProductBindings.store, storeProductBindings.externalProductId, storeProductBindings.externalBasePlanId, storeProductBindings.environment],
          })
      }
    })
    return { ok: true }
  })
