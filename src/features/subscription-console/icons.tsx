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

export function DashboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 16 16" {...props}>
      <rect height="6" rx="1" width="3" x="2" y="8" />
      <rect height="9" rx="1" width="3" x="6.5" y="5" />
      <rect height="12" rx="1" width="3" x="11" y="2" />
    </svg>
  )
}

export function SubscriptionsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 16 16" {...props}>
      <rect height="2.5" rx="1.25" width="12" x="2" y="3" />
      <rect height="2.5" rx="1.25" width="12" x="2" y="7" />
      <rect height="2.5" rx="1.25" width="7" x="2" y="11" />
    </svg>
  )
}

export function EntitlementsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 16 16" {...props}>
      <circle cx="8" cy="8" r="5.5" />
    </svg>
  )
}

export function OfferingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 16 16" {...props}>
      <rect height="8" rx="2" width="8" x="2.5" y="2.5" />
      <rect height="8" opacity="0.5" rx="2" width="8" x="6" y="6" />
    </svg>
  )
}

export function SubscribersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 16 16" {...props}>
      <circle cx="5.5" cy="5.5" r="3" />
      <circle cx="11" cy="6.5" opacity="0.6" r="2.3" />
      <rect height="4" rx="2" width="8" x="1.5" y="10" />
      <rect height="3.4" opacity="0.6" rx="1.7" width="6" x="8.5" y="10.6" />
    </svg>
  )
}

export function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 16 16" {...props}>
      <circle cx="8" cy="8" opacity="0.32" r="5.5" />
      <circle cx="8" cy="8" r="2.3" />
    </svg>
  )
}
