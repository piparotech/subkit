import type { SVGProps } from 'react'

export function AppUsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 16 16" {...props}>
      <circle cx="5.5" cy="5.5" r="3" />
      <circle cx="11" cy="6.5" opacity="0.6" r="2.3" />
      <rect height="4" rx="2" width="8" x="1.5" y="10" />
      <rect height="3.4" opacity="0.6" rx="1.7" width="6" x="8.5" y="10.6" />
    </svg>
  )
}
