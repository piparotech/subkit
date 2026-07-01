import { cn } from '@piparo/cn-web'

export function TrialToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-[12px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] p-[14px]">
      <div className="flex items-center justify-between gap-[14px]">
        <div>
          <div className="text-[13.5px] font-semibold">Free trial intent</div>
          <div className="mt-[2px] text-[12.5px] text-[var(--subkit-dim)]">Stored in SubKit. Store offers sync through a separate preview.</div>
        </div>
        <button
          aria-pressed={enabled}
          className={cn('relative h-[22px] w-[38px] cursor-pointer rounded-full transition-colors duration-fast', enabled ? 'bg-[var(--subkit-accent)]' : 'bg-[var(--subkit-border-2)]')}
          onClick={onToggle}
          type="button"
        >
          <span className="sr-only">Toggle trial intent</span>
          <span className={cn('absolute top-[2px] size-[18px] rounded-full bg-white shadow-sm transition-[left] duration-fast', enabled ? 'left-[18px]' : 'left-[2px]')} />
        </button>
      </div>
    </div>
  )
}
