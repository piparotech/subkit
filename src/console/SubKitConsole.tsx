import { useLoaderData, useNavigate, useRouter } from '@tanstack/react-router'
import * as React from 'react'

import { ActiveView } from '~/console/ActiveView'
import { listAppStoreConnectApps } from '~/integrations/app-store-connect/server/apps'
import { emptyAppDraft, emptyTenantDraft, safeInitials, safeTenantId } from '~/console/helpers'
import { newCatalogProduct } from '~/domain/products/data'
import { Notice, type NoticeTone } from '~/components/ui/Notice'
import { Panels } from '~/console/Panels'
import { createAppRecord, createTenantRecord, upsertProductRecord } from '~/console/server'
import { ConsoleShell } from '~/console/ConsoleShell'
import { appRouteParams } from '~/console/routing'
import { filterAppUsers } from '~/domain/app-users/filters'
import { createAppFromDraft } from '~/domain/apps/helpers'
import { filterApps } from '~/domain/apps/filters'
import { filterProducts } from '~/domain/products/filters'
import type { AppUser } from '~/domain/app-users/types'
import type { AppDraft, AppDraftField, AppTenant } from '~/domain/apps/types'
import type { Entitlement } from '~/domain/entitlements/types'
import type { Offering } from '~/domain/offerings/types'
import type { CatalogProduct, EditableCatalogProductTextField } from '~/domain/products/types'
import type { TenantDraft, TenantDraftField, TenantMemberSummary } from '~/domain/tenants/types'
import type { AppStoreConnectAccessibleApp, AppStoreConnectConnection } from '~/integrations/app-store-connect/types'
import type { PanelState, View } from '~/console/types'

interface OperationFeedback {
  message: string
  tone: NoticeTone
}

export function SubKitConsole({ currentAppId, view }: { currentAppId: string | null; view: View }) {
  const consoleData = useLoaderData({ from: '/_console' })
  const router = useRouter()
  const navigate = useNavigate()
  const currentUser = consoleData.currentUser
  const [apps, setApps] = React.useState<AppTenant[]>(consoleData.apps)
  const [products, setProducts] = React.useState<CatalogProduct[]>(consoleData.products)
  const [entitlements, setEntitlements] = React.useState<Entitlement[]>(consoleData.entitlements)
  const [offerings, setOfferings] = React.useState<Offering[]>(consoleData.offerings)
  const [appUsers, setAppUsers] = React.useState<AppUser[]>(consoleData.appUsers)
  const [switcherOpen, setSwitcherOpen] = React.useState(false)
  const [selectedTenantId, setSelectedTenantId] = React.useState(consoleData.tenant.id)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [appDraft, setAppDraft] = React.useState<AppDraft>(emptyAppDraft)
  const [tenantDraft, setTenantDraft] = React.useState<TenantDraft>(emptyTenantDraft)
  const [appStoreApps, setAppStoreApps] = React.useState<AppStoreConnectAccessibleApp[]>([])
  const [appStoreAppsLoaded, setAppStoreAppsLoaded] = React.useState(false)
  const [appStoreLoadError, setAppStoreLoadError] = React.useState<string | null>(null)
  const [loadingAppStoreApps, setLoadingAppStoreApps] = React.useState(false)
  const [operationFeedback, setOperationFeedback] = React.useState<OperationFeedback | null>(null)
  const [panel, setPanel] = React.useState<PanelState>({ kind: 'closed' })

  React.useEffect(() => {
    setApps(consoleData.apps)
    setProducts(consoleData.products)
    setEntitlements(consoleData.entitlements)
    setOfferings(consoleData.offerings)
    setAppUsers(consoleData.appUsers)
  }, [consoleData])

  React.useEffect(() => {
    setSearchQuery('')
    setSwitcherOpen(false)
    setPanel({ kind: 'closed' })
  }, [currentAppId, view])

  const currentApp = apps.find((app) => app.id === currentAppId) ?? null
  const currentTenant = consoleData.accessibleTenants.find((item) => item.id === (currentApp?.tenantId ?? selectedTenantId)) ?? consoleData.tenant
  const currentConnection = consoleData.appStoreConnectConnections.find((connection) => connection.tenantId === currentTenant.id) ?? null
  const canCreateApps = currentTenant.role === 'admin' || currentTenant.role === 'super_admin'
  const isFiltering = searchQuery.trim() !== ''
  const currentProducts = React.useMemo(
    () => (currentApp == null ? products : products.filter((product) => product.appId === currentApp.id)),
    [currentApp, products],
  )
  const currentEntitlements = React.useMemo(
    () => (currentApp == null ? entitlements : entitlements.filter((entitlement) => entitlement.appId === currentApp.id)),
    [currentApp, entitlements],
  )
  const currentOfferings = React.useMemo(
    () => (currentApp == null ? offerings : offerings.filter((offering) => offering.appId === currentApp.id)),
    [currentApp, offerings],
  )
  const currentAppUsers = React.useMemo(
    () => (currentApp == null ? appUsers : appUsers.filter((appUser) => appUser.appId === currentApp.id)),
    [appUsers, currentApp],
  )

  const visibleApps = React.useMemo(() => filterApps(apps, searchQuery), [apps, searchQuery])
  const visibleProducts = React.useMemo(
    () => filterProducts(currentProducts, searchQuery),
    [currentProducts, searchQuery],
  )
  const visibleAppUsers = React.useMemo(
    () => filterAppUsers(currentAppUsers, searchQuery),
    [currentAppUsers, searchQuery],
  )
  const visibleTenantMembers = React.useMemo(
    () => filterTenantMembers(consoleData.tenantMembers, searchQuery),
    [consoleData.tenantMembers, searchQuery],
  )

  const reportNavigationError = (error: unknown) => {
    console.error('Failed to navigate SubKit', error)
    setOperationFeedback({ message: readErrorMessage(error, 'SubKit could not navigate to the requested view.'), tone: 'danger' })
  }

  const selectTenant = (id: string) => {
    setSelectedTenantId(id)
    setSwitcherOpen(false)
    if (currentApp != null && currentApp.tenantId !== id) {
      navigate({ to: '/apps' }).catch(reportNavigationError)
    }
  }

  const primaryAction = () => {
    if (view === 'apps') {
      openAppCreator()
      return
    }
    if (view === 'products' && currentApp != null) {
      setPanel({
        kind: 'product',
        mode: 'new',
        product: { ...newCatalogProduct, appId: currentApp.id },
      })
    }
  }

  const openAppCreator = () => {
    setSelectedTenantId(currentTenant.id)
    setAppDraft(emptyAppDraft)
    setAppStoreApps([])
    setAppStoreAppsLoaded(false)
    setAppStoreLoadError(null)
    setOperationFeedback(null)
    setPanel({ kind: 'newApp' })
  }

  const openProduct = (product: CatalogProduct) => {
    setPanel({
      kind: 'product',
      mode: 'edit',
      product: { ...product },
    })
  }

  const openAppUser = (appUser: AppUser) => {
    setPanel({ appUser, kind: 'appUser' })
  }

  const closePanel = () => setPanel({ kind: 'closed' })

  const updateProductField = (field: EditableCatalogProductTextField, value: string) => {
    setPanel((current) => {
      if (current.kind !== 'product') return current
      const nextTrial = field === 'trial' ? value : current.product.trial
      return {
        ...current,
        product: {
          ...current.product,
          [field]: value,
          billingKind: field === 'productType' && value !== 'subscription' ? 'one_time' : current.product.billingKind,
          trialOn: nextTrial.toLowerCase() !== 'off' && nextTrial.toLowerCase() !== 'no trial',
        },
      }
    })
  }

  const toggleProductTrial = () => {
    setPanel((current) => {
      if (current.kind !== 'product') return current
      const enabled = !current.product.trialOn
      return {
        ...current,
        product: {
          ...current.product,
          trial: enabled ? '7-day free trial' : 'Off',
          trialOn: enabled,
        },
      }
    })
  }

  const refreshConsoleData = () => {
    router.invalidate().catch((error: unknown) => {
      console.error('Failed to refresh SubKit data', error)
      setOperationFeedback({ message: readErrorMessage(error, 'SubKit saved the change, but could not refresh the console data.'), tone: 'warning' })
    })
  }

  const saveProduct = () => {
    if (panel.kind !== 'product') return
    const saved = panel.product
    const appId = saved.appId
    const productKey = saved.productKey.trim()
    const planKey = saved.planKey.trim()
    if (!productKey || !planKey || !appId) {
      setOperationFeedback({ message: 'Product key and plan key are required before saving a product.', tone: 'warning' })
      return
    }

    const previousProducts = products
    const nextProduct = { ...saved, appId, planKey, productKey }
    setProducts((current) => {
      const existingIndex = current.findIndex((item) => item.appId === appId && item.planId === saved.planId)
      if (existingIndex === -1) return [...current, nextProduct]
      return current.map((item, index) => (index === existingIndex ? nextProduct : item))
    })
    setPanel({ kind: 'closed' })
    setOperationFeedback(null)

    upsertProductRecord({
      data: {
        appId,
        appleProductId: nextProduct.appleProductId || undefined,
        billingPeriod: nextProduct.billingPeriod,
        description: nextProduct.description,
        entitlement: nextProduct.entitlement,
        googleBasePlanId: nextProduct.googleBasePlanId || undefined,
        googleProductId: nextProduct.googleProductId || undefined,
        name: nextProduct.name,
        planId: nextProduct.planId || undefined,
        planKey: nextProduct.planKey,
        price: nextProduct.price,
        productId: nextProduct.productId || undefined,
        productKey: nextProduct.productKey,
        productType: nextProduct.productType,
        status: nextProduct.status,
        trialOn: nextProduct.trialOn,
      },
    })
      .then(() => {
        setOperationFeedback({ message: `${nextProduct.name || nextProduct.productKey} saved in SubKit.`, tone: 'success' })
        refreshConsoleData()
      })
      .catch((error: unknown) => {
        console.error('Failed to save product', error)
        setProducts(previousProducts)
        setOperationFeedback({ message: readErrorMessage(error, 'Product could not be saved. Your local preview was rolled back.'), tone: 'danger' })
      })
  }

  const updateAppDraft = (field: AppDraftField, value: string) => {
    setAppDraft((draft) => ({ ...draft, [field]: value }))
  }

  const updateTenantDraft = (field: TenantDraftField, value: string) => {
    setTenantDraft((draft) => {
      const next = { ...draft, [field]: value }
      if (field === 'name') {
        return {
          ...next,
          id: draft.id.trim() === '' || draft.id === safeTenantId(draft.name) ? safeTenantId(value) : draft.id,
          initials: draft.initials.trim() === '' || draft.initials === safeInitials(draft.name) ? safeInitials(value) : draft.initials,
        }
      }
      return next
    })
  }

  const loadAppStoreApps = React.useCallback(() => {
    if (loadingAppStoreApps) return

    if (currentConnection?.hasPrivateKey !== true) {
      setAppStoreApps([])
      setAppStoreLoadError('Configure the App Store Connect key in Workspace Settings before creating an iOS app.')
      setAppStoreAppsLoaded(true)
      return
    }

    setLoadingAppStoreApps(true)
    setAppStoreLoadError(null)
    listAppStoreConnectApps({ data: { tenantId: currentTenant.id } })
      .then((items) => {
        setAppStoreApps(items)
        setAppStoreAppsLoaded(true)
      })
      .catch((error: unknown) => {
        setAppStoreLoadError(readErrorMessage(error, 'Failed to load App Store Connect apps'))
        setAppStoreAppsLoaded(true)
      })
      .finally(() => setLoadingAppStoreApps(false))
  }, [currentConnection?.hasPrivateKey, currentTenant.id, loadingAppStoreApps])

  React.useEffect(() => {
    if (panel.kind !== 'newApp') return
    if (appStoreAppsLoaded || loadingAppStoreApps) return
    loadAppStoreApps()
  }, [appStoreAppsLoaded, loadAppStoreApps, loadingAppStoreApps, panel.kind])

  const createApp = () => {
    let app: AppTenant
    try {
      app = createAppFromDraft(appDraft, apps.length, currentTenant.id)
    } catch (error: unknown) {
      setOperationFeedback({ message: readErrorMessage(error, 'Select an App Store Connect app before creating it in SubKit.'), tone: 'warning' })
      return
    }

    setApps((current) => [...current, app])
    setPanel({ kind: 'closed' })
    setAppDraft(emptyAppDraft)
    setOperationFeedback({ message: `Creating ${app.name} in this workspace…`, tone: 'info' })

    navigate({ params: appRouteParams(app), to: '/$tenantSlug/$appSlug' }).catch(reportNavigationError)
    createAppRecord({
      data: {
        appleAppId: app.appleAppId ?? '',
        bundleId: app.iosBundleId ?? '',
        color: app.color,
        id: app.id,
        initials: app.initials,
        name: app.name,
        tenantId: currentTenant.id,
      },
    })
      .then(() => {
        setOperationFeedback({ message: `${app.name} was created. Next step: sync the catalog from App Settings.`, tone: 'success' })
        refreshConsoleData()
      })
      .catch((error: unknown) => {
        console.error('Failed to create app', error)
        setApps((current) => current.filter((item) => item.id !== app.id))
        setOperationFeedback({ message: readErrorMessage(error, `${app.name} could not be created. The optimistic app card was rolled back.`), tone: 'danger' })
        navigate({ to: '/apps' }).catch(reportNavigationError)
      })
  }

  const createTenant = () => {
    const normalizedId = safeTenantId(tenantDraft.id || tenantDraft.name)
    if (!normalizedId || !tenantDraft.name.trim()) {
      setOperationFeedback({ message: 'Workspace name and ID are required.', tone: 'warning' })
      return
    }

    const workspaceName = tenantDraft.name.trim()
    createTenantRecord({
      data: {
        color: tenantDraft.color,
        id: normalizedId,
        initials: tenantDraft.initials.trim() || safeInitials(workspaceName),
        name: workspaceName,
      },
    })
      .then((result) => {
        setSelectedTenantId(result.id)
        setPanel({ kind: 'closed' })
        setTenantDraft(emptyTenantDraft)
        setOperationFeedback({ message: `${workspaceName} workspace created.`, tone: 'success' })
        refreshConsoleData()
      })
      .catch((error: unknown) => {
        console.error('Failed to create workspace', error)
        setOperationFeedback({ message: readErrorMessage(error, 'Workspace could not be created.'), tone: 'danger' })
      })
  }

  const openTenantCreator = () => {
    setTenantDraft(emptyTenantDraft)
    setSwitcherOpen(false)
    setPanel({ kind: 'newTenant' })
  }

  const deleteLocalApp = (id: string) => {
    setApps((current) => current.filter((app) => app.id !== id))
    setProducts((current) => current.filter((product) => product.appId !== id))
    setEntitlements((current) => current.filter((entitlement) => entitlement.appId !== id))
    setOfferings((current) => current.filter((offering) => offering.appId !== id))
    setAppUsers((current) => current.filter((appUser) => appUser.appId !== id))
    navigate({ to: '/apps' }).catch(reportNavigationError)
  }

  return (
    <>
      <ConsoleShell
        apps={apps}
        currentApp={currentApp}
        currentUser={currentUser}
        accessibleTenants={consoleData.accessibleTenants}
        canCreateApps={canCreateApps}
        canCreateTenants={currentUser.canCreateTenants}
        tenant={currentTenant}
        onNewTenant={openTenantCreator}
        onPrimaryAction={primaryAction}
        onSearchQueryChange={setSearchQuery}
        onSelectTenant={selectTenant}
        onToggleSwitcher={() => setSwitcherOpen((open) => !open)}
        productsCount={currentProducts.length}
        searchPlaceholder={searchPlaceholderForView(view)}
        searchQuery={searchQuery}
        switcherOpen={switcherOpen}
        view={view}
      >
        {operationFeedback != null ? (
          <div className="px-[32px] pt-[16px] max-md:px-[18px]">
            <Notice className="m-0" tone={operationFeedback.tone}>{operationFeedback.message}</Notice>
          </div>
        ) : null}
        <ActiveView
          appUsers={visibleAppUsers}
          apps={visibleApps}
          canCreateApps={canCreateApps}
          consoleData={consoleData}
          connection={currentConnection}
          currentApp={currentApp}
          entitlements={currentEntitlements}
          isFiltering={isFiltering}
          offerings={currentOfferings}
          onAppDeleted={deleteLocalApp}
          onCreateApp={openAppCreator}
          onOpenAppUser={openAppUser}
          onOpenProduct={openProduct}
          onRefreshConsoleData={refreshConsoleData}
          products={visibleProducts}
          tenant={currentTenant}
          tenantMembers={visibleTenantMembers}
          view={view}
        />
      </ConsoleShell>
      <Panels
        appDraft={appDraft}
        appStoreApps={appStoreApps}
        appStoreAppsLoaded={appStoreAppsLoaded}
        appStoreConnection={currentConnection}
        appStoreLoadError={appStoreLoadError}
        loadingAppStoreApps={loadingAppStoreApps}
        onAppDraftChange={updateAppDraft}
        onClose={closePanel}
        onCreateApp={createApp}
        onCreateTenant={createTenant}
        onProductFieldChange={updateProductField}
        onProductTrialToggle={toggleProductTrial}
        onSaveProduct={saveProduct}
        onTenantDraftChange={updateTenantDraft}
        panel={panel}
        tenantDraft={tenantDraft}
      />
    </>
  )
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim() !== '') return error.message
  return fallback
}

function searchPlaceholderForView(view: View): string | null {
  switch (view) {
    case 'apps':
      return 'Search apps…'
    case 'products':
      return 'Search products, plans, entitlements…'
    case 'appUsers':
      return 'Search App Users, countries, entitlements…'
    case 'tenantMembers':
      return 'Search workspace members…'
    default:
      return null
  }
}

function filterTenantMembers(members: TenantMemberSummary[], query: string): TenantMemberSummary[] {
  const normalized = query.trim().toLowerCase()
  if (normalized === '') return members
  return members.filter((member) => {
    const searchable = [member.name, member.email ?? '', member.userId, member.organization, member.role, member.globalRole]
    return searchable.some((value) => value.toLowerCase().includes(normalized))
  })
}
