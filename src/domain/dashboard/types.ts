import type { StatusTone } from '~/components/ui/types'

export interface Metric {
  label: string
  value: string
  delta?: string
  tone?: StatusTone
}

export interface ConsoleStats {
  appUsers: number
  apps: number
  entitlements: number
  products: number
  purchaseEvents: number
  tenants: number
}

export interface RevenueBar {
  month: string
  height: string
}

export interface ActivityEvent {
  type: string
  user: string
  product: string
  amount: string
  amountTone: StatusTone
  time: string
  dotTone: StatusTone
}

export interface DashboardSummary {
  appId: string
  activity: ActivityEvent[]
  metrics: Metric[]
  revenueBars: RevenueBar[]
}

export interface ConsoleRuntimeConfig {
  appleServerNotificationsUrl: string
  publicOrigin: string
}
