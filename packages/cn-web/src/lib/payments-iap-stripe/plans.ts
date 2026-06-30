import { z } from 'zod'

/**
 * The shared payments domain schema — the single source validated on BOTH client (UX gating, plan
 * lists) and server (authoritative entitlement). One schema, no drift. Consumed by the Shell
 * screens, the isomorphic client, and the backend store.
 *
 * The two purchase rails (native In-App-Purchase via the store, Stripe Checkout on the web) both
 * resolve to ONE thing: a `sub`-keyed entitlement. That is why a web purchase and a mobile purchase
 * are automatically in sync — they write the same row, read by the same `GET /payments/status`.
 */

/** Which rail granted the active entitlement. */
export const PaymentProvider = z.enum(['apple', 'google', 'stripe'])
export type PaymentProvider = z.infer<typeof PaymentProvider>

/** Billing period of a plan. `lifetime` = one-off non-consumable (no expiry). */
export const PlanInterval = z.enum(['weekly', 'monthly', 'annual', 'lifetime'])
export type PlanInterval = z.infer<typeof PlanInterval>

/**
 * A purchasable plan. The store-product identifiers and the Stripe price id are configured per app
 * (App Store Connect / Play Console / Stripe Dashboard); the same logical plan maps to all three.
 */
export const Plan = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(''),
  interval: PlanInterval,
  /** Native store product id (App Store / Play). Empty = not offered on native. */
  storeProductId: z.string().default(''),
  /** Stripe Price id for the web checkout. Empty = not offered on the web. */
  stripePriceId: z.string().default(''),
})
export type Plan = z.infer<typeof Plan>

/**
 * The authoritative entitlement — what the server says the caller is entitled to. `active` is the
 * ONLY thing the UI gates on; everything else is provenance. A never-purchased / denied caller reads
 * back the `noEntitlement` default (active=false → all Pro features locked).
 */
export const Entitlement = z.strictObject({
  active: z.boolean(),
  planId: z.string().nullable(),
  provider: PaymentProvider.nullable(),
  /** ISO instant the entitlement expires (subscriptions); null = no expiry (lifetime) or inactive. */
  expiresAt: z.string().nullable(),
})
export type Entitlement = z.infer<typeof Entitlement>

/** The status a fresh / denied / lapsed caller reads back. */
export const noEntitlement: Entitlement = {
  active: false,
  planId: null,
  provider: null,
  expiresAt: null,
}

/**
 * Pure Pro-gating predicate — the single rule the Shell uses to lock/unlock features (capability
 * AC: "While der Abo-Status inaktiv ist, sind Pro-Features im UI gesperrt"). An entitlement is Pro
 * iff the server marked it active AND it has not expired at `now`. A missing `expiresAt` on an active
 * entitlement = lifetime / non-expiring (still Pro).
 */
export function isPro(
  entitlement: Entitlement | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!entitlement || !entitlement.active) return false
  if (entitlement.expiresAt === null) return true
  const expiry = Date.parse(entitlement.expiresAt)
  if (Number.isNaN(expiry)) return false
  return expiry > now.getTime()
}

/** Parse + validate an entitlement coming off the wire (client re-validates the server response). */
export function parseEntitlement(input: unknown) {
  return Entitlement.safeParse(input)
}
