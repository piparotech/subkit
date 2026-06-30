import { type Entitlement, parseEntitlement } from './plans'
import {
  type CheckoutRequest,
  CheckoutRequest as CheckoutRequestSchema,
  type NativeReceipt,
  NativeReceipt as NativeReceiptSchema,
} from './receipts'

/**
 * The isomorphic payments client (Engine) — one fetch surface for web + native. The host supplies a
 * `getToken` (the auth module's session controller) so the client never owns auth state, and a
 * `store` adapter wrapping the platform purchase SDK (expo-iap on native, none on web). The client
 * orchestrates the FLOW; the server is always the authority on the resulting entitlement.
 *
 * Flow on native: store.purchase(productId) → raw receipt → POST /payments/receipt (server validates
 *   with Apple/Google) → server returns the authoritative entitlement.
 * Flow on web: POST /payments/checkout → Stripe Checkout URL → host opens it; the entitlement
 *   becomes active after Stripe confirms server-side, surfaced on the next getStatus().
 */
export type PaymentsClientOptions = {
  baseUrl: string
  /** Returns a fresh access token (sync or async); null = unauthenticated. */
  getToken: () => Promise<string | null> | string | null
  /** Native store adapter (expo-iap wrapper). Omit on the web (Stripe-only). */
  store?: NativeStoreAdapter
}

/**
 * The narrow seam over the native store SDK the host wires (e.g. expo-iap). Kept tiny + injectable
 * so the Engine and its tests never load a native module. `purchase`/`restore` return the raw
 * store receipts; the server re-validates them.
 */
export type NativeStoreAdapter = {
  /** Run the native purchase UI for a store product; resolve the raw receipt(s) to submit. */
  purchase(input: { storeProductId: string }): Promise<NativeReceiptPayload>
  /** Restore previous purchases; resolve every restorable receipt to re-validate. */
  restore(): Promise<NativeReceiptPayload[]>
}

/** The raw bits the store adapter yields for one purchase, minus the plan id (the client adds it). */
export type NativeReceiptPayload = {
  provider: 'apple' | 'google'
  receipt: string
  productId?: string
}

export type PaymentsClient = {
  /** The authoritative entitlement for the current caller (server-validated). */
  getStatus(): Promise<Entitlement>
  /** Native purchase: drive the store, then submit the receipt for server validation. */
  purchaseNative(input: { planId: string; storeProductId: string }): Promise<Entitlement>
  /** Native restore: re-validate every restorable receipt; returns the resulting entitlement. */
  restoreNative(input: { planId: string }): Promise<Entitlement>
  /** Submit an already-collected native receipt for server validation (low-level seam). */
  submitReceipt(receipt: NativeReceipt): Promise<Entitlement>
  /** Web: create a Stripe Checkout session; returns the URL the host opens. */
  startCheckout(req: CheckoutRequest): Promise<{ url: string }>
}

export class PaymentsError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
    this.name = 'PaymentsError'
  }
}

async function codeOf(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { code?: string }
    return body.code ?? `HTTP_${res.status}`
  } catch {
    return `HTTP_${res.status}`
  }
}

export function createPaymentsClient(opts: PaymentsClientOptions): PaymentsClient {
  const base = opts.baseUrl.replace(/\/$/, '')
  const url = (path: string) => `${base}${path}`

  async function authHeaders(): Promise<Record<string, string>> {
    const token = await opts.getToken()
    return token ? { authorization: `Bearer ${token}` } : {}
  }

  async function postJson(path: string, body: unknown): Promise<Response> {
    return fetch(url(path), {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify(body),
    })
  }

  async function submitReceipt(receipt: NativeReceipt): Promise<Entitlement> {
    const parsed = NativeReceiptSchema.safeParse(receipt)
    if (!parsed.success) throw new PaymentsError(400, 'INVALID_RECEIPT')
    const res = await postJson('/payments/receipt', parsed.data)
    if (!res.ok) throw new PaymentsError(res.status, await codeOf(res))
    const entitlement = parseEntitlement(await res.json())
    if (!entitlement.success) throw new PaymentsError(502, 'INVALID_RESPONSE')
    return entitlement.data
  }

  function requireStore(): NativeStoreAdapter {
    if (!opts.store) throw new PaymentsError(400, 'NO_NATIVE_STORE')
    return opts.store
  }

  return {
    async getStatus() {
      const res = await fetch(url('/payments/status'), { headers: await authHeaders() })
      if (!res.ok) throw new PaymentsError(res.status, await codeOf(res))
      const entitlement = parseEntitlement(await res.json())
      if (!entitlement.success) throw new PaymentsError(502, 'INVALID_RESPONSE')
      return entitlement.data
    },

    async purchaseNative({ planId, storeProductId }) {
      const store = requireStore()
      const payload = await store.purchase({ storeProductId })
      return submitReceipt({ ...payload, planId })
    },

    async restoreNative({ planId }) {
      const store = requireStore()
      const payloads = await store.restore()
      let latest: Entitlement | null = null
      for (const payload of payloads) {
        latest = await submitReceipt({ ...payload, planId })
      }
      // No restorable receipts → re-read the authoritative status (still possibly active elsewhere).
      return latest ?? this.getStatus()
    },

    submitReceipt,

    async startCheckout(req) {
      const parsed = CheckoutRequestSchema.safeParse(req)
      if (!parsed.success) throw new PaymentsError(400, 'INVALID_CHECKOUT')
      const res = await postJson('/payments/checkout', parsed.data)
      if (!res.ok) throw new PaymentsError(res.status, await codeOf(res))
      const body = (await res.json()) as { url?: string }
      if (!body.url) throw new PaymentsError(502, 'INVALID_RESPONSE')
      return { url: body.url }
    },
  }
}
