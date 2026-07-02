import { SidebarNavLink } from '~/console/components/SidebarNavLink'
import { SidebarSection } from '~/console/components/SidebarSection'
import { consoleViews, workspaceConsoleNavigation } from '~/console/views'

export function GlobalNavigation({ appsCount, onNavigate }: { appsCount: number; onNavigate?: () => void }) {
  return (
    <div>
      <SidebarSection label="Workspace" />
      {workspaceConsoleNavigation.map((view) => {
        const definition = consoleViews[view]
        const count = view === 'apps' ? appsCount : undefined
        return (
          <SidebarNavLink
            count={count}
            countLabel={count == null ? undefined : `${count} apps`}
            icon={definition.icon}
            key={view}
            label={definition.navigationLabel}
            onNavigate={onNavigate}
            to={definition.to}
          />
        )
      })}
    </div>
  )
}
