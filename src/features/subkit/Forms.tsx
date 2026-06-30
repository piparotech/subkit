import { PUIField, PUIInput, cn, type PUIFieldRenderProps } from '@piparo/cn-web'
import { Layers2 } from 'lucide-react'

import type {
  AppDraft,
  AppDraftField,
  AppStoreConnectAccessibleApp,
  AppStoreConnectConnection,
  EditableSubscriptionTextField,
  SubscriptionProduct,
} from './types'

export function ProductFormFields({
  onTextChange,
  subscription,
}: {
  onTextChange: (field: EditableSubscriptionTextField, value: string) => void
  subscription: SubscriptionProduct
}) {
  return (
    <>
      <PUIField label="Display name">
        {(field) => (
          <PUIInput
            onChange={(event) => onTextChange('name', event.target.value)}
            placeholder="Display name"
            value={subscription.name}
            {...inputFieldProps(field)}
          />
        )}
      </PUIField>
      <PUIField hint="Used in your code. Stays the same across stores." label="Subscription identifier">
        {(field) => (
          <PUIInput
            className="font-mono"
            onChange={(event) => onTextChange('identifier', event.target.value)}
            placeholder="Subscription identifier"
            value={subscription.identifier}
            {...inputFieldProps(field)}
          />
        )}
      </PUIField>
      <div className="mt-[6px] text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--subkit-faint)]">Store mapping</div>
      <StoreMapping
        onPriceChange={(value) => onTextChange('price', value)}
        onValueChange={(value) => onTextChange('iosId', value)}
        platform="iOS"
        price={subscription.price}
        store="App Store Connect"
        value={subscription.iosId}
      />
      <div className="flex gap-[12px] max-sm:flex-col">
        <PUIField className="flex-1" label="Billing period">
          {(field) => (
            <PUIInput
              onChange={(event) => onTextChange('duration', event.target.value)}
              placeholder="Billing period"
              value={subscription.duration}
              {...inputFieldProps(field)}
            />
          )}
        </PUIField>
        <PUIField className="flex-1" label="Entitlement">
          {(field) => (
            <PUIInput
              className="font-mono"
              onChange={(event) => onTextChange('entitlement', event.target.value)}
              placeholder="Entitlement key"
              value={subscription.entitlement}
              {...inputFieldProps(field)}
            />
          )}
        </PUIField>
      </div>
    </>
  )
}

function StoreMapping({
  onPriceChange,
  onValueChange,
  platform,
  price,
  store,
  value,
}: {
  onPriceChange: (value: string) => void
  onValueChange: (value: string) => void
  platform: string
  price: string
  store: string
  value: string
}) {
  return (
    <div className="rounded-[12px] border border-[var(--subkit-border)] p-[14px]">
      <div className="mb-[12px] flex items-center gap-[8px]">
        <span className="rounded-[5px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[7px] py-[2px] text-[11px] font-bold text-[var(--subkit-dim)]">
          {platform}
        </span>
        <span className="text-[13px] font-semibold">{store}</span>
      </div>
      <PUIInput
        className="mb-[9px] font-mono"
        onChange={(event) => onValueChange(event.target.value)}
        placeholder="App Store product ID"
        value={value}
      />
      <PUIInput className="font-mono" onChange={(event) => onPriceChange(event.target.value)} placeholder="Price" value={price} />
    </div>
  )
}

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
      <div className="rounded-[11px] border border-[var(--subkit-border)] bg-[var(--subkit-panel-2)] px-[12px] py-[10px] text-[12.5px] leading-[1.45] text-[var(--subkit-dim)]">
        Start iOS-only: apps are synced automatically from the workspace App Store Connect key when this dialog opens.
      </div>
      {loading ? (
        <div className="rounded-[10px] border border-[var(--subkit-border)] bg-[var(--subkit-panel)] px-[12px] py-[10px] text-[12.5px] text-[var(--subkit-dim)]">
          Syncing App Store Connect apps…
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

export function TrialToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-[11px] border border-[var(--subkit-border)] px-[14px] py-[13px]">
      <div>
        <div className="text-[13px] font-semibold">Free trial</div>
        <div className="text-[11.5px] text-[var(--subkit-faint)]">{enabled ? '7-day free trial' : 'Off'}</div>
      </div>
      <button
        aria-checked={enabled}
        className={cn('relative h-[22px] w-[38px] cursor-pointer rounded-full transition-colors duration-fast', enabled ? 'bg-[var(--subkit-accent)]' : 'bg-[var(--subkit-border-2)]')}
        onClick={onToggle}
        role="switch"
        type="button"
      >
        <span className={cn('absolute top-[2px] size-[18px] rounded-full bg-white shadow-sm transition-[left] duration-fast', enabled ? 'left-[18px]' : 'left-[2px]')} />
      </button>
    </div>
  )
}

export function OfferingIcon() {
  return <Layers2 aria-hidden className="size-[16px]" />
}

function inputFieldProps(field: PUIFieldRenderProps) {
  return {
    'aria-describedby': field.describedby,
    'aria-invalid': field.invalid || undefined,
    disabled: field.disabled,
    id: field.id,
  }
}
