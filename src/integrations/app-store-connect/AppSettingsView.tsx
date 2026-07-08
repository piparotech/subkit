import * as React from 'react'

import { ActionButton } from '~/components/ui/ActionButton'
import { EmptySettingsText } from '~/components/ui/EmptySettingsText'
import { Notice, type NoticeTone } from '~/components/ui/Notice'
import { SettingsCard } from '~/components/ui/SettingsCard'
import { ViewTitle } from '~/components/ui/ViewTitle'
import { deleteAppRecord } from '~/console/server'
import type { AppTenant } from '~/domain/apps/types'
import { MonitoringSnapshot } from '~/integrations/app-store-connect/components/MonitoringSnapshot'
import { ProductPreviewTable } from '~/integrations/app-store-connect/components/ProductPreviewTable'
import { SalesReportHistory } from '~/integrations/app-store-connect/components/SalesReportHistory'
import {
  importAppStoreConnectProductPreview,
  previewAppStoreConnectProducts,
  syncAppStoreConnectCatalog,
  syncAppStoreConnectSalesReport,
} from '~/integrations/app-store-connect/server/actions'
import { inspectAppStoreConnectMonitoring } from '~/integrations/app-store-connect/server/monitor'
import type {
  AppStoreConnectConnection,
  AppStoreConnectMonitorSnapshot,
  AppStoreConnectProductPreview,
} from '~/integrations/app-store-connect/types'

import { PUIInput } from '@piparo/cn-web'

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
  const [feedback, setFeedback] = React.useState<{ message: string; tone: NoticeTone } | null>(null)
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
        setFeedback({ message, tone: 'success' })
        onRefreshConsoleData()
      })
      .catch((error: unknown) => {
        setFeedback({
          message: error instanceof Error ? error.message : 'App Store Connect operation failed',
          tone: 'danger',
        })
      })
      .finally(() => setBusy(null))
  }

  const previewProducts = () => {
    runTask('preview', async () => {
      const result = await previewAppStoreConnectProducts({ data: { appId: app.id } })
      setPreview(result)
      return `${result.length} Apple catalog products compared with local products.`
    })
  }

  const importProducts = () => {
    runTask('import', async () => {
      const result = await importAppStoreConnectProductPreview({ data: { appId: app.id, preview } })
      return `${result.created} products created, ${result.updated} updated, ${result.skipped} skipped.`
    })
  }

  const syncCatalog = () => {
    runTask('catalog-sync', async () => {
      const result = await syncAppStoreConnectCatalog({ data: { appId: app.id } })
      setPreview(result.preview)
      return `${result.created} products created, ${result.updated} updated, ${result.unchanged} unchanged, ${result.conflicts} conflicts.`
    })
  }

  const syncSalesReport = () => {
    runTask('sales-report', async () => {
      const result = await syncAppStoreConnectSalesReport({
        data: { appId: app.id, reportDate: reportDate || undefined },
      })
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
        setFeedback({
          message: error instanceof Error ? error.message : 'App could not be deleted',
          tone: 'danger',
        })
        setBusy(null)
      })
  }

  return (
    <section className="max-w-[1080px] animate-[subkit-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <ViewTitle
        description={`App-specific App Store Connect workflows for ${app.name}. Workspace credentials live in Workspace Settings.`}
        title="App Settings"
      />

      {feedback != null ? (
        <Notice className="mt-[16px] mb-[16px]" tone={feedback.tone}>
          {feedback.message}
        </Notice>
      ) : null}

      <div className="grid grid-cols-[1fr_1fr] gap-[16px] max-lg:grid-cols-1">
        <SettingsCard
          description="Fetch Apple subscriptions and IAPs, compare them with local products, then create or update local SubKit products. App Store Connect is never mutated."
          title="Subscription catalog sync"
        >
          <div className="flex flex-wrap gap-[8px]">
            <ActionButton
              disabled={busy != null || connection == null || connection.status === 'deleted'}
              label={busy === 'catalog-sync' ? 'Syncing catalog…' : 'Sync from App Store Connect'}
              onPress={syncCatalog}
              tone="primary"
            />
            <ActionButton
              disabled={busy != null || connection == null || connection.status === 'deleted'}
              label="Preview only"
              onPress={previewProducts}
            />
            <ActionButton
              disabled={busy != null || preview.length === 0}
              label="Import preview"
              onPress={importProducts}
            />
          </div>
          {preview.length > 0 ? (
            <ProductPreviewTable preview={preview} />
          ) : (
            <EmptySettingsText>
              No sync preview yet. Syncing reads Apple catalog data and updates local SubKit records
              only.
            </EmptySettingsText>
          )}
        </SettingsCard>

        <SettingsCard
          description="Download the latest daily Sales & Trends report. Raw imports are kept separate from derived metrics."
          title="Sales report sync"
        >
          <div className="flex gap-[10px] max-sm:flex-col">
            <PUIInput
              className="font-mono"
              onChange={(event) => setReportDate(event.target.value)}
              placeholder="YYYY-MM-DD, default yesterday"
              type="text"
              value={reportDate}
            />
            <ActionButton
              disabled={busy != null || connection == null || connection.vendorNumber == null}
              label="Sync report"
              onPress={syncSalesReport}
              tone="primary"
            />
          </div>
          <SalesReportHistory connection={connection} />
        </SettingsCard>
      </div>

      <SettingsCard
        description="Read release versions, TestFlight builds, customer reviews, and provisioning metadata before deeper workflows."
        title="Release and store monitoring"
      >
        <div className="flex flex-wrap gap-[8px]">
          <ActionButton
            disabled={busy != null || connection == null || connection.status === 'deleted'}
            label="Inspect monitoring"
            onPress={inspectMonitoring}
          />
        </div>
        {monitoring == null ? (
          <EmptySettingsText>
            No monitoring snapshot yet. This is read-only App Store Connect inspection.
          </EmptySettingsText>
        ) : (
          <MonitoringSnapshot snapshot={monitoring} />
        )}
      </SettingsCard>

      <SettingsCard
        description="Runtime APIs answer entitlement checks from SubKit state. App backends read authorization answers; they do not authoritatively sync App User state."
        title="Runtime Entitlement API"
      >
        <EmptySettingsText>
          App backends should query{' '}
          <span className="font-mono">/api/runtime/entitlements/check</span> with{' '}
          <span className="font-mono">appId</span>, <span className="font-mono">appUserId</span>,
          and <span className="font-mono">entitlement</span>. SubKit answers from local App User
          entitlement grants.
        </EmptySettingsText>
      </SettingsCard>

      <SettingsCard
        description="Delete this app and all local SubKit records for it. App Store Connect is not changed."
        title="Danger zone"
        tone="danger"
      >
        <div className="rounded-[11px] border border-[color-mix(in_oklch,var(--subkit-red)_24%,var(--subkit-border))] bg-[color-mix(in_oklch,var(--subkit-red)_5%,white)] px-[12px] py-[10px] text-[12.5px] leading-[1.45] text-[var(--subkit-dim)]">
          This removes local products, entitlements, offerings, App Users, imported reports, and
          app-scoped audit entries for{' '}
          <strong className="text-[var(--subkit-text)]">{app.name}</strong>.
        </div>
        <div className="flex flex-col gap-[7px]">
          <label
            className="text-[12.5px] font-semibold text-[var(--subkit-text)]"
            htmlFor="delete-app-confirmation"
          >
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
