import { Link, useLoaderData, useNavigate, useRouter } from '@tanstack/react-router'
import * as React from 'react'

import { ConsoleShell } from './Shell'
import {
  AppUsersView,
  AppsView,
  DashboardView,
  EntitlementsView,
  OfferingsView,
  SubscriptionsView,
} from './Views'
import { AppSettingsView, WorkspaceSettingsView } from './SettingsView'
import { TenantMembersView } from './TenantMembersView'
import { newSubscription } from './data'
import { Panels } from './Panels'
import { appRouteParams, createAppFromDraft, filterAppUsers, filterApps, filterSubscriptions, idForLabel, initialsForName } from './store'
import { listAppStoreConnectApps } from './app-store-connect-apps-server'
import { createAppRecord, createTenantRecord, upsertSubscriptionRecord } from './server'
import type {
  AppDraft,
  AppDraftField,
  AppStoreConnectAccessibleApp,
  AppStoreConnectConnection,
  AppTenant,
  AppUser,
  ConsoleData,
  EditableSubscriptionTextField,
  Entitlement,
  Offering,
  PanelState,
  SubscriptionProduct,
  TenantDraft,
  TenantDraftField,
  View,
} from './types'

const emptyAppDraft: AppDraft = { appleAppId: '', bundleId: '', name: '', sku: '' }
const emptyTenantDraft: TenantDraft = { color: 'oklch(0.62 0.17 152)', id: '', initials: '', name: '' }

export function SubKitConsole({ currentAppId, view }: { currentAppId: string | null; view: View }) {
  const consoleData = useLoaderData({ from: '/_console' })
  const router = useRouter()
  const navigate = useNavigate()
  const currentUser = consoleData.currentUser
  const [apps, setApps] = React.useState<AppTenant[]>(consoleData.apps)
  const [subscriptions, setSubscriptions] = React.useState<SubscriptionProduct[]>(consoleData.subscriptions)
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
  const [panel, setPanel] = React.useState<PanelState>({ kind: 'closed' })

  React.useEffect(() => {
    setApps(consoleData.apps)
    setSubscriptions(consoleData.subscriptions)
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
  const currentSubscriptions = React.useMemo(
    () => (currentApp == null ? subscriptions : subscriptions.filter((subscription) => subscription.appId === currentApp.id)),
    [currentApp, subscriptions],
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
  const visibleSubscriptions = React.useMemo(
    () => filterSubscriptions(currentSubscriptions, searchQuery),
    [currentSubscriptions, searchQuery],
  )
  const visibleAppUsers = React.useMemo(
    () => filterAppUsers(currentAppUsers, searchQuery),
    [currentAppUsers, searchQuery],
  )

  const reportNavigationError = (error: unknown) => {
    console.error('Failed to navigate SubKit', error)
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
      setSelectedTenantId(currentTenant.id)
      setAppDraft(emptyAppDraft)
      setAppStoreApps([])
      setAppStoreAppsLoaded(false)
      setAppStoreLoadError(null)
      setPanel({ kind: 'newApp' })
      return
    }
    if (view === 'subscriptions' && currentApp != null) {
      setPanel({
        kind: 'subscription',
        mode: 'new',
        originalIdentifier: null,
        subscription: { ...newSubscription, appId: currentApp.id },
      })
    }
  }

  const openSubscription = (subscription: SubscriptionProduct) => {
    setPanel({
      kind: 'subscription',
      mode: 'edit',
      originalIdentifier: subscription.identifier,
      subscription: { ...subscription },
    })
  }

  const openAppUser = (appUser: AppUser) => {
    setPanel({ appUser, kind: 'appUser' })
  }

  const closePanel = () => setPanel({ kind: 'closed' })

  const updateSubscriptionField = (field: EditableSubscriptionTextField, value: string) => {
    setPanel((current) => {
      if (current.kind !== 'subscription') return current
      const nextTrial = field === 'trial' ? value : current.subscription.trial
      return {
        ...current,
        subscription: {
          ...current.subscription,
          [field]: value,
          trialOn: nextTrial.toLowerCase() !== 'off' && nextTrial.toLowerCase() !== 'no trial',
        },
      }
    })
  }

  const toggleSubscriptionTrial = () => {
    setPanel((current) => {
      if (current.kind !== 'subscription') return current
      const enabled = !current.subscription.trialOn
      return {
        ...current,
        subscription: {
          ...current.subscription,
          trial: enabled ? '7-day free trial' : 'Off',
          trialOn: enabled,
        },
      }
    })
  }

  const refreshConsoleData = () => {
    router.invalidate().catch((error: unknown) => {
      console.error('Failed to refresh SubKit data', error)
    })
  }

  const saveSubscription = () => {
    if (panel.kind !== 'subscription') return
    const saved = panel.subscription
    const appId = saved.appId
    const identifier = saved.identifier.trim()
    if (!identifier || !appId) return
    const nextSubscription = { ...saved, identifier, appId }
    setSubscriptions((current) => {
      const existingIndex = current.findIndex(
        (item) => item.appId === appId && (item.identifier === panel.originalIdentifier || item.identifier === identifier),
      )
      if (existingIndex === -1) return [...current, nextSubscription]
      return current.map((item, index) => (index === existingIndex ? nextSubscription : item))
    })
    upsertSubscriptionRecord({
      data: {
        androidId: nextSubscription.androidId || undefined,
        appId,
        duration: nextSubscription.duration,
        entitlement: nextSubscription.entitlement,
        identifier: nextSubscription.identifier,
        iosId: nextSubscription.iosId,
        name: nextSubscription.name,
        originalIdentifier: panel.originalIdentifier,
        price: nextSubscription.price,
        trialOn: nextSubscription.trialOn,
      },
    })
      .then(refreshConsoleData)
      .catch((error: unknown) => {
        console.error('Failed to save subscription', error)
      })
    setPanel({ kind: 'closed' })
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
        setAppStoreLoadError(error instanceof Error ? error.message : 'Failed to load App Store Connect apps')
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
    const app = createAppFromDraft(appDraft, apps.length, currentTenant.id)
    setApps((current) => [...current, app])
    navigate({ params: appRouteParams(app), to: '/$tenantSlug/$appSlug' }).catch(reportNavigationError)
    setPanel({ kind: 'closed' })
    setAppDraft(emptyAppDraft)
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
      .then(refreshConsoleData)
      .catch((error: unknown) => {
        console.error('Failed to create app', error)
      })
  }

  const createTenant = () => {
    const normalizedId = safeTenantId(tenantDraft.id || tenantDraft.name)
    if (!normalizedId || !tenantDraft.name.trim()) return
    createTenantRecord({
      data: {
        color: tenantDraft.color,
        id: normalizedId,
        initials: tenantDraft.initials.trim() || safeInitials(tenantDraft.name),
        name: tenantDraft.name.trim(),
      },
    })
      .then((result) => {
        setSelectedTenantId(result.id)
        setPanel({ kind: 'closed' })
        setTenantDraft(emptyTenantDraft)
        refreshConsoleData()
      })
      .catch((error: unknown) => {
        console.error('Failed to create tenant', error)
      })
  }

  const openTenantCreator = () => {
    setTenantDraft(emptyTenantDraft)
    setSwitcherOpen(false)
    setPanel({ kind: 'newTenant' })
  }

  const deleteLocalApp = (id: string) => {
    setApps((current) => current.filter((app) => app.id !== id))
    setSubscriptions((current) => current.filter((subscription) => subscription.appId !== id))
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
        canCreateApps={currentTenant.role === 'admin' || currentTenant.role === 'super_admin'}
        canCreateTenants={currentUser.canCreateTenants}
        tenant={currentTenant}
        onNewTenant={openTenantCreator}
        onPrimaryAction={primaryAction}
        onSearchQueryChange={setSearchQuery}
        onSelectTenant={selectTenant}
        onToggleSwitcher={() => setSwitcherOpen((open) => !open)}
        searchQuery={searchQuery}
        subscriptionsCount={currentSubscriptions.length}
        switcherOpen={switcherOpen}
        view={view}
      >
        <ActiveView
          apps={visibleApps}
          consoleData={consoleData}
          connection={currentConnection}
          currentApp={currentApp}
          tenant={currentTenant}
          entitlements={currentEntitlements}
          offerings={currentOfferings}
          onAppDeleted={deleteLocalApp}
          onOpenAppUser={openAppUser}
          onOpenSubscription={openSubscription}
          onRefreshConsoleData={refreshConsoleData}
          appUsers={visibleAppUsers}
          subscriptions={visibleSubscriptions}
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
        onSaveSubscription={saveSubscription}
        onSubscriptionFieldChange={updateSubscriptionField}
        onTenantDraftChange={updateTenantDraft}
        onSubscriptionTrialToggle={toggleSubscriptionTrial}
        panel={panel}
        tenantDraft={tenantDraft}
      />
    </>
  )
}

function ActiveView({
  apps,
  connection,
  consoleData,
  currentApp,
  tenant,
  entitlements,
  offerings,
  onAppDeleted,
  onOpenAppUser,
  onOpenSubscription,
  onRefreshConsoleData,
  appUsers,
  subscriptions,
  view,
}: {
  apps: AppTenant[]
  connection: AppStoreConnectConnection | null
  consoleData: ConsoleData
  currentApp: AppTenant | null
  tenant: ConsoleData['tenant']
  entitlements: Entitlement[]
  offerings: Offering[]
  onAppDeleted: (id: string) => void
  onOpenAppUser: (appUser: AppUser) => void
  onOpenSubscription: (subscription: SubscriptionProduct) => void
  onRefreshConsoleData: () => void
  appUsers: AppUser[]
  subscriptions: SubscriptionProduct[]
  view: View
}) {
  if (view === 'tenantMembers') {
    return <TenantMembersView onRefreshConsoleData={onRefreshConsoleData} tenant={tenant} tenantMembers={consoleData.tenantMembers} />
  }

  if (view === 'workspaceSettings') {
    return <WorkspaceSettingsView connection={connection} onRefreshConsoleData={onRefreshConsoleData} tenant={tenant} />
  }

  if (view === 'apps') return <AppsView apps={apps} />

  if (currentApp == null) return <AppRouteNotFound apps={apps} />

  switch (view) {
    case 'dashboard': {
      const dashboard = consoleData.dashboards.find((item) => item.appId === currentApp.id)
      if (dashboard == null) throw new Error('Dashboard data missing for selected app')
      return (
        <DashboardView
          activity={dashboard.activity}
          app={currentApp}
          dbStats={consoleData.stats}
          metrics={dashboard.metrics}
          revenueBars={dashboard.revenueBars}
        />
      )
    }
    case 'subscriptions':
      return <SubscriptionsView onOpenSubscription={onOpenSubscription} subscriptions={subscriptions} />
    case 'entitlements':
      return <EntitlementsView entitlements={entitlements} />
    case 'offerings':
      return <OfferingsView offerings={offerings} />
    case 'appUsers':
      return <AppUsersView appUsers={appUsers} onOpenAppUser={onOpenAppUser} />
    case 'settings':
      return (
        <AppSettingsView
          app={currentApp}
          connection={connection}
          onAppDeleted={onAppDeleted}
          onRefreshConsoleData={onRefreshConsoleData}
        />
      )
  }
}

function safeTenantId(value: string): string {
  try {
    return idForLabel(value)
  } catch {
    return ''
  }
}

function safeInitials(value: string): string {
  try {
    return initialsForName(value)
  } catch {
    return ''
  }
}

function AppRouteNotFound({ apps }: { apps: AppTenant[] }) {
  return (
    <section className="max-w-[760px] animate-[subkit-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <div className="rounded-[14px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] p-[22px]">
        <h1 className="m-0 text-[19px] font-bold tracking-[-0.01em]">App route not found</h1>
        <p className="mt-[8px] mb-0 text-[13.5px] text-[var(--subkit-dim)]">The app in the URL is not available in this workspace.</p>
        {apps.length > 0 ? (
          <div className="mt-[16px] flex flex-wrap gap-[8px]">
            {apps.map((app) => (
              <Link
                className="cursor-pointer rounded-[9px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[11px] py-[7px] text-[12.5px] font-semibold text-[var(--subkit-text)] hover:bg-[var(--subkit-accent-soft)]"
                key={app.id}
                params={appRouteParams(app)}
                preload="intent"
                to="/$tenantSlug/$appSlug"
              >
                {app.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
