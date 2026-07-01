import { PUIField, PUIInput } from '@piparo/cn-web'

import { inputFieldProps } from './formFieldProps'
import { StoreMapping } from './StoreMapping'
import type { EditableSubscriptionTextField, SubscriptionProduct } from './types'

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
