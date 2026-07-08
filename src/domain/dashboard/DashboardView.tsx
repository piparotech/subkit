import { ActionButton } from '~/components/ui/ActionButton'
import { EmptySettingsText } from '~/components/ui/EmptySettingsText'
import { MetricCard } from '~/components/ui/MetricCard'
import { ToneDot } from '~/components/ui/ToneDot'
import { toneTextClass } from '~/components/ui/toneClasses'
import { AppAvatar } from '~/domain/apps/AppAvatar'
import type { AppTenant } from '~/domain/apps/types'
import type {
  ActivityEvent,
  ConsoleRuntimeConfig,
  Metric,
  RevenueBar,
} from '~/domain/dashboard/types'

import { PUICard, PUIText, cn } from '@piparo/cn-web'

export function DashboardView({
  activity,
  app,
  metrics,
  revenueBars,
  runtime,
}: {
  activity: ActivityEvent[]
  app: AppTenant
  metrics: Metric[]
  revenueBars: RevenueBar[]
  runtime: ConsoleRuntimeConfig
}) {
  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(runtime.appleServerNotificationsUrl).catch((error: unknown) => {
      console.error('Failed to copy Apple Server Notifications URL', error)
    })
  }

  return (
    <section className="max-w-[1180px] animate-[subkit-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <div className="mb-[22px] flex items-center gap-[14px]">
        <AppAvatar app={app} size="lg" />
        <div>
          <PUIText
            as="h1"
            className="m-0 text-[22px] font-bold tracking-[-0.01em]"
            variant="title2"
          >
            {app.name}
          </PUIText>
          <div className="mt-[2px] font-mono text-[12.5px] text-[var(--subkit-faint)]">
            {app.bundle}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-[14px] max-lg:grid-cols-2 max-sm:grid-cols-1">
        {metrics.map((metric) => (
          <MetricCard
            delta={metric.delta}
            key={metric.label}
            label={metric.label}
            tone={metric.tone}
            value={metric.value}
          />
        ))}
      </div>

      <PUICard className="mt-[16px] rounded-[14px] border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[20px] py-[18px]">
        <div className="flex flex-wrap items-start justify-between gap-[12px]">
          <div>
            <div className="text-[14px] font-semibold">App Store Connect setup</div>
            <div className="mt-[3px] text-[12.5px] leading-[1.45] text-[var(--subkit-faint)]">
              Configure these Apple settings for{' '}
              <span className="font-semibold text-[var(--subkit-dim)]">{app.name}</span>. Webhook
              URLs point to the deployed SubKit backend at{' '}
              <span className="font-mono text-[var(--subkit-dim)]">{runtime.publicOrigin}</span>,
              not to the mobile app.
            </div>
          </div>
          <span className="rounded-[999px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[9px] py-[4px] font-mono text-[11px] text-[var(--subkit-faint)]">
            {app.bundle}
          </span>
        </div>

        <div className="mt-[16px] grid grid-cols-[1fr_1fr] gap-[12px] max-md:grid-cols-1">
          <div className="rounded-[11px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[13px] py-[12px]">
            <div className="flex items-center justify-between gap-[10px]">
              <div className="text-[12.5px] font-semibold">Apple Server Notifications V2</div>
              <ActionButton disabled={false} label="Copy URL" onPress={copyWebhookUrl} />
            </div>
            <div className="mt-[8px] space-y-[7px] text-[12px] leading-[1.45] text-[var(--subkit-faint)]">
              <div>
                <span className="text-[var(--subkit-dim)]">Production Server URL</span>
                <div className="mt-[2px] overflow-x-auto rounded-[7px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[8px] py-[6px] font-mono text-[11.5px] text-[var(--subkit-text)]">
                  {runtime.appleServerNotificationsUrl}
                </div>
              </div>
              <div>
                <span className="text-[var(--subkit-dim)]">Sandbox Server URL</span>
                <div className="mt-[2px] overflow-x-auto rounded-[7px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[8px] py-[6px] font-mono text-[11.5px] text-[var(--subkit-text)]">
                  {runtime.appleServerNotificationsUrl}
                </div>
              </div>
              <div>
                Path in Apple: App Store Connect → My Apps → {app.name} → App Information → App
                Store Server Notifications.
              </div>
            </div>
          </div>

          <div className="rounded-[11px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[13px] py-[12px]">
            <div className="text-[12.5px] font-semibold">API and product prerequisites</div>
            <ul className="mt-[8px] space-y-[6px] pl-[16px] text-[12px] leading-[1.45] text-[var(--subkit-faint)]">
              <li>Use the bundle ID shown above for the App Store Connect app mapping.</li>
              <li>
                Create an App Store Connect API key with read access for catalogue, reports,
                reviews, builds, and app metadata.
              </li>
              <li>
                Store Issuer ID, Key ID, private key, Apple app ID, and vendor number in Workspace
                Settings.
              </li>
              <li>
                Make subscription product IDs match the Store IDs configured in SubKit products.
              </li>
            </ul>
          </div>
        </div>
      </PUICard>

      <div className="mt-[16px] grid grid-cols-[1.55fr_1fr] gap-[16px] max-lg:grid-cols-1">
        <PUICard className="rounded-[14px] border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[20px] py-[18px]">
          <div className="flex items-center justify-between">
            <div className="text-[14px] font-semibold">Monthly recurring revenue</div>
            <div className="text-[12px] text-[var(--subkit-faint)]">Last 12 months</div>
          </div>
          {revenueBars.length === 0 ? (
            <div className="mt-[16px]">
              <EmptySettingsText>
                No revenue events yet. Revenue bars appear after Sales Report or purchase imports
                create monthly totals.
              </EmptySettingsText>
            </div>
          ) : (
            <div className="mt-[20px] flex h-[190px] items-end gap-[8px]">
              {revenueBars.map((bar, index) => (
                <div
                  className="flex h-full flex-1 flex-col items-center justify-end gap-[8px]"
                  key={bar.month}
                >
                  <div className="font-mono text-[10.5px] font-semibold text-[var(--subkit-dim)]">
                    {bar.value}
                  </div>
                  <div
                    aria-label={`${bar.month}: ${bar.value}`}
                    className={cn(
                      'duration-normal w-full rounded-t-[5px] rounded-b-[2px] transition-[height]',
                      index === revenueBars.length - 1
                        ? 'bg-[var(--subkit-accent)]'
                        : 'bg-[var(--subkit-accent-line)]',
                    )}
                    role="img"
                    style={{ height: bar.height }}
                    title={`${bar.month}: ${bar.value}`}
                  />
                  <div className="text-[10px] text-[var(--subkit-faint)]">{bar.month}</div>
                </div>
              ))}
            </div>
          )}
        </PUICard>

        <PUICard className="rounded-[14px] border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[20px] py-[18px]">
          <div className="mb-[6px] text-[14px] font-semibold">Recent activity</div>
          {activity.map((event) => (
            <div
              className="flex items-center gap-[11px] border-b border-[var(--subkit-border)] py-[9px] last:border-b-0"
              key={`${event.type}-${event.time}`}
            >
              <ToneDot className="shrink-0" tone={event.dotTone} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium">{event.type}</div>
                <div className="font-mono text-[11.5px] text-[var(--subkit-faint)]">
                  {event.user} · {event.product}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={cn(
                    'font-mono text-[12.5px] font-semibold',
                    toneTextClass(event.amountTone),
                  )}
                >
                  {event.amount}
                </div>
                <div className="text-[11px] text-[var(--subkit-faint)]">{event.time}</div>
              </div>
            </div>
          ))}
        </PUICard>
      </div>
    </section>
  )
}
