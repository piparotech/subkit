import { CloseButton } from './CloseButton'

export function PanelHeader({ kicker, onClose, title }: { kicker: string; onClose: () => void; title: string }) {
  return (
    <div className="flex items-center gap-[12px] border-b border-[var(--subkit-border)] px-[22px] py-[18px]">
      <div className="flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--subkit-faint)]">{kicker}</div>
        <div className="mt-[2px] text-[17px] font-bold">{title}</div>
      </div>
      <CloseButton onClose={onClose} />
    </div>
  )
}
