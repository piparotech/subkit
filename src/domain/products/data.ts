import type { CatalogProduct } from '~/domain/products/types'

export const newCatalogProduct: CatalogProduct = {
  activeAppUsers: '0',
  appId: '',
  appleProductId: '',
  billingKind: 'recurring',
  billingPeriod: 'P1M',
  description: '',
  entitlement: '',
  googleBasePlanId: '',
  googleProductId: '',
  name: '',
  planId: '',
  planKey: 'monthly',
  price: '',
  productId: '',
  productKey: '',
  productType: 'subscription',
  status: 'draft',
  trial: 'Off',
  trialOn: false,
}
