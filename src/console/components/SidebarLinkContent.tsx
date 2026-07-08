import type { ComponentType, ReactNode, SVGProps } from 'react'

export function SidebarLinkContent({
  children,
  count,
  countLabel,
  icon: Icon,
}: {
  children: ReactNode
  count?: ReactNode
  countLabel?: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}) {
  return (
    <>
      <Icon aria-hidden className="size-[16px] shrink-0" />
      <span className="flex-1 truncate">{children}</span>
      {count != null ? (
        <span
          aria-label={countLabel}
          className="rounded-[999px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[6px] py-[1px] font-mono text-[10.5px] text-[var(--subkit-faint)]"
        >
          {count}
        </span>
      ) : null}
    </>
  )
}
