import { PUIText } from '@piparo/cn-web'
import { Link } from '@tanstack/react-router'

import { AppAvatar } from './AppAvatar'
import { AppCardMetric } from './AppCardMetric'
import { sumCurrency, sumNumberText } from './formatMetrics'
import { MetricCard } from './MetricCard'
import { RowChevron } from './RowChevron'
import { SoftTag } from './SoftTag'
import { appRouteParams } from './store'
import { StatusLabel } from './StatusLabel'
import type { AppTenant } from './types'

export function AppsView({ apps }: { apps: AppTenant[] }) {
  return (
    <section className="animate-[subkit-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <div className="max-w-[1200px]">
        <div className="mb-[6px] flex items-end justify-between">
          <div>
            <PUIText as="h1" className="m-0 text-[23px] font-bold tracking-[-0.01em]" variant="title2">
              Apps
            </PUIText>
            <p className="mt-[5px] mb-0 text-[13.5px] text-[var(--subkit-dim)]">
              Every iOS app in your workspace. Connect App Store apps from the tenant key.
            </p>
          </div>
        </div>

        <div className="my-[22px] mb-[24px] flex gap-[14px] max-md:flex-col">
          <MetricCard label="Total MRR" value={sumCurrency(apps.map((app) => app.mrr))} />
          <MetricCard label="Active App Users" value={sumNumberText(apps.map((app) => app.activeAppUsers))} />
          <MetricCard label="Apps" value={String(apps.length)} />
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-[16px]">
          {apps.map((app) => (
            <Link
              className="cursor-pointer rounded-[14px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] p-[18px] text-left transition-[box-shadow,border-color,transform] duration-fast hover:-translate-y-[2px] hover:border-[var(--subkit-border-2)] hover:shadow-[0_10px_28px_-12px_rgba(30,30,70,0.22)] motion-reduce:transform-none"
              key={app.id}
              params={appRouteParams(app)}
              preload="intent"
              to="/$tenantSlug/$appSlug"
            >
              <div className="flex items-center gap-[12px]">
                <AppAvatar app={app} />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold">{app.name}</div>
                  <div className="truncate font-mono text-[12px] text-[var(--subkit-faint)]">{app.bundle}</div>
                </div>
                <StatusLabel label={app.status} tone={app.statusTone} />
              </div>
              <div className="my-[14px] flex gap-[6px]">
                {app.platforms.length === 0 ? (
                  <span className="rounded-[6px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[8px] py-[3px] text-[11px] font-medium text-[var(--subkit-dim)]">
                    iOS pending
                  </span>
                ) : null}
                {app.platforms.map((platform) => (
                  <SoftTag key={platform}>{platform}</SoftTag>
                ))}
              </div>
              <div className="flex border-t border-[var(--subkit-border)] pt-[13px]">
                <AppCardMetric label="MRR" value={app.mrr} />
                <AppCardMetric label="Active users" value={app.activeAppUsers} />
                <div className="flex items-center text-[var(--subkit-faint)]">
                  <RowChevron />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
