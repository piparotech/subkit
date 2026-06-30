import { PUICard, PUIInput, cn } from '@piparo/cn-web'
import * as React from 'react'

import { CredentialForm } from './AppStoreConnectCredentialForm'
import { listAppStoreConnectApps } from './app-store-connect-apps-server'
import { inspectAppStoreConnectMonitoring } from './app-store-connect-monitor-server'
import {
  deleteAppStoreConnectCredential,
  importAppStoreConnectProductPreview,
  previewAppStoreConnectProducts,
  saveAppStoreConnectCredential,
  syncAppStoreConnectSalesReport,
  validateAppStoreConnectCredential,
} from './app-store-connect-server'
import { deleteAppRecord } from './server'
import { StatusLabel, ViewTitle } from './ui'
import type {
  AppStoreConnectAccessibleApp,
  AppStoreConnectCapabilityStatus,
  AppStoreConnectConnection,
  AppStoreConnectCredentialDraft,
  AppStoreConnectMonitorSnapshot,
  AppStoreConnectProductPreview,
  AppStoreConnectProductSyncAction,
  AppTenant,
  StatusTone,
} from './types'

export function WorkspaceSettingsView({
  connection,
  onRefreshConsoleData,
}: {
  connection: AppStoreConnectConnection | null
  onRefreshConsoleData: () => void
}) {
  const [draft, setDraft] = React.useState<AppStoreConnectCredentialDraft>(() => credentialDraftFromConnection(connection))
  const [busy, setBusy] = React.useState<string | null>(null)
  const [feedback, setFeedback] = React.useState<string | null>(null)
  const [accessibleApps, setAccessibleApps] = React.useState<AppStoreConnectAccessibleApp[]>([])
  const [preview, setPreview] = React.useState<AppStoreConnectProductPreview[]>([])
  const [monitoring, setMonitoring] = React.useState<AppStoreConnectMonitorSnapshot | null>(null)
  const [reportDate, setReportDate] = React.useState('')

  React.useEffect(() => {
    setDraft(credentialDraftFromConnection(connection))
    setAccessibleApps([])
    setFeedback(null)
  }, [connection])

  const updateDraft = (field: keyof AppStoreConnectCredentialDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  const runTask = (label: string, task: () => Promise<string>) => {
    setBusy(label)
    setFeedback(null)
    task()
      .then((message) => {
        setFeedback(message)
        onRefreshConsoleData()
      })
      .catch((error: unknown) => {
        setFeedback(error instanceof Error ? error.message : 'App Store Connect operation failed')
      })
      .finally(() => setBusy(null))
  }

  const saveCredential = () => {
    runTask('save', async () => {
      await saveAppStoreConnectCredential({ data: draft })
      return 'App Store Connect credential saved and validated.'
    })
  }

  const listAccessibleApps = () => {
    runTask('list-apps', async () => {
      const result = await listAppStoreConnectApps({ data: connection?.hasPrivateKey ? {} : draft })
      setAccessibleApps(result)
      return `${result.length} App Store Connect apps found for this key.`
    })
  }

  const validateCredential = () => {
    runTask('validate', async () => {
      await validateAppStoreConnectCredential({ data: {} })
      return 'Capability preflight finished.'
    })
  }

  const deleteCredential = () => {
    runTask('delete', async () => {
      await deleteAppStoreConnectCredential({ data: {} })
      setPreview([])
      return 'Local encrypted private key material deleted. Revoke the key in App Store Connect too.'
    })
  }


  return (
    <section className="max-w-[1080px] animate-[subs-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <ViewTitle
        description="Tenant-wide App Store Connect access used to list and connect iOS apps."
        title="Workspace Settings"
      />

      <div className="mt-[20px] grid grid-cols-[1.15fr_0.85fr] gap-[16px] max-lg:grid-cols-1">
        <SettingsCard
          description="Upload one App Store Connect API key for this tenant. It can list and connect multiple iOS apps; individual apps are selected from the New App flow."
          title="Tenant App Store Connect key"
        >
          <CredentialForm draft={draft} hasStoredKey={connection?.hasPrivateKey ?? false} onChange={updateDraft} />
          <div className="flex flex-wrap gap-[8px]">
            <ActionButton disabled={busy != null} label={connection == null ? 'Save & validate key' : 'Save / rotate key'} onPress={saveCredential} tone="primary" />
            <ActionButton disabled={busy != null} label="List accessible apps" onPress={listAccessibleApps} />
            <ActionButton disabled={busy != null || connection == null} label="Run preflight" onPress={validateCredential} />
            <ActionButton disabled={busy != null || connection == null} label="Delete tenant key" onPress={deleteCredential} tone="danger" />
          </div>
          {feedback != null ? <div className="rounded-[10px] border border-[var(--subs-border)] bg-[var(--subs-panel-2)] px-[12px] py-[10px] text-[12.5px] text-[var(--subs-dim)]">{feedback}</div> : null}
          {accessibleApps.length > 0 ? <AccessibleAppList apps={accessibleApps} /> : null}
        </SettingsCard>

        <SettingsCard description="What this credential can do right now." title="Connection health">
          {connection == null ? (
            <EmptySettingsText>No App Store Connect credential is configured yet.</EmptySettingsText>
          ) : (
            <>
              <ConnectionSummary connection={connection} />
              <CapabilityList capabilities={connection.capabilities} />
            </>
          )}
        </SettingsCard>
      </div>

      <SettingsCard description="Customer-visible history for credential actions. Secret values are redacted." title="Audit log">
        <AuditHistory connection={connection} />
      </SettingsCard>
    </section>
  )
}

export function AppSettingsView({
  app,
  connection,
  onAppDeleted,
  onRefreshConsoleData,
}: {
  app: AppTenant
  connection: AppStoreConnectConnection | null
  onAppDeleted: (id: string) => void
  onRefreshConsoleData: () => void
}) {
  const [busy, setBusy] = React.useState<string | null>(null)
  const [feedback, setFeedback] = React.useState<string | null>(null)
  const [preview, setPreview] = React.useState<AppStoreConnectProductPreview[]>([])
  const [monitoring, setMonitoring] = React.useState<AppStoreConnectMonitorSnapshot | null>(null)
  const [reportDate, setReportDate] = React.useState('')
  const [deleteConfirmation, setDeleteConfirmation] = React.useState('')

  React.useEffect(() => {
    setPreview([])
    setMonitoring(null)
    setFeedback(null)
    setDeleteConfirmation('')
  }, [app])

  const runTask = (label: string, task: () => Promise<string>) => {
    setBusy(label)
    setFeedback(null)
    task()
      .then((message) => {
        setFeedback(message)
        onRefreshConsoleData()
      })
      .catch((error: unknown) => {
        setFeedback(error instanceof Error ? error.message : 'App Store Connect operation failed')
      })
      .finally(() => setBusy(null))
  }

  const previewProducts = () => {
    runTask('preview', async () => {
      const result = await previewAppStoreConnectProducts({ data: { appId: app.id } })
      setPreview(result)
      return `${result.length} Apple catalogue products compared with local products.`
    })
  }

  const importProducts = () => {
    runTask('import', async () => {
      const result = await importAppStoreConnectProductPreview({ data: { appId: app.id, preview } })
      return `${result.created} products created, ${result.updated} updated, ${result.skipped} skipped.`
    })
  }

  const syncSalesReport = () => {
    runTask('sales-report', async () => {
      const result = await syncAppStoreConnectSalesReport({ data: { appId: app.id, reportDate: reportDate || undefined } })
      return result.status === 'imported'
        ? `Sales Report ${result.reportDate} imported with ${result.rowCount} rows.`
        : `Sales Report ${result.reportDate} failed; see import history.`
    })
  }

  const inspectMonitoring = () => {
    runTask('monitoring', async () => {
      const result = await inspectAppStoreConnectMonitoring({ data: { appId: app.id } })
      setMonitoring(result)
      return `Monitoring snapshot refreshed at ${result.checkedAt}.`
    })
  }

  const deleteApp = () => {
    if (deleteConfirmation !== app.name) return
    setBusy('delete-app')
    setFeedback(null)
    deleteAppRecord({ data: { appId: app.id } })
      .then(() => {
        setBusy(null)
        onRefreshConsoleData()
        onAppDeleted(app.id)
      })
      .catch((error: unknown) => {
        setFeedback(error instanceof Error ? error.message : 'App could not be deleted')
        setBusy(null)
      })
  }

  return (
    <section className="max-w-[1080px] animate-[subs-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <ViewTitle description={`App-specific App Store Connect workflows for ${app.name}. Workspace credentials live in Workspace Settings.`} title="App Settings" />

      {feedback != null ? <div className="mt-[16px] rounded-[10px] border border-[var(--subs-border)] bg-[var(--subs-panel-2)] px-[12px] py-[10px] text-[12.5px] text-[var(--subs-dim)]">{feedback}</div> : null}

      <div className="grid grid-cols-[1fr_1fr] gap-[16px] max-lg:grid-cols-1">
        <SettingsCard description="Fetch Apple subscriptions and IAPs, compare them with local products, then import local records after review." title="Subscription product sync">
          <div className="flex flex-wrap gap-[8px]">
            <ActionButton disabled={busy != null || connection == null || connection.status === 'deleted'} label="Preview Apple products" onPress={previewProducts} />
            <ActionButton disabled={busy != null || preview.length === 0} label="Import local changes" onPress={importProducts} tone="primary" />
          </div>
          {preview.length > 0 ? <ProductPreviewTable preview={preview} /> : <EmptySettingsText>No preview yet. This only reads from Apple and does not mutate App Store Connect.</EmptySettingsText>}
        </SettingsCard>

        <SettingsCard description="Download the latest daily Sales & Trends report. Raw imports are kept separate from derived metrics." title="Sales report sync">
          <div className="flex gap-[10px] max-sm:flex-col">
            <PUIInput
              className="font-mono"
              onChange={(event) => setReportDate(event.target.value)}
              placeholder="YYYY-MM-DD, default yesterday"
              type="text"
              value={reportDate}
            />
            <ActionButton disabled={busy != null || connection == null || connection.vendorNumber == null} label="Sync report" onPress={syncSalesReport} tone="primary" />
          </div>
          <SalesReportHistory connection={connection} />
        </SettingsCard>
      </div>

      <SettingsCard description="Read release versions, TestFlight builds, customer reviews, and provisioning metadata before deeper workflows." title="Release and store monitoring">
        <div className="flex flex-wrap gap-[8px]">
          <ActionButton disabled={busy != null || connection == null || connection.status === 'deleted'} label="Inspect monitoring" onPress={inspectMonitoring} />
        </div>
        {monitoring == null ? <EmptySettingsText>No monitoring snapshot yet. This is read-only App Store Connect inspection.</EmptySettingsText> : <MonitoringSnapshot snapshot={monitoring} />}
      </SettingsCard>

      <SettingsCard
        description="Delete this app and all local subscription-console records for it. App Store Connect is not changed."
        title="Danger zone"
        tone="danger"
      >
        <div className="rounded-[11px] border border-[color-mix(in_oklch,var(--subs-red)_24%,var(--subs-border))] bg-[color-mix(in_oklch,var(--subs-red)_5%,white)] px-[12px] py-[10px] text-[12.5px] leading-[1.45] text-[var(--subs-dim)]">
          This removes local products, entitlements, offerings, subscribers, imported reports, and app-scoped audit entries for <strong className="text-[var(--subs-text)]">{app.name}</strong>.
        </div>
        <div className="flex flex-col gap-[7px]">
          <label className="text-[12.5px] font-semibold text-[var(--subs-text)]" htmlFor="delete-app-confirmation">
            Type <span className="font-mono">{app.name}</span> to confirm
          </label>
          <PUIInput
            className="font-mono"
            disabled={busy != null}
            id="delete-app-confirmation"
            onChange={(event) => setDeleteConfirmation(event.target.value)}
            placeholder={app.name}
            value={deleteConfirmation}
          />
        </div>
        <div className="flex justify-end">
          <ActionButton
            disabled={busy != null || deleteConfirmation !== app.name}
            label={busy === 'delete-app' ? 'Deleting app…' : 'Delete app'}
            onPress={deleteApp}
            tone="danger"
          />
        </div>
      </SettingsCard>
    </section>
  )
}

function AccessibleAppList({ apps }: { apps: AppStoreConnectAccessibleApp[] }) {
  return (
    <div className="rounded-[11px] border border-[var(--subs-border)]">
      <div className="border-b border-[var(--subs-border)] bg-[var(--subs-panel-2)] px-[12px] py-[9px] text-[12px] font-semibold">Accessible App Store Connect apps</div>
      {apps.map((app) => (
        <div
          className="grid grid-cols-[1fr_1fr_auto] gap-[10px] border-b border-[var(--subs-border)] px-[12px] py-[10px] text-left text-[12px] last:border-b-0 max-sm:grid-cols-1"
          key={app.appleAppId}
        >
          <span className="font-semibold text-[var(--subs-text)]">{app.name}</span>
          <span className="font-mono text-[var(--subs-dim)]">{app.bundleId || 'No bundle ID returned'}</span>
          <span className="font-mono text-[var(--subs-faint)]">{app.appleAppId}</span>
        </div>
      ))}
    </div>
  )
}

function SettingsCard({ children, description, title, tone = 'neutral' }: { children: React.ReactNode; description?: string; title: string; tone?: 'danger' | 'neutral' }) {
  return (
    <PUICard
      className={cn(
        'mt-[16px] rounded-[14px] border-[var(--subs-border)] bg-[var(--subs-panel)] p-[20px] first:mt-[20px]',
        tone === 'danger' && 'border-[color-mix(in_oklch,var(--subs-red)_32%,var(--subs-border))]',
      )}
    >
      <div className={cn('mb-[14px] text-[14px] font-semibold', tone === 'danger' && 'text-[var(--subs-red)]')}>{title}</div>
      {description != null ? <div className="mb-[12px] text-[12.5px] text-[var(--subs-dim)]">{description}</div> : null}
      <div className="flex flex-col gap-[12px]">{children}</div>
    </PUICard>
  )
}

function EmptySettingsText({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[10px] border border-[var(--subs-border)] bg-[var(--subs-panel-2)] px-[12px] py-[10px] text-[12.5px] text-[var(--subs-dim)]">{children}</div>
}

function credentialDraftFromConnection(connection: AppStoreConnectConnection | null): AppStoreConnectCredentialDraft {
  return {
    issuerId: connection?.issuerId ?? '',
    keyId: connection?.keyId ?? '',
    privateKey: '',
    vendorNumber: connection?.vendorNumber ?? '',
  }
}

function ConnectionSummary({ connection }: { connection: AppStoreConnectConnection }) {
  return (
    <div className="rounded-[11px] border border-[var(--subs-border)] bg-[var(--subs-panel-2)] p-[13px]">
      <div className="flex items-center justify-between gap-[12px]">
        <div>
          <div className="text-[13px] font-semibold">Key {connection.keyId}</div>
          <div className="mt-[3px] font-mono text-[11.5px] text-[var(--subs-faint)]">Issuer {connection.issuerId}</div>
        </div>
        <StatusLabel label={connection.status.replaceAll('_', ' ')} tone={connectionStatusTone(connection.status)} />
      </div>
      <div className="mt-[12px] grid grid-cols-2 gap-[8px] text-[12px] max-sm:grid-cols-1">
        <ConnectionFact label="Scope" value="Tenant" />
        <ConnectionFact label="Vendor Number" value={connection.vendorNumber ?? 'Missing'} />
        <ConnectionFact label="Private key" value={connection.keyFingerprint == null ? 'Missing' : `sha256:${connection.keyFingerprint}`} />
      </div>
      {connection.lastError != null ? <div className="mt-[10px] rounded-[9px] border border-[color-mix(in_oklch,var(--subs-red)_30%,var(--subs-border))] bg-[color-mix(in_oklch,var(--subs-red)_8%,white)] px-[10px] py-[8px] text-[12px] text-[var(--subs-red)]">{connection.lastError}</div> : null}
      {connection.lastValidatedAt != null ? <div className="mt-[9px] text-[11.5px] text-[var(--subs-faint)]">Last preflight: {connection.lastValidatedAt}</div> : null}
    </div>
  )
}

function ConnectionFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[9px] border border-[var(--subs-border)] bg-[var(--subs-panel)] px-[10px] py-[8px]">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-[var(--subs-faint)]">{label}</div>
      <div className="mt-[3px] truncate font-mono text-[12px] text-[var(--subs-text)]">{value}</div>
    </div>
  )
}

function CapabilityList({ capabilities }: { capabilities: AppStoreConnectConnection['capabilities'] }) {
  if (capabilities.length === 0) return <EmptySettingsText>No preflight has run yet.</EmptySettingsText>
  return (
    <div className="rounded-[11px] border border-[var(--subs-border)]">
      {capabilities.map((capability) => (
        <div className="border-b border-[var(--subs-border)] px-[12px] py-[11px] last:border-b-0" key={capability.key}>
          <div className="flex items-center justify-between gap-[10px]">
            <div className="text-[13px] font-semibold">{capability.label}</div>
            <StatusLabel label={capability.status} tone={capabilityStatusTone(capability.status)} />
          </div>
          <div className="mt-[4px] text-[12px] text-[var(--subs-dim)]">{capability.description}</div>
          <div className="mt-[3px] text-[11.5px] text-[var(--subs-faint)]">{capability.detail}</div>
        </div>
      ))}
    </div>
  )
}

function ProductPreviewTable({ preview }: { preview: AppStoreConnectProductPreview[] }) {
  return (
    <div className="max-h-[360px] overflow-auto rounded-[11px] border border-[var(--subs-border)]">
      <div className="grid min-w-[720px] grid-cols-[0.8fr_1.2fr_1.2fr_0.9fr_1.2fr] gap-[10px] border-b border-[var(--subs-border)] bg-[var(--subs-panel-2)] px-[12px] py-[9px] text-[10.5px] font-semibold uppercase tracking-[0.04em] text-[var(--subs-faint)]">
        <div>Action</div>
        <div>Apple product</div>
        <div>Local product</div>
        <div>State</div>
        <div>Note</div>
      </div>
      {preview.map((item) => (
        <div className="grid min-w-[720px] grid-cols-[0.8fr_1.2fr_1.2fr_0.9fr_1.2fr] gap-[10px] border-b border-[var(--subs-border)] px-[12px] py-[10px] text-[12px] last:border-b-0" key={`${item.appleProductId}-${item.action}`}>
          <StatusLabel label={item.action} tone={productActionTone(item.action)} />
          <div className="min-w-0">
            <div className="truncate font-semibold">{item.appleName}</div>
            <div className="truncate font-mono text-[11px] text-[var(--subs-faint)]">{item.appleProductId}</div>
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold">{item.localName ?? 'New local product'}</div>
            <div className="truncate font-mono text-[11px] text-[var(--subs-faint)]">{item.localIdentifier ?? item.entitlement}</div>
          </div>
          <div className="font-mono text-[11.5px] text-[var(--subs-dim)]">{item.appleState}</div>
          <div className="text-[11.5px] text-[var(--subs-dim)]">{item.note}</div>
        </div>
      ))}
    </div>
  )
}

function SalesReportHistory({ connection }: { connection: AppStoreConnectConnection | null }) {
  if (!connection?.salesReports.length) {
    return <EmptySettingsText>Vendor Number required. Reports are delayed Apple snapshots, not realtime entitlements.</EmptySettingsText>
  }
  return (
    <div className="overflow-hidden rounded-[11px] border border-[var(--subs-border)]">
      {connection.salesReports.map((report) => (
        <div className="grid grid-cols-[0.9fr_0.8fr_0.7fr_1.2fr] gap-[10px] border-b border-[var(--subs-border)] px-[12px] py-[10px] text-[12px] last:border-b-0" key={report.id}>
          <span className="font-mono font-semibold">{report.reportDate}</span>
          <StatusLabel label={report.status} tone={report.status === 'imported' ? 'success' : 'destructive'} />
          <span className="font-mono text-[var(--subs-dim)]">{report.rowCount} rows</span>
          <span className="truncate text-[var(--subs-faint)]">{report.errorDetail ?? report.createdAt}</span>
        </div>
      ))}
    </div>
  )
}

function MonitoringSnapshot({ snapshot }: { snapshot: AppStoreConnectMonitorSnapshot }) {
  return (
    <div className="grid grid-cols-2 gap-[12px] max-lg:grid-cols-1">
      {snapshot.sections.map((section) => (
        <div className="rounded-[11px] border border-[var(--subs-border)]" key={section.title}>
          <div className="border-b border-[var(--subs-border)] bg-[var(--subs-panel-2)] px-[12px] py-[9px] text-[12px] font-semibold">{section.title}</div>
          {section.items.length === 0 ? (
            <div className="px-[12px] py-[10px] text-[12px] text-[var(--subs-faint)]">No records returned.</div>
          ) : (
            section.items.map((item) => (
              <div className="border-b border-[var(--subs-border)] px-[12px] py-[10px] text-[12px] last:border-b-0" key={item.id}>
                <div className="flex items-center justify-between gap-[8px]">
                  <span className="font-semibold text-[var(--subs-text)]">{item.label}</span>
                  <span className="rounded-[999px] border border-[var(--subs-border)] px-[7px] py-[2px] font-mono text-[10.5px] text-[var(--subs-dim)]">{item.status}</span>
                </div>
                <div className="mt-[4px] text-[var(--subs-dim)]">{item.detail}</div>
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  )
}

function AuditHistory({ connection }: { connection: AppStoreConnectConnection | null }) {
  if (!connection?.auditEvents.length) return <EmptySettingsText>No App Store Connect audit events yet.</EmptySettingsText>
  return (
    <div className="rounded-[11px] border border-[var(--subs-border)]">
      {connection.auditEvents.map((event) => (
        <div className="grid grid-cols-[0.8fr_1fr_2fr] gap-[12px] border-b border-[var(--subs-border)] px-[12px] py-[10px] text-[12px] last:border-b-0 max-md:grid-cols-1" key={event.id}>
          <span className="font-mono text-[var(--subs-faint)]">{event.createdAt}</span>
          <span className="font-mono font-semibold text-[var(--subs-text)]">{event.action}</span>
          <span className="text-[var(--subs-dim)]">{event.detail}</span>
        </div>
      ))}
    </div>
  )
}

function ActionButton({ disabled, label, onPress, tone = 'neutral' }: { disabled: boolean; label: string; onPress: () => void; tone?: 'danger' | 'neutral' | 'primary' }) {
  return (
    <button
      className={cn(
        'min-h-[36px] cursor-pointer rounded-[9px] px-[13px] py-[8px] text-[12.5px] font-semibold transition-colors duration-fast disabled:cursor-not-allowed disabled:opacity-50',
        tone === 'primary' && 'bg-[var(--subs-text)] text-white hover:bg-[color-mix(in_oklch,var(--subs-text)_88%,white)]',
        tone === 'neutral' && 'border border-[var(--subs-border)] bg-[var(--subs-panel)] text-[var(--subs-text)] hover:bg-[var(--subs-panel-2)]',
        tone === 'danger' && 'border border-[color-mix(in_oklch,var(--subs-red)_30%,var(--subs-border))] bg-white text-[var(--subs-red)] hover:bg-[color-mix(in_oklch,var(--subs-red)_7%,white)]',
      )}
      disabled={disabled}
      onClick={onPress}
      type="button"
    >
      {label}
    </button>
  )
}

function connectionStatusTone(status: AppStoreConnectConnection['status']): StatusTone {
  if (status === 'connected') return 'success'
  if (status === 'invalid' || status === 'deleted') return 'destructive'
  return 'warning'
}

function capabilityStatusTone(status: AppStoreConnectCapabilityStatus): StatusTone {
  if (status === 'available') return 'success'
  if (status === 'missing') return 'destructive'
  return 'warning'
}

function productActionTone(action: AppStoreConnectProductSyncAction): StatusTone {
  if (action === 'create') return 'success'
  if (action === 'update') return 'warning'
  if (action === 'conflict') return 'destructive'
  return 'muted'
}
