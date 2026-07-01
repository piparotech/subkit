export function AppCardMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1">
      <div className="text-[11px] text-[var(--subkit-faint)]">{label}</div>
      <div className="mt-[2px] font-mono text-[15px] font-bold">{value}</div>
    </div>
  )
}
