import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { AppAvatar } from '~/domain/apps/AppAvatar'
import { SidebarNavLink } from '~/console/components/SidebarNavLink'
import { SidebarSection } from '~/console/components/SidebarSection'
import { appRouteParams } from '~/console/routing'
import { appConsoleNavigationSections, consoleViews } from '~/console/views'
import type { AppTenant } from '~/domain/apps/types'

export function AppNavigation({
  app,
  onNavigate,
  productsCount,
}: {
  app: AppTenant
  onNavigate?: () => void
  productsCount: number
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

      {appConsoleNavigationSections.map((section) => (
        <div key={section.label}>
          <SidebarSection label={section.label} />
          {section.views.map((view) => {
            const definition = consoleViews[view]
            const count = view === 'products' ? productsCount : undefined
            return (
              <SidebarNavLink
                count={count}
                countLabel={count == null ? undefined : `${count} catalog products`}
                icon={definition.icon}
                key={view}
                label={definition.navigationLabel}
                onNavigate={onNavigate}
                params={routeParams}
                to={definition.to}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
