import type { StoreIdentityHints } from '@piparotech/subkit-core'

export interface StoreIdentityHintProvider {
  getStoreIdentityHints(): Promise<StoreIdentityHints | undefined>
}

export interface PurchaseIdentityFields {
  appAccountToken?: string
  obfuscatedAccountId?: string
  obfuscatedProfileId?: string
}

export async function buildPurchaseIdentityFields(
  provider: StoreIdentityHintProvider,
): Promise<PurchaseIdentityFields> {
  const hints = await provider.getStoreIdentityHints()
  return {
    appAccountToken: hints?.apple?.appAccountToken,
    obfuscatedAccountId: hints?.google?.obfuscatedAccountId,
    obfuscatedProfileId: hints?.google?.obfuscatedProfileId,
  }
}

export class MemoryIdentityStore implements StoreIdentityHintProvider {
  private appUserIdValue: string | undefined
  private generationValue = 0
  private storeIdentityHintsValue: StoreIdentityHints | undefined

  get appUserId(): string | undefined {
    return this.appUserIdValue
  }

  get generation(): number {
    return this.generationValue
  }

  get storeIdentityHints(): StoreIdentityHints | undefined {
    return this.storeIdentityHintsValue
  }

  identify(appUserId: string, hints?: StoreIdentityHints): void {
    if (this.appUserIdValue !== appUserId) this.generationValue += 1
    this.appUserIdValue = appUserId
    this.storeIdentityHintsValue = hints
  }

  reset(): void {
    this.generationValue += 1
    this.appUserIdValue = undefined
    this.storeIdentityHintsValue = undefined
  }

  async getStoreIdentityHints(): Promise<StoreIdentityHints | undefined> {
    return this.storeIdentityHintsValue
  }
}
