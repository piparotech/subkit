import { useLoaderData, useNavigate, useRouter } from '@tanstack/react-router'
import * as React from 'react'

import { ConsoleShell } from './Shell'
import {
  AppsView,
  DashboardView,
  EntitlementsView,
  OfferingsView,
  SubscribersView,
  SubscriptionsView,
} from './Views'
import { AppSettingsView, WorkspaceSettingsView } from './SettingsView'
import { newSubscription } from './data'
import { Panels } from './Panels'
import { appRouteParams, createAppFromDraft, filterApps, filterSubscribers, filterSubscriptions } from './store'
import { listAppStoreConnectApps } from './app-store-connect-apps-server'
import { createAppRecord, upsertSubscriptionRecord } from './server'
import type {
  AppDraft,
  AppDraftField,
  AppStoreConnectAccessibleApp,
  AppTenant,
  ConsoleData,
  EditableSubscriptionTextField,
  Entitlement,
  Offering,
  PanelState,
  Subscriber,
  SubscriptionProduct,
  View,
} from './types'

const emptyAppDraft: AppDraft = { appleAppId: '', bundleId: '', name: '', sku: '' }

export function SubKitConsole({ currentAppId, view }: { currentAppId: string | null; view: View }) {
  const consoleData = useLoaderData({ from: '/_console' })
  const router = useRouter()
  const navigate = useNavigate()
  const tenant = consoleData.tenant
  const currentUser = consoleData.currentUser
  const [apps, setApps] = React.useState<AppTenant[]>(consoleData.apps)
  const [subscriptions, setSubscriptions] = React.useState<SubscriptionProduct[]>(consoleData.subscriptions)
  const [entitlements, setEntitlements] = React.useState<Entitlement[]>(consoleData.entitlements)
  const [offerings, setOfferings] = React.useState<Offering[]>(consoleData.offerings)
  const [subscribers, setSubscribers] = React.useState<Subscriber[]>(consoleData.subscribers)
  const [switcherOpen, setSwitcherOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [appDraft, setAppDraft] = React.useState<AppDraft>(emptyAppDraft)
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
    setSubscribers(consoleData.subscribers)
  }, [consoleData])

  React.useEffect(() => {
    setSearchQuery('')
    setSwitcherOpen(false)
    setPanel({ kind: 'closed' })
  }, [currentAppId, view])

  const currentApp = apps.find((app) => app.id === currentAppId) ?? null
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
  const currentSubscribers = React.useMemo(
    () => (currentApp == null ? subscribers : subscribers.filter((subscriber) => subscriber.appId === currentApp.id)),
    [currentApp, subscribers],
  )

  const visibleApps = React.useMemo(() => filterApps(apps, searchQuery), [apps, searchQuery])
  const visibleSubscriptions = React.useMemo(
    () => filterSubscriptions(currentSubscriptions, searchQuery),
    [currentSubscriptions, searchQuery],
  )
  const visibleSubscribers = React.useMemo(
    () => filterSubscribers(currentSubscribers, searchQuery),
    [currentSubscribers, searchQuery],
  )

  const reportNavigationError = (error: unknown) => {
    console.error('Failed to navigate SubKit', error)
  }

  const selectApp = (id: string) => {
    const app = apps.find((item) => item.id === id)
    if (app == null) return
    setSwitcherOpen(false)
    navigate({ params: appRouteParams(app), to: '/$tenantSlug/$appSlug' }).catch(reportNavigationError)
  }

  const goAllApps = () => {
    setSwitcherOpen(false)
    navigate({ to: '/apps' }).catch(reportNavigationError)
  }

  const goView = (nextView: View) => {
    setSwitcherOpen(false)

    if (nextView === 'apps') {
      navigate({ to: '/apps' }).catch(reportNavigationError)
      return
    }

    if (nextView === 'workspaceSettings') {
      navigate({ to: '/settings' }).catch(reportNavigationError)
      return
    }

    if (currentApp == null) return

    switch (nextView) {
      case 'dashboard':
        navigate({ params: appRouteParams(currentApp), to: '/$tenantSlug/$appSlug' }).catch(reportNavigationError)
        return
      case 'subscriptions':
        navigate({ params: appRouteParams(currentApp), to: '/$tenantSlug/$appSlug/subscriptions' }).catch(reportNavigationError)
        return
      case 'entitlements':
        navigate({ params: appRouteParams(currentApp), to: '/$tenantSlug/$appSlug/entitlements' }).catch(reportNavigationError)
        return
      case 'offerings':
        navigate({ params: appRouteParams(currentApp), to: '/$tenantSlug/$appSlug/offerings' }).catch(reportNavigationError)
        return
      case 'subscribers':
        navigate({ params: appRouteParams(currentApp), to: '/$tenantSlug/$appSlug/subscribers' }).catch(reportNavigationError)
        return
      case 'settings':
        navigate({ params: appRouteParams(currentApp), to: '/$tenantSlug/$appSlug/settings' }).catch(reportNavigationError)
        return
    }
  }

  const primaryAction = () => {
    if (view === 'apps') {
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

  const openSubscriber = (subscriber: Subscriber) => {
    setPanel({ kind: 'subscriber', subscriber })
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

  const loadAppStoreApps = React.useCallback(() => {
    if (loadingAppStoreApps) return

    if (consoleData.appStoreConnect?.hasPrivateKey !== true) {
      setAppStoreApps([])
      setAppStoreLoadError('Configure the App Store Connect key in Workspace Settings before creating an iOS app.')
      setAppStoreAppsLoaded(true)
      return
    }

    setLoadingAppStoreApps(true)
    setAppStoreLoadError(null)
    listAppStoreConnectApps({ data: {} })
      .then((items) => {
        setAppStoreApps(items)
        setAppStoreAppsLoaded(true)
      })
      .catch((error: unknown) => {
        setAppStoreLoadError(error instanceof Error ? error.message : 'Failed to load App Store Connect apps')
        setAppStoreAppsLoaded(true)
      })
      .finally(() => setLoadingAppStoreApps(false))
  }, [consoleData.appStoreConnect?.hasPrivateKey, loadingAppStoreApps])

  React.useEffect(() => {
    if (panel.kind !== 'newApp') return
    if (appStoreAppsLoaded || loadingAppStoreApps) return
    loadAppStoreApps()
  }, [appStoreAppsLoaded, loadAppStoreApps, loadingAppStoreApps, panel.kind])

  const createApp = () => {
    const app = createAppFromDraft(appDraft, apps.length, tenant.id)
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
        tenantId: tenant.id,
      },
    })
      .then(refreshConsoleData)
      .catch((error: unknown) => {
        console.error('Failed to create app', error)
      })
  }

  const deleteLocalApp = (id: string) => {
    setApps((current) => current.filter((app) => app.id !== id))
    setSubscriptions((current) => current.filter((subscription) => subscription.appId !== id))
    setEntitlements((current) => current.filter((entitlement) => entitlement.appId !== id))
    setOfferings((current) => current.filter((offering) => offering.appId !== id))
    setSubscribers((current) => current.filter((subscriber) => subscriber.appId !== id))
    navigate({ to: '/apps' }).catch(reportNavigationError)
  }

  return (
    <>
      <ConsoleShell
        apps={apps}
        currentApp={currentApp}
        currentUser={currentUser}
        tenant={tenant}
        onGoAllApps={goAllApps}
        onGoView={goView}
        onPrimaryAction={primaryAction}
        onSearchQueryChange={setSearchQuery}
        onSelectApp={selectApp}
        onToggleSwitcher={() => setSwitcherOpen((open) => !open)}
        searchQuery={searchQuery}
        subscriptionsCount={currentSubscriptions.length}
        switcherOpen={switcherOpen}
        view={view}
      >
        <ActiveView
          apps={visibleApps}
          consoleData={consoleData}
          currentApp={currentApp}
          entitlements={currentEntitlements}
          offerings={currentOfferings}
          onAppDeleted={deleteLocalApp}
          onOpenSubscriber={openSubscriber}
          onOpenSubscription={openSubscription}
          onRefreshConsoleData={refreshConsoleData}
          onSelectApp={selectApp}
          subscribers={visibleSubscribers}
          subscriptions={visibleSubscriptions}
          view={view}
        />
      </ConsoleShell>
      <Panels
        appDraft={appDraft}
        appStoreApps={appStoreApps}
        appStoreAppsLoaded={appStoreAppsLoaded}
        appStoreConnection={consoleData.appStoreConnect}
        appStoreLoadError={appStoreLoadError}
        loadingAppStoreApps={loadingAppStoreApps}
        onAppDraftChange={updateAppDraft}
        onClose={closePanel}
        onCreateApp={createApp}
        onSaveSubscription={saveSubscription}
        onSubscriptionFieldChange={updateSubscriptionField}
        onSubscriptionTrialToggle={toggleSubscriptionTrial}
        panel={panel}
      />
    </>
  )
}

function ActiveView({
  apps,
  consoleData,
  currentApp,
  entitlements,
  offerings,
  onAppDeleted,
  onOpenSubscriber,
  onOpenSubscription,
  onRefreshConsoleData,
  onSelectApp,
  subscribers,
  subscriptions,
  view,
}: {
  apps: AppTenant[]
  consoleData: ConsoleData
  currentApp: AppTenant | null
  entitlements: Entitlement[]
  offerings: Offering[]
  onAppDeleted: (id: string) => void
  onOpenSubscriber: (subscriber: Subscriber) => void
  onOpenSubscription: (subscription: SubscriptionProduct) => void
  onRefreshConsoleData: () => void
  onSelectApp: (id: string) => void
  subscribers: Subscriber[]
  subscriptions: SubscriptionProduct[]
  view: View
}) {
  if (view === 'workspaceSettings') {
    return <WorkspaceSettingsView connection={consoleData.appStoreConnect} onRefreshConsoleData={onRefreshConsoleData} />
  }

  if (view === 'apps') return <AppsView apps={apps} onSelectApp={onSelectApp} />

  if (currentApp == null) return <AppRouteNotFound apps={apps} onSelectApp={onSelectApp} />

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
    case 'subscribers':
      return <SubscribersView onOpenSubscriber={onOpenSubscriber} subscribers={subscribers} />
    case 'settings':
      return <AppSettingsView app={currentApp} connection={consoleData.appStoreConnect} onAppDeleted={onAppDeleted} onRefreshConsoleData={onRefreshConsoleData} />
  }
}

function AppRouteNotFound({ apps, onSelectApp }: { apps: AppTenant[]; onSelectApp: (id: string) => void }) {
  return (
    <section className="max-w-[760px] animate-[subkit-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <div className="rounded-[14px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] p-[22px]">
        <h1 className="m-0 text-[19px] font-bold tracking-[-0.01em]">App route not found</h1>
        <p className="mt-[8px] mb-0 text-[13.5px] text-[var(--subkit-dim)]">The app in the URL is not available in this workspace.</p>
        {apps.length > 0 ? (
          <div className="mt-[16px] flex flex-wrap gap-[8px]">
            {apps.map((app) => (
              <button
                className="cursor-pointer rounded-[9px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[11px] py-[7px] text-[12.5px] font-semibold text-[var(--subkit-text)] hover:bg-[var(--subkit-accent-soft)]"
                key={app.id}
                onClick={() => onSelectApp(app.id)}
                type="button"
              >
                {app.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
