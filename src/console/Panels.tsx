import * as React from 'react'

import type { PanelState } from '~/console/types'
import { AppUserPanel } from '~/domain/app-users/AppUserPanel'
import { NewAppDialog } from '~/domain/apps/NewAppDialog'
import type { AppDraft, AppDraftField } from '~/domain/apps/types'
import { ProductPanel } from '~/domain/products/ProductPanel'
import type { EditableCatalogProductTextField } from '~/domain/products/types'
import { NewTenantDialog } from '~/domain/tenants/NewTenantDialog'
import type { TenantDraft, TenantDraftField } from '~/domain/tenants/types'
import type {
  AppStoreConnectAccessibleApp,
  AppStoreConnectConnection,
} from '~/integrations/app-store-connect/types'

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
  const previousFocusRef = React.useRef<Element | null>(null)

  React.useEffect(() => {
    if (panel.kind === 'closed') return

    previousFocusRef.current = document.activeElement
    window.requestAnimationFrame(() => {
      const dialog = currentDialog()
      if (dialog == null) return
      const [firstFocusable] = dialogFocusables(dialog)
      if (firstFocusable != null) {
        firstFocusable.focus()
        return
      }
      dialog.focus()
    })

    return () => {
      const previous = previousFocusRef.current
      if (previous instanceof HTMLElement) previous.focus()
      previousFocusRef.current = null
    }
  }, [panel.kind])

  React.useEffect(() => {
    if (panel.kind === 'closed') return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') return
      const dialog = currentDialog()
      if (dialog == null) return
      const focusables = dialogFocusables(dialog)
      if (focusables.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (first == null || last == null) return

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
        return
      }

      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, panel.kind])

  if (panel.kind === 'closed') return null

  return (
    <>
      <button
        aria-label="Close panel"
        className="fixed inset-0 z-[80] animate-[subkit-fade-in_160ms_ease] cursor-default bg-[rgba(24,24,40,0.32)]"
        onClick={onClose}
        tabIndex={-1}
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

function currentDialog(): HTMLElement | null {
  const element = document.querySelector('[role="dialog"]')
  return element instanceof HTMLElement ? element : null
}

function dialogFocusables(dialog: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',')

  return [...dialog.querySelectorAll(selector)].filter((element): element is HTMLElement => {
    if (!(element instanceof HTMLElement)) return false
    return element.offsetParent != null || element === document.activeElement
  })
}
