import { AccessClient } from './AccessClient.js'
import { ContractsClient } from './ContractsClient.js'
import { CustomersClient } from './CustomersClient.js'
import { EntitlementsClient } from './EntitlementsClient.js'
import { HttpClient } from './HttpClient.js'
import { OfferingsClient } from './OfferingsClient.js'
import { PaymentsClient } from './PaymentsClient.js'
import { ProductsClient } from './ProductsClient.js'

export interface SubKitOptions {
  apiBaseUrl: string
  appId?: string
  fetch?: typeof fetch
  secretKey: string
  timeoutMs?: number
  userAgent?: string
}

export class SubKit {
  readonly access: AccessClient
  readonly contracts: ContractsClient
  readonly customers: CustomersClient
  readonly entitlements: EntitlementsClient
  readonly offerings: OfferingsClient
  readonly payments: PaymentsClient
  readonly products: ProductsClient

  constructor(options: SubKitOptions) {
    const http = new HttpClient({
      apiBaseUrl: options.apiBaseUrl,
      fetchImpl: options.fetch ?? fetch,
      secretKey: options.secretKey,
      timeoutMs: options.timeoutMs ?? 10_000,
      userAgent: options.userAgent ?? '@piparotech/subkit-node/0.1.2',
    })

    this.access = new AccessClient({ appId: options.appId, http })
    this.contracts = new ContractsClient({ appId: options.appId, http })
    this.customers = new CustomersClient({ appId: options.appId, http })
    this.entitlements = new EntitlementsClient({ appId: options.appId, http })
    this.offerings = new OfferingsClient({ appId: options.appId, http })
    this.payments = new PaymentsClient({ appId: options.appId, http })
    this.products = new ProductsClient({ appId: options.appId, http })
  }
}
