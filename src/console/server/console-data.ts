import { createServerFn } from '@tanstack/react-start'

import { eq, isNull } from 'drizzle-orm'
import type { StatusTone } from '~/components/ui/types'
import type { ConsoleData } from '~/console/types'
import { db } from '~/db/client'
import {
  appPlatforms,
  appUsers,
  apps,
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
  userTenants,
  users,
} from '~/db/schema'
import { ensureDatabaseReady } from '~/db/setup'
import type {
  AppUser,
  EntitlementGrantSummary,
  PurchaseHistoryEvent,
} from '~/domain/app-users/types'
import type { AppTenant } from '~/domain/apps/types'
import type {
  ActivityEvent,
  ConsoleStats,
  DashboardSummary,
  Metric,
} from '~/domain/dashboard/types'
import type { Entitlement } from '~/domain/entitlements/types'
import type { Offering, OfferingPackage } from '~/domain/offerings/types'
import type { CatalogProduct } from '~/domain/products/types'
import type { StoreSyncAppSummary } from '~/domain/stores/types'
import type { WorkspaceTenant } from '~/domain/tenants/types'
import { readAppStoreConnectConnectionForTenant } from '~/integrations/app-store-connect/server/read'
import { getOptionalCurrentUser } from '~/server/auth/current-user'
import { listAccessibleTenantRows } from '~/server/auth/tenant-access'

import {
  canCreateTenants,
  getCurrentConsoleUser,
  roleForTenant,
  tenantRolesById,
  toConsoleUser,
  toTenantMemberSummary,
  toWorkspaceTenant,
} from './access'
import {
  amountMicrosToCents,
  amountTone,
  formatCurrency,
  formatDateTime,
  formatInteger,
  formatJsonSummary,
  formatOptionalDateTime,
  formatSignedCurrency,
} from './format'
import {
  appPlatformLabels,
  appStatus,
  appStoreSummary,
  consolePublicOrigin,
  grantStatus,
  isAccessGrant,
  isOwnedApp,
  revenueBarsForEvents,
  shortUserId,
  sortGrantsByRelevance,
  sourceLabel,
  storeSyncObjectLabel,
} from './presentation'

export const getAuthStatus = createServerFn({ method: 'GET' }).handler(async () => {
  await ensureDatabaseReady()
  const currentUser = await getOptionalCurrentUser()
  return { authenticated: Boolean(currentUser) }
})

export const getSubKitConsoleData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ConsoleData> => {
    await ensureDatabaseReady()
    const currentUser = await getCurrentConsoleUser()
    const accessibleTenantRows = await listAccessibleTenantRows(currentUser)
    const roleByTenantId = await tenantRolesById(
      currentUser,
      accessibleTenantRows.map((tenant) => tenant.id),
    )
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
      Promise.all(
        accessibleTenantRows.map((tenant) => readAppStoreConnectConnectionForTenant(tenant.id)),
      ),
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
    const productEntitlementRows = productEntitlementRowsAll.filter((row) =>
      ownedProductIds.has(row.productId),
    )
    const priceRows = priceRowsAll.filter((price) => ownedProductPlanIds.has(price.productPlanId))
    const productOfferRows = productOfferRowsAll.filter((offer) =>
      ownedProductPlanIds.has(offer.productPlanId),
    )
    const storeProductBindingRows = storeProductBindingRowsAll.filter((binding) =>
      isOwnedApp(binding.appId, ownedAppIds),
    )
    const storeIntegrationRows = storeIntegrationRowsAll.filter((integration) =>
      isOwnedApp(integration.appId, ownedAppIds),
    )
    const appPlatformRows = appPlatformRowsAll.filter((platform) =>
      isOwnedApp(platform.appId, ownedAppIds),
    )
    const ownedAppPlatformIds = new Set(appPlatformRows.map((platform) => platform.id))
    const storeCatalogSnapshotRows = storeCatalogSnapshotRowsAll.filter(
      (snapshot) =>
        snapshot.appPlatformId != null && ownedAppPlatformIds.has(snapshot.appPlatformId),
    )
    const storeCatalogDriftRows = storeCatalogDriftRowsAll.filter((drift) =>
      isOwnedApp(drift.appId, ownedAppIds),
    )
    const syncRunRows = syncRunRowsAll.filter((run) => isOwnedApp(run.appId, ownedAppIds))
    const storeMutationPlanRows = storeMutationPlanRowsAll.filter((plan) =>
      isOwnedApp(plan.appId, ownedAppIds),
    )
    const entitlementRows = entitlementRowsAll.filter((entitlement) =>
      isOwnedApp(entitlement.appId, ownedAppIds),
    )
    const offeringRows = offeringRowsAll.filter((offering) =>
      isOwnedApp(offering.appId, ownedAppIds),
    )
    const appUserRows = appUserRowsAll.filter((appUser) => isOwnedApp(appUser.appId, ownedAppIds))
    const ownedAppUserIds = new Set(appUserRows.map((appUser) => appUser.id))
    const entitlementGrantRows = entitlementGrantRowsAll.filter(
      (grant) => isOwnedApp(grant.appId, ownedAppIds) && ownedAppUserIds.has(grant.appUserId),
    )
    const eventRows = eventRowsAll.filter((event) => ownedAppUserIds.has(event.appUserId))
    const tenantMemberRows = tenantMemberRowsAll.filter((member) =>
      accessibleTenantIds.has(member.tenantId),
    )

    const stats: ConsoleStats = {
      appUsers: appUserRows.length,
      apps: appRows.length,
      products: productRows.length,
      entitlements: entitlementRows.length,
      purchaseEvents: eventRows.length,
      tenants: accessibleTenantRows.length,
    }

    const tenant: WorkspaceTenant =
      activeTenant == null
        ? {
            color: 'oklch(0.62 0.17 152)',
            id: 'none',
            initials: '—',
            name: 'No workspace access',
            role: 'developer',
          }
        : toWorkspaceTenant(activeTenant, roleForTenant(roleByTenantId, activeTenant.id))
    const accessibleTenants = accessibleTenantRows.map((tenantRow) =>
      toWorkspaceTenant(tenantRow, roleForTenant(roleByTenantId, tenantRow.id)),
    )
    const appStoreConnectConnectionsFiltered = appStoreConnectConnections.filter(
      (connection) => connection != null,
    )
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

    const priceByPlanId = new Map(
      priceRows
        .filter((price) => price.status === 'active')
        .map((price) => [price.productPlanId, price]),
    )
    const trialEnabledByPlanId = new Map(
      productOfferRows
        .filter((offer) => offer.status === 'active' && offer.offerType === 'free_trial')
        .map((offer) => [offer.productPlanId, true]),
    )
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
      ltvByAppUser.set(
        event.appUserId,
        (ltvByAppUser.get(event.appUserId) ?? 0) + Math.max(event.amountCents ?? 0, 0),
      )
    }

    const appItems: AppTenant[] = appRows.map((app) => {
      const status = appStatus(app.status)
      return {
        id: app.id,
        tenantId: app.tenantId,
        name: app.name,
        initials: app.initials,
        color: app.color,
        bundle: appStoreSummary(
          app.appleAppId,
          app.iosBundleId,
          app.bundleId,
          app.androidPackageName,
        ),
        appleAppId: app.appleAppId,
        iosBundleId: app.iosBundleId,
        androidPackageName: app.androidPackageName,
        platforms: appPlatformLabels(
          app.appleAppId,
          app.iosBundleId,
          app.bundleId,
          app.androidPackageName,
        ),
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
      return [
        {
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
        },
      ]
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
      const appPlatformIds = new Set(
        appPlatformRows
          .filter((platform) => platform.appId === app.id)
          .map((platform) => platform.id),
      )
      const appSnapshotRows = storeCatalogSnapshotRows
        .filter(
          (snapshot) =>
            snapshot.appPlatformId != null && appPlatformIds.has(snapshot.appPlatformId),
        )
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
          const product =
            productById.get(binding.productId) ??
            (plan == null ? undefined : productById.get(plan.productId))
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
            const binding =
              drift.storeProductBindingId == null
                ? null
                : bindingById.get(drift.storeProductBindingId)
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
      const primaryStatus: { label: string; tone: StatusTone } =
        primaryGrant == null
          ? { label: 'No entitlement', tone: 'muted' }
          : grantStatus(primaryGrant.status)
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
      const primaryEntitlement =
        primaryGrant == null
          ? '—'
          : (entitlementById.get(primaryGrant.entitlementId)?.key ?? primaryGrant.entitlementId)

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
      const trialUserIds = new Set(
        appGrants.filter((grant) => grant.status === 'trialing').map((grant) => grant.appUserId),
      )
      const expiredUserIds = new Set(
        appGrants.filter((grant) => grant.status === 'expired').map((grant) => grant.appUserId),
      )
      const appEvents = eventRows.filter(
        (event) => appUserById.get(event.appUserId)?.appId === app.id,
      )
      const revenue30dCents = appEvents.reduce(
        (total, event) => total + Math.max(event.amountCents ?? 0, 0),
        0,
      )
      const trialConversionBase = activeUserIds.size + trialUserIds.size
      const trialConversion =
        trialConversionBase > 0
          ? Math.round((activeUserIds.size / trialConversionBase) * 1000) / 10
          : 0
      const churnRate =
        appUsersForApp.length > 0
          ? Math.round((expiredUserIds.size / appUsersForApp.length) * 1000) / 10
          : 0
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
        const grant =
          event.entitlementGrantId == null ? null : grantById.get(event.entitlementGrantId)
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
  },
)
