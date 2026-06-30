import { PUIButton, PUIText, cn } from '@piparo/cn-web'
import { ChevronDown, MoreVertical, Plus, Search } from 'lucide-react'
import * as React from 'react'

import {
  AppsIcon,
  DashboardIcon,
  EntitlementsIcon,
  OfferingsIcon,
  SettingsIcon,
  SubscribersIcon,
  SubscriptionsIcon,
} from './icons'
import { AppAvatar, MiniAppAvatar } from './ui'
import type { AppTenant, ConsoleUser, View, WorkspaceTenant } from './types'

interface NavItem {
  view: View
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  count?: string
}

const APP_NAV: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { view: 'subscriptions', label: 'Subscriptions', icon: SubscriptionsIcon },
  { view: 'entitlements', label: 'Entitlements', icon: EntitlementsIcon },
  { view: 'offerings', label: 'Offerings', icon: OfferingsIcon },
  { view: 'subscribers', label: 'App Users', icon: SubscribersIcon },
  { view: 'settings', label: 'Settings', icon: SettingsIcon },
]

const viewLabels: Record<View, string> = {
  apps: 'All Apps',
  workspaceSettings: 'Workspace Settings',
  dashboard: 'Dashboard',
  subscriptions: 'Subscriptions',
  entitlements: 'Entitlements',
  offerings: 'Offerings',
  subscribers: 'App Users',
  settings: 'Settings',
}

interface ShellProps {
  accessibleTenants: WorkspaceTenant[]
  apps: AppTenant[]
  canCreateApps: boolean
  canCreateTenants: boolean
  children: React.ReactNode
  currentApp: AppTenant | null
  currentUser: ConsoleUser
  switcherOpen: boolean
  tenant: WorkspaceTenant
  view: View
  searchQuery: string
  subscriptionsCount: number
  onSearchQueryChange: (query: string) => void
  onToggleSwitcher: () => void
  onSelectApp: (id: string) => void
  onSelectTenant: (id: string) => void
  onGoAllApps: () => void
  onGoView: (view: View) => void
  onNewTenant: () => void
  onPrimaryAction: () => void
}

export function ConsoleShell({
  accessibleTenants,
  apps,
  canCreateApps,
  canCreateTenants,
  children,
  currentApp,
  currentUser,
  switcherOpen,
  tenant,
  view,
  onToggleSwitcher,
  onSelectApp,
  onGoAllApps,
  onGoView,
  onNewTenant,
  onPrimaryAction,
  onSearchQueryChange,
  onSelectTenant,
  searchQuery,
  subscriptionsCount,
}: ShellProps) {
  const showPrimary = (view === 'apps' && canCreateApps) || (view === 'subscriptions' && currentApp != null)
  const primaryLabel = view === 'apps' ? 'New App' : 'New Subscription'

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[var(--subkit-bg)] text-[14px] text-[var(--subkit-text)]">
      <aside className="flex w-[248px] shrink-0 flex-col border-r border-[var(--subkit-border)] bg-[var(--subkit-panel)] max-md:hidden">
        <div className="relative px-[14px] pb-[10px] pt-[14px]">
          <button
            className="flex w-full cursor-pointer items-center gap-[10px] rounded-[10px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] p-[8px] text-left"
            onClick={onToggleSwitcher}
            type="button"
          >
            <MiniAppAvatar color={tenant.color} initials={tenant.initials} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold leading-[1.15]">{tenant.name}</div>
              <div className="text-[11px] leading-[1.2] text-[var(--subkit-faint)]">Workspace</div>
            </div>
            <ChevronDown aria-hidden className="size-[14px] text-[var(--subkit-faint)]" strokeWidth={1.6} />
          </button>
          {switcherOpen ? (
            <WorkspaceSwitcher
              apps={apps}
              canCreateTenants={canCreateTenants}
              onNewTenant={onNewTenant}
              onSelectApp={onSelectApp}
              onSelectTenant={onSelectTenant}
              onViewAll={onGoAllApps}
              tenants={accessibleTenants}
            />
          ) : null}
        </div>

        <nav className="flex-1 overflow-y-auto px-[12px] pb-[12px] pt-[4px]">
          <SidebarSection label="Workspace" />
          <SidebarButton
            active={view === 'apps'}
            count={String(apps.length)}
            icon={AppsIcon}
            label="All Apps"
            onPress={onGoAllApps}
          />
          <SidebarButton
            active={view === 'workspaceSettings'}
            icon={SettingsIcon}
            label="Workspace Settings"
            onPress={() => onGoView('workspaceSettings')}
          />

          {currentApp != null ? (
            <div>
              <div className="flex items-center gap-[7px] px-[8px] pb-[6px] pt-[14px] text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--subkit-faint)]">
                <span
                  className="inline-flex size-[14px] items-center justify-center rounded-[4px] text-[8px] text-white"
                  style={{ background: currentApp.color }}
                >
                  {currentApp.initials}
                </span>
                <span className="truncate">{currentApp.name}</span>
              </div>
              {APP_NAV.map((item) => (
                <SidebarButton
                  active={view === item.view}
                  count={item.view === 'subscriptions' ? String(subscriptionsCount) : item.count}
                  icon={item.icon}
                  key={item.view}
                  label={item.label}
                  onPress={() => onGoView(item.view)}
                />
              ))}
            </div>
          ) : null}
        </nav>

        <div className="flex items-center gap-[10px] border-t border-[var(--subkit-border)] p-[12px]">
          <div className="flex size-[30px] items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--subkit-green),var(--subkit-accent))] text-[12px] font-semibold text-white">
            {currentUser.initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-semibold leading-[1.15]">{currentUser.name}</div>
            <div className="truncate text-[11px] text-[var(--subkit-faint)]">{currentUser.globalRole === 'super_admin' ? 'SuperAdmin' : currentUser.organization}</div>
          </div>
          <a aria-label="Sign out" className="text-[var(--subkit-faint)] hover:text-[var(--subkit-text)]" href="/logout">
            <MoreVertical aria-hidden className="size-[15px]" strokeWidth={1.6} />
          </a>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-[58px] shrink-0 items-center gap-[16px] border-b border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[22px]">
          <div className="flex min-w-0 items-center gap-[8px] text-[13px]">
            <span className="text-[var(--subkit-faint)]">{tenant.name}</span>
            {currentApp != null ? (
              <>
                <span className="text-[var(--subkit-border-2)]">/</span>
                <span className="truncate text-[var(--subkit-faint)]">{currentApp.name}</span>
              </>
            ) : null}
            <span className="text-[var(--subkit-border-2)]">/</span>
            <span className="font-semibold text-[var(--subkit-text)]">{viewLabels[view]}</span>
          </div>
          <div className="flex-1" />
          <label className="hidden w-[240px] items-center gap-[8px] rounded-[9px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[11px] py-[7px] md:flex">
            <Search aria-hidden className="size-[14px] text-[var(--subkit-faint)]" strokeWidth={1.6} />
            <span className="sr-only">Search</span>
            <input
              className="w-full border-0 bg-transparent font-sans text-[13px] text-[var(--subkit-text)] outline-none placeholder:text-[var(--subkit-faint)]"
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Search apps, products, users…"
              type="search"
              value={searchQuery}
            />
          </label>
          {showPrimary ? (
            <PUIButton
              addonStart={<Plus aria-hidden className="size-[14px]" strokeWidth={2} />}
              className="min-h-[36px] rounded-[9px] px-[14px] py-[9px] text-[13px] font-semibold shadow-sm"
              label={primaryLabel}
              onPress={onPrimaryAction}
              size="sm"
            />
          ) : null}
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  )
}

function WorkspaceSwitcher({
  apps,
  canCreateTenants,
  onNewTenant,
  onSelectApp,
  onSelectTenant,
  onViewAll,
  tenants,
}: {
  apps: AppTenant[]
  canCreateTenants: boolean
  onNewTenant: () => void
  onSelectApp: (id: string) => void
  onSelectTenant: (id: string) => void
  onViewAll: () => void
  tenants: WorkspaceTenant[]
}) {
  return (
    <div className="absolute left-[14px] right-[14px] top-[54px] z-40 animate-[subkit-drop-in_140ms_ease] rounded-[12px] border border-[var(--subkit-border-2)] bg-[var(--subkit-panel)] p-[6px] shadow-[0_12px_32px_-8px_rgba(20,20,40,0.18)]">
      <div className="px-[8px] pb-[4px] pt-[6px] text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--subkit-faint)]">
        Tenants
      </div>
      {tenants.map((item) => (
        <button
          className="flex w-full cursor-pointer items-center gap-[8px] rounded-[8px] px-[8px] py-[6px] text-left hover:bg-[var(--subkit-panel-2)]"
          key={item.id}
          onClick={() => onSelectTenant(item.id)}
          type="button"
        >
          <MiniAppAvatar color={item.color} initials={item.initials} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-semibold">{item.name}</div>
            <div className="truncate text-[10.5px] text-[var(--subkit-faint)]">{item.role === 'super_admin' ? 'SuperAdmin access' : item.role}</div>
          </div>
        </button>
      ))}
      <div className="mx-[4px] my-[5px] h-px bg-[var(--subkit-border)]" />
      <div className="px-[8px] pb-[4px] pt-[4px] text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--subkit-faint)]">
        Switch app
      </div>
      {apps.slice(0, 8).map((app) => (
        <button
          className="flex w-full cursor-pointer items-center gap-[9px] rounded-[8px] px-[8px] py-[7px] text-left hover:bg-[var(--subkit-panel-2)]"
          key={app.id}
          onClick={() => onSelectApp(app.id)}
          type="button"
        >
          <AppAvatar app={app} size="sm" />
          <span className="min-w-0 flex-1 text-[13px] font-medium">
            <span className="block truncate">{app.name}</span>
            <span className="block truncate text-[10.5px] font-normal text-[var(--subkit-faint)]">{app.tenantId}</span>
          </span>
        </button>
      ))}
      <div className="mx-[4px] my-[5px] h-px bg-[var(--subkit-border)]" />
      <button
        className="flex w-full cursor-pointer items-center gap-[9px] rounded-[8px] px-[8px] py-[7px] text-[13px] font-semibold text-[var(--subkit-accent-d)] hover:bg-[var(--subkit-accent-soft)]"
        onClick={onViewAll}
        type="button"
      >
        View all apps
      </button>
      {canCreateTenants ? (
        <button
          className="mt-[2px] flex w-full cursor-pointer items-center gap-[9px] rounded-[8px] px-[8px] py-[7px] text-[13px] font-semibold text-[var(--subkit-accent-d)] hover:bg-[var(--subkit-accent-soft)]"
          onClick={onNewTenant}
          type="button"
        >
          Create tenant
        </button>
      ) : null}
    </div>
  )
}

function SidebarSection({ label }: { label: string }) {
  return <div className="px-[8px] pb-[6px] pt-[10px] text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--subkit-faint)]">{label}</div>
}

function SidebarButton({
  active,
  count,
  icon: Icon,
  label,
  onPress,
}: {
  active: boolean
  count?: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  onPress: () => void
}) {
  return (
    <button
      className={cn(
        'mt-[2px] flex w-full cursor-pointer select-none items-center gap-[11px] rounded-[9px] px-[10px] py-[8px] text-left text-[13.5px] transition-colors duration-fast motion-reduce:transition-none',
        active
          ? 'bg-[var(--subkit-accent-soft)] font-semibold text-[var(--subkit-accent-d)]'
          : 'bg-transparent font-medium text-[var(--subkit-dim)] hover:bg-[var(--subkit-panel-2)]',
      )}
      onClick={onPress}
      type="button"
    >
      <Icon aria-hidden className="size-[16px]" />
      <span className="flex-1">{label}</span>
      {count != null ? <span className="font-mono text-[11px] text-[var(--subkit-faint)]">{count}</span> : null}
    </button>
  )
}
