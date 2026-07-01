import type { StatusTone } from '~/components/ui/types'

export type Store = 'App Store' | 'Play Store'

export interface PurchaseHistoryEvent {
  type: string
  date: string
  store: Store
  amount: string
  amountTone: StatusTone
}

export interface EntitlementGrantSummary {
  entitlement: string
  expiresAt: string
  id: string
  product: string
  source: string
  startsAt: string
  status: string
  statusTone: StatusTone
}

export interface AppUser {
  appId: string
  appUserId: string
  countryCode: string
  country: string
  createdAt: string
  grants: EntitlementGrantSummary[]
  history: PurchaseHistoryEvent[]
  lastSeenAt: string
  ltv: string
  primaryEntitlement: string
  primarySource: string
  status: string
  statusTone: StatusTone
}
