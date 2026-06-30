import { type ReactNode } from 'react'

export type PUIAvatarSize = 'sm' | 'md' | 'lg'

export interface PUIAvatarBaseProps {
  /** Remote image URL. When absent or it fails to load, the initials fallback is shown. */
  src?: string
  /** Used for the initials fallback and the accessibility label. */
  name: ReactNode
  size?: PUIAvatarSize
  className?: string
}

/** Two-letter uppercase initials from a string name; empty for non-string nodes. */
export function avatarInitials(name: ReactNode): string {
  if (typeof name !== 'string') return ''
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
