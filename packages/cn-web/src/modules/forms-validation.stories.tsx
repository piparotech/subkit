import { useCallback, useMemo, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'
import { Check, Lock, ShieldCheck } from 'lucide-react'

import { PUIBadge, PUIButton, PUIInput, PUIPasswordInput, PUIText } from '@/components/ui'
import { type FieldErrors, fieldErrors } from '@/lib/forms-validation'

import {
  LoginSchema,
  type LoginValues,
  correctPin,
  createMockSubmit,
  maxAttempts,
} from './mock-forms-validation'

type Outcome =
  | { kind: 'idle' }
  | { kind: 'success'; username: string }
  | { kind: 'rejected'; remaining: number }
  | { kind: 'locked' }

const initialValues: LoginValues = { username: '', pin: '' }

/** Headless controller bound to the shared schema: inline field errors, double-submit guard. */
function useLoginForm(onValid: (values: LoginValues) => Promise<void>) {
  const [values, setValues] = useState<LoginValues>(initialValues)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const setField = useCallback((key: keyof LoginValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const submit = useCallback(async () => {
    if (submitting) return
    const parsed = LoginSchema.safeParse(values)
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }
    setErrors({})
    setSubmitting(true)
    try {
      await onValid(parsed.data)
    } finally {
      setSubmitting(false)
    }
  }, [onValid, submitting, values])

  return { values, errors, submitting, setField, submit }
}

function Checkpoint({ done, label, detail }: { done: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden
        className={
          done
            ? 'bg-primary text-primary-foreground mt-0.5 flex size-5 items-center justify-center rounded-full'
            : 'border-border text-muted-foreground mt-0.5 flex size-5 items-center justify-center rounded-full border'
        }
      >
        {done ? (
          <Check className="size-3" />
        ) : (
          <span className="size-1.5 rounded-full bg-current" />
        )}
      </span>
      <div className="flex flex-col gap-0.5">
        <PUIText className={done ? 'font-medium' : 'font-medium opacity-60'} variant="footnote">
          {label}
        </PUIText>
        <PUIText tone="muted" variant="caption1">
          {detail}
        </PUIText>
      </div>
    </li>
  )
}

function FormsValidationDemo() {
  const submitToServer = useMemo(() => createMockSubmit(), [])
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' })
  const [serverChecked, setServerChecked] = useState(false)

  const form = useLoginForm(async (values) => {
    // The client already pre-validated against the schema; the server re-validates against the SAME
    // schema and enforces the lockout authoritatively, then reports the outcome.
    const result = await submitToServer(values)
    setServerChecked(true)
    switch (result.kind) {
      case 'success':
        setOutcome({ kind: 'success', username: result.data.username })
        break
      case 'rejected':
        setOutcome({ kind: 'rejected', remaining: result.attempts.remaining })
        break
      case 'locked':
        setOutcome({ kind: 'locked' })
        break
      case 'invalid':
        setOutcome({ kind: 'rejected', remaining: 0 })
        break
    }
  })

  const locked = outcome.kind === 'locked'
  const clientValid = LoginSchema.safeParse(form.values).success
  const remaining = outcome.kind === 'rejected' ? outcome.remaining : maxAttempts

  const reset = () => {
    form.setField('pin', '')
    setServerChecked(false)
    setOutcome({ kind: 'idle' })
  }

  return (
    <div className="grid max-w-3xl gap-x-12 gap-y-8 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void form.submit()
        }}
      >
        <div className="flex flex-col gap-1.5">
          <PUIText as="h2" className="tracking-tight" variant="title3">
            Sign in
          </PUIText>
          <PUIText className="max-w-prose" tone="muted" variant="subheadline">
            One Zod schema, checked twice: inline on the client, then re-validated by the server
            before the action runs.
          </PUIText>
        </div>

        <PUIInput
          autoCapitalize="none"
          autoComplete="username"
          disabled={form.submitting || locked}
          error={form.errors.username}
          label="Username"
          onChange={(event) => form.setField('username', event.target.value)}
          placeholder="demo"
          value={form.values.username}
        />

        <PUIPasswordInput
          autoComplete="off"
          disabled={form.submitting || locked}
          error={form.errors.pin}
          inputMode="numeric"
          label="PIN (6 digits)"
          onChange={(event) => form.setField('pin', event.target.value)}
          placeholder="123456"
          value={form.values.pin}
        />

        {outcome.kind === 'success' ? (
          <p className="text-primary flex items-center gap-2" role="status">
            <ShieldCheck className="size-4" />
            <PUIText className="text-primary" variant="footnote">
              Signed in as {outcome.username}, confirmed server-side against the same schema.
            </PUIText>
          </p>
        ) : null}

        {outcome.kind === 'rejected' ? (
          <PUIText className="text-destructive" variant="footnote">
            Wrong PIN. {outcome.remaining} {outcome.remaining === 1 ? 'attempt' : 'attempts'} left
            before lockout.
          </PUIText>
        ) : null}

        {locked ? (
          <p className="text-destructive flex items-center gap-2" role="alert">
            <Lock className="size-4" />
            <PUIText className="text-destructive" variant="footnote">
              Too many failed attempts. Sign-in is temporarily locked.
            </PUIText>
          </p>
        ) : null}

        {outcome.kind === 'success' ? (
          <PUIButton onPress={reset} type="button" variant="outline">
            Reset
          </PUIButton>
        ) : (
          <PUIButton disabled={locked} loading={form.submitting} type="submit">
            Sign in
          </PUIButton>
        )}
      </form>

      <aside className="md:border-border flex flex-col gap-6 md:border-l md:pl-12">
        <div className="flex flex-col gap-3">
          <PUIText className="font-medium tracking-tight" variant="subheadline">
            Where the schema runs
          </PUIText>
          <ol className="flex flex-col gap-4">
            <Checkpoint
              detail="safeParse on every keystroke surfaces the first error per field and blocks submit."
              done={clientValid}
              label="Client, inline UX"
            />
            <Checkpoint
              detail="revalidate() re-checks the same schema; only ok:true data reaches the action."
              done={serverChecked && outcome.kind !== 'rejected'}
              label="Server, authoritative"
            />
            <Checkpoint
              detail="A server-side limiter counts failures and locks the action after the budget."
              done={outcome.kind === 'success' || locked}
              label="Server, lockout gate"
            />
          </ol>
        </div>

        <div className="border-border flex items-center justify-between gap-4 border-t pt-4">
          <PUIText tone="muted" variant="footnote">
            Lockout budget
          </PUIText>
          <PUIBadge
            dot
            variant={locked ? 'destructive' : remaining < maxAttempts ? 'warning' : 'success'}
          >
            {locked ? 'Locked' : `${remaining} of ${maxAttempts} left`}
          </PUIBadge>
        </div>

        <PUIText className="max-w-prose" tone="subtle" variant="caption1">
          Seeded credential: PIN {correctPin} signs in. Any other 6-digit PIN counts as a failed
          attempt; three failures lock the username.
        </PUIText>
      </aside>
    </div>
  )
}

const meta = {
  title: 'Modules/Form Validation (Shared Client/Server Schema)',
  component: FormsValidationDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Capture user input and secure it against one shared schema on both client and server, so validation rules never drift and error and lockout states stay traceable. In-memory demo: a login form (username + 6-digit PIN) seeded so PIN 123456 signs in. Try a malformed field for inline errors, a wrong PIN to watch the server-side limiter count down, and three failures to trigger the lockout.',
      },
    },
  },
} satisfies Meta<typeof FormsValidationDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
