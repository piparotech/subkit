import * as React from 'react'

import { tagIntent } from '~/components/ui/toneClasses'
import type { StatusTone } from '~/components/ui/types'

import { PUITag } from '@piparo/cn-web'

export function SoftTag({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode
  tone?: StatusTone
}) {
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
