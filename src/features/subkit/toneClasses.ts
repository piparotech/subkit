import type { StatusTone } from './types'

const toneText: Record<StatusTone, string> = {
  success: 'text-[var(--subkit-green)]',
  warning: 'text-[var(--subkit-amber)]',
  muted: 'text-[var(--subkit-faint)]',
  destructive: 'text-[var(--subkit-red)]',
}

const toneBg: Record<StatusTone, string> = {
  success: 'bg-[var(--subkit-green)]',
  warning: 'bg-[var(--subkit-amber)]',
  muted: 'bg-[var(--subkit-faint)]',
  destructive: 'bg-[var(--subkit-red)]',
}

export const tagIntent: Record<StatusTone, 'neutral' | 'success' | 'warning' | 'destructive'> = {
  success: 'success',
  warning: 'warning',
  muted: 'neutral',
  destructive: 'destructive',
}

export function toneTextClass(tone: StatusTone): string {
  return toneText[tone]
}

export function toneBgClass(tone: StatusTone): string {
  return toneBg[tone]
}
