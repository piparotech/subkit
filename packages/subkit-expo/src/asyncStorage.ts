import AsyncStorage from '@react-native-async-storage/async-storage'

import {
  type CreateOrGetInstallationIdOptions,
  type SubKitInstallationIdStorage,
  createOrGetInstallationId as createInstallationIdProvider,
} from './installationStorage.js'

export interface CreateAsyncStorageInstallationIdOptions extends Omit<
  CreateOrGetInstallationIdOptions,
  'storage'
> {
  storage?: SubKitInstallationIdStorage
}

export function createOrGetInstallationId(options: CreateAsyncStorageInstallationIdOptions = {}) {
  return createInstallationIdProvider({
    ...options,
    storage: options.storage ?? AsyncStorage,
  })
}
