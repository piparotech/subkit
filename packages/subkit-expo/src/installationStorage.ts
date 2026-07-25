import type { SubKitInstallationIdInput } from './types.js'

export interface SubKitInstallationIdStorage {
  getItem(key: string): string | null | Promise<string | null>
  removeItem?(key: string): void | Promise<void>
  setItem(key: string, value: string): void | Promise<void>
}

export interface CreateOrGetInstallationIdOptions {
  legacyStorageKeys?: readonly string[]
  randomId?: () => string
  storage: SubKitInstallationIdStorage
  storageKey?: string
}

export const DEFAULT_INSTALLATION_ID_STORAGE_KEY = 'subkit.installation-id.v1'

export function createOrGetInstallationId(
  options: CreateOrGetInstallationIdOptions,
): Extract<SubKitInstallationIdInput, () => string | Promise<string>> {
  const storageKey = normalizeStorageKey(options.storageKey ?? DEFAULT_INSTALLATION_ID_STORAGE_KEY)
  const legacyStorageKeys = (options.legacyStorageKeys ?? [])
    .map(normalizeStorageKey)
    .filter((key) => key !== storageKey)
  let inFlight: Promise<string> | null = null
  let resolved: string | null = null

  return () => {
    if (resolved != null) return resolved
    if (inFlight != null) return inFlight
    const attempt = resolveStoredInstallationId({
      legacyStorageKeys,
      randomId: options.randomId ?? createCryptographicInstallationId,
      storage: options.storage,
      storageKey,
    })
    const tracked = attempt.then(
      (installationId) => {
        resolved = installationId
        inFlight = null
        return installationId
      },
      (error: unknown) => {
        inFlight = null
        throw error
      },
    )
    inFlight = tracked
    return tracked
  }
}

async function resolveStoredInstallationId(input: {
  legacyStorageKeys: readonly string[]
  randomId: () => string
  storage: SubKitInstallationIdStorage
  storageKey: string
}): Promise<string> {
  const current = normalizeStoredId(await input.storage.getItem(input.storageKey))
  if (current != null) return current

  for (const legacyKey of input.legacyStorageKeys) {
    const legacy = normalizeStoredId(await input.storage.getItem(legacyKey))
    if (legacy == null) continue
    await input.storage.setItem(input.storageKey, legacy)
    if (input.storage.removeItem != null) await input.storage.removeItem(legacyKey)
    return legacy
  }

  const created = normalizeStoredId(input.randomId())
  if (created == null) throw new Error('SubKit installation ID generator returned an empty value')
  await input.storage.setItem(input.storageKey, created)
  return created
}

function createCryptographicInstallationId(): string {
  const cryptoApi = globalThis.crypto
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID()
  if (typeof cryptoApi?.getRandomValues !== 'function') {
    throw new Error('Secure random generation is unavailable for the SubKit installation ID')
  }
  const bytes = cryptoApi.getRandomValues(new Uint8Array(16))
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function normalizeStoredId(value: string | null): string | null {
  if (value == null) return null
  const normalized = value.trim()
  return normalized === '' ? null : normalized
}

function normalizeStorageKey(value: string): string {
  const normalized = value.trim()
  if (normalized === '') throw new Error('SubKit installation ID storageKey must not be empty')
  return normalized
}
