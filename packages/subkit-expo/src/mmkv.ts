import {
  type CreateOrGetInstallationIdOptions,
  createOrGetInstallationId as createInstallationIdProvider,
} from './installationStorage.js'

export interface SubKitInstallationMmkvStorage {
  delete?(key: string): void
  getString(key: string): string | undefined
  set(key: string, value: string): void
}

export interface CreateMmkvInstallationIdOptions extends Omit<
  CreateOrGetInstallationIdOptions,
  'storage'
> {
  storage: SubKitInstallationMmkvStorage
}

export function createOrGetInstallationId(options: CreateMmkvInstallationIdOptions) {
  return createInstallationIdProvider({
    ...options,
    storage: {
      getItem: (key) => options.storage.getString(key) ?? null,
      removeItem:
        options.storage.delete == null ? undefined : (key) => options.storage.delete?.(key),
      setItem: (key, value) => options.storage.set(key, value),
    },
  })
}
