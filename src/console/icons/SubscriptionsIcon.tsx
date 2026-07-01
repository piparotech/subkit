import type { SVGProps } from 'react'

export function SubscriptionsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 16 16" {...props}>
      <rect height="2.5" rx="1.25" width="12" x="2" y="3" />
      <rect height="2.5" rx="1.25" width="12" x="2" y="7" />
      <rect height="2.5" rx="1.25" width="7" x="2" y="11" />
    </svg>
  )
}
