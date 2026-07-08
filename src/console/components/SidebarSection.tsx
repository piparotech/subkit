export function SidebarSection({ label }: { label: string }) {
  return (
    <div className="px-[8px] pt-[12px] pb-[5px] text-[11px] font-semibold tracking-[0.04em] text-[var(--subkit-dim)] uppercase">
      {label}
    </div>
  )
}
