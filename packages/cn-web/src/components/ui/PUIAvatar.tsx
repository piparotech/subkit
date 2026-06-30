import * as React from 'react'

import { cn } from '../../lib/utils'
import { avatarInitials, type PUIAvatarBaseProps, type PUIAvatarSize } from './PUIAvatar.types'

export type { PUIAvatarBaseProps, PUIAvatarSize } from './PUIAvatar.types'

export type PUIAvatarProps = PUIAvatarBaseProps

// Initials cap-height tuned to the avatar diameter (footnote/subheadline/title3).
const SIZE: Record<PUIAvatarSize, string> = {
  sm: 'h-8 w-8 text-footnote',
  md: 'h-10 w-10 text-subheadline',
  lg: 'h-14 w-14 text-title-3',
}

/** @scope both */
export const PUIAvatar = React.forwardRef<HTMLSpanElement, PUIAvatarProps>(function PUIAvatar(
  { src, name, size = 'md', className },
  ref,
) {
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    setLoaded(false)
  }, [src])

  const showImage = src != null && loaded

  return (
    <span
      ref={ref}
      aria-label={typeof name === 'string' ? name : undefined}
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-muted font-semibold text-foreground',
        SIZE[size],
        className,
      )}
      role="img"
    >
      {src != null ? (
        <img
          alt=""
          className={cn('h-full w-full object-cover', !showImage && 'opacity-0')}
          onError={() => setLoaded(false)}
          onLoad={() => setLoaded(true)}
          src={src}
        />
      ) : null}
      {!showImage ? <span className="absolute">{avatarInitials(name)}</span> : null}
    </span>
  )
})
PUIAvatar.displayName = 'PUIAvatar'
