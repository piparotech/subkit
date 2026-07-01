import { Link } from '@tanstack/react-router'

import { AppUsersIcon } from './AppUsersIcon'
import { AppsIcon } from './AppsIcon'
import { SettingsIcon } from './SettingsIcon'
import { SidebarLinkContent } from './SidebarLinkContent'
import { SidebarSection } from './SidebarSection'

export function GlobalNavigation({ appsCount }: { appsCount: number }) {
  return (
    <div>
      <SidebarSection label="Global" />
      <Link
        activeOptions={{ exact: true }}
        activeProps={{ className: 'bg-[var(--subkit-accent-soft)] font-semibold text-[var(--subkit-accent-d)]' }}
        className="mt-[2px] flex w-full cursor-pointer select-none items-center gap-[11px] rounded-[9px] px-[10px] py-[8px] text-left text-[13.5px] transition-colors duration-fast motion-reduce:transition-none"
        inactiveProps={{ className: 'bg-transparent font-medium text-[var(--subkit-dim)] hover:bg-[var(--subkit-panel-2)]' }}
        preload="intent"
        to="/apps"
      >
        <SidebarLinkContent count={String(appsCount)} icon={AppsIcon}>All Apps</SidebarLinkContent>
      </Link>
      <Link
        activeOptions={{ exact: true }}
        activeProps={{ className: 'bg-[var(--subkit-accent-soft)] font-semibold text-[var(--subkit-accent-d)]' }}
        className="mt-[2px] flex w-full cursor-pointer select-none items-center gap-[11px] rounded-[9px] px-[10px] py-[8px] text-left text-[13.5px] transition-colors duration-fast motion-reduce:transition-none"
        inactiveProps={{ className: 'bg-transparent font-medium text-[var(--subkit-dim)] hover:bg-[var(--subkit-panel-2)]' }}
        preload="intent"
        to="/members"
      >
        <SidebarLinkContent icon={AppUsersIcon}>Tenant Members</SidebarLinkContent>
      </Link>
      <Link
        activeOptions={{ exact: true }}
        activeProps={{ className: 'bg-[var(--subkit-accent-soft)] font-semibold text-[var(--subkit-accent-d)]' }}
        className="mt-[2px] flex w-full cursor-pointer select-none items-center gap-[11px] rounded-[9px] px-[10px] py-[8px] text-left text-[13.5px] transition-colors duration-fast motion-reduce:transition-none"
        inactiveProps={{ className: 'bg-transparent font-medium text-[var(--subkit-dim)] hover:bg-[var(--subkit-panel-2)]' }}
        preload="intent"
        to="/settings"
      >
        <SidebarLinkContent icon={SettingsIcon}>Workspace Settings</SidebarLinkContent>
      </Link>
    </div>
  )
}
