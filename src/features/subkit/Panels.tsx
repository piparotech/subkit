import { PUIButton, PUIText, cn } from '@piparo/cn-web'
import { X } from 'lucide-react'
import * as React from 'react'

import { NewAppForm, ProductFormFields, TrialToggle } from './Forms'
import { GhostBox, SoftTag, StatusLabel, ToneDot, toneTextClass } from './ui'
import type {
  AppDraft,
  AppDraftField,
  AppStoreConnectAccessibleApp,
  AppStoreConnectConnection,
  EditableSubscriptionTextField,
  PanelState,
  TenantDraft,
  TenantDraftField,
  Subscriber,
  SubscriptionProduct,
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
      {panel.kind === 'subscriber' ? <SubscriberPanel onClose={onClose} subscriber={panel.subscriber} /> : null}
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

function NewTenantDialog({
  draft,
  onChange,
  onClose,
  onCreate,
}: {
  draft: TenantDraft
  onChange: (field: TenantDraftField, value: string) => void
  onClose: () => void
  onCreate: () => void
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-[24px]">
      <div
        aria-label="Create tenant"
        aria-modal="true"
        className="w-[520px] max-w-full overflow-hidden rounded-[16px] bg-[var(--subkit-panel)] shadow-[0_24px_60px_-16px_rgba(20,20,50,0.4)] animate-[subkit-pop-in_180ms_ease]"
        role="dialog"
      >
        <div className="px-[24px] pt-[20px]">
          <PUIText as="h2" className="text-[18px] font-bold" variant="title3">
            Create tenant
          </PUIText>
          <div className="mt-[4px] text-[13px] text-[var(--subkit-dim)]">Admins are assigned to tenants they create automatically.</div>
        </div>
        <div className="flex flex-col gap-[12px] px-[24px] py-[18px]">
          <label className="flex flex-col gap-[6px] text-[12.5px] font-semibold text-[var(--subkit-text)]">
            Tenant name
            <input
              className="rounded-[9px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[11px] py-[9px] font-sans text-[13px] text-[var(--subkit-text)] outline-none"
              onChange={(event) => onChange('name', event.target.value)}
              placeholder="Customer GmbH"
              value={draft.name}
            />
          </label>
          <label className="flex flex-col gap-[6px] text-[12.5px] font-semibold text-[var(--subkit-text)]">
            Tenant ID
            <input
              className="rounded-[9px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[11px] py-[9px] font-mono text-[13px] text-[var(--subkit-text)] outline-none"
              onChange={(event) => onChange('id', event.target.value)}
              placeholder="customer-gmbh"
              value={draft.id}
            />
          </label>
          <div className="grid grid-cols-[1fr_1.4fr] gap-[10px] max-sm:grid-cols-1">
            <label className="flex flex-col gap-[6px] text-[12.5px] font-semibold text-[var(--subkit-text)]">
              Initials
              <input
                className="rounded-[9px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[11px] py-[9px] font-mono text-[13px] text-[var(--subkit-text)] outline-none"
                onChange={(event) => onChange('initials', event.target.value.toUpperCase())}
                placeholder="CG"
                value={draft.initials}
              />
            </label>
            <label className="flex flex-col gap-[6px] text-[12.5px] font-semibold text-[var(--subkit-text)]">
              Color
              <input
                className="rounded-[9px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[11px] py-[9px] font-mono text-[13px] text-[var(--subkit-text)] outline-none"
                onChange={(event) => onChange('color', event.target.value)}
                value={draft.color}
              />
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-[10px] border-t border-[var(--subkit-border)] px-[24px] py-[16px]">
          <PUIButton className="rounded-[9px]" label="Cancel" onPress={onClose} variant="outline" />
          <PUIButton className="rounded-[9px]" disabled={draft.name.trim() === '' || draft.id.trim() === ''} label="Create tenant" onPress={onCreate} />
        </div>
      </div>
    </div>
  )
}

function SubscriptionPanel({
  mode,
  onClose,
  onFieldChange,
  onSave,
  onTrialToggle,
  subscription,
}: {
  mode: 'new' | 'edit'
  onClose: () => void
  onFieldChange: (field: EditableSubscriptionTextField, value: string) => void
  onSave: () => void
  onTrialToggle: () => void
  subscription: SubscriptionProduct
}) {
  return (
    <aside
      aria-label={mode === 'new' ? 'New subscription' : `Edit ${subscription.name}`}
      className="fixed bottom-0 right-0 top-0 z-[90] flex w-[480px] animate-[subkit-slide-in_220ms_cubic-bezier(.2,.7,.2,1)] flex-col bg-[var(--subkit-panel)] shadow-[-16px_0_40px_-16px_rgba(20,20,50,0.28)] max-sm:left-0 max-sm:w-auto"
      role="dialog"
    >
      <PanelHeader
        kicker={mode === 'new' ? 'New product' : 'Edit subscription'}
        onClose={onClose}
        title={mode === 'new' ? 'New subscription' : subscription.name || 'Subscription'}
      />
      <div className="flex-1 overflow-y-auto p-[22px]">
        <div className="flex flex-col gap-[18px]">
          <ProductFormFields onTextChange={onFieldChange} subscription={subscription} />
          <TrialToggle enabled={subscription.trialOn} onToggle={onTrialToggle} />
        </div>
      </div>
      <PanelActions primaryLabel={mode === 'new' ? 'Create subscription' : 'Save changes'} onClose={onClose} onPrimary={onSave} />
    </aside>
  )
}

function SubscriberPanel({ onClose, subscriber }: { onClose: () => void; subscriber: Subscriber }) {
  return (
    <aside
      aria-label={`App User ${subscriber.userId}`}
      className="fixed bottom-0 right-0 top-0 z-[90] flex w-[460px] animate-[subkit-slide-in_220ms_cubic-bezier(.2,.7,.2,1)] flex-col bg-[var(--subkit-panel)] shadow-[-16px_0_40px_-16px_rgba(20,20,50,0.28)] max-sm:left-0 max-sm:w-auto"
      role="dialog"
    >
      <div className="flex items-start gap-[12px] border-b border-[var(--subkit-border)] px-[22px] py-[18px]">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--subkit-faint)]">App User</div>
          <div className="mt-[3px] break-all font-mono text-[15px] font-bold">{subscriber.userId}</div>
          <div className="mt-[8px]">
            <StatusLabel label={subscriber.status} tone={subscriber.statusTone} />
          </div>
        </div>
        <CloseButton onClose={onClose} />
      </div>
      <div className="flex-1 overflow-y-auto p-[22px]">
        <div className="mb-[22px] grid grid-cols-2 gap-[12px]">
          <SubscriberFact label="Country" value={subscriber.country} />
          <SubscriberFact label="App User since" value={subscriber.since} />
          <SubscriberFact label="Current plan" value={subscriber.plan} />
          <SubscriberFact mono label="Lifetime value" value={subscriber.ltv} />
        </div>

        <div className="mb-[10px] text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--subkit-faint)]">Active entitlements</div>
        <div className="mb-[24px] flex gap-[8px]">
          <SoftTag tone="success">{subscriber.entitlement}</SoftTag>
        </div>

        <div className="mb-[6px] text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--subkit-faint)]">Purchase history</div>
        {subscriber.history.map((event) => (
          <div className="flex items-center gap-[11px] border-b border-[var(--subkit-border)] py-[11px]" key={`${event.type}-${event.date}`}>
            <ToneDot className="shrink-0" tone={event.amountTone} />
            <div className="flex-1">
              <div className="text-[13px] font-medium">{event.type}</div>
              <div className="text-[11.5px] text-[var(--subkit-faint)]">
                {event.date} · {event.store}
              </div>
            </div>
            <div className={cn('font-mono text-[13px] font-semibold', toneTextClass(event.amountTone))}>{event.amount}</div>
          </div>
        ))}
      </div>
    </aside>
  )
}

function NewAppDialog({
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

function PanelHeader({ kicker, onClose, title }: { kicker: string; onClose: () => void; title: string }) {
  return (
    <div className="flex items-center gap-[12px] border-b border-[var(--subkit-border)] px-[22px] py-[18px]">
      <div className="flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--subkit-faint)]">{kicker}</div>
        <div className="mt-[2px] text-[17px] font-bold">{title}</div>
      </div>
      <CloseButton onClose={onClose} />
    </div>
  )
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      aria-label="Close"
      className="flex size-[32px] shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] text-[var(--subkit-dim)]"
      onClick={onClose}
      type="button"
    >
      <X aria-hidden className="size-[14px]" strokeWidth={1.8} />
    </button>
  )
}

function PanelActions({ onClose, onPrimary, primaryLabel }: { onClose: () => void; onPrimary: () => void; primaryLabel: string }) {
  return (
    <div className="flex gap-[10px] border-t border-[var(--subkit-border)] px-[22px] py-[16px]">
      <PUIButton className="flex-1 rounded-[9px]" label="Cancel" onPress={onClose} variant="outline" />
      <PUIButton className="flex-[1.6] rounded-[9px]" label={primaryLabel} onPress={onPrimary} />
    </div>
  )
}

function SubscriberFact({ label, mono = false, value }: { label: string; mono?: boolean; value: string }) {
  return (
    <GhostBox>
      <div className="text-[11.5px] text-[var(--subkit-faint)]">{label}</div>
      <div className={cn('mt-[3px] text-[14px] font-semibold', mono && 'font-mono')}>{value}</div>
    </GhostBox>
  )
}
