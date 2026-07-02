import * as React from 'react'

import { AccessibleAppList } from '~/integrations/app-store-connect/components/AccessibleAppList'
import { ActionButton } from '~/components/ui/ActionButton'
import { AppStoreConnectCredentialForm } from '~/integrations/app-store-connect/components/AppStoreConnectCredentialForm'
import { listAppStoreConnectApps } from '~/integrations/app-store-connect/server/apps'
import {
  deleteAppStoreConnectCredential,
  saveAppStoreConnectCredential,
  validateAppStoreConnectCredential,
} from '~/integrations/app-store-connect/server/actions'
import { AuditHistory } from '~/integrations/app-store-connect/components/AuditHistory'
import { CapabilityList } from '~/integrations/app-store-connect/components/CapabilityList'
import { ConnectionSummary } from '~/integrations/app-store-connect/components/ConnectionSummary'
import { credentialDraftFromConnection } from '~/integrations/app-store-connect/credentialDraftFromConnection'
import { EmptySettingsText } from '~/components/ui/EmptySettingsText'
import { Notice, type NoticeTone } from '~/components/ui/Notice'
import { SettingsCard } from '~/components/ui/SettingsCard'
import type { WorkspaceTenant } from '~/domain/tenants/types'
import type {
  AppStoreConnectAccessibleApp,
  AppStoreConnectConnection,
  AppStoreConnectCredentialDraft,
  AppStoreConnectTenantSyncResult,
} from '~/integrations/app-store-connect/types'
import { ViewTitle } from '~/components/ui/ViewTitle'

function formatTenantSyncResult(result: AppStoreConnectTenantSyncResult): string {
  const sales = result.salesReport == null ? '' : ` Sales Report ${result.salesReport.reportDate}: ${result.salesReport.status}.`
  return `${result.appsFound} apps found, ${result.appsCreated} created, ${result.appsUpdated} updated, ${result.appsSynced} catalogs synced, ${result.appsFailed} failed. Products: ${result.productsCreated} created, ${result.productsUpdated} updated, ${result.productsUnchanged} unchanged, ${result.productsConflicts} conflicts.${sales}`
}

export function WorkspaceSettingsView({
  connection,
  onRefreshConsoleData,
  tenant,
}: {
  connection: AppStoreConnectConnection | null
  onRefreshConsoleData: () => void
  tenant: WorkspaceTenant
}) {
  const [draft, setDraft] = React.useState<AppStoreConnectCredentialDraft>(() => credentialDraftFromConnection(connection))
  const [busy, setBusy] = React.useState<string | null>(null)
  const [feedback, setFeedback] = React.useState<{ message: string; tone: NoticeTone } | null>(null)
  const [accessibleApps, setAccessibleApps] = React.useState<AppStoreConnectAccessibleApp[]>([])
  const canManageTenant = tenant.role === 'admin' || tenant.role === 'super_admin'

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
        setFeedback({ message, tone: 'success' })
        onRefreshConsoleData()
      })
      .catch((error: unknown) => {
        setFeedback({ message: error instanceof Error ? error.message : 'App Store Connect operation failed', tone: 'danger' })
      })
      .finally(() => setBusy(null))
  }

  const saveCredential = () => {
    runTask('save', async () => {
      const result = await saveAppStoreConnectCredential({ data: { ...draft, tenantId: tenant.id } })
      return `App Store Connect credential saved and validated. ${formatTenantSyncResult(result.sync)}`
    })
  }

  const listAccessibleApps = () => {
    runTask('list-apps', async () => {
      const result = await listAppStoreConnectApps({ data: connection?.hasPrivateKey ? { tenantId: tenant.id } : { ...draft, tenantId: tenant.id } })
      setAccessibleApps(result)
      return `${result.length} App Store Connect apps found for this key.`
    })
  }

  const validateCredential = () => {
    runTask('validate', async () => {
      await validateAppStoreConnectCredential({ data: { tenantId: tenant.id } })
      return 'Capability preflight finished.'
    })
  }

  const deleteCredential = () => {
    runTask('delete', async () => {
      await deleteAppStoreConnectCredential({ data: { tenantId: tenant.id } })
      return 'Local encrypted private key material deleted. Revoke the key in App Store Connect too.'
    })
  }

  return (
    <section className="max-w-[1080px] animate-[subkit-fade-in_200ms_ease] px-[32px] py-[28px] max-md:px-[18px]">
      <ViewTitle
        description="Workspace-wide App Store Connect access used to list and connect iOS apps."
        title="Workspace Settings"
      />

      <div className="mt-[20px] grid grid-cols-[1.15fr_0.85fr] gap-[16px] max-lg:grid-cols-1">
        <SettingsCard
          description="Upload one App Store Connect API key for this workspace. Saving immediately imports accessible iOS apps, subscription products, IAPs, and the latest Sales Report when a Vendor Number is set."
          title="Workspace App Store Connect key"
        >
          <AppStoreConnectCredentialForm draft={draft} hasStoredKey={connection?.hasPrivateKey ?? false} onChange={updateDraft} />
          <div className="flex flex-wrap gap-[8px]">
            <ActionButton disabled={busy != null || !canManageTenant} label={busy === 'save' ? 'Saving & syncing…' : connection == null ? 'Save, validate & sync key' : 'Save, rotate & sync key'} onPress={saveCredential} tone="primary" />
            <ActionButton disabled={busy != null} label="List accessible apps" onPress={listAccessibleApps} />
            <ActionButton disabled={busy != null || connection == null || !canManageTenant} label="Run preflight" onPress={validateCredential} />
            <ActionButton disabled={busy != null || connection == null || !canManageTenant} label="Delete workspace key" onPress={deleteCredential} tone="danger" />
          </div>
          {feedback != null ? <Notice className="m-0" tone={feedback.tone}>{feedback.message}</Notice> : null}
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
