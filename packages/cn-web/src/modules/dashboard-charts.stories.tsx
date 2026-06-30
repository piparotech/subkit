import { useMemo, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'

import { PUIBadge, PUISegmentedControl, PUIText } from '@/components/ui'
import {
  type Bucket,
  type DistributionSlice,
  type KpiResult,
  type SeriesPoint,
  type TimeRangeKey,
  type ValueMode,
  computeDistribution,
  computeKpi,
  computeSeries,
  formatDeltaRatio,
  reducers,
  resolveCardStatus,
  resolveTimeWindow,
} from '@/lib/dashboard-charts'

import { CHANNEL_LABELS, DEMO_NOW, type DemoOrder, seedDemoOrders } from './mock-dashboard-charts'

const RANGES = ['7d', '30d', '90d', '1y', 'all'] as const satisfies TimeRangeKey[]
const RANGE_LABELS: Record<(typeof RANGES)[number], string> = {
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
  '1y': '1 year',
  all: 'All time',
}

const at = (order: DemoOrder) => order.at
const revenue = reducers.sum<DemoOrder>((order) => order.amount)
const count = reducers.count<DemoOrder>()

/** Wider ranges aggregate into coarser buckets so the bar series stays readable. */
function bucketFor(range: TimeRangeKey): Bucket {
  if (range === '7d' || range === '30d') return 'day'
  if (range === '90d') return 'week'
  return 'month'
}

function formatBucketLabel(t: number, bucket: Bucket): string {
  const date = new Date(t)
  const opts: Intl.DateTimeFormatOptions =
    bucket === 'month'
      ? { month: 'short', year: '2-digit', timeZone: 'UTC' }
      : { day: '2-digit', month: '2-digit', timeZone: 'UTC' }
  return date.toLocaleDateString('en-GB', opts)
}

function formatEur(value: number): string {
  return `${Math.round(value).toLocaleString('en-US')} €`
}

function formatCount(value: number): string {
  return Math.round(value).toLocaleString('en-US')
}

const trendIcon = { up: TrendingUp, down: TrendingDown, flat: Minus } as const

/** A single headline number with its period-over-period delta (AC: KPIs with deltas). */
function KpiCard({
  label,
  kpi,
  format,
}: {
  label: string
  kpi: KpiResult
  format: (value: number) => string
}) {
  const Icon = trendIcon[kpi.trend]
  const tone =
    kpi.trend === 'up'
      ? 'text-success'
      : kpi.trend === 'down'
        ? 'text-destructive'
        : 'text-muted-foreground'
  return (
    <div className="bg-card border-border flex flex-col gap-2 rounded-xl border p-5">
      <PUIText tone="muted" variant="footnote">
        {label}
      </PUIText>
      <PUIText as="p" className="tracking-tight tabular-nums" variant="title1">
        {format(kpi.value)}
      </PUIText>
      <div className={`flex items-center gap-1.5 ${tone}`}>
        <Icon aria-hidden className="size-3.5" />
        <PUIText className={`tabular-nums ${tone}`} variant="caption1">
          {formatDeltaRatio(kpi.deltaRatio)}
        </PUIText>
        <PUIText tone="subtle" variant="caption1">
          vs previous period
        </PUIText>
      </div>
    </div>
  )
}

/** Revenue over time as a bar series. Empty windows render a real empty state, never a blank chart. */
function SeriesCard({ points, bucket }: { points: SeriesPoint[]; bucket: Bucket }) {
  const status = resolveCardStatus({ empty: points.length === 0 })
  const max = points.reduce((acc, point) => Math.max(acc, point.value), 0)
  return (
    <section className="bg-card border-border flex flex-col gap-4 rounded-xl border p-5">
      <div className="flex items-baseline justify-between gap-3">
        <PUIText as="h3" className="tracking-tight" variant="headline">
          Revenue over time
        </PUIText>
        <PUIText tone="subtle" variant="caption2">
          per {bucket}
        </PUIText>
      </div>
      {status === 'empty' ? (
        <PUIText tone="muted" variant="footnote">
          No orders in this period.
        </PUIText>
      ) : (
        <div aria-hidden className="flex h-40 items-end gap-1">
          {points.map((point) => (
            <div
              className="bg-primary/80 hover:bg-primary min-h-0.5 flex-1 rounded-t-sm transition-[height] duration-300 ease-out motion-reduce:transition-none"
              key={point.t}
              style={{ height: `${max === 0 ? 0 : (point.value / max) * 100}%` }}
              title={`${formatBucketLabel(point.t, bucket)}: ${formatEur(point.value)}`}
            />
          ))}
        </div>
      )}
      {status !== 'empty' && points.length > 0 ? (
        <div className="flex justify-between">
          <PUIText tone="subtle" variant="caption2">
            {formatBucketLabel(points[0]!.t, bucket)}
          </PUIText>
          <PUIText tone="subtle" variant="caption2">
            {formatBucketLabel(points[points.length - 1]!.t, bucket)}
          </PUIText>
        </div>
      ) : null}
    </section>
  )
}

/** Revenue split by channel, with the percent/amount toggle (AC: dual-unit switchable). */
function DistributionCard({
  slices,
  valueMode,
}: {
  slices: DistributionSlice[]
  valueMode: ValueMode
}) {
  const status = resolveCardStatus({ empty: slices.length === 0 })
  return (
    <section className="bg-card border-border flex flex-col gap-4 rounded-xl border p-5">
      <PUIText as="h3" className="tracking-tight" variant="headline">
        Revenue by channel
      </PUIText>
      {status === 'empty' ? (
        <PUIText tone="muted" variant="footnote">
          No orders in this period.
        </PUIText>
      ) : (
        <ul className="flex flex-col gap-3">
          {slices.map((slice) => (
            <li className="flex flex-col gap-1.5" key={slice.key}>
              <div className="flex items-baseline justify-between gap-3">
                <PUIText variant="footnote">
                  {CHANNEL_LABELS[slice.key as DemoOrder['channel']] ?? slice.key}
                </PUIText>
                <PUIText className="tabular-nums" tone="muted" variant="footnote">
                  {valueMode === 'percent'
                    ? `${(slice.share * 100).toFixed(1)}%`
                    : formatEur(slice.value)}
                </PUIText>
              </div>
              <div className="bg-muted h-2 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none"
                  style={{ width: `${slice.share * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function DashboardChartsDemo() {
  const orders = useMemo(() => seedDemoOrders(), [])
  const [range, setRange] = useState<TimeRangeKey>('30d')
  const [valueMode, setValueMode] = useState<ValueMode>('amount')

  // One window drives every card, so changing the range updates them all consistently.
  const view = useMemo(() => {
    const window = resolveTimeWindow(range, DEMO_NOW)
    const bucket = bucketFor(range)
    return {
      bucket,
      revenueKpi: computeKpi(orders, at, window, revenue),
      ordersKpi: computeKpi(orders, at, window, count),
      series: computeSeries(orders, at, window, bucket, revenue),
      byChannel: computeDistribution(orders, at, window, (order) => order.channel, revenue),
    }
  }, [orders, range])

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <PUIText as="h2" className="tracking-tight" variant="title3">
          Revenue dashboard
        </PUIText>
        <PUIText className="max-w-prose" tone="muted" variant="subheadline">
          A deterministic order log is aggregated on the way in by the vendored Engine. Pick a
          period to re-window every card at once, and switch the channel split between amount and
          share.
        </PUIText>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <PUIText as="label" className="font-medium" variant="caption1">
            Period
          </PUIText>
          <PUISegmentedControl
            onValueChange={(value) => setRange(value as TimeRangeKey)}
            options={RANGES.map((key) => ({ value: key, label: RANGE_LABELS[key] }))}
            value={range}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <PUIText as="label" className="font-medium" variant="caption1">
            Channel split
          </PUIText>
          <PUISegmentedControl
            onValueChange={(value) => setValueMode(value as ValueMode)}
            options={[
              { value: 'amount', label: 'Amount' },
              { value: 'percent', label: 'Share' },
            ]}
            value={valueMode}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard format={formatEur} kpi={view.revenueKpi} label="Revenue" />
        <KpiCard format={formatCount} kpi={view.ordersKpi} label="Orders" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <SeriesCard bucket={view.bucket} points={view.series} />
        <DistributionCard slices={view.byChannel} valueMode={valueMode} />
      </div>

      <PUIBadge variant="outline">
        Fixed clock: {new Date(DEMO_NOW).toLocaleDateString('en-GB', { timeZone: 'UTC' })}
      </PUIBadge>
    </div>
  )
}

const meta = {
  title: 'Modules/Dashboards & Charts',
  component: DashboardChartsDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Make data visually explorable in an interactive card dashboard with period and filter control, on the isomorphic dashboard-charts Engine that aggregates KPIs, series and distributions on the way in. In-memory demo: a deterministic 400-day order log against a fixed clock is seeded, so every render is identical. Switch the period to re-window all cards at once, watch the period-over-period KPI deltas, and toggle the channel split between absolute amount and share. Windows with no rows show a real empty state rather than a blank chart.',
      },
    },
  },
} satisfies Meta<typeof DashboardChartsDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
