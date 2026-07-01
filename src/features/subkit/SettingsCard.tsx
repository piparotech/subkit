import { PUICard, cn } from '@piparo/cn-web'
import type { ReactNode } from 'react'

export function SettingsCard({ children, description, title, tone = 'neutral' }: { children: ReactNode; description?: string; title: string; tone?: 'danger' | 'neutral' }) {
  return (
    <PUICard
      className={cn(
        'mt-[16px] rounded-[14px] border-[var(--subkit-border)] bg-[var(--subkit-panel)] p-[20px] first:mt-[20px]',
        tone === 'danger' && 'border-[color-mix(in_oklch,var(--subkit-red)_32%,var(--subkit-border))]',
      )}
    >
      <div className={cn('mb-[14px] text-[14px] font-semibold', tone === 'danger' && 'text-[var(--subkit-red)]')}>{title}</div>
      {description != null ? <div className="mb-[12px] text-[12.5px] text-[var(--subkit-dim)]">{description}</div> : null}
      <div className="flex flex-col gap-[12px]">{children}</div>
    </PUICard>
  )
}
