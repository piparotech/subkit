import type { ValueMode } from './config'

/**
 * Card presentation logic — the deterministic glue between aggregated numbers and what a card shows:
 * the loading/empty/error/ready state machine, the percent↔amount dual-unit selection, and the
 * formatting of values/deltas. Kept in the Engine so client and any SSR render the identical label.
 */

export type CardStatus = 'loading' | 'error' | 'empty' | 'ready'

export type CardState = {
  loading?: boolean
  error?: unknown
  /** True when the data has loaded but the windowed result set is empty. */
  empty?: boolean
}

/**
 * Resolve a card's render state. Precedence: an in-flight load wins over a stale error, an error wins
 * over an empty result, and `empty` shows a real empty-state — never a blank/zeroed chart (the
 * capability's explicit guarantee).
 */
export function resolveCardStatus(state: CardState): CardStatus {
  if (state.loading) return 'loading'
  if (state.error != null) return 'error'
  if (state.empty) return 'empty'
  return 'ready'
}

/** A metric that carries both a percentage (0..1) and an absolute amount; the card toggles between them. */
export type DualValue = { percent: number; amount: number }

/** Pick the active figure for the current value mode. */
export function selectValue(value: DualValue, mode: ValueMode): number {
  return mode === 'percent' ? value.percent : value.amount
}

/** Flip the value mode (for the percent/amount toggle). */
export function toggleValueMode(mode: ValueMode): ValueMode {
  return mode === 'percent' ? 'amount' : 'percent'
}

export type FormatOptions = {
  /** Currency / unit affix for the amount mode, e.g. '€', '$', 'kg'. */
  unit?: string
  /** Whether the unit is a prefix ('€100') or suffix ('100 kg'). Default suffix. */
  unitPosition?: 'prefix' | 'suffix'
  /** Fraction digits for the amount mode. Percent always uses 1. Default 0. */
  fractionDigits?: number
  /** BCP-47 locale for number grouping. Default 'en-US' (stable across runtimes). */
  locale?: string
}

/** Format a dual-unit value for the active mode (percent → '12.3%', amount → '1,234 €'). */
export function formatValue(
  value: DualValue,
  mode: ValueMode,
  options: FormatOptions = {},
): string {
  if (mode === 'percent') {
    return `${(value.percent * 100).toLocaleString(options.locale ?? 'en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}%`
  }
  const amount = value.amount.toLocaleString(options.locale ?? 'en-US', {
    minimumFractionDigits: options.fractionDigits ?? 0,
    maximumFractionDigits: options.fractionDigits ?? 0,
  })
  if (!options.unit) return amount
  return options.unitPosition === 'prefix'
    ? `${options.unit}${amount}`
    : `${amount} ${options.unit}`
}

/** Format a signed delta ratio as a percentage with an explicit sign ('+4.2%', '-1.0%', '±0%'). */
export function formatDeltaRatio(ratio: number | null, locale = 'en-US'): string {
  if (ratio === null) return '—'
  if (ratio === 0) return '±0%'
  const sign = ratio > 0 ? '+' : '-'
  const magnitude = (Math.abs(ratio) * 100).toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  return `${sign}${magnitude}%`
}
