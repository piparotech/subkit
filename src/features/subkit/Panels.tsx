import { AppUserPanel } from './AppUserPanel'
import { NewAppDialog } from './NewAppDialog'
import { NewTenantDialog } from './NewTenantDialog'
import { SubscriptionPanel } from './SubscriptionPanel'
import type {
  AppDraft,
  AppDraftField,
  AppStoreConnectAccessibleApp,
  AppStoreConnectConnection,
  EditableSubscriptionTextField,
  PanelState,
  TenantDraft,
  TenantDraftField,
} from './types'

interface PanelsProps {
  appDraft: AppDraft
  appStoreApps: AppStoreConnectAccessibleApp[]
  appStoreAppsLoaded: boolean
  appStoreConnection: AppStoreConnectConnection | null
  appStoreLoadError: string | null
  loadingAppStoreApps: boolean
  onAppDraftChange: (field: AppDraftField, value: string) => void
  onClose: () => void
  onCreateApp: () => void
  onCreateTenant: () => void
  onSaveSubscription: () => void
  onSubscriptionFieldChange: (field: EditableSubscriptionTextField, value: string) => void
  onSubscriptionTrialToggle: () => void
  onTenantDraftChange: (field: TenantDraftField, value: string) => void
  panel: PanelState
  tenantDraft: TenantDraft
}

export function Panels({
  appDraft,
  appStoreApps,
  appStoreAppsLoaded,
  appStoreConnection,
  appStoreLoadError,
  loadingAppStoreApps,
  onAppDraftChange,
  onClose,
  onCreateApp,
  onCreateTenant,
  onSaveSubscription,
  onSubscriptionFieldChange,
  onSubscriptionTrialToggle,
  onTenantDraftChange,
  panel,
  tenantDraft,
}: PanelsProps) {
  if (panel.kind === 'closed') return null

  return (
    <>
      <button
        aria-label="Close panel"
        className="fixed inset-0 z-[80] animate-[subkit-fade-in_160ms_ease] cursor-default bg-[rgba(24,24,40,0.32)]"
        onClick={onClose}
        type="button"
      />
      {panel.kind === 'subscription' ? (
        <SubscriptionPanel
          mode={panel.mode}
          onClose={onClose}
          onFieldChange={onSubscriptionFieldChange}
          onSave={onSaveSubscription}
          onTrialToggle={onSubscriptionTrialToggle}
          subscription={panel.subscription}
        />
      ) : null}
      {panel.kind === 'appUser' ? <AppUserPanel appUser={panel.appUser} onClose={onClose} /> : null}
      {panel.kind === 'newApp' ? (
        <NewAppDialog
          appStoreApps={appStoreApps}
          appStoreAppsLoaded={appStoreAppsLoaded}
          appStoreConnection={appStoreConnection}
          appStoreLoadError={appStoreLoadError}
          draft={appDraft}
          loadingAppStoreApps={loadingAppStoreApps}
          onChange={onAppDraftChange}
          onClose={onClose}
          onCreate={onCreateApp}
        />
      ) : null}
      {panel.kind === 'newTenant' ? (
        <NewTenantDialog
          draft={tenantDraft}
          onChange={onTenantDraftChange}
          onClose={onClose}
          onCreate={onCreateTenant}
        />
      ) : null}
    </>
  )
}
