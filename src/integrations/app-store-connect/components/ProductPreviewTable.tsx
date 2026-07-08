import { StatusLabel } from '~/components/ui/StatusLabel'
import { productActionTone } from '~/integrations/app-store-connect/statusTones'
import type { AppStoreConnectProductPreview } from '~/integrations/app-store-connect/types'

export function ProductPreviewTable({ preview }: { preview: AppStoreConnectProductPreview[] }) {
  return (
    <div className="max-h-[360px] overflow-auto rounded-[11px] border border-[var(--subkit-border)]">
      <div className="grid min-w-[720px] grid-cols-[0.8fr_1.2fr_1.2fr_0.9fr_1.2fr] gap-[10px] border-b border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[12px] py-[9px] text-[10.5px] font-semibold tracking-[0.04em] text-[var(--subkit-faint)] uppercase">
        <div>Action</div>
        <div>Apple product</div>
        <div>Local product</div>
        <div>State</div>
        <div>Note</div>
      </div>
      {preview.map((item) => (
        <div
          className="grid min-w-[720px] grid-cols-[0.8fr_1.2fr_1.2fr_0.9fr_1.2fr] gap-[10px] border-b border-[var(--subkit-border)] px-[12px] py-[10px] text-[12px] last:border-b-0"
          key={`${item.appleProductId}-${item.action}`}
        >
          <StatusLabel label={item.action} tone={productActionTone(item.action)} />
          <div className="min-w-0">
            <div className="truncate font-semibold">{item.appleName}</div>
            <div className="truncate font-mono text-[11px] text-[var(--subkit-faint)]">
              {item.appleProductId}
            </div>
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold">{item.localName ?? 'New local product'}</div>
            <div className="truncate font-mono text-[11px] text-[var(--subkit-faint)]">
              {item.localIdentifier ?? item.entitlement}
            </div>
          </div>
          <div className="font-mono text-[11.5px] text-[var(--subkit-dim)]">{item.appleState}</div>
          <div className="text-[11.5px] text-[var(--subkit-dim)]">{item.note}</div>
        </div>
      ))}
    </div>
  )
}
