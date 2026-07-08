import type { ComponentType, ReactNode, SVGProps } from 'react'

import { Link } from '@tanstack/react-router'

import { SidebarLinkContent } from '~/console/components/SidebarLinkContent'
import type { AppRouteParams } from '~/console/routing'

interface SidebarNavLinkProps {
  activeExact?: boolean
  count?: ReactNode
  countLabel?: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  onNavigate?: () => void
  params?: AppRouteParams
  to: string
}

const sidebarLinkClass =
  'relative mt-[2px] flex w-full cursor-pointer select-none items-center gap-[11px] rounded-[9px] px-[10px] py-[8px] text-left text-[13.5px] outline-none transition-colors duration-fast focus-visible:ring-2 focus-visible:ring-[var(--subkit-accent-line)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--subkit-panel)] motion-reduce:transition-none'
const activeLinkClass =
  "bg-[var(--subkit-accent-soft)] font-semibold text-[var(--subkit-accent-d)] after:absolute after:left-[4px] after:top-1/2 after:size-[5px] after:-translate-y-1/2 after:rounded-full after:bg-[var(--subkit-accent)] after:content-['']"
const inactiveLinkClass =
  'bg-transparent font-medium text-[var(--subkit-dim)] hover:bg-[var(--subkit-panel-2)]'

export function SidebarNavLink({
  activeExact = true,
  count,
  countLabel,
  icon,
  label,
  onNavigate,
  params,
  to,
}: SidebarNavLinkProps) {
  return (
    <Link
      activeOptions={{ exact: activeExact }}
      activeProps={{ className: activeLinkClass }}
      className={sidebarLinkClass}
      inactiveProps={{ className: inactiveLinkClass }}
      onClick={onNavigate}
      params={params}
      preload="intent"
      to={to}
    >
      <SidebarLinkContent count={count} countLabel={countLabel} icon={icon}>
        {label}
      </SidebarLinkContent>
    </Link>
  )
}
