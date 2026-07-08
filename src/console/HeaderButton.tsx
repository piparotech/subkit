import * as React from 'react'

import { PUIButton } from '@piparo/cn-web'

export function HeaderButton({
  children,
  onPress,
}: {
  children: React.ReactNode
  onPress: () => void
}) {
  return (
    <PUIButton
      className="min-h-[38px] rounded-[9px] px-[14px] py-[9px] text-[13px] shadow-sm"
      label={children}
      onPress={onPress}
      size="sm"
    />
  )
}
