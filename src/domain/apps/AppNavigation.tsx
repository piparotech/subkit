import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { AppUsersIcon } from '~/console/icons/AppUsersIcon'
import { AppAvatar } from '~/domain/apps/AppAvatar'
import { DashboardIcon } from '~/console/icons/DashboardIcon'
import { EntitlementsIcon } from '~/console/icons/EntitlementsIcon'
import { OfferingsIcon } from '~/console/icons/OfferingsIcon'
import { SettingsIcon } from '~/console/icons/SettingsIcon'
import { SidebarNavLink } from '~/console/components/SidebarNavLink'
import { SidebarSection } from '~/console/components/SidebarSection'
import { appRouteParams } from '~/console/routing'
import { SubscriptionsIcon } from '~/console/icons/SubscriptionsIcon'
import type { AppTenant } from '~/domain/apps/types'

export function AppNavigation({
  app,
  onNavigate,
  subscriptionsCount,
}: {
  app: AppTenant
  onNavigate?: () => void
  subscriptionsCount: number
}) {
  const routeParams = appRouteParams(app)
  return (
    <div>
      <Link
        className="mb-[8px] flex items-center gap-[8px] rounded-[9px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[10px] py-[8px] text-[13px] font-semibold text-[var(--subkit-text)] outline-none transition-colors duration-fast hover:border-[var(--subkit-border-2)] hover:bg-[var(--subkit-bg)] focus-visible:ring-2 focus-visible:ring-[var(--subkit-accent-line)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--subkit-panel)] motion-reduce:transition-none"
        onClick={onNavigate}
        preload="intent"
        to="/apps"
      >
        <ArrowLeft aria-hidden className="size-[14px] shrink-0 text-[var(--subkit-dim)]" strokeWidth={1.8} />
        <span className="min-w-0 truncate">Back to workspace</span>
      </Link>

      <div className="flex items-center gap-[8px] px-[8px] pb-[7px] pt-[14px]">
        <AppAvatar app={app} size="xs" />
        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--subkit-dim)]">{app.name}</span>
      </div>

      <SidebarSection label="State" />
      <SidebarNavLink icon={DashboardIcon} label="Overview" onNavigate={onNavigate} params={routeParams} to="/$tenantSlug/$appSlug" />
      <SidebarNavLink icon={AppUsersIcon} label="App Users" onNavigate={onNavigate} params={routeParams} to="/$tenantSlug/$appSlug/app-users" />
      <SidebarNavLink icon={EntitlementsIcon} label="Entitlements" onNavigate={onNavigate} params={routeParams} to="/$tenantSlug/$appSlug/entitlements" />
      <SidebarNavLink
        count={subscriptionsCount}
        countLabel={`${subscriptionsCount} store subscriptions`}
        icon={SubscriptionsIcon}
        label="Store Subscriptions"
        onNavigate={onNavigate}
        params={routeParams}
        to="/$tenantSlug/$appSlug/subscriptions"
      />

      <SidebarSection label="Catalog" />
      <SidebarNavLink icon={OfferingsIcon} label="Offerings" onNavigate={onNavigate} params={routeParams} to="/$tenantSlug/$appSlug/offerings" />

      <SidebarSection label="Admin" />
      <SidebarNavLink icon={SettingsIcon} label="App Settings" onNavigate={onNavigate} params={routeParams} to="/$tenantSlug/$appSlug/settings" />
    </div>
  )
}
