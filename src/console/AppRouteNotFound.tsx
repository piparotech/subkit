import { Link } from '@tanstack/react-router'

import { appRouteParams } from '~/console/routing'
import type { AppTenant } from '~/domain/apps/types'

export function AppRouteNotFound({ apps }: { apps: AppTenant[] }) {
  return (
    <section className="max-w-[760px] animate-[subkit-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <div className="rounded-[14px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] p-[22px]">
        <h1 className="m-0 text-[19px] font-bold tracking-[-0.01em]">App route not found</h1>
        <p className="mt-[8px] mb-0 text-[13.5px] text-[var(--subkit-dim)]">
          The app in the URL is not available in this workspace.
        </p>
        {apps.length > 0 ? (
          <div className="mt-[16px] flex flex-wrap gap-[8px]">
            {apps.map((app) => (
              <Link
                className="cursor-pointer rounded-[9px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[11px] py-[7px] text-[12.5px] font-semibold text-[var(--subkit-text)] hover:bg-[var(--subkit-accent-soft)]"
                key={app.id}
                params={appRouteParams(app)}
                preload="intent"
                to="/$tenantSlug/$appSlug"
              >
                {app.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
