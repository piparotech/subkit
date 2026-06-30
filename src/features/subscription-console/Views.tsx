import { PUICard, PUIText, cn } from '@piparo/cn-web'
import { Circle } from 'lucide-react'

import { AppAvatar, MetricCard, RowChevron, SoftTag, StatusLabel, ToneDot, ViewTitle, toneBgClass, toneTextClass } from './ui'
import type {
  ActivityEvent,
  AppTenant,
  ConsoleStats,
  Entitlement,
  Metric,
  Offering,
  RevenueBar,
  Subscriber,
  SubscriptionProduct,
} from './types'

export function AppsView({ apps, onSelectApp }: { apps: AppTenant[]; onSelectApp: (id: string) => void }) {
  return (
    <section className="animate-[subs-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <div className="max-w-[1200px]">
        <div className="mb-[6px] flex items-end justify-between">
          <div>
            <PUIText as="h1" className="m-0 text-[23px] font-bold tracking-[-0.01em]" variant="title2">
              Apps
            </PUIText>
            <p className="mt-[5px] mb-0 text-[13.5px] text-[var(--subs-dim)]">
              Every app in your workspace. Manage iOS & Android subscriptions from one place.
            </p>
          </div>
        </div>

        <div className="my-[22px] mb-[24px] flex gap-[14px] max-md:flex-col">
          <MetricCard label="Total MRR" value={sumCurrency(apps.map((app) => app.mrr))} />
          <MetricCard label="Active subscribers" value={sumNumberText(apps.map((app) => app.activeSubs))} />
          <MetricCard label="Apps" value={String(apps.length)} />
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-[16px]">
          {apps.map((app) => (
            <button
              className="cursor-pointer rounded-[14px] border border-[var(--subs-border)] bg-[var(--subs-panel)] p-[18px] text-left transition-[box-shadow,border-color,transform] duration-fast hover:-translate-y-[2px] hover:border-[var(--subs-border-2)] hover:shadow-[0_10px_28px_-12px_rgba(30,30,70,0.22)] motion-reduce:transform-none"
              key={app.id}
              onClick={() => onSelectApp(app.id)}
              type="button"
            >
              <div className="flex items-center gap-[12px]">
                <AppAvatar app={app} />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold">{app.name}</div>
                  <div className="truncate font-mono text-[12px] text-[var(--subs-faint)]">{app.bundle}</div>
                </div>
                <StatusLabel label={app.status} tone={app.statusTone} />
              </div>
              <div className="my-[14px] flex gap-[6px]">
                {app.platforms.map((platform) => (
                  <span
                    className="rounded-[6px] border border-[var(--subs-border)] bg-[var(--subs-panel-2)] px-[8px] py-[3px] text-[11px] font-medium text-[var(--subs-dim)]"
                    key={platform}
                  >
                    {platform}
                  </span>
                ))}
              </div>
              <div className="flex border-t border-[var(--subs-border)] pt-[13px]">
                <AppCardMetric label="MRR" value={app.mrr} />
                <AppCardMetric label="Active subs" value={app.activeSubs} />
                <div className="flex items-center text-[var(--subs-faint)]">
                  <RowChevron />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

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
    <section className="max-w-[1180px] animate-[subs-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <div className="mb-[22px] flex items-center gap-[14px]">
        <AppAvatar app={app} size="lg" />
        <div>
          <PUIText as="h1" className="m-0 text-[22px] font-bold tracking-[-0.01em]" variant="title2">
            {app.name}
          </PUIText>
          <div className="mt-[2px] font-mono text-[12.5px] text-[var(--subs-faint)]">{app.bundle}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-[14px] max-lg:grid-cols-2 max-sm:grid-cols-1">
        {metrics.map((metric) => (
          <MetricCard delta={metric.delta} key={metric.label} label={metric.label} tone={metric.tone} value={metric.value} />
        ))}
      </div>

      <div className="mt-[16px] flex flex-wrap gap-[8px] text-[11.5px] text-[var(--subs-faint)]">
        <span className="rounded-[6px] border border-[var(--subs-border)] bg-[var(--subs-panel)] px-[8px] py-[4px]">
          DB tenants {dbStats.tenants}
        </span>
        <span className="rounded-[6px] border border-[var(--subs-border)] bg-[var(--subs-panel)] px-[8px] py-[4px]">
          DB products {dbStats.products}
        </span>
        <span className="rounded-[6px] border border-[var(--subs-border)] bg-[var(--subs-panel)] px-[8px] py-[4px]">
          DB subscribers {dbStats.subscribers}
        </span>
      </div>

      <div className="mt-[16px] grid grid-cols-[1.55fr_1fr] gap-[16px] max-lg:grid-cols-1">
        <PUICard className="rounded-[14px] border-[var(--subs-border)] bg-[var(--subs-panel)] px-[20px] py-[18px]">
          <div className="flex items-center justify-between">
            <div className="text-[14px] font-semibold">Monthly recurring revenue</div>
            <div className="text-[12px] text-[var(--subs-faint)]">Last 12 months</div>
          </div>
          <div className="mt-[20px] flex h-[170px] items-end gap-[8px]">
            {revenueBars.map((bar, index) => (
              <div className="flex h-full flex-1 flex-col items-center justify-end gap-[8px]" key={bar.month}>
                <div
                  className={cn(
                    'w-full rounded-t-[5px] rounded-b-[2px] transition-[height] duration-normal',
                    index === revenueBars.length - 1 ? 'bg-[var(--subs-accent)]' : 'bg-[var(--subs-accent-line)]',
                  )}
                  style={{ height: bar.height }}
                />
                <div className="text-[10px] text-[var(--subs-faint)]">{bar.month}</div>
              </div>
            ))}
          </div>
        </PUICard>

        <PUICard className="rounded-[14px] border-[var(--subs-border)] bg-[var(--subs-panel)] px-[20px] py-[18px]">
          <div className="mb-[6px] text-[14px] font-semibold">Recent activity</div>
          {activity.map((event) => (
            <div className="flex items-center gap-[11px] border-b border-[var(--subs-border)] py-[9px] last:border-b-0" key={`${event.type}-${event.time}`}>
              <ToneDot className="shrink-0" tone={event.dotTone} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium">{event.type}</div>
                <div className="font-mono text-[11.5px] text-[var(--subs-faint)]">
                  {event.user} · {event.product}
                </div>
              </div>
              <div className="text-right">
                <div className={cn('font-mono text-[12.5px] font-semibold', toneTextClass(event.amountTone))}>{event.amount}</div>
                <div className="text-[11px] text-[var(--subs-faint)]">{event.time}</div>
              </div>
            </div>
          ))}
        </PUICard>
      </div>
    </section>
  )
}

export function SubscriptionsView({
  onOpenSubscription,
  subscriptions,
}: {
  onOpenSubscription: (subscription: SubscriptionProduct) => void
  subscriptions: SubscriptionProduct[]
}) {
  return (
    <section className="animate-[subs-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <ViewTitle description="Products mapped across stores. One identifier, both platforms." title="Subscriptions" />
      <div className="mt-[20px] overflow-hidden rounded-[14px] border border-[var(--subs-border)] bg-[var(--subs-panel)] max-lg:overflow-x-auto">
        <div className="min-w-[940px]">
          <div className="grid grid-cols-[1.4fr_1.5fr_1.5fr_0.9fr_0.8fr_0.8fr] gap-[14px] border-b border-[var(--subs-border)] bg-[var(--subs-panel-2)] px-[18px] py-[12px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--subs-faint)]">
            <div>Product</div>
            <div>App Store ID</div>
            <div>Play Store ID</div>
            <div>Price</div>
            <div>Entitlement</div>
            <div className="text-right">Active</div>
          </div>
          {subscriptions.map((subscription) => (
            <button
              className="grid w-full cursor-pointer grid-cols-[1.4fr_1.5fr_1.5fr_0.9fr_0.8fr_0.8fr] items-center gap-[14px] border-b border-[var(--subs-border)] px-[18px] py-[14px] text-left last:border-b-0 hover:bg-[var(--subs-panel-2)]"
              key={subscription.identifier}
              onClick={() => onOpenSubscription(subscription)}
              type="button"
            >
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold">{subscription.name}</div>
                <div className="font-mono text-[11.5px] text-[var(--subs-faint)]">
                  {subscription.identifier} · {subscription.duration}
                </div>
              </div>
              <StoreId platform="iOS" value={subscription.iosId} />
              <StoreId platform="AND" value={subscription.androidId} />
              <div className="font-mono text-[13.5px] font-semibold">{subscription.price}</div>
              <div>
                <SoftTag tone="success">{subscription.entitlement}</SoftTag>
              </div>
              <div className="text-right font-mono text-[13.5px] font-semibold">{subscription.activeSubs}</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

export function EntitlementsView({ entitlements }: { entitlements: Entitlement[] }) {
  return (
    <section className="max-w-[980px] animate-[subs-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <ViewTitle description="What a user unlocks. Check entitlements in your app, never product IDs." title="Entitlements" />
      <div className="mt-[20px] flex flex-col gap-[14px]">
        {entitlements.map((entitlement) => (
          <PUICard className="rounded-[14px] border-[var(--subs-border)] bg-[var(--subs-panel)] px-[20px] py-[18px]" key={entitlement.id}>
            <div className="flex items-center gap-[12px]">
              <div className="flex size-[40px] items-center justify-center rounded-[10px] border border-[var(--subs-accent-line)] bg-[var(--subs-accent-soft)]">
                <Circle aria-hidden className="size-[18px] fill-[var(--subs-accent)] text-[var(--subs-accent)]" />
              </div>
              <div className="flex-1">
                <div className="font-mono text-[15px] font-semibold">{entitlement.id}</div>
                <div className="mt-[2px] text-[13px] text-[var(--subs-dim)]">{entitlement.description}</div>
              </div>
              <div className="text-[12px] text-[var(--subs-faint)]">{entitlement.productCount}</div>
            </div>
            <div className="mt-[14px] flex flex-wrap gap-[8px] border-t border-[var(--subs-border)] pt-[14px]">
              {entitlement.products.map((product) => (
                <SoftTag key={product}>{product}</SoftTag>
              ))}
            </div>
          </PUICard>
        ))}
      </div>
    </section>
  )
}

export function OfferingsView({ offerings }: { offerings: Offering[] }) {
  return (
    <section className="max-w-[1080px] animate-[subs-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <ViewTitle description="The set of packages shown on a paywall. Change pricing without an app release." title="Offerings" />
      <div className="mt-[20px] flex flex-col gap-[16px]">
        {offerings.map((offering) => (
          <PUICard className="rounded-[14px] border-[var(--subs-border)] bg-[var(--subs-panel)] px-[20px] py-[18px]" key={offering.id}>
            <div className="mb-[16px] flex items-center gap-[10px] max-md:flex-wrap">
              <div className="text-[15px] font-semibold">{offering.name}</div>
              <span className="font-mono text-[11.5px] text-[var(--subs-faint)]">{offering.id}</span>
              <SoftTag tone={offering.tagTone}>{offering.tag}</SoftTag>
              <div className="flex-1" />
              <span className="text-[12.5px] text-[var(--subs-dim)]">{offering.desc}</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[12px]">
              {offering.packages.map((pkg) => (
                <div className="relative rounded-[11px] border border-[var(--subs-border)] bg-[var(--subs-panel)] p-[14px]" key={pkg.productId}>
                  {pkg.hasBadge ? (
                    <span className="absolute left-[12px] top-[-9px] rounded-[5px] bg-[var(--subs-accent)] px-[7px] py-[2px] text-[10px] font-bold text-white">
                      {pkg.badge}
                    </span>
                  ) : null}
                  <div className="text-[14px] font-semibold">{pkg.label}</div>
                  <div className="mt-[8px] font-mono text-[19px] font-bold">{pkg.price}</div>
                  <div className="mt-[8px] border-t border-[var(--subs-border)] pt-[8px] font-mono text-[11.5px] text-[var(--subs-faint)]">
                    {pkg.productId}
                  </div>
                </div>
              ))}
            </div>
          </PUICard>
        ))}
      </div>
    </section>
  )
}

export function SubscribersView({ onOpenSubscriber, subscribers }: { onOpenSubscriber: (subscriber: Subscriber) => void; subscribers: Subscriber[] }) {
  return (
    <section className="animate-[subs-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <ViewTitle description="Identified by App User ID. Same identity across iOS and Android." title="Subscribers" />
      <div className="mt-[20px] overflow-hidden rounded-[14px] border border-[var(--subs-border)] bg-[var(--subs-panel)] max-lg:overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[1.5fr_1.3fr_1.2fr_1fr_0.9fr_0.8fr] gap-[14px] border-b border-[var(--subs-border)] bg-[var(--subs-panel-2)] px-[18px] py-[12px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--subs-faint)]">
            <div>App User ID</div>
            <div>Country</div>
            <div>Plan</div>
            <div>Status</div>
            <div>Since</div>
            <div className="text-right">LTV</div>
          </div>
          {subscribers.map((subscriber) => (
            <button
              className="grid w-full cursor-pointer grid-cols-[1.5fr_1.3fr_1.2fr_1fr_0.9fr_0.8fr] items-center gap-[14px] border-b border-[var(--subs-border)] px-[18px] py-[14px] text-left last:border-b-0 hover:bg-[var(--subs-panel-2)]"
              key={subscriber.userId}
              onClick={() => onOpenSubscriber(subscriber)}
              type="button"
            >
              <div className="truncate font-mono text-[12.5px] text-[var(--subs-text)]">{subscriber.userId}</div>
              <div className="flex items-center gap-[8px] text-[13px]">
                <span className="rounded-[4px] border border-[var(--subs-border)] bg-[var(--subs-panel-2)] px-[5px] py-[1px] text-[10px] font-bold text-[var(--subs-dim)]">
                  {subscriber.countryCode}
                </span>
                {subscriber.country}
              </div>
              <div className="text-[13px]">{subscriber.plan}</div>
              <StatusLabel label={subscriber.status} tone={subscriber.statusTone} />
              <div className="text-[13px] text-[var(--subs-dim)]">{subscriber.since}</div>
              <div className="text-right font-mono text-[13px] font-semibold">{subscriber.ltv}</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function AppCardMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1">
      <div className="text-[11px] text-[var(--subs-faint)]">{label}</div>
      <div className="mt-[2px] font-mono text-[15px] font-bold">{value}</div>
    </div>
  )
}

function StoreId({ platform, value }: { platform: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-[6px]">
      <span className="shrink-0 rounded-[4px] border border-[var(--subs-border)] bg-[var(--subs-panel-2)] px-[5px] py-[1px] text-[9.5px] font-bold text-[var(--subs-dim)]">
        {platform}
      </span>
      <span className="truncate font-mono text-[12px] text-[var(--subs-dim)]">{value}</span>
    </div>
  )
}

function sumCurrency(values: readonly string[]): string {
  const total = values.reduce((sum, value) => sum + Number(value.replace(/[^0-9.-]/g, '')), 0)
  return new Intl.NumberFormat('en-US', { currency: 'USD', maximumFractionDigits: 0, style: 'currency' }).format(total)
}

function sumNumberText(values: readonly string[]): string {
  const total = values.reduce((sum, value) => sum + Number(value.replace(/[^0-9.-]/g, '')), 0)
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(total)
}

export { toneBgClass }
