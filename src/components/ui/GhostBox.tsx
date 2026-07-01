import { cn } from '@piparo/cn-web'
import * as React from 'react'

export function GhostBox({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-[11px] border border-[var(--subkit-border)] p-[13px]', className)}>
      {children}
    </div>
  )
}
