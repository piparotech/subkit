import { cn } from '@piparo/cn-web'

import { toneBgClass } from './toneClasses'
import type { StatusTone } from './types'

export function ToneDot({ tone, className }: { tone: StatusTone; className?: string }) {
  return <span aria-hidden className={cn('size-[7px] rounded-full', toneBgClass(tone), className)} />
}
