export function StoreId({ platform, value }: { platform: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-[6px]">
      <span className="shrink-0 rounded-[4px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[5px] py-[1px] text-[9.5px] font-bold text-[var(--subkit-dim)]">
        {platform}
      </span>
      <span className="truncate font-mono text-[12px] text-[var(--subkit-dim)]">{value}</span>
    </div>
  )
}
