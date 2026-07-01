import { PUITag } from '@piparo/cn-web'
import * as React from 'react'

import { tagIntent } from './toneClasses'
import type { StatusTone } from './types'

export function SoftTag({ children, tone = 'muted' }: { children: React.ReactNode; tone?: StatusTone }) {
  return (
    <PUITag
      className="border border-[var(--subkit-border)] font-mono"
      emphasis="soft"
      intent={tagIntent[tone]}
      label={children}
      size="sm"
    />
  )
}
