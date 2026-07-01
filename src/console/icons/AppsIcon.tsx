import type { SVGProps } from 'react'

export function AppsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 16 16" {...props}>
      <rect height="5" rx="1.5" width="5" x="2" y="2" />
      <rect height="5" rx="1.5" width="5" x="9" y="2" />
      <rect height="5" rx="1.5" width="5" x="2" y="9" />
      <rect height="5" rx="1.5" width="5" x="9" y="9" />
    </svg>
  )
}
