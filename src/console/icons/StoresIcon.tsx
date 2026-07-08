import type { SVGProps } from 'react'

export function StoresIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 16 16" {...props}>
      <path
        d="M2.75 3.25A1.75 1.75 0 0 1 4.5 1.5h7a1.75 1.75 0 0 1 1.75 1.75v1.2c0 .64-.36 1.23-.93 1.52L8.9 7.67a2 2 0 0 1-1.8 0L3.68 5.97a1.7 1.7 0 0 1-.93-1.52z"
        opacity="0.5"
      />
      <path d="M2.75 6.35 6.7 8.33a2.9 2.9 0 0 0 2.6 0l3.95-1.98v2.05L8.9 10.57a2 2 0 0 1-1.8 0L2.75 8.4z" />
      <path
        d="M2.75 10.2 6.7 12.18a2.9 2.9 0 0 0 2.6 0l3.95-1.98v1.55a1.75 1.75 0 0 1-1.75 1.75h-7a1.75 1.75 0 0 1-1.75-1.75z"
        opacity="0.68"
      />
    </svg>
  )
}
