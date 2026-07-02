import { connectionStatusTone } from '~/integrations/app-store-connect/statusTones'
import { ConnectionFact } from '~/integrations/app-store-connect/components/ConnectionFact'
import { StatusLabel } from '~/components/ui/StatusLabel'
import type { AppStoreConnectConnection } from '~/integrations/app-store-connect/types'

export function ConnectionSummary({ connection }: { connection: AppStoreConnectConnection }) {
  return (
    <div className="rounded-[11px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] p-[13px]">
      <div className="flex items-center justify-between gap-[12px]">
        <div>
          <div className="text-[13px] font-semibold">Key {connection.keyId}</div>
          <div className="mt-[3px] font-mono text-[11.5px] text-[var(--subkit-faint)]">Issuer {connection.issuerId}</div>
        </div>
        <StatusLabel label={connection.status.replaceAll('_', ' ')} tone={connectionStatusTone(connection.status)} />
      </div>
      <div className="mt-[12px] grid grid-cols-2 gap-[8px] text-[12px] max-sm:grid-cols-1">
        <ConnectionFact label="Scope" value="Workspace" />
        <ConnectionFact label="Vendor Number" value={connection.vendorNumber ?? 'Missing'} />
        <ConnectionFact label="Private key" value={connection.keyFingerprint == null ? 'Missing' : `sha256:${connection.keyFingerprint}`} />
      </div>
      {connection.lastError != null ? <div className="mt-[10px] rounded-[9px] border border-[color-mix(in_oklch,var(--subkit-red)_30%,var(--subkit-border))] bg-[color-mix(in_oklch,var(--subkit-red)_8%,white)] px-[10px] py-[8px] text-[12px] text-[var(--subkit-red)]">{connection.lastError}</div> : null}
      {connection.lastValidatedAt != null ? <div className="mt-[9px] text-[11.5px] text-[var(--subkit-faint)]">Last preflight: {connection.lastValidatedAt}</div> : null}
    </div>
  )
}
