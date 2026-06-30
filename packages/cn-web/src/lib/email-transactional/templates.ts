import { z } from 'zod'

/**
 * The transactional template catalogue (Engine metadata) — the versioned, per-locale set distilled
 * from the reference apps (relm: magic-link, workspace-invite; website: lead-confirmation; auth:
 * password-reset). Each template is typed (a Zod payload schema), versioned (bumped on copy/layout
 * changes), and translated (localized subject + body per configured locale).
 *
 * Adapted from @piparo/email-transactional/templates. The platform renders the body with react-email
 * server-side (react-dom/server on bun/node), which never runs in a browser bundle; here the same
 * typed payloads + localized copy drive a browser-safe HTML + text preview so the showcase shows the
 * real subject, placeholders, and locale fallback without the server renderer.
 */

export const TEMPLATE_IDS = [
  'magic-link',
  'lead-confirmation',
  'workspace-invite',
  'password-reset',
] as const
export type TemplateId = (typeof TEMPLATE_IDS)[number]

type LocaleCopy = {
  subject: string
  heading?: string
  body: string
  cta?: { label: string; href: string }
  note?: string
}

type Payload = Record<string, string>

export type EmailTemplate = {
  id: TemplateId
  /** Bumped on copy/markup/engine changes; lets a Blueprint pin a known-good template revision. */
  version: string
  /** The locales this template ships copy for, in declaration order (the first is its own fallback). */
  locales: string[]
  /** The Zod schema for the payload this template needs (the same contract the server validates). */
  payload: z.ZodType<Payload>
  /** Localized, payload-aware copy bundle for a resolved locale. */
  copy: (payload: Payload, locale: string) => LocaleCopy
}

const magicLink: EmailTemplate = {
  id: 'magic-link',
  version: '2.0.0',
  locales: ['de', 'en'],
  payload: z.strictObject({ appName: z.string().min(1), magicLink: z.url() }),
  copy: ({ appName, magicLink: link }, locale) =>
    locale === 'de'
      ? {
          subject: `Dein Anmeldelink für ${appName}`,
          body: `Hallo, melde dich bei ${appName} an:`,
          cta: { label: 'Jetzt anmelden', href: link! },
          note: 'Der Link ist 15 Minuten gültig. Falls du das nicht angefordert hast, ignoriere diese Mail.',
        }
      : {
          subject: `Your sign-in link for ${appName}`,
          body: `Hi, sign in to ${appName}:`,
          cta: { label: 'Sign in now', href: link! },
          note: 'The link is valid for 15 minutes. If you did not request this, ignore this email.',
        },
}

const leadConfirmation: EmailTemplate = {
  id: 'lead-confirmation',
  version: '2.0.0',
  locales: ['de', 'en'],
  payload: z.strictObject({ name: z.string().min(1), company: z.string().min(1) }),
  copy: ({ name, company }, locale) =>
    locale === 'de'
      ? {
          subject: `Danke für deine Anfrage bei ${company}`,
          heading: `Hallo ${name},`,
          body: `vielen Dank für deine Anfrage. Wir melden uns in Kürze bei dir. Dein Team von ${company}.`,
        }
      : {
          subject: `Thanks for reaching out to ${company}`,
          heading: `Hi ${name},`,
          body: `thanks for your enquiry. We will get back to you shortly. Your ${company} team.`,
        },
}

const workspaceInvite: EmailTemplate = {
  id: 'workspace-invite',
  version: '2.0.0',
  locales: ['de', 'en'],
  payload: z.strictObject({
    inviter: z.string().min(1),
    workspace: z.string().min(1),
    inviteLink: z.url(),
  }),
  copy: ({ inviter, workspace, inviteLink }, locale) =>
    locale === 'de'
      ? {
          subject: `${inviter} lädt dich zu ${workspace} ein`,
          body: `${inviter} hat dich zum Workspace ${workspace} eingeladen.`,
          cta: { label: 'Einladung annehmen', href: inviteLink! },
        }
      : {
          subject: `${inviter} invited you to ${workspace}`,
          body: `${inviter} invited you to the workspace ${workspace}.`,
          cta: { label: 'Accept invitation', href: inviteLink! },
        },
}

const passwordReset: EmailTemplate = {
  id: 'password-reset',
  version: '2.0.0',
  locales: ['de', 'en'],
  payload: z.strictObject({ appName: z.string().min(1), resetLink: z.url() }),
  copy: ({ appName, resetLink }, locale) =>
    locale === 'de'
      ? {
          subject: `Passwort zurücksetzen: ${appName}`,
          body: `Hallo, setze dein Passwort für ${appName} zurück:`,
          cta: { label: 'Passwort zurücksetzen', href: resetLink! },
          note: 'Falls du das nicht angefordert hast, ignoriere diese Mail.',
        }
      : {
          subject: `Reset your password: ${appName}`,
          body: `Hi, reset your password for ${appName}:`,
          cta: { label: 'Reset password', href: resetLink! },
          note: 'If you did not request this, ignore this email.',
        },
}

/** The default registry. A Blueprint can extend/override per project (own templates, more locales). */
export const templates: Record<TemplateId, EmailTemplate> = {
  'magic-link': magicLink,
  'lead-confirmation': leadConfirmation,
  'workspace-invite': workspaceInvite,
  'password-reset': passwordReset,
}

/** Resolve which locale a template renders for a request (requested → fallback → first declared). */
export function resolveLocale(
  template: EmailTemplate,
  locale: string,
  fallbackLocale: string,
): string {
  if (template.locales.includes(locale)) return locale
  if (template.locales.includes(fallbackLocale)) return fallbackLocale
  return template.locales[0]!
}
