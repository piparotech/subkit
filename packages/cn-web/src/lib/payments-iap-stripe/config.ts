import { z } from 'zod'

import { Plan } from './plans'

/**
 * The `payments-iap-stripe` module's `config.schema` — the contract for `modules[].config` in a
 * Blueprint. The typed, customer/cockpit-facing switch surface: which plans are offered, which rails
 * are enabled (native IAP / Stripe web), and the paywall copy. Validated by generator-core.
 *
 * Store product ids and Stripe price ids live INSIDE each plan; the actual credentials (Apple shared
 * secret, Google service account, Stripe secret key) are server env, never in this config.
 */

/** Customer-editable paywall copy (the Cockpit may edit these; see paymentsConfigRights). */
export const PaymentsTexts = z.strictObject({
  paywallTitle: z.string().default('Pro freischalten'),
  paywallSubtitle: z.string().default('Wähle einen Plan und nutze alle Funktionen.'),
  purchaseButton: z.string().default('Kaufen'),
  restoreButton: z.string().default('Käufe wiederherstellen'),
  manageButton: z.string().default('Abo verwalten'),
  activeLabel: z.string().default('Aktiv'),
  inactiveLabel: z.string().default('Kein aktives Abo'),
  lockedNotice: z.string().default('Diese Funktion ist Pro-Mitgliedern vorbehalten.'),
})
export type PaymentsTexts = z.infer<typeof PaymentsTexts>

export const PaymentsConfig = z.strictObject({
  /** The offered plans. Order is the display order on the paywall. */
  plans: z.array(Plan).default([]),
  /** Enable native In-App-Purchase (iOS/Android) — requires store products configured. */
  enableNativeIap: z.boolean().default(true),
  /** Enable the Stripe Checkout web fallback — requires Stripe price ids + server key. */
  enableStripeWeb: z.boolean().default(true),
  /** Whether the Shell offers a "restore purchases" action (native). */
  allowRestore: z.boolean().default(true),
  texts: PaymentsTexts.default(() => PaymentsTexts.parse({})),
})
export type PaymentsConfig = z.infer<typeof PaymentsConfig>

/**
 * Rights model ("wer darf bedienen") — per config path: `customer` = editable in the Cockpit,
 * `piparo` = piparo-only. Plan ids/credentials and the rail toggles are wiring (piparo); copy is
 * the customer's.
 */
export type EditableBy = 'piparo' | 'customer'
export const paymentsConfigRights: Record<string, EditableBy> = {
  plans: 'piparo',
  enableNativeIap: 'piparo',
  enableStripeWeb: 'piparo',
  allowRestore: 'piparo',
  texts: 'customer',
}

/** Parse + validate a payments-iap-stripe module config (returns the Zod safeParse result). */
export function parsePaymentsConfig(input: unknown) {
  return PaymentsConfig.safeParse(input)
}
