import type { AppStoreConnectAccessibleApp } from './types'

export function AccessibleAppList({ apps }: { apps: AppStoreConnectAccessibleApp[] }) {
  return (
    <div className="rounded-[11px] border border-[var(--subkit-border)]">
      <div className="border-b border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[12px] py-[9px] text-[12px] font-semibold">Accessible App Store Connect apps</div>
      {apps.map((app) => (
        <div
          className="grid grid-cols-[1fr_1fr_auto] gap-[10px] border-b border-[var(--subkit-border)] px-[12px] py-[10px] text-left text-[12px] last:border-b-0 max-sm:grid-cols-1"
          key={app.appleAppId}
        >
          <span className="font-semibold text-[var(--subkit-text)]">{app.name}</span>
          <span className="font-mono text-[var(--subkit-dim)]">{app.bundleId || 'No bundle ID returned'}</span>
          <span className="font-mono text-[var(--subkit-faint)]">{app.appleAppId}</span>
        </div>
      ))}
    </div>
  )
}
