import { type CustomerInfo, customerInfoSchema } from '@piparotech/subkit-core'

import type { SubKitJsonStorage } from './storageQueue.js'

export interface CustomerInfoCachePolicy {
  customerInfoStaleAfterMs: number
  nonExpiringEntitlementMaxOfflineAgeMs: number
}

export interface CustomerInfoCacheStore {
  read(appUserId: string): Promise<CustomerInfo | null>
  write(info: CustomerInfo): Promise<void>
}

export interface CreateCustomerInfoCacheStoreOptions {
  keyPrefix: string
  now?: () => number
  policy?: Partial<CustomerInfoCachePolicy>
  storage: SubKitJsonStorage
}

export const DEFAULT_CUSTOMER_INFO_CACHE_POLICY: CustomerInfoCachePolicy = {
  customerInfoStaleAfterMs: 24 * 60 * 60 * 1000,
  nonExpiringEntitlementMaxOfflineAgeMs: 30 * 24 * 60 * 60 * 1000,
}

interface StoredCustomerInfo {
  cachedAt: number
  customerInfo: CustomerInfo
}

export function createCustomerInfoCacheStore(
  options: CreateCustomerInfoCacheStoreOptions,
): CustomerInfoCacheStore {
  const now = options.now ?? (() => Date.now())
  const policy: CustomerInfoCachePolicy = {
    customerInfoStaleAfterMs:
      options.policy?.customerInfoStaleAfterMs ??
      DEFAULT_CUSTOMER_INFO_CACHE_POLICY.customerInfoStaleAfterMs,
    nonExpiringEntitlementMaxOfflineAgeMs:
      options.policy?.nonExpiringEntitlementMaxOfflineAgeMs ??
      DEFAULT_CUSTOMER_INFO_CACHE_POLICY.nonExpiringEntitlementMaxOfflineAgeMs,
  }

  return {
    async read(appUserId) {
      const key = customerInfoCacheKey(options.keyPrefix, appUserId)
      const raw = await options.storage.getItem(key)
      if (raw == null || raw.trim() === '') return null
      const stored = parseStoredCustomerInfo(raw)
      if (stored == null || stored.customerInfo.appUserId !== appUserId) {
        await options.storage.setItem(`${key}:corrupt`, raw)
        await options.storage.removeItem(key)
        return null
      }
      return evaluateCachedCustomerInfo(stored.customerInfo, {
        cachedAt: stored.cachedAt,
        freshness: now() - stored.cachedAt > policy.customerInfoStaleAfterMs ? 'stale' : 'fresh',
        nonExpiringEntitlementMaxOfflineAgeMs: policy.nonExpiringEntitlementMaxOfflineAgeMs,
        now: now(),
      })
    },
    async write(info) {
      const stored: StoredCustomerInfo = { cachedAt: now(), customerInfo: info }
      await options.storage.setItem(
        customerInfoCacheKey(options.keyPrefix, info.appUserId),
        JSON.stringify(stored),
      )
    },
  }
}

export function evaluateOfflineCustomerInfo(
  info: CustomerInfo,
  options: {
    nonExpiringEntitlementMaxOfflineAgeMs?: number
    now?: number
  } = {},
): CustomerInfo {
  const now = options.now ?? Date.now()
  return evaluateCachedCustomerInfo(info, {
    cachedAt: now,
    freshness: 'offline',
    nonExpiringEntitlementMaxOfflineAgeMs:
      options.nonExpiringEntitlementMaxOfflineAgeMs ??
      DEFAULT_CUSTOMER_INFO_CACHE_POLICY.nonExpiringEntitlementMaxOfflineAgeMs,
    now,
  })
}

function evaluateCachedCustomerInfo(
  info: CustomerInfo,
  options: {
    cachedAt: number
    freshness: CustomerInfo['freshness']
    nonExpiringEntitlementMaxOfflineAgeMs: number
    now: number
  },
): CustomerInfo {
  const deviceAccessExpired =
    info.deviceAccess?.accessExpiresAt != null &&
    Date.parse(info.deviceAccess.accessExpiresAt) <= options.now
  return {
    ...info,
    accessContext:
      info.accessContext != null && Date.parse(info.accessContext.expiresAt) > options.now
        ? info.accessContext
        : null,
    deviceAccess:
      info.deviceAccess == null
        ? undefined
        : {
            ...info.deviceAccess,
            blockedReason: deviceAccessExpired
              ? 'DEVICE_REPLACED'
              : info.deviceAccess.blockedReason,
          },
    entitlements: Object.fromEntries(
      Object.entries(info.entitlements).map(([key, entitlement]) => {
        if (!entitlement.active) return [key, entitlement]
        if (deviceAccessExpired) {
          return [key, { ...entitlement, active: false, status: 'expired' as const }]
        }
        const validUntil = entitlement.expiresAt == null ? null : Date.parse(entitlement.expiresAt)
        const verifiedAt =
          entitlement.verifiedAt == null ? null : Date.parse(entitlement.verifiedAt)
        const active =
          validUntil == null
            ? verifiedAt != null &&
              Number.isFinite(verifiedAt) &&
              options.now <= verifiedAt + options.nonExpiringEntitlementMaxOfflineAgeMs
            : Number.isFinite(validUntil) && options.now <= validUntil
        return [
          key,
          active ? entitlement : { ...entitlement, active: false, status: 'expired' as const },
        ]
      }),
    ),
    freshness: options.freshness,
  }
}

function customerInfoCacheKey(prefix: string, appUserId: string): string {
  return `${prefix}:${hashCacheIdentity(appUserId)}`
}

function hashCacheIdentity(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

function parseStoredCustomerInfo(raw: string): StoredCustomerInfo | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || typeof parsed.cachedAt !== 'number') return null
    const customerInfo = customerInfoSchema.safeParse(parsed.customerInfo)
    if (!customerInfo.success) return null
    return { cachedAt: parsed.cachedAt, customerInfo: customerInfo.data }
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
