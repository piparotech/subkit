import { EmptySettingsText } from '~/components/ui/EmptySettingsText'
import { StatusLabel } from '~/components/ui/StatusLabel'
import type { AppStoreConnectConnection } from '~/integrations/app-store-connect/types'

export function SalesReportHistory({ connection }: { connection: AppStoreConnectConnection | null }) {
  if (!connection?.salesReports.length) {
    return <EmptySettingsText>Vendor Number required. Reports are delayed Apple snapshots, not realtime entitlements.</EmptySettingsText>
  }
  return (
    <div className="overflow-hidden rounded-[11px] border border-[var(--subkit-border)]">
      {connection.salesReports.map((report) => (
        <div className="grid grid-cols-[0.9fr_0.8fr_0.7fr_1.2fr] gap-[10px] border-b border-[var(--subkit-border)] px-[12px] py-[10px] text-[12px] last:border-b-0" key={report.id}>
          <span className="font-mono font-semibold">{report.reportDate}</span>
          <StatusLabel label={report.status} tone={report.status === 'imported' ? 'success' : 'destructive'} />
          <span className="font-mono text-[var(--subkit-dim)]">{report.rowCount} rows</span>
          <span className="truncate text-[var(--subkit-faint)]">{report.errorDetail ?? report.createdAt}</span>
        </div>
      ))}
    </div>
  )
}
