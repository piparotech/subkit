import { CustomersClient } from './CustomersClient.js'
import { EntitlementsClient } from './EntitlementsClient.js'
import { HttpClient } from './HttpClient.js'
import { OfferingsClient } from './OfferingsClient.js'
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
  readonly customers: CustomersClient
  readonly entitlements: EntitlementsClient
  readonly offerings: OfferingsClient
  readonly products: ProductsClient

  constructor(options: SubKitOptions) {
    const http = new HttpClient({
      apiBaseUrl: options.apiBaseUrl,
      fetchImpl: options.fetch ?? fetch,
      secretKey: options.secretKey,
      timeoutMs: options.timeoutMs ?? 10_000,
      userAgent: options.userAgent ?? '@piparotech/subkit-node/0.1.0',
    })

    this.customers = new CustomersClient({ appId: options.appId, http })
    this.entitlements = new EntitlementsClient({ appId: options.appId, http })
    this.offerings = new OfferingsClient({ appId: options.appId, http })
    this.products = new ProductsClient({ appId: options.appId, http })
  }
}
