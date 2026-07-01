import type { SVGProps } from 'react'

export function OfferingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 16 16" {...props}>
      <rect height="8" rx="2" width="8" x="2.5" y="2.5" />
      <rect height="8" opacity="0.5" rx="2" width="8" x="6" y="6" />
    </svg>
  )
}
