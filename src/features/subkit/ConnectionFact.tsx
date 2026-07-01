export function ConnectionFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[9px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[10px] py-[8px]">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-[var(--subkit-faint)]">{label}</div>
      <div className="mt-[3px] truncate font-mono text-[12px] text-[var(--subkit-text)]">{value}</div>
    </div>
  )
}
