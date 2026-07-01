import type { AppStoreConnectConnection, AppStoreConnectCredentialDraft } from './types'

export function credentialDraftFromConnection(connection: AppStoreConnectConnection | null): AppStoreConnectCredentialDraft {
  return {
    issuerId: connection?.issuerId ?? '',
    keyId: connection?.keyId ?? '',
    privateKey: '',
    vendorNumber: connection?.vendorNumber ?? '',
  }
}
