import { cn } from '@piparo/cn-web'

import { toneTextClass } from './toneClasses'
import { ToneDot } from './ToneDot'
import type { StatusTone } from './types'

export function StatusLabel({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <span className={cn('inline-flex items-center gap-[6px] text-[12px] font-semibold', toneTextClass(tone))}>
      <ToneDot tone={tone} />
      {label}
    </span>
  )
}
