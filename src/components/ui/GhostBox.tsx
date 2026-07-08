import * as React from 'react'

import { cn } from '@piparo/cn-web'

export function GhostBox({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-[11px] border border-[var(--subkit-border)] p-[13px]', className)}>
      {children}
    </div>
  )
}
