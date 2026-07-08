import { Link } from '@tanstack/react-router'

import { appRouteParams } from '~/console/routing'
import { AppAvatar } from '~/domain/apps/AppAvatar'
import { MiniAppAvatar } from '~/domain/apps/MiniAppAvatar'
import type { AppTenant } from '~/domain/apps/types'
import type { WorkspaceTenant } from '~/domain/tenants/types'

export function WorkspaceSwitcher({
  apps,
  canCreateTenants,
  onNewTenant,
  onSelectTenant,
  tenants,
}: {
  apps: AppTenant[]
  canCreateTenants: boolean
  onNewTenant: () => void
  onSelectTenant: (id: string) => void
  tenants: WorkspaceTenant[]
}) {
  return (
    <div className="absolute top-[54px] right-[14px] left-[14px] z-40 animate-[subkit-drop-in_140ms_ease] rounded-[12px] border border-[var(--subkit-border-2)] bg-[var(--subkit-panel)] p-[6px] shadow-[0_12px_32px_-8px_rgba(20,20,40,0.18)]">
      <div className="px-[8px] pt-[6px] pb-[4px] text-[10.5px] font-semibold tracking-[0.06em] text-[var(--subkit-faint)] uppercase">
        Workspaces
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
            <div className="truncate text-[10.5px] text-[var(--subkit-faint)]">
              {item.role === 'super_admin' ? 'SuperAdmin access' : item.role}
            </div>
          </div>
        </button>
      ))}
      <div className="mx-[4px] my-[5px] h-px bg-[var(--subkit-border)]" />
      <div className="px-[8px] pt-[4px] pb-[4px] text-[10.5px] font-semibold tracking-[0.06em] text-[var(--subkit-faint)] uppercase">
        Switch app
      </div>
      {apps.slice(0, 8).map((app) => (
        <Link
          className="flex w-full cursor-pointer items-center gap-[9px] rounded-[8px] px-[8px] py-[7px] text-left hover:bg-[var(--subkit-panel-2)]"
          key={app.id}
          params={appRouteParams(app)}
          preload="intent"
          to="/$tenantSlug/$appSlug"
        >
          <AppAvatar app={app} size="sm" />
          <span className="min-w-0 flex-1 text-[13px] font-medium">
            <span className="block truncate">{app.name}</span>
            <span className="block truncate text-[10.5px] font-normal text-[var(--subkit-faint)]">
              {app.tenantId}
            </span>
          </span>
        </Link>
      ))}
      <div className="mx-[4px] my-[5px] h-px bg-[var(--subkit-border)]" />
      <Link
        className="flex w-full cursor-pointer items-center gap-[9px] rounded-[8px] px-[8px] py-[7px] text-[13px] font-semibold text-[var(--subkit-accent-d)] hover:bg-[var(--subkit-accent-soft)]"
        preload="intent"
        to="/apps"
      >
        View all apps
      </Link>
      {canCreateTenants ? (
        <button
          className="mt-[2px] flex w-full cursor-pointer items-center gap-[9px] rounded-[8px] px-[8px] py-[7px] text-[13px] font-semibold text-[var(--subkit-accent-d)] hover:bg-[var(--subkit-accent-soft)]"
          onClick={onNewTenant}
          type="button"
        >
          Create workspace
        </button>
      ) : null}
    </div>
  )
}
