import { cn } from '@piparo/cn-web'

import { toneTextClass } from './toneClasses'
import type { StatusTone } from './types'

export function MetricCard({ label, value, delta, tone }: { label: string; value: string; delta?: string; tone?: StatusTone }) {
  return (
    <div className="rounded-[12px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[18px] py-[16px]">
      <div className="text-[12.5px] text-[var(--subkit-dim)]">{label}</div>
      <div className="mt-[7px] flex items-baseline gap-[9px]">
        <div className="font-mono text-[23px] font-bold">{value}</div>
        {delta != null && tone != null ? <div className={cn('text-[12.5px] font-semibold', toneTextClass(tone))}>{delta}</div> : null}
      </div>
    </div>
  )
}
