import { Link } from '@tanstack/react-router'

import { AppUsersIcon } from './AppUsersIcon'
import { DashboardIcon } from './DashboardIcon'
import { EntitlementsIcon } from './EntitlementsIcon'
import { OfferingsIcon } from './OfferingsIcon'
import { SettingsIcon } from './SettingsIcon'
import { SidebarLinkContent } from './SidebarLinkContent'
import { appRouteParams } from './store'
import { SubscriptionsIcon } from './SubscriptionsIcon'
import type { AppTenant } from './types'

export function AppNavigation({ app, subscriptionsCount }: { app: AppTenant; subscriptionsCount: number }) {
  const routeParams = appRouteParams(app)
  return (
    <div>
      <div className="flex items-center gap-[7px] px-[8px] pb-[6px] pt-[14px] text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--subkit-faint)]">
        <span
          className="inline-flex size-[14px] items-center justify-center rounded-[4px] text-[8px] text-white"
          style={{ background: app.color }}
        >
          {app.initials}
        </span>
        <span className="truncate">{app.name}</span>
      </div>
      <Link
        activeOptions={{ exact: true }}
        activeProps={{ className: 'bg-[var(--subkit-accent-soft)] font-semibold text-[var(--subkit-accent-d)]' }}
        className="mt-[2px] flex w-full cursor-pointer select-none items-center gap-[11px] rounded-[9px] px-[10px] py-[8px] text-left text-[13.5px] transition-colors duration-fast motion-reduce:transition-none"
        inactiveProps={{ className: 'bg-transparent font-medium text-[var(--subkit-dim)] hover:bg-[var(--subkit-panel-2)]' }}
        params={routeParams}
        preload="intent"
        to="/$tenantSlug/$appSlug"
      >
        <SidebarLinkContent icon={DashboardIcon}>Dashboard</SidebarLinkContent>
      </Link>
      <Link
        activeOptions={{ exact: true }}
        activeProps={{ className: 'bg-[var(--subkit-accent-soft)] font-semibold text-[var(--subkit-accent-d)]' }}
        className="mt-[2px] flex w-full cursor-pointer select-none items-center gap-[11px] rounded-[9px] px-[10px] py-[8px] text-left text-[13.5px] transition-colors duration-fast motion-reduce:transition-none"
        inactiveProps={{ className: 'bg-transparent font-medium text-[var(--subkit-dim)] hover:bg-[var(--subkit-panel-2)]' }}
        params={routeParams}
        preload="intent"
        to="/$tenantSlug/$appSlug/subscriptions"
      >
        <SidebarLinkContent count={String(subscriptionsCount)} icon={SubscriptionsIcon}>Subscriptions</SidebarLinkContent>
      </Link>
      <Link
        activeOptions={{ exact: true }}
        activeProps={{ className: 'bg-[var(--subkit-accent-soft)] font-semibold text-[var(--subkit-accent-d)]' }}
        className="mt-[2px] flex w-full cursor-pointer select-none items-center gap-[11px] rounded-[9px] px-[10px] py-[8px] text-left text-[13.5px] transition-colors duration-fast motion-reduce:transition-none"
        inactiveProps={{ className: 'bg-transparent font-medium text-[var(--subkit-dim)] hover:bg-[var(--subkit-panel-2)]' }}
        params={routeParams}
        preload="intent"
        to="/$tenantSlug/$appSlug/entitlements"
      >
        <SidebarLinkContent icon={EntitlementsIcon}>Entitlements</SidebarLinkContent>
      </Link>
      <Link
        activeOptions={{ exact: true }}
        activeProps={{ className: 'bg-[var(--subkit-accent-soft)] font-semibold text-[var(--subkit-accent-d)]' }}
        className="mt-[2px] flex w-full cursor-pointer select-none items-center gap-[11px] rounded-[9px] px-[10px] py-[8px] text-left text-[13.5px] transition-colors duration-fast motion-reduce:transition-none"
        inactiveProps={{ className: 'bg-transparent font-medium text-[var(--subkit-dim)] hover:bg-[var(--subkit-panel-2)]' }}
        params={routeParams}
        preload="intent"
        to="/$tenantSlug/$appSlug/offerings"
      >
        <SidebarLinkContent icon={OfferingsIcon}>Offerings</SidebarLinkContent>
      </Link>
      <Link
        activeOptions={{ exact: true }}
        activeProps={{ className: 'bg-[var(--subkit-accent-soft)] font-semibold text-[var(--subkit-accent-d)]' }}
        className="mt-[2px] flex w-full cursor-pointer select-none items-center gap-[11px] rounded-[9px] px-[10px] py-[8px] text-left text-[13.5px] transition-colors duration-fast motion-reduce:transition-none"
        inactiveProps={{ className: 'bg-transparent font-medium text-[var(--subkit-dim)] hover:bg-[var(--subkit-panel-2)]' }}
        params={routeParams}
        preload="intent"
        to="/$tenantSlug/$appSlug/app-users"
      >
        <SidebarLinkContent icon={AppUsersIcon}>App Users</SidebarLinkContent>
      </Link>
      <Link
        activeOptions={{ exact: true }}
        activeProps={{ className: 'bg-[var(--subkit-accent-soft)] font-semibold text-[var(--subkit-accent-d)]' }}
        className="mt-[2px] flex w-full cursor-pointer select-none items-center gap-[11px] rounded-[9px] px-[10px] py-[8px] text-left text-[13.5px] transition-colors duration-fast motion-reduce:transition-none"
        inactiveProps={{ className: 'bg-transparent font-medium text-[var(--subkit-dim)] hover:bg-[var(--subkit-panel-2)]' }}
        params={routeParams}
        preload="intent"
        to="/$tenantSlug/$appSlug/settings"
      >
        <SidebarLinkContent icon={SettingsIcon}>Settings</SidebarLinkContent>
      </Link>
    </div>
  )
}
