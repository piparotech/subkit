import { X } from 'lucide-react'

export function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      aria-label="Close"
      className="flex size-[32px] shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] text-[var(--subkit-dim)]"
      onClick={onClose}
      type="button"
    >
      <X aria-hidden className="size-[14px]" strokeWidth={1.8} />
    </button>
  )
}
