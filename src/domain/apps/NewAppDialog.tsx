import { PUIButton, PUIText } from '@piparo/cn-web'

import { NewAppForm } from '~/domain/apps/NewAppForm'
import type { AppDraft, AppDraftField } from '~/domain/apps/types'
import type { AppStoreConnectAccessibleApp, AppStoreConnectConnection } from '~/integrations/app-store-connect/types'

export function NewAppDialog({
  appStoreApps,
  appStoreAppsLoaded,
  appStoreConnection,
  appStoreLoadError,
  draft,
  loadingAppStoreApps,
  onChange,
  onClose,
  onCreate,
}: {
  appStoreApps: AppStoreConnectAccessibleApp[]
  appStoreAppsLoaded: boolean
  appStoreConnection: AppStoreConnectConnection | null
  appStoreLoadError: string | null
  draft: AppDraft
  loadingAppStoreApps: boolean
  onChange: (field: AppDraftField, value: string) => void
  onClose: () => void
  onCreate: () => void
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-[24px]">
      <div
        aria-label="Create app"
        aria-modal="true"
        className="w-[620px] max-w-full overflow-hidden rounded-[16px] bg-[var(--subkit-panel)] shadow-[0_24px_60px_-16px_rgba(20,20,50,0.4)] animate-[subkit-pop-in_180ms_ease]"
        role="dialog"
      >
        <div className="px-[24px] pt-[20px]">
          <PUIText as="h2" className="text-[18px] font-bold" variant="title3">
            Create iOS app
          </PUIText>
          <div className="mt-[4px] text-[13px] text-[var(--subkit-dim)]">Select an app from App Store Connect using the tenant API key.</div>
        </div>
        <div className="px-[24px] py-[18px]">
          <NewAppForm
            apps={appStoreApps}
            appsLoaded={appStoreAppsLoaded}
            connection={appStoreConnection}
            draft={draft}
            error={appStoreLoadError}
            loading={loadingAppStoreApps}
            onChange={onChange}
          />
        </div>
        <div className="flex justify-end gap-[10px] border-t border-[var(--subkit-border)] px-[24px] py-[16px]">
          <PUIButton className="rounded-[9px]" label="Cancel" onPress={onClose} variant="outline" />
          <PUIButton className="rounded-[9px]" disabled={draft.appleAppId.trim() === ''} label="Create app" onPress={onCreate} />
        </div>
      </div>
    </div>
  )
}
