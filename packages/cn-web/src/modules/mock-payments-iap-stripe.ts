import {
  type Entitlement,
  type NativeReceiptPayload,
  type NativeStoreAdapter,
  type Plan,
  type ValidatedReceipt,
  entitlementFromReceipt,
  noEntitlement,
  parseCheckoutRequest,
  parseNativeReceipt,
} from '@/lib/payments-iap-stripe'

/**
 * In-memory backend for the payments-iap-stripe demo. It stands in for the real server the vendored
 * Engine talks to over `fetch`: it answers `/payments/status`, `/payments/receipt` and
 * `/payments/checkout` exactly as the platform backend would, and it owns the SINGLE authoritative
 * entitlement both rails (native receipt, Stripe web) resolve to — so a web purchase and a native
 * one stay in sync, the defining guarantee of this module.
 *
 * The validator is INJECTED (mirroring backend/verify.ts): a receipt is granted only if the demo's
 * deterministic validator recognises it, otherwise the server denies (capability AC on unverifiable
 * receipts). All data is seeded and deterministic; nothing leaves the browser.
 */

export const BASE_URL = 'https://payments.demo.piparo'

export const SEEDED_PLANS: Plan[] = [
  {
    id: 'weekly',
    title: 'Weekly',
    description: 'Full access, billed every week. Cancel anytime.',
    interval: 'weekly',
    storeProductId: 'tech.piparo.demo.pro.weekly',
    stripePriceId: 'price_demo_weekly',
  },
  {
    id: 'annual',
    title: 'Annual',
    description: 'Full access for a year at the best rate.',
    interval: 'annual',
    storeProductId: 'tech.piparo.demo.pro.annual',
    stripePriceId: 'price_demo_annual',
  },
  {
    id: 'lifetime',
    title: 'Lifetime',
    description: 'A one-off purchase, no expiry.',
    interval: 'lifetime',
    storeProductId: 'tech.piparo.demo.pro.lifetime',
    stripePriceId: 'price_demo_lifetime',
  },
]

const INTERVAL_MS: Record<Plan['interval'], number | null> = {
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
  annual: 365 * 24 * 60 * 60 * 1000,
  lifetime: null,
}

/** The fixed instant the demo treats as "now" so seeded expiries render identically every run. */
export const DEMO_NOW = new Date('2026-06-26T10:00:00.000Z')

function planById(planId: string): Plan | undefined {
  return SEEDED_PLANS.find((p) => p.id === planId)
}

export type CheckoutOutcome = 'success' | 'cancel'

export class InMemoryPaymentsBackend {
  private entitlement: Entitlement = noEntitlement
  private transactionSeq = 1000
  /** Stripe sessions the demo can later confirm or abandon, keyed by session id. */
  private readonly pendingCheckouts = new Map<string, string>()

  get status(): Entitlement {
    return this.entitlement
  }

  reset(): void {
    this.entitlement = noEntitlement
    this.pendingCheckouts.clear()
  }

  /**
   * The injected validator: resolve a raw store receipt to a verdict, or `null` when it cannot be
   * verified. The demo recognises receipts that carry a known plan id and a non-empty payload;
   * a receipt tagged `tampered` is rejected to exercise the deny path.
   */
  private validate(provider: ValidatedReceipt['provider'], planId: string, receipt: string) {
    if (receipt.includes('tampered')) return null
    const plan = planById(planId)
    if (!plan || receipt.length === 0) return null
    const ttl = INTERVAL_MS[plan.interval]
    const verdict: ValidatedReceipt = {
      provider,
      transactionId: `txn_${(this.transactionSeq += 1)}`,
      planId: plan.id,
      interval: plan.interval,
      expiresAt: ttl === null ? null : new Date(DEMO_NOW.getTime() + ttl).toISOString(),
    }
    return verdict
  }

  private grant(verdict: ValidatedReceipt): Entitlement {
    this.entitlement = entitlementFromReceipt(verdict, DEMO_NOW)
    return this.entitlement
  }

  /** A `fetch`-compatible handler for the three payments endpoints the Engine calls. */
  async handle(input: string, init?: RequestInit): Promise<Response> {
    const path = input.slice(BASE_URL.length)
    const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })
    const deny = (status: number, code: string) =>
      new Response(JSON.stringify({ code }), { status })

    if (path === '/payments/status') return ok(this.entitlement)

    const payload: unknown = init?.body ? JSON.parse(String(init.body)) : {}

    if (path === '/payments/receipt') {
      const parsed = parseNativeReceipt(payload)
      if (!parsed.success) return deny(400, 'INVALID_RECEIPT')
      const verdict = this.validate(parsed.data.provider, parsed.data.planId, parsed.data.receipt)
      if (!verdict) return deny(402, 'RECEIPT_NOT_VALIDATED')
      return ok(this.grant(verdict))
    }

    if (path === '/payments/checkout') {
      const parsed = parseCheckoutRequest(payload)
      if (!parsed.success) return deny(400, 'INVALID_CHECKOUT')
      if (!planById(parsed.data.planId)) return deny(404, 'UNKNOWN_PLAN')
      const sessionId = `cs_demo_${(this.transactionSeq += 1)}`
      this.pendingCheckouts.set(sessionId, parsed.data.planId)
      return ok({ url: `${BASE_URL}/checkout/${sessionId}` })
    }

    return deny(404, 'NOT_FOUND')
  }

  /**
   * Resolve a Stripe Checkout session the demo opened. On `success`, Stripe confirms server-side and
   * the same authoritative entitlement flips active (no client receipt involved); on `cancel`, the
   * session is dropped and the status is unchanged.
   */
  confirmCheckout(url: string, outcome: CheckoutOutcome): Entitlement {
    const sessionId = url.slice(`${BASE_URL}/checkout/`.length)
    const planId = this.pendingCheckouts.get(sessionId)
    this.pendingCheckouts.delete(sessionId)
    if (outcome === 'cancel' || !planId) return this.entitlement
    const plan = planById(planId)
    if (!plan) return this.entitlement
    const ttl = INTERVAL_MS[plan.interval]
    return this.grant({
      provider: 'stripe',
      transactionId: `txn_${(this.transactionSeq += 1)}`,
      planId: plan.id,
      interval: plan.interval,
      expiresAt: ttl === null ? null : new Date(DEMO_NOW.getTime() + ttl).toISOString(),
    })
  }
}

/**
 * A deterministic native store adapter (the expo-iap seam) for the demo. It yields a syntactically
 * valid Apple receipt the in-memory validator accepts, and a restorable copy of the same plan.
 * Pass `tamper` to emit a corrupted receipt the server rejects (exercising the deny path).
 */
export function createMockStore(
  planId: string,
  opts: { tamper?: boolean } = {},
): NativeStoreAdapter {
  const receipt: NativeReceiptPayload = {
    provider: 'apple',
    receipt: opts.tamper ? 'demo-apple-receipt-tampered' : `demo-apple-receipt-${planId}`,
  }
  return {
    purchase: async () => receipt,
    restore: async () => [receipt],
  }
}

/**
 * Install the backend as `globalThis.fetch` for this base URL only (other requests fall through to
 * the original fetch). Returns an uninstall function. This lets the REAL vendored Engine run its
 * unchanged `fetch(...)` calls against the in-memory server.
 */
export function installMockFetch(backend: InMemoryPaymentsBackend): () => void {
  const original = globalThis.fetch
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const target = typeof input === 'string' ? input : input.toString()
    if (target.startsWith(BASE_URL)) return backend.handle(target, init)
    return original(input, init)
  }) as typeof fetch
  return () => {
    globalThis.fetch = original
  }
}
