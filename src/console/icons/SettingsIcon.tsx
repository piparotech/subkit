import type { SVGProps } from 'react'

export function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 16 16" {...props}>
      <circle cx="8" cy="8" opacity="0.32" r="5.5" />
      <circle cx="8" cy="8" r="2.3" />
    </svg>
  )
}
