import type { TimeRangeKey } from './config'

/**
 * Deterministic time-range resolution and row windowing. All math is relative to an explicit `now`
 * (the caller passes it — never `Date.now()` inside the Engine), so the same inputs always produce
 * the same buckets and the unit tests are reproducible.
 */

const DAY_MS = 24 * 60 * 60 * 1000

/** A half-open window `[from, to)` in epoch millis; `from === null` means unbounded (the `all` range). */
export type TimeWindow = { from: number | null; to: number }

/** The duration of a window, used to derive the immediately preceding period for delta comparisons. */
function spanMs(window: TimeWindow): number | null {
  return window.from === null ? null : window.to - window.from
}

/** Resolve a range preset to a concrete window ending at `now`. */
export function resolveTimeWindow(range: TimeRangeKey, now: number): TimeWindow {
  switch (range) {
    case '7d':
      return { from: now - 7 * DAY_MS, to: now }
    case '30d':
      return { from: now - 30 * DAY_MS, to: now }
    case '90d':
      return { from: now - 90 * DAY_MS, to: now }
    case '6m':
      return { from: now - 182 * DAY_MS, to: now }
    case '1y':
      return { from: now - 365 * DAY_MS, to: now }
    case 'ytd': {
      const start = Date.UTC(new Date(now).getUTCFullYear(), 0, 1)
      return { from: start, to: now }
    }
    case 'all':
      return { from: null, to: now }
  }
}

/** The period immediately before `window` (same length), for period-over-period deltas. `null` for `all`. */
export function previousWindow(window: TimeWindow): TimeWindow | null {
  const span = spanMs(window)
  if (span === null || window.from === null) return null
  return { from: window.from - span, to: window.from }
}

/** True when `at` (epoch millis) falls inside the half-open window `[from, to)`. */
export function withinWindow(at: number, window: TimeWindow): boolean {
  if (at >= window.to) return false
  return window.from === null || at >= window.from
}

/** Keep only the rows whose timestamp falls inside `window` (preserving input order). */
export function filterByWindow<T>(
  rows: readonly T[],
  at: (row: T) => number,
  window: TimeWindow,
): T[] {
  return rows.filter((row) => withinWindow(at(row), window))
}
