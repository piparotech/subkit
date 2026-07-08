import * as React from 'react'

import { Link } from '@tanstack/react-router'

import { ChevronDown, LogOut, Menu, Plus, Search, X } from 'lucide-react'
import { GlobalNavigation } from '~/console/GlobalNavigation'
import { WorkspaceSwitcher } from '~/console/WorkspaceSwitcher'
import { appRouteParams } from '~/console/routing'
import type { ConsolePrimaryAction } from '~/console/types'
import { AppNavigation } from '~/domain/apps/AppNavigation'
import { MiniAppAvatar } from '~/domain/apps/MiniAppAvatar'
import type { AppTenant } from '~/domain/apps/types'
import type { ConsoleUser, WorkspaceTenant } from '~/domain/tenants/types'

import { PUIButton } from '@piparo/cn-web'

interface ShellProps {
  accessibleTenants: WorkspaceTenant[]
  apps: AppTenant[]
  canCreateTenants: boolean
  children: React.ReactNode
  currentApp: AppTenant | null
  currentUser: ConsoleUser
  switcherOpen: boolean
  tenant: WorkspaceTenant
  title: string
  searchPlaceholder: string | null
  searchQuery: string
  productsCount: number
  onSearchQueryChange: (query: string) => void
  onToggleSwitcher: () => void
  onSelectTenant: (id: string) => void
  onNewTenant: () => void
  primaryAction: ConsolePrimaryAction | null
}

export function ConsoleShell({
  accessibleTenants,
  apps,
  canCreateTenants,
  children,
  currentApp,
  currentUser,
  switcherOpen,
  tenant,
  title,
  onToggleSwitcher,
  onNewTenant,
  primaryAction,
  onSearchQueryChange,
  onSelectTenant,
  searchPlaceholder,
  searchQuery,
  productsCount,
}: ShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)
  const currentAppRouteParams = currentApp == null ? null : appRouteParams(currentApp)
  const showSearch = searchPlaceholder != null

  React.useEffect(() => {
    if (!mobileNavOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mobileNavOpen])

  const closeMobileNav = () => setMobileNavOpen(false)

  const handleSelectTenant = (id: string) => {
    closeMobileNav()
    onSelectTenant(id)
  }

  const handleNewTenant = () => {
    closeMobileNav()
    onNewTenant()
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[var(--subkit-bg)] text-[14px] text-[var(--subkit-text)]">
      <aside className="flex w-[248px] shrink-0 flex-col border-r border-[var(--subkit-border)] bg-[var(--subkit-panel)] max-md:hidden">
        <SidebarContent
          accessibleTenants={accessibleTenants}
          apps={apps}
          canCreateTenants={canCreateTenants}
          currentApp={currentApp}
          currentUser={currentUser}
          onNavigate={undefined}
          onNewTenant={onNewTenant}
          onSelectTenant={onSelectTenant}
          onToggleSwitcher={onToggleSwitcher}
          productsCount={productsCount}
          switcherOpen={switcherOpen}
          tenant={tenant}
        />
      </aside>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-[70] md:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 cursor-default bg-[rgba(24,24,40,0.32)]"
            onClick={closeMobileNav}
            type="button"
          />
          <aside className="absolute top-0 bottom-0 left-0 flex w-[min(320px,calc(100vw-48px))] flex-col border-r border-[var(--subkit-border)] bg-[var(--subkit-panel)] shadow-[12px_0_34px_-18px_rgba(20,20,50,0.36)]">
            <div className="flex items-center justify-between border-b border-[var(--subkit-border)] px-[14px] py-[12px]">
              <span className="text-[13px] font-semibold">Navigation</span>
              <button
                aria-label="Close navigation"
                className="flex size-[32px] items-center justify-center rounded-[8px] border border-[var(--subkit-border)] text-[var(--subkit-dim)]"
                onClick={closeMobileNav}
                type="button"
              >
                <X aria-hidden className="size-[15px]" strokeWidth={1.8} />
              </button>
            </div>
            <SidebarContent
              accessibleTenants={accessibleTenants}
              apps={apps}
              canCreateTenants={canCreateTenants}
              currentApp={currentApp}
              currentUser={currentUser}
              onNavigate={closeMobileNav}
              onNewTenant={handleNewTenant}
              onSelectTenant={handleSelectTenant}
              onToggleSwitcher={onToggleSwitcher}
              productsCount={productsCount}
              switcherOpen={switcherOpen}
              tenant={tenant}
            />
          </aside>
        </div>
      ) : null}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-[58px] shrink-0 items-center gap-[12px] border-b border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[22px] max-md:px-[14px]">
          <button
            aria-label="Open navigation"
            className="hidden size-[34px] shrink-0 items-center justify-center rounded-[9px] border border-[var(--subkit-border)] text-[var(--subkit-dim)] max-md:flex"
            onClick={() => setMobileNavOpen(true)}
            type="button"
          >
            <Menu aria-hidden className="size-[16px]" strokeWidth={1.8} />
          </button>
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-[8px] text-[13px]">
            <Link className={breadcrumbLinkClass} preload="intent" to="/apps">
              {tenant.name}
            </Link>
            {currentApp != null && currentAppRouteParams != null ? (
              <>
                <BreadcrumbSeparator />
                <Link
                  className={breadcrumbLinkClass}
                  params={currentAppRouteParams}
                  preload="intent"
                  to="/$tenantSlug/$appSlug"
                >
                  {currentApp.name}
                </Link>
              </>
            ) : null}
            <BreadcrumbSeparator />
            <span
              aria-current="page"
              className="min-w-0 truncate font-semibold text-[var(--subkit-text)]"
            >
              {title}
            </span>
          </nav>
          <div className="flex-1" />
          {showSearch ? (
            <label className="hidden w-[260px] items-center gap-[8px] rounded-[9px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[11px] py-[7px] md:flex">
              <Search
                aria-hidden
                className="size-[14px] text-[var(--subkit-faint)]"
                strokeWidth={1.6}
              />
              <span className="sr-only">Search</span>
              <input
                className="w-full border-0 bg-transparent font-sans text-[13px] text-[var(--subkit-text)] outline-none placeholder:text-[var(--subkit-faint)]"
                onChange={(event) => onSearchQueryChange(event.target.value)}
                placeholder={searchPlaceholder}
                type="search"
                value={searchQuery}
              />
            </label>
          ) : null}
          {primaryAction != null ? (
            <PUIButton
              addonStart={<Plus aria-hidden className="size-[14px]" strokeWidth={2} />}
              className="min-h-[36px] rounded-[9px] px-[14px] py-[9px] text-[13px] font-semibold shadow-sm"
              label={primaryAction.label}
              onPress={primaryAction.onPress}
              size="sm"
            />
          ) : null}
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  )
}

function SidebarContent({
  accessibleTenants,
  apps,
  canCreateTenants,
  currentApp,
  currentUser,
  onNavigate,
  onNewTenant,
  onSelectTenant,
  onToggleSwitcher,
  productsCount,
  switcherOpen,
  tenant,
}: {
  accessibleTenants: WorkspaceTenant[]
  apps: AppTenant[]
  canCreateTenants: boolean
  currentApp: AppTenant | null
  currentUser: ConsoleUser
  onNavigate: (() => void) | undefined
  onNewTenant: () => void
  onSelectTenant: (id: string) => void
  onToggleSwitcher: () => void
  productsCount: number
  switcherOpen: boolean
  tenant: WorkspaceTenant
}) {
  return (
    <>
      <div className="relative px-[14px] pt-[14px] pb-[10px]">
        <button
          className="flex w-full cursor-pointer items-center gap-[10px] rounded-[10px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] p-[8px] text-left"
          onClick={onToggleSwitcher}
          type="button"
        >
          <MiniAppAvatar color={tenant.color} initials={tenant.initials} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] leading-[1.15] font-semibold">{tenant.name}</div>
            <div className="text-[11px] leading-[1.2] text-[var(--subkit-faint)]">Workspace</div>
          </div>
          <ChevronDown
            aria-hidden
            className="size-[14px] text-[var(--subkit-faint)]"
            strokeWidth={1.6}
          />
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

      <nav className="flex-1 overflow-y-auto px-[12px] pt-[4px] pb-[12px]">
        {currentApp == null ? (
          <GlobalNavigation appsCount={apps.length} onNavigate={onNavigate} />
        ) : (
          <AppNavigation app={currentApp} onNavigate={onNavigate} productsCount={productsCount} />
        )}
      </nav>

      <div className="flex items-center gap-[10px] border-t border-[var(--subkit-border)] p-[12px]">
        <div className="flex size-[30px] items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--subkit-green),var(--subkit-accent))] text-[12px] font-semibold text-white">
          {currentUser.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] leading-[1.15] font-semibold">
            {currentUser.name}
          </div>
          <div className="truncate text-[11px] text-[var(--subkit-faint)]">
            {currentUser.globalRole === 'super_admin' ? 'SuperAdmin' : currentUser.organization}
          </div>
        </div>
        <a
          aria-label="Sign out"
          className="inline-flex items-center gap-[6px] rounded-[8px] border border-[var(--subkit-border)] px-[8px] py-[6px] text-[11.5px] font-semibold text-[var(--subkit-dim)] hover:text-[var(--subkit-text)]"
          href="/logout"
        >
          <LogOut aria-hidden className="size-[13px]" strokeWidth={1.7} />
          <span>Sign out</span>
        </a>
      </div>
    </>
  )
}

const breadcrumbLinkClass =
  'min-w-0 truncate font-medium text-[var(--subkit-faint)] outline-none transition-colors duration-fast hover:text-[var(--subkit-text)] hover:underline focus-visible:text-[var(--subkit-text)] focus-visible:underline motion-reduce:transition-none'

function BreadcrumbSeparator() {
  return (
    <span aria-hidden className="shrink-0 text-[var(--subkit-border-2)]">
      /
    </span>
  )
}
