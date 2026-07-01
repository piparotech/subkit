import { PUICard, PUIText, cn } from '@piparo/cn-web'

import { AppAvatar } from './AppAvatar'
import { MetricCard } from './MetricCard'
import { toneTextClass } from './toneClasses'
import { ToneDot } from './ToneDot'
import type { ActivityEvent, AppTenant, ConsoleStats, Metric, RevenueBar } from './types'

export function DashboardView({
  activity,
  app,
  dbStats,
  metrics,
  revenueBars,
}: {
  activity: ActivityEvent[]
  app: AppTenant
  dbStats: ConsoleStats
  metrics: Metric[]
  revenueBars: RevenueBar[]
}) {
  return (
    <section className="max-w-[1180px] animate-[subkit-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <div className="mb-[22px] flex items-center gap-[14px]">
        <AppAvatar app={app} size="lg" />
        <div>
          <PUIText as="h1" className="m-0 text-[22px] font-bold tracking-[-0.01em]" variant="title2">
            {app.name}
          </PUIText>
          <div className="mt-[2px] font-mono text-[12.5px] text-[var(--subkit-faint)]">{app.bundle}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-[14px] max-lg:grid-cols-2 max-sm:grid-cols-1">
        {metrics.map((metric) => (
          <MetricCard delta={metric.delta} key={metric.label} label={metric.label} tone={metric.tone} value={metric.value} />
        ))}
      </div>

      <div className="mt-[16px] flex flex-wrap gap-[8px] text-[11.5px] text-[var(--subkit-faint)]">
        <span className="rounded-[6px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[8px] py-[4px]">
          DB tenants {dbStats.tenants}
        </span>
        <span className="rounded-[6px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[8px] py-[4px]">
          DB products {dbStats.products}
        </span>
        <span className="rounded-[6px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[8px] py-[4px]">
          DB App Users {dbStats.appUsers}
        </span>
      </div>

      <div className="mt-[16px] grid grid-cols-[1.55fr_1fr] gap-[16px] max-lg:grid-cols-1">
        <PUICard className="rounded-[14px] border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[20px] py-[18px]">
          <div className="flex items-center justify-between">
            <div className="text-[14px] font-semibold">Monthly recurring revenue</div>
            <div className="text-[12px] text-[var(--subkit-faint)]">Last 12 months</div>
          </div>
          <div className="mt-[20px] flex h-[170px] items-end gap-[8px]">
            {revenueBars.map((bar, index) => (
              <div className="flex h-full flex-1 flex-col items-center justify-end gap-[8px]" key={bar.month}>
                <div
                  className={cn(
                    'w-full rounded-t-[5px] rounded-b-[2px] transition-[height] duration-normal',
                    index === revenueBars.length - 1 ? 'bg-[var(--subkit-accent)]' : 'bg-[var(--subkit-accent-line)]',
                  )}
                  style={{ height: bar.height }}
                />
                <div className="text-[10px] text-[var(--subkit-faint)]">{bar.month}</div>
              </div>
            ))}
          </div>
        </PUICard>

        <PUICard className="rounded-[14px] border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[20px] py-[18px]">
          <div className="mb-[6px] text-[14px] font-semibold">Recent activity</div>
          {activity.map((event) => (
            <div className="flex items-center gap-[11px] border-b border-[var(--subkit-border)] py-[9px] last:border-b-0" key={`${event.type}-${event.time}`}>
              <ToneDot className="shrink-0" tone={event.dotTone} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium">{event.type}</div>
                <div className="font-mono text-[11.5px] text-[var(--subkit-faint)]">
                  {event.user} · {event.product}
                </div>
              </div>
              <div className="text-right">
                <div className={cn('font-mono text-[12.5px] font-semibold', toneTextClass(event.amountTone))}>{event.amount}</div>
                <div className="text-[11px] text-[var(--subkit-faint)]">{event.time}</div>
              </div>
            </div>
          ))}
        </PUICard>
      </div>
    </section>
  )
}
