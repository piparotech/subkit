import { toneBgClass } from '~/components/ui/toneClasses'
import type { StatusTone } from '~/components/ui/types'

import { cn } from '@piparo/cn-web'

export function ToneDot({ tone, className }: { tone: StatusTone; className?: string }) {
  return (
    <span aria-hidden className={cn('size-[7px] rounded-full', toneBgClass(tone), className)} />
  )
}
