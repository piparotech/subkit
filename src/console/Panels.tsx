import { AppUserPanel } from '~/domain/app-users/AppUserPanel'
import { NewAppDialog } from '~/domain/apps/NewAppDialog'
import { NewTenantDialog } from '~/domain/tenants/NewTenantDialog'
import { ProductPanel } from '~/domain/products/ProductPanel'
import type { AppDraft, AppDraftField } from '~/domain/apps/types'
import type { EditableCatalogProductTextField } from '~/domain/products/types'
import type { TenantDraft, TenantDraftField } from '~/domain/tenants/types'
import type { AppStoreConnectAccessibleApp, AppStoreConnectConnection } from '~/integrations/app-store-connect/types'
import type { PanelState } from '~/console/types'

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
  onProductFieldChange: (field: EditableCatalogProductTextField, value: string) => void
  onProductTrialToggle: () => void
  onSaveProduct: () => void
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
  onProductFieldChange,
  onProductTrialToggle,
  onSaveProduct,
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
      {panel.kind === 'product' ? (
        <ProductPanel
          mode={panel.mode}
          onClose={onClose}
          onFieldChange={onProductFieldChange}
          onSave={onSaveProduct}
          onTrialToggle={onProductTrialToggle}
          product={panel.product}
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
