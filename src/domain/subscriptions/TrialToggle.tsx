import { cn } from '@piparo/cn-web'

export function TrialToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-[11px] border border-[var(--subkit-border)] px-[14px] py-[13px]">
      <div>
        <div className="text-[13px] font-semibold">Free trial</div>
        <div className="text-[11.5px] text-[var(--subkit-faint)]">{enabled ? '7-day free trial' : 'Off'}</div>
      </div>
      <button
        aria-checked={enabled}
        className={cn('relative h-[22px] w-[38px] cursor-pointer rounded-full transition-colors duration-fast', enabled ? 'bg-[var(--subkit-accent)]' : 'bg-[var(--subkit-border-2)]')}
        onClick={onToggle}
        role="switch"
        type="button"
      >
        <span className={cn('absolute top-[2px] size-[18px] rounded-full bg-white shadow-sm transition-[left] duration-fast', enabled ? 'left-[18px]' : 'left-[2px]')} />
      </button>
    </div>
  )
}
