import { type ReactNode, useMemo, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  PUIBadge,
  PUIButton,
  PUIEmailInput,
  PUIInput,
  PUISegmentedControl,
  PUISelect,
  PUISeparator,
  PUIText,
} from '@/components/ui'
import {
  type EmailClient,
  EmailError,
  TEMPLATE_IDS,
  type TemplateId,
  type TriggerResponse,
  resolveLocale,
  templates,
} from '@/lib/email-transactional'

import {
  FALLBACK_LOCALE,
  SUPPORTED_LOCALES,
  createMockEmailClient,
} from './mock-email-transactional'

// --- seeded demo content (mirrors the native showcase so both tell the same story) ----------------

const SEEDED_RECIPIENT = 'demo@piparo.tech'

const seededPayloads: Record<TemplateId, Record<string, string>> = {
  'magic-link': { appName: 'Bolzfieber', magicLink: 'https://app.piparo.tech/auth/magic?t=demo' },
  'lead-confirmation': { name: 'Alex Demo', company: 'piparo' },
  'workspace-invite': {
    inviter: 'Pirmin',
    workspace: 'piparo',
    inviteLink: 'https://app.piparo.tech/invite/demo',
  },
  'password-reset': {
    appName: 'Bolzfieber',
    resetLink: 'https://app.piparo.tech/auth/reset?t=demo',
  },
}

const templateLabels: Record<TemplateId, string> = {
  'magic-link': 'Magic link',
  'lead-confirmation': 'Lead confirmation',
  'workspace-invite': 'Workspace invite',
  'password-reset': 'Password reset',
}

const labelFor = (id: string): string => templateLabels[id as TemplateId] ?? id

const fieldLabels: Record<string, string> = {
  appName: 'App name',
  magicLink: 'Magic link URL',
  resetLink: 'Reset link URL',
  inviteLink: 'Invite link URL',
  name: 'Recipient name',
  company: 'Company',
  inviter: 'Inviter',
  workspace: 'Workspace',
}

const localeOptions = SUPPORTED_LOCALES.map((value) => ({ label: value.toUpperCase(), value }))

// --- live preview rendered from the typed template catalogue ---------------------------------------

function MailPreview({ templateId, locale }: { templateId: TemplateId; locale: string }) {
  const template = templates[templateId]
  const resolved = resolveLocale(template, locale, FALLBACK_LOCALE)
  const copy = template.copy(seededPayloads[templateId], resolved)

  return (
    <div className="bg-muted/40 rounded-lg p-5">
      <div className="flex items-baseline justify-between gap-3">
        <PUIText className="font-medium" variant="footnote">
          {copy.subject}
        </PUIText>
        <PUIText className="shrink-0" tone="subtle" variant="caption2">
          {resolved.toUpperCase()}
          {resolved !== locale ? ' (fallback)' : ''}
        </PUIText>
      </div>
      <PUISeparator className="my-4" />
      <div className="bg-background mx-auto max-w-prose space-y-3 rounded-md border p-5">
        {copy.heading ? (
          <PUIText as="h3" className="tracking-tight" variant="headline">
            {copy.heading}
          </PUIText>
        ) : null}
        <PUIText className="text-foreground" variant="callout">
          {copy.body}
        </PUIText>
        {copy.cta ? (
          <span className="bg-primary text-primary-foreground text-subheadline inline-flex rounded-md px-4 py-2 font-semibold">
            {copy.cta.label}
          </span>
        ) : null}
        {copy.note ? (
          <PUIText className="border-border border-t pt-3" tone="muted" variant="footnote">
            {copy.note}
          </PUIText>
        ) : null}
      </div>
    </div>
  )
}

// --- outbox: every transport attempt, the way the platform's send log records it -------------------

type OutboxEntry = { key: number } & (
  | { outcome: TriggerResponse }
  | { error: string; templateId: TemplateId }
)

function OutcomeBadge({ status }: { status: TriggerResponse['status'] }) {
  return status === 'sent' ? (
    <PUIBadge dot variant="success">
      Delivered
    </PUIBadge>
  ) : (
    <PUIBadge dot variant="warning">
      Retrying
    </PUIBadge>
  )
}

function Outbox({ entries }: { entries: OutboxEntry[] }) {
  if (entries.length === 0) {
    return (
      <PUIText tone="subtle" variant="footnote">
        No sends yet. Trigger a template to see the transport outcome here.
      </PUIText>
    )
  }
  return (
    <ul className="divide-border divide-y">
      {entries.map((entry) => (
        <li className="flex items-center justify-between gap-4 py-3" key={entry.key}>
          {'error' in entry ? (
            <>
              <div className="flex min-w-0 flex-col">
                <PUIText className="truncate font-medium" variant="footnote">
                  {labelFor(entry.templateId)}
                </PUIText>
                <PUIText className="font-mono" tone="muted" variant="caption2">
                  rejected before send
                </PUIText>
              </div>
              <PUIBadge dot variant="destructive">
                {entry.error}
              </PUIBadge>
            </>
          ) : (
            <>
              <div className="flex min-w-0 flex-col">
                <PUIText className="truncate font-medium" variant="footnote">
                  {labelFor(entry.outcome.templateId)} v{entry.outcome.version}
                </PUIText>
                <PUIText className="font-mono" tone="muted" variant="caption2">
                  {entry.outcome.id} · {entry.outcome.locale} · {entry.outcome.attempts}×
                </PUIText>
              </div>
              <OutcomeBadge status={entry.outcome.status} />
            </>
          )}
        </li>
      ))}
    </ul>
  )
}

// --- the compose-and-send Shell, wired to the real Engine seam ------------------------------------

function SendTransactionalMail({ client }: { client: EmailClient }) {
  const [recipient, setRecipient] = useState(SEEDED_RECIPIENT)
  const [templateId, setTemplateId] = useState<TemplateId>('magic-link')
  const [locale, setLocale] = useState(SUPPORTED_LOCALES[0]!)
  const [payload, setPayload] = useState<Record<string, string>>(seededPayloads['magic-link'])
  const [busy, setBusy] = useState(false)
  const [entries, setEntries] = useState<OutboxEntry[]>([])

  const fields = useMemo(() => Object.keys(seededPayloads[templateId]), [templateId])

  function selectTemplate(id: TemplateId) {
    setTemplateId(id)
    setPayload(seededPayloads[id])
  }

  async function onSend() {
    setBusy(true)
    const key = Date.now()
    try {
      const outcome = await client.trigger({ templateId, to: recipient.trim(), locale, payload })
      setEntries((prev) => [{ key, outcome }, ...prev])
    } catch (error) {
      const code = error instanceof EmailError ? error.code : 'UNKNOWN'
      setEntries((prev) => [{ key, error: code, templateId }, ...prev])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void onSend()
        }}
      >
        <div className="flex flex-col gap-1.5">
          <PUIText as="h2" className="tracking-tight" variant="title3">
            Trigger a transactional mail
          </PUIText>
          <PUIText className="max-w-prose" tone="muted" variant="subheadline">
            The form drives the isomorphic trigger client. It validates against the shared schema,
            then the in-memory transport delivers and logs every attempt.
          </PUIText>
        </div>

        <Labelled label="Template">
          <PUISelect
            onValueChange={(value) => selectTemplate(value as TemplateId)}
            options={TEMPLATE_IDS.map((id) => ({ label: templateLabels[id], value: id }))}
            value={templateId}
          />
        </Labelled>

        <PUIEmailInput
          label="Recipient"
          onChange={(event) => setRecipient(event.target.value)}
          value={recipient}
        />

        <Labelled label="Locale">
          <PUISegmentedControl onValueChange={setLocale} options={localeOptions} value={locale} />
        </Labelled>

        <div className="flex flex-col gap-4">
          {fields.map((field) => (
            <PUIInput
              key={field}
              label={fieldLabels[field] ?? field}
              onChange={(event) => setPayload((prev) => ({ ...prev, [field]: event.target.value }))}
              value={payload[field] ?? ''}
            />
          ))}
        </div>

        <PUIButton fullWidth loading={busy} type="submit">
          Send mail
        </PUIButton>

        <PUIText tone="subtle" variant="footnote">
          Clear the recipient for the NO_RECIPIENT guard. Password reset fails its first transport
          attempt, then the queue retries and delivers on the second.
        </PUIText>
      </form>

      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <PUIText as="h2" className="tracking-tight" variant="headline">
            Preview
          </PUIText>
          <MailPreview locale={locale} templateId={templateId} />
        </section>

        <section className="flex flex-col gap-3">
          <PUIText as="h2" className="tracking-tight" variant="headline">
            Outbox
          </PUIText>
          <Outbox entries={entries} />
        </section>
      </div>
    </div>
  )
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <PUIText className="font-medium" variant="subheadline">
        {label}
      </PUIText>
      {children}
    </div>
  )
}

function EmailTransactionalDemo() {
  const client = useMemo(() => createMockEmailClient(), [])
  return <SendTransactionalMail client={client} />
}

const meta = {
  title: 'Modules/Email (Transactional)',
  component: EmailTransactionalDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Reliably send transactional mail (magic link, lead confirmation, invites, reset) on the isomorphic email-transactional Engine, the same trigger client and typed template catalogue the platform ships on web and native. In-memory demo: a mock transport seeds the magic-link, lead-confirmation, workspace-invite and password-reset templates in de/en. Try the seeded data to deliver, switch locale to watch the subject and fallback change, clear the recipient for the NO_RECIPIENT guard, and send the password reset to watch the queue retry and deliver on the second attempt.',
      },
    },
  },
} satisfies Meta<typeof EmailTransactionalDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
