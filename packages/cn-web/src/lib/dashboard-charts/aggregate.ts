import { type TimeWindow, filterByWindow, previousWindow } from './time'

/**
 * Pure, deterministic aggregation — the "compute the chart data on the way in, never in render"
 * layer of the capability. Given the windowed rows it produces KPI summaries (with period-over-period
 * deltas), time-series points (bucketed by day/week/month), and categorical distributions. No I/O,
 * no `Date.now()`, no floating order dependence — the same rows + window always yield the same output.
 */

export type Reducer<T> = (rows: readonly T[]) => number

/** Built-in reducers so a host needn't hand-roll the common cases. */
export const reducers = {
  count:
    <T>() =>
    (rows: readonly T[]) =>
      rows.length,
  sum:
    <T>(value: (row: T) => number) =>
    (rows: readonly T[]) =>
      rows.reduce((acc, row) => acc + value(row), 0),
  average:
    <T>(value: (row: T) => number) =>
    (rows: readonly T[]) =>
      rows.length === 0 ? 0 : rows.reduce((acc, row) => acc + value(row), 0) / rows.length,
  max:
    <T>(value: (row: T) => number) =>
    (rows: readonly T[]) =>
      rows.reduce((acc, row) => Math.max(acc, value(row)), Number.NEGATIVE_INFINITY),
} as const

export type Trend = 'up' | 'down' | 'flat'

export type KpiResult = {
  value: number
  /** The same reducer over the immediately preceding period; `null` when there is no prior window. */
  previous: number | null
  /** Absolute change vs the previous period; `null` when there is no prior window. */
  delta: number | null
  /** Relative change in [-1, ∞); `null` when undefined (no prior window or prior value 0). */
  deltaRatio: number | null
  trend: Trend
}

function trendOf(delta: number | null): Trend {
  if (delta === null || delta === 0) return 'flat'
  return delta > 0 ? 'up' : 'down'
}

/**
 * A single KPI over the current window, with a delta vs the immediately preceding period. `higherIsBetter`
 * only annotates the result for the Shell's coloring — the numbers are direction-agnostic.
 */
export function computeKpi<T>(
  rows: readonly T[],
  at: (row: T) => number,
  window: TimeWindow,
  reduce: Reducer<T>,
): KpiResult {
  const current = reduce(filterByWindow(rows, at, window))
  const prevWindow = previousWindow(window)
  const previous = prevWindow ? reduce(filterByWindow(rows, at, prevWindow)) : null
  const delta = previous === null ? null : current - previous
  const deltaRatio = previous === null || previous === 0 ? null : (current - previous) / previous
  return { value: current, previous, delta, deltaRatio, trend: trendOf(delta) }
}

export type Bucket = 'day' | 'week' | 'month'

const DAY_MS = 24 * 60 * 60 * 1000

/** Floor an epoch-millis timestamp to the start (UTC) of its bucket. */
export function bucketStart(at: number, bucket: Bucket): number {
  const date = new Date(at)
  switch (bucket) {
    case 'day':
      return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    case 'week': {
      const dayStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
      const isoDow = (date.getUTCDay() + 6) % 7 // Monday = 0
      return dayStart - isoDow * DAY_MS
    }
    case 'month':
      return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
  }
}

export type SeriesPoint = { t: number; value: number }

/**
 * A time series: rows windowed, grouped into `bucket`s, reduced per bucket, and returned in ascending
 * time order. Buckets with no rows are omitted (the Shell connects the dots); pass `fill` to emit a
 * zero point for empty buckets when a continuous axis is needed.
 */
export function computeSeries<T>(
  rows: readonly T[],
  at: (row: T) => number,
  window: TimeWindow,
  bucket: Bucket,
  reduce: Reducer<T>,
): SeriesPoint[] {
  const windowed = filterByWindow(rows, at, window)
  const groups = new Map<number, T[]>()
  for (const row of windowed) {
    const key = bucketStart(at(row), bucket)
    const existing = groups.get(key)
    if (existing) existing.push(row)
    else groups.set(key, [row])
  }
  return [...groups.entries()]
    .map(([t, group]) => ({ t, value: reduce(group) }))
    .sort((a, b) => a.t - b.t)
}

export type DistributionSlice = { key: string; value: number; share: number }

/**
 * A categorical distribution (pie/bar): rows windowed, grouped by `category`, reduced per group, and
 * returned sorted by value descending with each slice's share of the total. Stable secondary sort by
 * key keeps ties deterministic.
 */
export function computeDistribution<T>(
  rows: readonly T[],
  at: (row: T) => number,
  window: TimeWindow,
  category: (row: T) => string,
  reduce: Reducer<T>,
): DistributionSlice[] {
  const windowed = filterByWindow(rows, at, window)
  const groups = new Map<string, T[]>()
  for (const row of windowed) {
    const key = category(row)
    const existing = groups.get(key)
    if (existing) existing.push(row)
    else groups.set(key, [row])
  }
  const entries = [...groups.entries()].map(([key, group]) => ({ key, value: reduce(group) }))
  const total = entries.reduce((acc, entry) => acc + entry.value, 0)
  return entries
    .map((entry) => ({ ...entry, share: total === 0 ? 0 : entry.value / total }))
    .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key))
}
