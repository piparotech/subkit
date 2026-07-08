import type { ReactNode } from 'react'

export function EmptySettingsText({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[10px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[12px] py-[10px] text-[12.5px] text-[var(--subkit-dim)]">
      {children}
    </div>
  )
}
