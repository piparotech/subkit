import { inputFieldProps } from '~/components/ui/formFieldProps'
import type { CatalogProduct, EditableCatalogProductTextField } from '~/domain/products/types'

import { PUIField, PUIInput, PUISelect } from '@piparo/cn-web'

const productTypeOptions = [
  { label: 'Subscription', value: 'subscription' },
  { label: 'Non-consumable', value: 'non_consumable' },
  { label: 'Consumable', value: 'consumable' },
  { label: 'Voucher / promo-backed', value: 'voucher' },
  { label: 'Manual grant only', value: 'manual' },
]

const statusOptions = [
  { label: 'Draft', value: 'draft' },
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
]

export function ProductFormFields({
  onTextChange,
  product,
}: {
  onTextChange: (field: EditableCatalogProductTextField, value: string) => void
  product: CatalogProduct
}) {
  return (
    <>
      <PUIField label="Product name">
        {(field) => (
          <PUIInput
            onChange={(event) => onTextChange('name', event.target.value)}
            placeholder="Premium Monthly"
            value={product.name}
            {...inputFieldProps(field)}
          />
        )}
      </PUIField>
      <PUIField
        hint="Canonical SubKit key. Apps and stores should not depend on display names."
        label="Product key"
      >
        {(field) => (
          <PUIInput
            className="font-mono"
            onChange={(event) => onTextChange('productKey', event.target.value)}
            placeholder="premium"
            value={product.productKey}
            {...inputFieldProps(field)}
          />
        )}
      </PUIField>
      <PUIField hint="What this product unlocks for the App User." label="Entitlement">
        {(field) => (
          <PUIInput
            className="font-mono"
            onChange={(event) => onTextChange('entitlement', event.target.value)}
            placeholder="premium"
            value={product.entitlement}
            {...inputFieldProps(field)}
          />
        )}
      </PUIField>
      <PUIField label="Description">
        {(field) => (
          <PUIInput
            onChange={(event) => onTextChange('description', event.target.value)}
            placeholder="Unlocks all premium features"
            value={product.description}
            {...inputFieldProps(field)}
          />
        )}
      </PUIField>
      <div className="grid grid-cols-2 gap-[12px] max-sm:grid-cols-1">
        <PUIField label="Product type">
          {(field) => (
            <PUISelect
              disabled={field.disabled}
              id={field.id}
              onValueChange={(value) => onTextChange('productType', value)}
              options={productTypeOptions}
              value={product.productType}
            />
          )}
        </PUIField>
        <PUIField label="Status">
          {(field) => (
            <PUISelect
              disabled={field.disabled}
              id={field.id}
              onValueChange={(value) => onTextChange('status', value)}
              options={statusOptions}
              value={product.status}
            />
          )}
        </PUIField>
      </div>
      <div className="mt-[6px] text-[12px] font-semibold tracking-[0.04em] text-[var(--subkit-faint)] uppercase">
        Plan
      </div>
      <div className="grid grid-cols-2 gap-[12px] max-sm:grid-cols-1">
        <PUIField hint="Stable package/plan key, e.g. monthly, annual, lifetime." label="Plan key">
          {(field) => (
            <PUIInput
              className="font-mono"
              onChange={(event) => onTextChange('planKey', event.target.value)}
              placeholder="monthly"
              value={product.planKey}
              {...inputFieldProps(field)}
            />
          )}
        </PUIField>
        <PUIField
          hint="ISO-8601 duration, e.g. P1M, P1Y. Use lifetime for one-time lifetime products."
          label="Billing period"
        >
          {(field) => (
            <PUIInput
              className="font-mono"
              onChange={(event) => onTextChange('billingPeriod', event.target.value)}
              placeholder="P1M"
              value={product.billingPeriod}
              {...inputFieldProps(field)}
            />
          )}
        </PUIField>
      </div>
      <PUIField
        hint="Reference price in SubKit. Store-effective regional prices are synced separately."
        label="Reference price"
      >
        {(field) => (
          <PUIInput
            className="font-mono"
            onChange={(event) => onTextChange('price', event.target.value)}
            placeholder="$9.99"
            value={product.price}
            {...inputFieldProps(field)}
          />
        )}
      </PUIField>
      <div className="mt-[6px] text-[12px] font-semibold tracking-[0.04em] text-[var(--subkit-faint)] uppercase">
        Store bindings
      </div>
      <PUIField
        hint="External Apple product ID. This is a binding, not the canonical Product key."
        label="Apple product ID"
      >
        {(field) => (
          <PUIInput
            className="font-mono"
            onChange={(event) => onTextChange('appleProductId', event.target.value)}
            placeholder="com.acme.app.premium.monthly"
            value={product.appleProductId}
            {...inputFieldProps(field)}
          />
        )}
      </PUIField>
      <div className="grid grid-cols-2 gap-[12px] max-sm:grid-cols-1">
        <PUIField label="Google product ID">
          {(field) => (
            <PUIInput
              className="font-mono"
              onChange={(event) => onTextChange('googleProductId', event.target.value)}
              placeholder="premium"
              value={product.googleProductId}
              {...inputFieldProps(field)}
            />
          )}
        </PUIField>
        <PUIField label="Google base plan ID">
          {(field) => (
            <PUIInput
              className="font-mono"
              onChange={(event) => onTextChange('googleBasePlanId', event.target.value)}
              placeholder="monthly"
              value={product.googleBasePlanId}
              {...inputFieldProps(field)}
            />
          )}
        </PUIField>
      </div>
    </>
  )
}
