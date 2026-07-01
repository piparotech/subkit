import type { AppStoreConnectMonitorSnapshot } from '~/integrations/app-store-connect/types'

export function MonitoringSnapshot({ snapshot }: { snapshot: AppStoreConnectMonitorSnapshot }) {
  return (
    <div className="grid grid-cols-2 gap-[12px] max-lg:grid-cols-1">
      {snapshot.sections.map((section) => (
        <div className="rounded-[11px] border border-[var(--subkit-border)]" key={section.title}>
          <div className="border-b border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[12px] py-[9px] text-[12px] font-semibold">{section.title}</div>
          {section.items.length === 0 ? (
            <div className="px-[12px] py-[10px] text-[12px] text-[var(--subkit-faint)]">No records returned.</div>
          ) : (
            section.items.map((item) => (
              <div className="border-b border-[var(--subkit-border)] px-[12px] py-[10px] text-[12px] last:border-b-0" key={item.id}>
                <div className="flex items-center justify-between gap-[8px]">
                  <span className="font-semibold text-[var(--subkit-text)]">{item.label}</span>
                  <span className="rounded-[999px] border border-[var(--subkit-border)] px-[7px] py-[2px] font-mono text-[10.5px] text-[var(--subkit-dim)]">{item.status}</span>
                </div>
                <div className="mt-[4px] text-[var(--subkit-dim)]">{item.detail}</div>
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  )
}
