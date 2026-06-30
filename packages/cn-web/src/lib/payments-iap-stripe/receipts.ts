import { z } from 'zod'

import { type PaymentProvider, PlanInterval } from './plans'

/**
 * Provider-neutral receipt handling — the PURE, offline core of "server-side receipt validation".
 *
 * The Shell never trusts a client-reported entitlement: after a native purchase/restore it hands the
 * raw store receipt to the backend, which re-checks it with the store. The actual network call to
 * Apple/Google/Stripe is an INJECTED function (see ReceiptValidator in backend/verify.ts) so this
 * file — and every unit test — stays offline and deterministic. Here we define only the wire shapes
 * and the pure normalization of a validator's verdict into an entitlement.
 */

/** A raw native-store receipt the client submits for server-side validation. */
export const NativeReceipt = z.strictObject({
  provider: z.enum(['apple', 'google']),
  /** Logical plan id the client believes was purchased (re-derived & re-checked server-side). */
  planId: z.string().min(1),
  /** The store-native receipt/token payload (Apple base64 receipt, Google purchaseToken, etc.). */
  receipt: z.string().min(1),
  /** Android only: the package's product id the token belongs to. */
  productId: z.string().optional(),
})
export type NativeReceipt = z.infer<typeof NativeReceipt>

/** The body of POST /payments/checkout — start a Stripe Checkout session for a web plan. */
export const CheckoutRequest = z.strictObject({
  planId: z.string().min(1),
  successUrl: z.url(),
  cancelUrl: z.url(),
})
export type CheckoutRequest = z.infer<typeof CheckoutRequest>

/**
 * A validator's verdict — what a store/Stripe lookup resolved the receipt to. `null` everywhere a
 * validator returns means "could not be validated" → the server MUST deny (capability AC: "If eine
 * eingehende Store-/Stripe-Quittung nicht server-seitig validiert werden kann, then bleibt der
 * Pro-Status verweigert").
 */
export const ValidatedReceipt = z.strictObject({
  provider: z.enum(['apple', 'google', 'stripe']),
  /** Store-side transaction id — used as the idempotency key in the processed-receipt ledger. */
  transactionId: z.string().min(1),
  planId: z.string().min(1),
  interval: PlanInterval,
  /** ISO expiry for a subscription; null = lifetime / non-expiring. */
  expiresAt: z.string().nullable(),
})
export type ValidatedReceipt = z.infer<typeof ValidatedReceipt>

/**
 * Pure mapping from a validator verdict to the entitlement the store persists. A verdict whose
 * expiry is already in the past yields an inactive entitlement (lapsed subscription) — never grant
 * Pro for an expired receipt.
 */
export function entitlementFromReceipt(
  v: ValidatedReceipt,
  now: Date = new Date(),
): { active: boolean; planId: string; provider: PaymentProvider; expiresAt: string | null } {
  const expired = v.expiresAt !== null && Date.parse(v.expiresAt) <= now.getTime()
  return {
    active: !expired,
    planId: v.planId,
    provider: v.provider,
    expiresAt: v.expiresAt,
  }
}

/** Parse a native receipt submission (client → server). */
export function parseNativeReceipt(input: unknown) {
  return NativeReceipt.safeParse(input)
}

/** Parse a checkout request (client → server). */
export function parseCheckoutRequest(input: unknown) {
  return CheckoutRequest.safeParse(input)
}
