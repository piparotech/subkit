// In-memory seam for the email-transactional Engine: a deterministic EmailClient standing in for the
// platform's auth-gated `/email/send` backend + nodemailer transport + outbox. The Engine normally
// POSTs the trigger with the auth session's bearer; here we replace that surface with an offline
// transport that validates the request against the shared TriggerRequest schema and "delivers" canned
// outcomes per template, so the audited client/contract runs unchanged with no network.
//
// Seeded transactional set: magic-link · lead-confirmation · workspace-invite · password-reset (de/en),
// mirroring the native showcase mock so both tell the same story. Known templates are delivered ('sent');
// password-reset is flaky and only succeeds on the 2nd attempt (exercises the queue/retry counter). An
// unknown template id is rejected (UNKNOWN_TEMPLATE) and a missing/invalid recipient is rejected before
// send (NO_RECIPIENT).
import {
  type EmailClient,
  EmailError,
  type TriggerRequest,
  TriggerRequest as TriggerRequestSchema,
} from '@/lib/email-transactional'

const templateVersions: Record<string, string> = {
  'magic-link': '2.1.0',
  'lead-confirmation': '1.4.0',
  'workspace-invite': '1.0.0',
  'password-reset': '3.0.0',
}

export const SUPPORTED_LOCALES = ['de', 'en']
export const FALLBACK_LOCALE = 'de'

const delay = (ms = 140) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** A deterministic, offline EmailClient backed by an in-memory transport + outbox. */
export function createMockEmailClient(): EmailClient {
  const attemptsByKey = new Map<string, number>()
  let sequence = 0

  return {
    async trigger(request: TriggerRequest) {
      const parsed = TriggerRequestSchema.safeParse(request)
      if (!parsed.success || !parsed.data.to) {
        await delay(40)
        throw new EmailError(422, 'NO_RECIPIENT')
      }
      const { templateId, locale } = parsed.data
      const version = templateVersions[templateId]
      if (!version) {
        await delay(40)
        throw new EmailError(404, 'UNKNOWN_TEMPLATE')
      }

      await delay()

      const key = `${templateId}:${parsed.data.to}`
      const attempts = (attemptsByKey.get(key) ?? 0) + 1
      attemptsByKey.set(key, attempts)

      // password-reset fails the first attempt to exercise the queue/retry path, then succeeds.
      const sent = templateId !== 'password-reset' || attempts >= 2

      return {
        id: `eml_${(++sequence).toString().padStart(4, '0')}`,
        status: sent ? 'sent' : 'failed',
        templateId,
        version,
        locale: SUPPORTED_LOCALES.includes(locale ?? '') ? (locale as string) : FALLBACK_LOCALE,
        attempts,
      }
    },
  }
}
