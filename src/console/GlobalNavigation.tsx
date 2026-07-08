import { SidebarNavLink } from '~/console/components/SidebarNavLink'
import { SidebarSection } from '~/console/components/SidebarSection'
import { AppUsersIcon } from '~/console/icons/AppUsersIcon'
import { AppsIcon } from '~/console/icons/AppsIcon'
import { SettingsIcon } from '~/console/icons/SettingsIcon'

export function GlobalNavigation({
  appsCount,
  onNavigate,
}: {
  appsCount: number
  onNavigate?: () => void
}) {
  return (
    <div>
      <SidebarSection label="Workspace" />
      <SidebarNavLink
        count={appsCount}
        countLabel={`${appsCount} apps`}
        icon={AppsIcon}
        label="Apps"
        onNavigate={onNavigate}
        to="/apps"
      />
      <SidebarNavLink
        icon={AppUsersIcon}
        label="Workspace Members"
        onNavigate={onNavigate}
        to="/members"
      />
      <SidebarNavLink
        icon={SettingsIcon}
        label="Workspace Settings"
        onNavigate={onNavigate}
        to="/settings"
      />
    </div>
  )
}
