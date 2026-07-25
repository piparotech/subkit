import * as SecureStore from 'expo-secure-store'

import {
  type CreateOrGetInstallationIdOptions,
  createOrGetInstallationId as createInstallationIdProvider,
} from './installationStorage.js'

export interface CreateSecureStoreInstallationIdOptions extends Omit<
  CreateOrGetInstallationIdOptions,
  'storage'
> {
  keychainAccessible?: number
}

export function createOrGetInstallationId(options: CreateSecureStoreInstallationIdOptions = {}) {
  const secureStoreOptions: SecureStore.SecureStoreOptions = {
    keychainAccessible: options.keychainAccessible ?? SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    requireAuthentication: false,
  }
  return createInstallationIdProvider({
    ...options,
    storage: {
      getItem: (key) => SecureStore.getItemAsync(key, secureStoreOptions),
      removeItem: (key) => SecureStore.deleteItemAsync(key, secureStoreOptions),
      setItem: (key, value) => SecureStore.setItemAsync(key, value, secureStoreOptions),
    },
  })
}
