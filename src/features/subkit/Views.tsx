import { PUICard, PUIText, cn } from '@piparo/cn-web'
import { Link } from '@tanstack/react-router'
import { Circle } from 'lucide-react'

import { appRouteParams } from './store'
import { AppAvatar, MetricCard, RowChevron, SoftTag, StatusLabel, ToneDot, ViewTitle, toneBgClass, toneTextClass } from './ui'
import type {
  ActivityEvent,
  AppTenant,
  AppUser,
  ConsoleStats,
  Entitlement,
  Metric,
  Offering,
  RevenueBar,
  SubscriptionProduct,
} from './types'

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
                  <span
                    className="rounded-[6px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[8px] py-[3px] text-[11px] font-medium text-[var(--subkit-dim)]"
                    key={platform}
                  >
                    {platform}
                  </span>
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

export function SubscriptionsView({
  onOpenSubscription,
  subscriptions,
}: {
  onOpenSubscription: (subscription: SubscriptionProduct) => void
  subscriptions: SubscriptionProduct[]
}) {
  return (
    <section className="animate-[subkit-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <ViewTitle description="Products mapped to App Store Connect. Android support comes later." title="Subscriptions" />
      <div className="mt-[20px] overflow-hidden rounded-[14px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] max-lg:overflow-x-auto">
        <div className="min-w-[940px]">
          <div className="grid grid-cols-[1.4fr_1.7fr_0.9fr_0.9fr_0.8fr] gap-[14px] border-b border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[18px] py-[12px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--subkit-faint)]">
            <div>Product</div>
            <div>App Store ID</div>
            <div>Price</div>
            <div>Entitlement</div>
            <div className="text-right">Active Users</div>
          </div>
          {subscriptions.map((subscription) => (
            <button
              className="grid w-full cursor-pointer grid-cols-[1.4fr_1.7fr_0.9fr_0.9fr_0.8fr] items-center gap-[14px] border-b border-[var(--subkit-border)] px-[18px] py-[14px] text-left last:border-b-0 hover:bg-[var(--subkit-panel-2)]"
              key={subscription.identifier}
              onClick={() => onOpenSubscription(subscription)}
              type="button"
            >
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold">{subscription.name}</div>
                <div className="font-mono text-[11.5px] text-[var(--subkit-faint)]">
                  {subscription.identifier} · {subscription.duration}
                </div>
              </div>
              <StoreId platform="iOS" value={subscription.iosId} />
              <div className="font-mono text-[13.5px] font-semibold">{subscription.price}</div>
              <div>
                <SoftTag tone="success">{subscription.entitlement}</SoftTag>
              </div>
              <div className="text-right font-mono text-[13.5px] font-semibold">{subscription.activeAppUsers}</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

export function EntitlementsView({ entitlements }: { entitlements: Entitlement[] }) {
  return (
    <section className="max-w-[980px] animate-[subkit-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <ViewTitle description="What a user unlocks. Check entitlements in your app, never product IDs." title="Entitlements" />
      <div className="mt-[20px] flex flex-col gap-[14px]">
        {entitlements.map((entitlement) => (
          <PUICard className="rounded-[14px] border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[20px] py-[18px]" key={entitlement.id}>
            <div className="flex items-center gap-[12px]">
              <div className="flex size-[40px] items-center justify-center rounded-[10px] border border-[var(--subkit-accent-line)] bg-[var(--subkit-accent-soft)]">
                <Circle aria-hidden className="size-[18px] fill-[var(--subkit-accent)] text-[var(--subkit-accent)]" />
              </div>
              <div className="flex-1">
                <div className="font-mono text-[15px] font-semibold">{entitlement.id}</div>
                <div className="mt-[2px] text-[13px] text-[var(--subkit-dim)]">{entitlement.description}</div>
              </div>
              <div className="text-[12px] text-[var(--subkit-faint)]">{entitlement.productCount}</div>
            </div>
            <div className="mt-[14px] flex flex-wrap gap-[8px] border-t border-[var(--subkit-border)] pt-[14px]">
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
    <section className="max-w-[1080px] animate-[subkit-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <ViewTitle description="The set of packages shown on a paywall. Change pricing without an app release." title="Offerings" />
      <div className="mt-[20px] flex flex-col gap-[16px]">
        {offerings.map((offering) => (
          <PUICard className="rounded-[14px] border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[20px] py-[18px]" key={offering.id}>
            <div className="mb-[16px] flex items-center gap-[10px] max-md:flex-wrap">
              <div className="text-[15px] font-semibold">{offering.name}</div>
              <span className="font-mono text-[11.5px] text-[var(--subkit-faint)]">{offering.id}</span>
              <SoftTag tone={offering.tagTone}>{offering.tag}</SoftTag>
              <div className="flex-1" />
              <span className="text-[12.5px] text-[var(--subkit-dim)]">{offering.desc}</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[12px]">
              {offering.packages.map((pkg) => (
                <div className="relative rounded-[11px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] p-[14px]" key={pkg.productId}>
                  {pkg.hasBadge ? (
                    <span className="absolute left-[12px] top-[-9px] rounded-[5px] bg-[var(--subkit-accent)] px-[7px] py-[2px] text-[10px] font-bold text-white">
                      {pkg.badge}
                    </span>
                  ) : null}
                  <div className="text-[14px] font-semibold">{pkg.label}</div>
                  <div className="mt-[8px] font-mono text-[19px] font-bold">{pkg.price}</div>
                  <div className="mt-[8px] border-t border-[var(--subkit-border)] pt-[8px] font-mono text-[11.5px] text-[var(--subkit-faint)]">
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

export function AppUsersView({ appUsers, onOpenAppUser }: { appUsers: AppUser[]; onOpenAppUser: (appUser: AppUser) => void }) {
  return (
    <section className="animate-[subkit-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <ViewTitle description="End users of this app, identified by App User ID and resolved through SubKit entitlement grants." title="App Users" />
      <div className="mt-[20px] overflow-hidden rounded-[14px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] max-lg:overflow-x-auto">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[1.5fr_1.2fr_1.25fr_1fr_1fr_0.8fr] gap-[14px] border-b border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[18px] py-[12px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--subkit-faint)]">
            <div>App User ID</div>
            <div>Country</div>
            <div>Primary Entitlement</div>
            <div>Status</div>
            <div>Source</div>
            <div className="text-right">LTV</div>
          </div>
          {appUsers.map((appUser) => (
            <button
              className="grid w-full cursor-pointer grid-cols-[1.5fr_1.2fr_1.25fr_1fr_1fr_0.8fr] items-center gap-[14px] border-b border-[var(--subkit-border)] px-[18px] py-[14px] text-left last:border-b-0 hover:bg-[var(--subkit-panel-2)]"
              key={appUser.appUserId}
              onClick={() => onOpenAppUser(appUser)}
              type="button"
            >
              <div className="truncate font-mono text-[12.5px] text-[var(--subkit-text)]">{appUser.appUserId}</div>
              <div className="flex items-center gap-[8px] text-[13px]">
                <span className="rounded-[4px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[5px] py-[1px] text-[10px] font-bold text-[var(--subkit-dim)]">
                  {appUser.countryCode}
                </span>
                {appUser.country}
              </div>
              <div>
                <SoftTag tone={appUser.primaryEntitlement === '—' ? 'muted' : 'success'}>{appUser.primaryEntitlement}</SoftTag>
              </div>
              <StatusLabel label={appUser.status} tone={appUser.statusTone} />
              <div className="text-[13px] text-[var(--subkit-dim)]">{appUser.primarySource}</div>
              <div className="text-right font-mono text-[13px] font-semibold">{appUser.ltv}</div>
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
      <div className="text-[11px] text-[var(--subkit-faint)]">{label}</div>
      <div className="mt-[2px] font-mono text-[15px] font-bold">{value}</div>
    </div>
  )
}

function StoreId({ platform, value }: { platform: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-[6px]">
      <span className="shrink-0 rounded-[4px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[5px] py-[1px] text-[9.5px] font-bold text-[var(--subkit-dim)]">
        {platform}
      </span>
      <span className="truncate font-mono text-[12px] text-[var(--subkit-dim)]">{value}</span>
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
