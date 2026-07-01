import type { AppStoreConnectConnection, AppStoreConnectCredentialDraft } from '~/integrations/app-store-connect/types'

export function credentialDraftFromConnection(connection: AppStoreConnectConnection | null): AppStoreConnectCredentialDraft {
  return {
    issuerId: connection?.issuerId ?? '',
    keyId: connection?.keyId ?? '',
    privateKey: '',
    vendorNumber: connection?.vendorNumber ?? '',
  }
}
