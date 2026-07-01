export function MiniAppAvatar({ initials, color }: { initials: string; color: string }) {
  return (
    <span
      className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-[8px] text-[13px] font-bold text-white"
      style={{ background: color }}
    >
      {initials}
    </span>
  )
}
