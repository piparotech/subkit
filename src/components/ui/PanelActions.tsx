import { PUIButton } from '@piparo/cn-web'

export function PanelActions({ onClose, onPrimary, primaryLabel }: { onClose: () => void; onPrimary: () => void; primaryLabel: string }) {
  return (
    <div className="flex gap-[10px] border-t border-[var(--subkit-border)] px-[22px] py-[16px]">
      <PUIButton className="flex-1 rounded-[9px]" label="Cancel" onPress={onClose} variant="outline" />
      <PUIButton className="flex-[1.6] rounded-[9px]" label={primaryLabel} onPress={onPrimary} />
    </div>
  )
}
