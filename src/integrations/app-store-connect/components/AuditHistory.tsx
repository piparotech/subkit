import { EmptySettingsText } from '~/components/ui/EmptySettingsText'
import type { AppStoreConnectConnection } from '~/integrations/app-store-connect/types'

export function AuditHistory({ connection }: { connection: AppStoreConnectConnection | null }) {
  if (!connection?.auditEvents.length)
    return <EmptySettingsText>No App Store Connect audit events yet.</EmptySettingsText>
  return (
    <div className="rounded-[11px] border border-[var(--subkit-border)]">
      {connection.auditEvents.map((event) => (
        <div
          className="grid grid-cols-[0.8fr_1fr_2fr] gap-[12px] border-b border-[var(--subkit-border)] px-[12px] py-[10px] text-[12px] last:border-b-0 max-md:grid-cols-1"
          key={event.id}
        >
          <span className="font-mono text-[var(--subkit-faint)]">{event.createdAt}</span>
          <span className="font-mono font-semibold text-[var(--subkit-text)]">{event.action}</span>
          <span className="text-[var(--subkit-dim)]">{event.detail}</span>
        </div>
      ))}
    </div>
  )
}
