import { EmptySettingsText } from '~/components/ui/EmptySettingsText'
import { StatusLabel } from '~/components/ui/StatusLabel'
import { capabilityStatusTone } from '~/integrations/app-store-connect/statusTones'
import type { AppStoreConnectConnection } from '~/integrations/app-store-connect/types'

export function CapabilityList({
  capabilities,
}: {
  capabilities: AppStoreConnectConnection['capabilities']
}) {
  if (capabilities.length === 0)
    return <EmptySettingsText>No preflight has run yet.</EmptySettingsText>
  return (
    <div className="rounded-[11px] border border-[var(--subkit-border)]">
      {capabilities.map((capability) => (
        <div
          className="border-b border-[var(--subkit-border)] px-[12px] py-[11px] last:border-b-0"
          key={capability.key}
        >
          <div className="flex items-center justify-between gap-[10px]">
            <div className="text-[13px] font-semibold">{capability.label}</div>
            <StatusLabel label={capability.status} tone={capabilityStatusTone(capability.status)} />
          </div>
          <div className="mt-[4px] text-[12px] text-[var(--subkit-dim)]">
            {capability.description}
          </div>
          <div className="mt-[3px] text-[11.5px] text-[var(--subkit-faint)]">
            {capability.detail}
          </div>
        </div>
      ))}
    </div>
  )
}
