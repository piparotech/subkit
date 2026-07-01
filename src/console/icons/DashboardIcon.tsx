import type { SVGProps } from 'react'

export function DashboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 16 16" {...props}>
      <rect height="6" rx="1" width="3" x="2" y="8" />
      <rect height="9" rx="1" width="3" x="6.5" y="5" />
      <rect height="12" rx="1" width="3" x="11" y="2" />
    </svg>
  )
}
