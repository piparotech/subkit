import { cn } from '@piparo/cn-web'
import { LoaderCircle } from 'lucide-react'

import type { AppDraft, AppDraftField } from '~/domain/apps/types'
import type { AppStoreConnectAccessibleApp, AppStoreConnectConnection } from '~/integrations/app-store-connect/types'

export function NewAppForm({
  apps,
  appsLoaded,
  connection,
  draft,
  error,
  loading,
  onChange,
}: {
  apps: AppStoreConnectAccessibleApp[]
  appsLoaded: boolean
  connection: AppStoreConnectConnection | null
  draft: AppDraft
  error: string | null
  loading: boolean
  onChange: (field: AppDraftField, value: string) => void
}) {
  const needsTenantKey = connection == null || !connection.hasPrivateKey
  return (
    <div className="space-y-[14px]">
      {loading ? (
        <div
          aria-live="polite"
          className="flex items-center gap-[9px] rounded-[10px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[12px] py-[10px] text-[12.5px] text-[var(--subkit-dim)]"
          role="status"
        >
          <LoaderCircle aria-hidden className="subkit-ignore-reduced-motion size-[16px] animate-spin text-[var(--subkit-accent)]" strokeWidth={2} />
          <span>Syncing App Store Connect apps…</span>
        </div>
      ) : null}
      {needsTenantKey ? (
        <div className="rounded-[10px] border border-[color-mix(in_oklch,var(--subkit-amber)_40%,var(--subkit-border))] bg-[color-mix(in_oklch,var(--subkit-amber)_9%,white)] px-[12px] py-[10px] text-[12.5px] text-[var(--subkit-dim)]">
          Configure the workspace App Store Connect key in Workspace Settings before creating an iOS app.
        </div>
      ) : null}
      {error != null ? (
        <div className="rounded-[10px] border border-[color-mix(in_oklch,var(--subkit-red)_30%,var(--subkit-border))] bg-[color-mix(in_oklch,var(--subkit-red)_7%,white)] px-[12px] py-[10px] text-[12.5px] text-[var(--subkit-red)]">
          {error}
        </div>
      ) : null}
      {!loading && appsLoaded && apps.length === 0 && error == null && !needsTenantKey ? (
        <div className="rounded-[10px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[12px] py-[10px] text-[12.5px] text-[var(--subkit-dim)]">
          No App Store Connect apps were returned for this workspace key.
        </div>
      ) : null}
      {apps.length > 0 ? (
        <div className="max-h-[300px] overflow-auto rounded-[11px] border border-[var(--subkit-border)]">
          {apps.map((app) => (
            <button
              className={cn(
                'grid w-full cursor-pointer grid-cols-[1fr_auto] gap-[8px] border-b border-[var(--subkit-border)] px-[12px] py-[10px] text-left last:border-b-0 hover:bg-[var(--subkit-panel-2)]',
                draft.appleAppId === app.appleAppId && 'bg-[var(--subkit-accent-soft)]',
              )}
              key={app.appleAppId}
              onClick={() => {
                onChange('appleAppId', app.appleAppId)
                onChange('bundleId', app.bundleId)
                onChange('name', app.name)
                onChange('sku', app.sku)
              }}
              type="button"
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-[var(--subkit-text)]">{app.name}</span>
                <span className="mt-[2px] block truncate font-mono text-[11.5px] text-[var(--subkit-faint)]">{app.bundleId || 'No bundle ID returned'}</span>
              </span>
              <span className="font-mono text-[11px] text-[var(--subkit-faint)]">{app.appleAppId}</span>
            </button>
          ))}
        </div>
      ) : null}
      {draft.appleAppId !== '' ? (
        <div className="rounded-[11px] border border-[var(--subkit-accent-line)] bg-[var(--subkit-accent-soft)] px-[12px] py-[10px] text-[12.5px] text-[var(--subkit-accent-d)]">
          Selected <strong>{draft.name}</strong> · <span className="font-mono">{draft.bundleId || draft.appleAppId}</span>
        </div>
      ) : null}
    </div>
  )
}
