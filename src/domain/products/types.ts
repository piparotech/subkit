export type ProductType = 'subscription' | 'non_consumable' | 'consumable' | 'voucher' | 'manual'
export type ProductStatus = 'draft' | 'active' | 'archived'
export type BillingKind = 'recurring' | 'one_time'

export interface CatalogProduct {
  activeAppUsers: string
  appId: string
  appleProductId: string
  billingKind: BillingKind
  billingPeriod: string
  description: string
  entitlement: string
  googleBasePlanId: string
  googleProductId: string
  name: string
  planId: string
  planKey: string
  price: string
  productId: string
  productKey: string
  productType: ProductType
  status: ProductStatus
  trial: string
  trialOn: boolean
}

export type EditableCatalogProductTextField =
  | 'appleProductId'
  | 'billingPeriod'
  | 'description'
  | 'entitlement'
  | 'googleBasePlanId'
  | 'googleProductId'
  | 'name'
  | 'planKey'
  | 'price'
  | 'productKey'
  | 'productType'
  | 'status'
  | 'trial'
