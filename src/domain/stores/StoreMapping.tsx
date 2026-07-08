import { PUIInput } from '@piparo/cn-web'

export function StoreMapping({
  onPriceChange,
  onValueChange,
  platform,
  price,
  store,
  value,
}: {
  onPriceChange: (value: string) => void
  onValueChange: (value: string) => void
  platform: string
  price: string
  store: string
  value: string
}) {
  return (
    <div className="rounded-[12px] border border-[var(--subkit-border)] p-[14px]">
      <div className="mb-[12px] flex items-center gap-[8px]">
        <span className="rounded-[5px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[7px] py-[2px] text-[11px] font-bold text-[var(--subkit-dim)]">
          {platform}
        </span>
        <span className="text-[13px] font-semibold">{store}</span>
      </div>
      <PUIInput
        className="mb-[9px] font-mono"
        onChange={(event) => onValueChange(event.target.value)}
        placeholder="App Store product ID"
        value={value}
      />
      <PUIInput
        className="font-mono"
        onChange={(event) => onPriceChange(event.target.value)}
        placeholder="Price"
        value={price}
      />
    </div>
  )
}
