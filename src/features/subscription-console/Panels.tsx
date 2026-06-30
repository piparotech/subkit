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
  AppStoreConnectCredentialDraft,
  EditableSubscriptionTextField,
  PanelState,
  Subscriber,
  SubscriptionProduct,
} from './types'

interface PanelsProps {
  appDraft: AppDraft
  appStoreApps: AppStoreConnectAccessibleApp[]
  appStoreConnection: AppStoreConnectConnection | null
  appStoreCredentialDraft: AppStoreConnectCredentialDraft
  appStoreLoadError: string | null
  loadingAppStoreApps: boolean
  onAppDraftChange: (field: AppDraftField, value: string) => void
  onAppStoreCredentialDraftChange: (field: keyof AppStoreConnectCredentialDraft, value: string) => void
  onClose: () => void
  onCreateApp: () => void
  onLoadAppStoreApps: () => void
  onSaveSubscription: () => void
  onSubscriptionFieldChange: (field: EditableSubscriptionTextField, value: string) => void
  onSubscriptionTrialToggle: () => void
  panel: PanelState
}

export function Panels({
  appDraft,
  appStoreApps,
  appStoreConnection,
  appStoreCredentialDraft,
  appStoreLoadError,
  loadingAppStoreApps,
  onAppDraftChange,
  onAppStoreCredentialDraftChange,
  onClose,
  onCreateApp,
  onLoadAppStoreApps,
  onSaveSubscription,
  onSubscriptionFieldChange,
  onSubscriptionTrialToggle,
  panel,
}: PanelsProps) {
  if (panel.kind === 'closed') return null

  return (
    <>
      <button
        aria-label="Close panel"
        className="fixed inset-0 z-[80] animate-[subs-fade-in_160ms_ease] cursor-default bg-[rgba(24,24,40,0.32)]"
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
          appStoreConnection={appStoreConnection}
          appStoreCredentialDraft={appStoreCredentialDraft}
          appStoreLoadError={appStoreLoadError}
          draft={appDraft}
          loadingAppStoreApps={loadingAppStoreApps}
          onChange={onAppDraftChange}
          onCredentialChange={onAppStoreCredentialDraftChange}
          onClose={onClose}
          onCreate={onCreateApp}
          onLoadAppStoreApps={onLoadAppStoreApps}
        />
      ) : null}
    </>
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
      className="fixed bottom-0 right-0 top-0 z-[90] flex w-[480px] animate-[subs-slide-in_220ms_cubic-bezier(.2,.7,.2,1)] flex-col bg-[var(--subs-panel)] shadow-[-16px_0_40px_-16px_rgba(20,20,50,0.28)] max-sm:left-0 max-sm:w-auto"
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
      aria-label={`Subscriber ${subscriber.userId}`}
      className="fixed bottom-0 right-0 top-0 z-[90] flex w-[460px] animate-[subs-slide-in_220ms_cubic-bezier(.2,.7,.2,1)] flex-col bg-[var(--subs-panel)] shadow-[-16px_0_40px_-16px_rgba(20,20,50,0.28)] max-sm:left-0 max-sm:w-auto"
      role="dialog"
    >
      <div className="flex items-start gap-[12px] border-b border-[var(--subs-border)] px-[22px] py-[18px]">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--subs-faint)]">Subscriber</div>
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
          <SubscriberFact label="Subscriber since" value={subscriber.since} />
          <SubscriberFact label="Current plan" value={subscriber.plan} />
          <SubscriberFact mono label="Lifetime value" value={subscriber.ltv} />
        </div>

        <div className="mb-[10px] text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--subs-faint)]">Active entitlements</div>
        <div className="mb-[24px] flex gap-[8px]">
          <SoftTag tone="success">{subscriber.entitlement}</SoftTag>
        </div>

        <div className="mb-[6px] text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--subs-faint)]">Purchase history</div>
        {subscriber.history.map((event) => (
          <div className="flex items-center gap-[11px] border-b border-[var(--subs-border)] py-[11px]" key={`${event.type}-${event.date}`}>
            <ToneDot className="shrink-0" tone={event.amountTone} />
            <div className="flex-1">
              <div className="text-[13px] font-medium">{event.type}</div>
              <div className="text-[11.5px] text-[var(--subs-faint)]">
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
  appStoreConnection,
  appStoreCredentialDraft,
  appStoreLoadError,
  draft,
  loadingAppStoreApps,
  onChange,
  onCredentialChange,
  onClose,
  onCreate,
  onLoadAppStoreApps,
}: {
  appStoreApps: AppStoreConnectAccessibleApp[]
  appStoreConnection: AppStoreConnectConnection | null
  appStoreCredentialDraft: AppStoreConnectCredentialDraft
  appStoreLoadError: string | null
  draft: AppDraft
  loadingAppStoreApps: boolean
  onChange: (field: AppDraftField, value: string) => void
  onCredentialChange: (field: keyof AppStoreConnectCredentialDraft, value: string) => void
  onClose: () => void
  onCreate: () => void
  onLoadAppStoreApps: () => void
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-[24px]">
      <div
        aria-label="Create app"
        aria-modal="true"
        className="w-[620px] max-w-full overflow-hidden rounded-[16px] bg-[var(--subs-panel)] shadow-[0_24px_60px_-16px_rgba(20,20,50,0.4)] animate-[subs-pop-in_180ms_ease]"
        role="dialog"
      >
        <div className="px-[24px] pt-[20px]">
          <PUIText as="h2" className="text-[18px] font-bold" variant="title3">
            Create iOS app
          </PUIText>
          <div className="mt-[4px] text-[13px] text-[var(--subs-dim)]">Select an app from App Store Connect using the tenant API key.</div>
        </div>
        <div className="px-[24px] py-[18px]">
          <NewAppForm
            apps={appStoreApps}
            connection={appStoreConnection}
            credentialDraft={appStoreCredentialDraft}
            draft={draft}
            error={appStoreLoadError}
            loading={loadingAppStoreApps}
            onChange={onChange}
            onCredentialChange={onCredentialChange}
            onLoadApps={onLoadAppStoreApps}
          />
        </div>
        <div className="flex justify-end gap-[10px] border-t border-[var(--subs-border)] px-[24px] py-[16px]">
          <PUIButton className="rounded-[9px]" label="Cancel" onPress={onClose} variant="outline" />
          <PUIButton className="rounded-[9px]" disabled={draft.appleAppId.trim() === ''} label="Create app" onPress={onCreate} />
        </div>
      </div>
    </div>
  )
}

function PanelHeader({ kicker, onClose, title }: { kicker: string; onClose: () => void; title: string }) {
  return (
    <div className="flex items-center gap-[12px] border-b border-[var(--subs-border)] px-[22px] py-[18px]">
      <div className="flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--subs-faint)]">{kicker}</div>
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
      className="flex size-[32px] shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-[var(--subs-border)] bg-[var(--subs-panel)] text-[var(--subs-dim)]"
      onClick={onClose}
      type="button"
    >
      <X aria-hidden className="size-[14px]" strokeWidth={1.8} />
    </button>
  )
}

function PanelActions({ onClose, onPrimary, primaryLabel }: { onClose: () => void; onPrimary: () => void; primaryLabel: string }) {
  return (
    <div className="flex gap-[10px] border-t border-[var(--subs-border)] px-[22px] py-[16px]">
      <PUIButton className="flex-1 rounded-[9px]" label="Cancel" onPress={onClose} variant="outline" />
      <PUIButton className="flex-[1.6] rounded-[9px]" label={primaryLabel} onPress={onPrimary} />
    </div>
  )
}

function SubscriberFact({ label, mono = false, value }: { label: string; mono?: boolean; value: string }) {
  return (
    <GhostBox>
      <div className="text-[11.5px] text-[var(--subs-faint)]">{label}</div>
      <div className={cn('mt-[3px] text-[14px] font-semibold', mono && 'font-mono')}>{value}</div>
    </GhostBox>
  )
}
