import { z } from 'zod'

/**
 * The `dashboard-charts` module config — the cross-cutting dashboard knobs (which time-range presets
 * a dashboard offers, the default range, and the default value mode). The card layout and the data
 * sources are supplied by the host per dashboard; this config carries only the reusable defaults.
 */

export const TIME_RANGES = ['7d', '30d', '90d', '6m', '1y', 'ytd', 'all'] as const
export type TimeRangeKey = (typeof TIME_RANGES)[number]

/** Whether a dual-unit metric shows the percentage or the absolute amount. */
export const VALUE_MODES = ['percent', 'amount'] as const
export type ValueMode = (typeof VALUE_MODES)[number]

export const DashboardConfig = z.strictObject({
  /** The time-range presets the period selector offers (order preserved). */
  ranges: z.array(z.enum(TIME_RANGES)).nonempty().default(['7d', '30d', '90d', '1y', 'all']),
  /** The range selected when a dashboard first opens. Must be one of `ranges`. */
  defaultRange: z.enum(TIME_RANGES).default('30d'),
  /** Initial value mode for dual-unit cards (percent vs amount). */
  defaultValueMode: z.enum(VALUE_MODES).default('amount'),
  /** Re-render debounce when the range/filter changes (ms). */
  refreshDebounceMs: z.number().int().nonnegative().default(0),
})
export type DashboardConfig = z.infer<typeof DashboardConfig>

export type EditableBy = 'piparo' | 'customer'
export const dashboardConfigRights: Record<string, EditableBy> = {
  ranges: 'piparo',
  defaultRange: 'customer',
  defaultValueMode: 'customer',
  refreshDebounceMs: 'piparo',
}

export function parseDashboardConfig(input: unknown) {
  const result = DashboardConfig.safeParse(input)
  if (result.success && !result.data.ranges.includes(result.data.defaultRange)) {
    return {
      success: false as const,
      error: new z.ZodError([
        {
          code: 'custom',
          path: ['defaultRange'],
          message: 'defaultRange must be one of ranges',
          input: result.data.defaultRange,
        },
      ]),
    }
  }
  return result
}
