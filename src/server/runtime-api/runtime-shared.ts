import { eq } from 'drizzle-orm'
import { createHash } from 'node:crypto'
import { db } from '~/db/client'
import {
  appUsers,
  apps,
  entitlementGrants,
  productPlans,
  products,
  storeProductBindings,
  storePurchaseOwnerships,
} from '~/db/schema'

import type { ProductKind, StoreName } from '@piparotech/subkit-core'

export type AppUserRow = typeof appUsers.$inferSelect
export type ProductRow = typeof products.$inferSelect
export type ProductPlanRow = typeof productPlans.$inferSelect
export type StoreProductBindingRow = typeof storeProductBindings.$inferSelect
export type EntitlementGrantStatus = typeof entitlementGrants.$inferSelect.status
export type RuntimeStore = typeof storePurchaseOwnerships.$inferSelect.store

export const RUNTIME_IAP_VALIDATION_PENDING_NOTE =
  'SubKit runtime IAP reconcile · validation pending'

export interface RuntimeAppUserContext {
  appUser: AppUserRow
  created: boolean
}

export async function assertAppExists(appId: string): Promise<void> {
  const [app] = await db.select({ id: apps.id }).from(apps).where(eq(apps.id, appId)).limit(1)
  if (app == null) throw new Error('App not found')
}

export function amountMicrosToCents(value: number | null): number {
  if (value == null) return 0
  return Math.round(value / 10_000)
}

export function isGrantCurrentlyEffective(grant: {
  expiresAt: string | null
  note?: string | null
  revokedAt: Date | null
  startsAt: string
  status: EntitlementGrantStatus
}): boolean {
  if (isGrantValidationPending(grant)) return false
  if (grant.status !== 'active' && grant.status !== 'trialing' && grant.status !== 'billing_retry')
    return false
  if (grant.revokedAt != null) return false
  const now = Date.now()
  const startsAt = Date.parse(grant.startsAt)
  if (Number.isFinite(startsAt) && startsAt > now) return false
  if (grant.expiresAt == null) return true
  const expiresAt = Date.parse(grant.expiresAt)
  return !Number.isFinite(expiresAt) || expiresAt > now
}

export function isGrantValidationPending(grant: { note?: string | null }): boolean {
  return grant.note === RUNTIME_IAP_VALIDATION_PENDING_NOTE
}

export function toRuntimeStore(store: StoreName): RuntimeStore {
  return store === 'apple_app_store' ? 'apple' : 'google'
}

export function toRuntimeProductKind(productType: ProductRow['productType']): ProductKind {
  if (productType === 'non_consumable') return 'non_consumable'
  if (productType === 'consumable') return 'consumable'
  return 'subscription'
}

export function runtimeAppUserId(appId: string, appUserId: string): string {
  return `${appId}:user:${encodeURIComponent(appUserId)}`
}

export function stableUuid(value: string): string {
  const hex = sha256Hex(value)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function stringifyJson(value: unknown): string | null {
  if (value == null) return null
  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}
