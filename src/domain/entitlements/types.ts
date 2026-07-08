export interface Entitlement {
  appId: string
  id: string
  description: string
  productCount: string
  products: string[]
}

export type EntitlementGrantSource =
  'apple' | 'google' | 'voucher' | 'promo' | 'manual' | 'lifetime' | 'migration'
export type EntitlementGrantStatus = 'active' | 'trialing' | 'billing_retry' | 'expired' | 'revoked'
