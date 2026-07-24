import { AccessClient } from './AccessClient.js'
import { ContractsClient } from './ContractsClient.js'
import { CustomersClient } from './CustomersClient.js'
import { EntitlementsClient } from './EntitlementsClient.js'
import { HttpClient, type OperatorContext } from './HttpClient.js'
import { LicensesClient } from './LicensesClient.js'
import { OfferingsClient } from './OfferingsClient.js'
import { PaymentsClient } from './PaymentsClient.js'
import { ProductsClient } from './ProductsClient.js'

export interface SubKitOptions {
  apiBaseUrl: string
  appId?: string
  fetch?: typeof fetch
  /**
   * Human operator behind this trusted key (for example a CMS admin). Forwarded
   * as audit evidence so SubKit distinguishes the technical key from the person.
   */
  operator?: OperatorContext
  secretKey: string
  timeoutMs?: number
  userAgent?: string
}

export class SubKit {
  readonly access: AccessClient
  readonly contracts: ContractsClient
  readonly customers: CustomersClient
  readonly entitlements: EntitlementsClient
  readonly licenses: LicensesClient
  readonly offerings: OfferingsClient
  readonly payments: PaymentsClient
  readonly products: ProductsClient

  constructor(options: SubKitOptions) {
    const http = new HttpClient({
      apiBaseUrl: options.apiBaseUrl,
      fetchImpl: options.fetch ?? fetch,
      operator: options.operator,
      secretKey: options.secretKey,
      timeoutMs: options.timeoutMs ?? 10_000,
      userAgent: options.userAgent ?? '@piparotech/subkit-node/0.1.8',
    })

    this.access = new AccessClient({ appId: options.appId, http })
    this.contracts = new ContractsClient({ appId: options.appId, http })
    this.customers = new CustomersClient({ appId: options.appId, http })
    this.entitlements = new EntitlementsClient({ appId: options.appId, http })
    this.licenses = new LicensesClient({ appId: options.appId, http })
    this.offerings = new OfferingsClient({ appId: options.appId, http })
    this.payments = new PaymentsClient({ appId: options.appId, http })
    this.products = new ProductsClient({ appId: options.appId, http })
  }
}
