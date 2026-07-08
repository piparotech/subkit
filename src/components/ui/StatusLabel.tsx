import { ToneDot } from '~/components/ui/ToneDot'
import { toneTextClass } from '~/components/ui/toneClasses'
import type { StatusTone } from '~/components/ui/types'

import { cn } from '@piparo/cn-web'

export function StatusLabel({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[6px] text-[12px] font-semibold',
        toneTextClass(tone),
      )}
    >
      <ToneDot tone={tone} />
      {label}
    </span>
  )
}
