import { z } from 'zod'

/**
 * The `email-transactional` module's `config.schema` — the contract for `modules[].config` in a
 * Blueprint. The typed, customer/cockpit-facing switch surface: which provider transports the prod
 * mail, the dev-vs-prod routing (MailDev), the sender identity, the locales templates are shipped in,
 * and the retry policy. Secrets (SMTP host/user/pass, API keys) are never here; they live in env and
 * are resolved by the backend.
 *
 * Vendored verbatim from @piparo/email-transactional/config. Pure zod, isomorphic — no server, no
 * RN, no react-email. The server-only render/templates/mail layers are skipped; the demo mocks the
 * isomorphic client seam (client.ts).
 */

/** Supported prod transports. `smtp` covers nodemailer-SMTP and any SMTP-relay provider (SES,
 *  Postmark, Resend, SendGrid all expose SMTP). Provider choice is a per-project decision. */
export const EmailProvider = z.enum(['smtp', 'ses', 'postmark', 'resend', 'sendgrid'])
export type EmailProvider = z.infer<typeof EmailProvider>

const localeRe = /^[a-z]{2}(-[A-Z]{2})?$/

/** How many times the queue retries a failed send, and the base backoff in ms (exponential). */
export const EmailRetry = z.strictObject({
  maxAttempts: z.number().int().min(1).max(10).default(3),
  baseDelayMs: z.number().int().min(0).max(60_000).default(500),
})
export type EmailRetry = z.infer<typeof EmailRetry>

export const EmailConfig = z.strictObject({
  /** Prod transport. In dev the send is always routed to MailDev regardless of this. */
  provider: EmailProvider.default('smtp'),
  /** Sender identity used on every transactional mail unless a trigger overrides `from`. */
  fromName: z.string().trim().min(1).default('piparo'),
  fromAddress: z.email().default('no-reply@example.com'),
  /** Optional reply-to applied to every mail. */
  replyTo: z.email().nullable().default(null),
  /** Locales templates are shipped in; the first is the fallback when a trigger locale is unknown. */
  locales: z.array(z.string().regex(localeRe)).min(1).default(['de', 'en']),
  retry: EmailRetry.default(() => EmailRetry.parse({})),
})
export type EmailConfig = z.infer<typeof EmailConfig>

/** Parse + validate an email-transactional module config (returns the Zod safeParse result). */
export function parseEmailConfig(input: unknown) {
  return EmailConfig.safeParse(input)
}
