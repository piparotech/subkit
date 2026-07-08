import type { ReactNode } from 'react'

import { cn } from '@piparo/cn-web'

export type NoticeTone = 'info' | 'success' | 'warning' | 'danger'

const toneClasses: Record<NoticeTone, string> = {
  danger:
    'border-[color-mix(in_oklch,var(--subkit-red)_30%,var(--subkit-border))] bg-[color-mix(in_oklch,var(--subkit-red)_7%,white)] text-[var(--subkit-red)]',
  info: 'border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] text-[var(--subkit-dim)]',
  success:
    'border-[color-mix(in_oklch,var(--subkit-green)_30%,var(--subkit-border))] bg-[color-mix(in_oklch,var(--subkit-green)_7%,white)] text-[var(--subkit-green)]',
  warning:
    'border-[color-mix(in_oklch,var(--subkit-amber)_40%,var(--subkit-border))] bg-[color-mix(in_oklch,var(--subkit-amber)_9%,white)] text-[var(--subkit-dim)]',
}

export function Notice({
  children,
  className,
  tone = 'info',
}: {
  children: ReactNode
  className?: string
  tone?: NoticeTone
}) {
  return (
    <div
      className={cn(
        'mt-[12px] rounded-[10px] border px-[12px] py-[10px] text-[12.5px] leading-[1.45]',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </div>
  )
}
