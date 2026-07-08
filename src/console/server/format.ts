import type { StatusTone } from '~/components/ui/types'

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(cents / 100)
}

export function amountMicrosToCents(value: number | null): number {
  if (value == null) return 0
  return Math.round(value / 10_000)
}

export function centsToAmountMicros(cents: number): number {
  return cents * 10_000
}

export function formatSignedCurrency(cents: number | null): string {
  if (cents == null) return '—'
  if (cents === 0) return '$0.00'
  const sign = cents > 0 ? '+' : '-'
  return `${sign}${formatCurrency(Math.abs(cents))}`
}

export function formatInteger(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value)
}

export function formatOptionalDateTime(value: Date | null): string {
  return value == null ? '—' : formatDateTime(value)
}

export function formatJsonSummary(value: string | null): string {
  if (value == null || value.trim() === '') return '—'
  try {
    const parsed: unknown = JSON.parse(value)
    if (isStringRecord(parsed)) {
      const entries = Object.entries(parsed)
      if (entries.length === 0) return '{}'
      return entries
        .slice(0, 3)
        .map(([key, entryValue]) => `${key}: ${formatJsonScalar(entryValue)}`)
        .join(' · ')
    }
    return formatJsonScalar(parsed)
  } catch {
    return value
  }
}

function formatJsonScalar(value: unknown): string {
  if (value == null) return 'null'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `${value.length} items`
  if (isStringRecord(value)) return `${Object.keys(value).length} fields`
  return 'value'
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value)
}

export function amountTone(cents: number | null): StatusTone {
  if (cents == null || cents === 0) return 'muted'
  return cents > 0 ? 'success' : 'destructive'
}
