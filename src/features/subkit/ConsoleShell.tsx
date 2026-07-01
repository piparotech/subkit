import { PUIButton } from '@piparo/cn-web'
import { ChevronDown, MoreVertical, Plus, Search } from 'lucide-react'
import * as React from 'react'

import { AppNavigation } from './AppNavigation'
import { GlobalNavigation } from './GlobalNavigation'
import { MiniAppAvatar } from './MiniAppAvatar'
import type { AppTenant, ConsoleUser, View, WorkspaceTenant } from './types'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'

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
  onSelectTenant: (id: string) => void
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
              onSelectTenant={onSelectTenant}
              tenants={accessibleTenants}
            />
          ) : null}
        </div>

        <nav className="flex-1 overflow-y-auto px-[12px] pb-[12px] pt-[4px]">
          {currentApp == null ? (
            <GlobalNavigation appsCount={apps.length} />
          ) : (
            <AppNavigation app={currentApp} subscriptionsCount={subscriptionsCount} />
          )}
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
            {view === 'apps' ? <span className="font-semibold text-[var(--subkit-text)]">All Apps</span> : null}
            {view === 'tenantMembers' ? <span className="font-semibold text-[var(--subkit-text)]">Tenant Members</span> : null}
            {view === 'workspaceSettings' ? <span className="font-semibold text-[var(--subkit-text)]">Workspace Settings</span> : null}
            {view === 'dashboard' ? <span className="font-semibold text-[var(--subkit-text)]">Dashboard</span> : null}
            {view === 'subscriptions' ? <span className="font-semibold text-[var(--subkit-text)]">Subscriptions</span> : null}
            {view === 'entitlements' ? <span className="font-semibold text-[var(--subkit-text)]">Entitlements</span> : null}
            {view === 'offerings' ? <span className="font-semibold text-[var(--subkit-text)]">Offerings</span> : null}
            {view === 'appUsers' ? <span className="font-semibold text-[var(--subkit-text)]">App Users</span> : null}
            {view === 'settings' ? <span className="font-semibold text-[var(--subkit-text)]">Settings</span> : null}
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
