import type { ComponentType, ReactNode, SVGProps } from 'react'

export function SidebarLinkContent({
  children,
  count,
  icon: Icon,
}: {
  children: ReactNode
  count?: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}) {
  return (
    <>
      <Icon aria-hidden className="size-[16px]" />
      <span className="flex-1">{children}</span>
      {count != null ? <span className="font-mono text-[11px] text-[var(--subkit-faint)]">{count}</span> : null}
    </>
  )
}
