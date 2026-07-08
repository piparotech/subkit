import { GhostBox } from '~/components/ui/GhostBox'

import { cn } from '@piparo/cn-web'

export function AppUserFact({
  label,
  mono = false,
  value,
}: {
  label: string
  mono?: boolean
  value: string
}) {
  return (
    <GhostBox>
      <div className="text-[11.5px] text-[var(--subkit-faint)]">{label}</div>
      <div className={cn('mt-[3px] text-[14px] font-semibold', mono && 'font-mono')}>{value}</div>
    </GhostBox>
  )
}
