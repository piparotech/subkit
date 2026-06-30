import { useLoaderData, useRouter } from '@tanstack/react-router'
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
import { SettingsView } from './SettingsView'
import { newSubscription } from './data'
import { Panels } from './Panels'
import { createAppFromDraft, filterApps, filterSubscribers, filterSubscriptions } from './store'
import { createAppRecord, upsertSubscriptionRecord } from './server'
import type {
  AppDraft,
  AppDraftField,
  AppStatusValue,
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

const emptyAppDraft: AppDraft = { androidPackage: '', iosBundle: '', name: '', status: '' }

export function SubscriptionConsole() {
  const consoleData = useLoaderData({ from: '/' })
  const router = useRouter()
  const tenant = consoleData.tenant
  const currentUser = consoleData.currentUser
  const [apps, setApps] = React.useState<AppTenant[]>(consoleData.apps)
  const [subscriptions, setSubscriptions] = React.useState<SubscriptionProduct[]>(consoleData.subscriptions)
  const [entitlements, setEntitlements] = React.useState<Entitlement[]>(consoleData.entitlements)
  const [offerings, setOfferings] = React.useState<Offering[]>(consoleData.offerings)
  const [subscribers, setSubscribers] = React.useState<Subscriber[]>(consoleData.subscribers)
  const [view, setView] = React.useState<View>('apps')
  const [currentAppId, setCurrentAppId] = React.useState<string | null>(null)
  const [switcherOpen, setSwitcherOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [appDraft, setAppDraft] = React.useState<AppDraft>(emptyAppDraft)
  const [panel, setPanel] = React.useState<PanelState>({ kind: 'closed' })

  React.useEffect(() => {
    setApps(consoleData.apps)
    setSubscriptions(consoleData.subscriptions)
    setEntitlements(consoleData.entitlements)
    setOfferings(consoleData.offerings)
    setSubscribers(consoleData.subscribers)
  }, [consoleData])

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

  const selectApp = (id: string) => {
    setCurrentAppId(id)
    setView('dashboard')
    setSwitcherOpen(false)
    setSearchQuery('')
    setPanel({ kind: 'closed' })
  }

  const goAllApps = () => {
    setCurrentAppId(null)
    setView('apps')
    setSwitcherOpen(false)
    setPanel({ kind: 'closed' })
  }

  const goView = (nextView: View) => {
    if (nextView !== view) setSearchQuery('')
    setView(nextView)
    setSwitcherOpen(false)
    setPanel({ kind: 'closed' })
  }

  const primaryAction = () => {
    if (view === 'apps') {
      setAppDraft(emptyAppDraft)
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
      console.error('Failed to refresh subscription console data', error)
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
        androidId: nextSubscription.androidId,
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
    if (field === 'status') {
      setAppDraft((draft) => ({ ...draft, status: readAppDraftStatus(value) }))
      return
    }
    setAppDraft((draft) => ({ ...draft, [field]: value }))
  }

  const createApp = () => {
    const app = createAppFromDraft(appDraft, apps.length, tenant.id)
    setApps((current) => [...current, app])
    setCurrentAppId(app.id)
    setView('dashboard')
    setSearchQuery('')
    setPanel({ kind: 'closed' })
    setAppDraft(emptyAppDraft)
    createAppRecord({
      data: {
        androidPackage: appDraft.androidPackage,
        bundle: app.bundle,
        color: app.color,
        id: app.id,
        initials: app.initials,
        iosBundle: appDraft.iosBundle,
        name: app.name,
        status: readRequiredAppDraftStatus(appDraft.status),
        tenantId: tenant.id,
      },
    })
      .then(refreshConsoleData)
      .catch((error: unknown) => {
        console.error('Failed to create app', error)
      })
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

function readAppDraftStatus(value: string): AppStatusValue | '' {
  if (value === '' || value === 'live' || value === 'beta' || value === 'inactive') return value
  throw new Error('Invalid app status')
}

function readRequiredAppDraftStatus(status: AppStatusValue | ''): AppStatusValue {
  if (status === '') throw new Error('App status is required')
  return status
}

function ActiveView({
  apps,
  consoleData,
  currentApp,
  entitlements,
  offerings,
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
  onOpenSubscriber: (subscriber: Subscriber) => void
  onOpenSubscription: (subscription: SubscriptionProduct) => void
  onRefreshConsoleData: () => void
  onSelectApp: (id: string) => void
  subscribers: Subscriber[]
  subscriptions: SubscriptionProduct[]
  view: View
}) {
  if (view === 'apps' || currentApp == null) return <AppsView apps={apps} onSelectApp={onSelectApp} />

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
      return (
        <SettingsView
          app={currentApp}
          connection={consoleData.appStoreConnect.find((item) => item.appId === currentApp.id) ?? null}
          onRefreshConsoleData={onRefreshConsoleData}
        />
      )
  }
}
