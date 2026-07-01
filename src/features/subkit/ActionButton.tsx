import { cn } from '@piparo/cn-web'

export function ActionButton({ disabled, label, onPress, tone = 'neutral' }: { disabled: boolean; label: string; onPress: () => void; tone?: 'danger' | 'neutral' | 'primary' }) {
  return (
    <button
      className={cn(
        'min-h-[36px] cursor-pointer rounded-[9px] px-[13px] py-[8px] text-[12.5px] font-semibold transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50',
        tone === 'primary' && 'bg-[var(--subkit-text)] text-white hover:bg-[color-mix(in_oklch,var(--subkit-text)_88%,white)]',
        tone === 'neutral' && 'border border-[var(--subkit-border)] bg-[var(--subkit-panel)] text-[var(--subkit-text)] hover:bg-[var(--subkit-panel-2)]',
        tone === 'danger' && 'border border-[color-mix(in_oklch,var(--subkit-red)_30%,var(--subkit-border))] bg-white text-[var(--subkit-red)] hover:bg-[color-mix(in_oklch,var(--subkit-red)_7%,white)]',
      )}
      disabled={disabled}
      onClick={onPress}
      type="button"
    >
      {label}
    </button>
  )
}
