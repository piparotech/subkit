import { PUIField, PUIInput, cn, type PUIFieldRenderProps } from '@piparo/cn-web'
import { Layers2 } from 'lucide-react'

import type {
  AppDraft,
  AppDraftField,
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
      <div className="mt-[6px] text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--subs-faint)]">Store mapping</div>
      <StoreMapping
        onPriceChange={(value) => onTextChange('price', value)}
        onValueChange={(value) => onTextChange('iosId', value)}
        platform="iOS"
        price={subscription.price}
        store="App Store Connect"
        value={subscription.iosId}
      />
      <StoreMapping
        onPriceChange={(value) => onTextChange('price', value)}
        onValueChange={(value) => onTextChange('androidId', value)}
        platform="AND"
        price={subscription.price}
        store="Google Play"
        value={subscription.androidId}
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
    <div className="rounded-[12px] border border-[var(--subs-border)] p-[14px]">
      <div className="mb-[12px] flex items-center gap-[8px]">
        <span className="rounded-[5px] border border-[var(--subs-border)] bg-[var(--subs-panel-2)] px-[7px] py-[2px] text-[11px] font-bold text-[var(--subs-dim)]">
          {platform}
        </span>
        <span className="text-[13px] font-semibold">{store}</span>
      </div>
      <PUIInput
        className="mb-[9px] font-mono"
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={platform === 'iOS' ? 'App Store product ID' : 'Play Store product ID'}
        value={value}
      />
      <PUIInput className="font-mono" onChange={(event) => onPriceChange(event.target.value)} placeholder="Price" value={price} />
    </div>
  )
}

export function NewAppForm({ draft, onChange }: { draft: AppDraft; onChange: (field: AppDraftField, value: string) => void }) {
  return (
    <div className="space-y-[16px]">
      <PUIField label="App name">
        {(field) => <PUIInput onChange={(event) => onChange('name', event.target.value)} placeholder="App name" value={draft.name} {...inputFieldProps(field)} />}
      </PUIField>
      <PUIField label="iOS bundle ID">
        {(field) => (
          <PUIInput
            className="font-mono"
            onChange={(event) => onChange('iosBundle', event.target.value)}
            placeholder="iOS bundle ID"
            value={draft.iosBundle}
            {...inputFieldProps(field)}
          />
        )}
      </PUIField>
      <PUIField label="Android package name">
        {(field) => (
          <PUIInput
            className="font-mono"
            onChange={(event) => onChange('androidPackage', event.target.value)}
            placeholder="Android package name"
            value={draft.androidPackage}
            {...inputFieldProps(field)}
          />
        )}
      </PUIField>
      <PUIField label="Status">
        {(field) => (
          <select
            className="w-full rounded-[10px] border border-[var(--subs-border-2)] bg-[var(--subs-panel)] px-[11px] py-[9px] text-[13px] text-[var(--subs-text)] outline-none"
            onChange={(event) => onChange('status', event.target.value)}
            value={draft.status}
            {...inputFieldProps(field)}
          >
            <option value="">Select status</option>
            <option value="live">Live</option>
            <option value="beta">Beta</option>
            <option value="inactive">Inactive</option>
          </select>
        )}
      </PUIField>
    </div>
  )
}

export function TrialToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-[11px] border border-[var(--subs-border)] px-[14px] py-[13px]">
      <div>
        <div className="text-[13px] font-semibold">Free trial</div>
        <div className="text-[11.5px] text-[var(--subs-faint)]">{enabled ? '7-day free trial' : 'Off'}</div>
      </div>
      <button
        aria-checked={enabled}
        className={cn('relative h-[22px] w-[38px] cursor-pointer rounded-full transition-colors duration-fast', enabled ? 'bg-[var(--subs-accent)]' : 'bg-[var(--subs-border-2)]')}
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
