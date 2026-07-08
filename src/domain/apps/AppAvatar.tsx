import type { AppTenant } from '~/domain/apps/types'

import { cn } from '@piparo/cn-web'

export function AppAvatar({
  app,
  size = 'md',
}: {
  app: AppTenant
  size?: 'xs' | 'sm' | 'md' | 'lg'
}) {
  const sizeClass = {
    xs: 'size-[14px] rounded-[4px] text-[8px]',
    sm: 'size-[24px] rounded-[6px] text-[10.5px]',
    md: 'size-[44px] rounded-[11px] text-[16px]',
    lg: 'size-[46px] rounded-[12px] text-[17px]',
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-bold text-white',
        sizeClass[size],
      )}
      style={{ background: app.color }}
    >
      {app.initials}
    </span>
  )
}
