import { type FormEvent, useMemo, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import {
  PUIAvatar,
  PUIBadge,
  PUIButton,
  PUIEmailInput,
  PUIPasswordInput,
  PUISpinner,
  PUIText,
} from '@/components/ui'
import {
  SessionProvider,
  type UseSession,
  authErrorMessage,
  createAuthSession,
  defaultAuthTexts,
  useSession,
} from '@/lib/auth'

import {
  MOCK_BASE_URL,
  SEEDED_DISPLAY_NAME,
  SEEDED_EMAIL,
  SEEDED_PASSWORD,
  SEEDED_USER_ID,
  createMockAuthFetch,
  createMockAuthStore,
} from './mock-auth'

const texts = defaultAuthTexts

function SignInForm({ signIn }: Pick<UseSession, 'signIn'>) {
  const [email, setEmail] = useState(SEEDED_EMAIL)
  const [password, setPassword] = useState(SEEDED_PASSWORD)
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(undefined)
    const result = await signIn(email, password)
    if ('code' in result) setError(authErrorMessage(result.code, texts))
    setPending(false)
  }

  return (
    <form className="flex max-w-sm flex-col gap-5" noValidate onSubmit={onSubmit}>
      <div className="flex flex-col gap-1.5">
        <PUIText as="h2" className="tracking-tight" variant="title3">
          {texts.signInTitle}
        </PUIText>
        <PUIText className="max-w-prose" tone="muted" variant="subheadline">
          The form drives the real session controller. On success it mints a Bearer token, persists
          it in the injected store, and resolves the canonical identity from the server.
        </PUIText>
      </div>

      <div className="flex flex-col gap-4">
        <PUIEmailInput
          autoFocus
          error={error}
          label={texts.emailLabel}
          onChange={(event) => setEmail(event.target.value)}
          value={email}
        />
        <PUIPasswordInput
          label={texts.passwordLabel}
          onChange={(event) => setPassword(event.target.value)}
          value={password}
        />
      </div>

      <PUIButton fullWidth loading={pending} type="submit">
        {texts.signInButton}
      </PUIButton>

      <PUIText tone="subtle" variant="footnote">
        Seeded: <span className="text-foreground font-mono">{SEEDED_EMAIL}</span> /{' '}
        <span className="text-foreground font-mono">{SEEDED_PASSWORD}</span>. Any other password is
        rejected with the Engine's INVALID_CREDENTIALS code.
      </PUIText>
    </form>
  )
}

function SignedIn({ userId, signOut }: { userId: string; signOut: UseSession['signOut'] }) {
  const [pending, setPending] = useState(false)

  async function onSignOut() {
    setPending(true)
    await signOut()
    setPending(false)
  }

  return (
    <div className="flex max-w-md flex-col gap-6">
      <div className="flex items-center gap-4">
        <PUIAvatar name={SEEDED_DISPLAY_NAME} size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <PUIText className="truncate font-medium" variant="headline">
              {SEEDED_DISPLAY_NAME}
            </PUIText>
            <PUIBadge dot variant="success">
              Authenticated
            </PUIBadge>
          </div>
          <PUIText className="truncate font-mono" tone="muted" variant="footnote">
            {SEEDED_EMAIL}
          </PUIText>
        </div>
      </div>

      <dl className="border-border divide-border divide-y border-y">
        <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-4 py-3">
          <PUIText as="span" tone="muted" variant="footnote">
            Server identity
          </PUIText>
          <PUIText as="span" className="font-mono" variant="footnote">
            {userId}
          </PUIText>
        </div>
        <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-4 py-3">
          <PUIText as="span" tone="muted" variant="footnote">
            Access token
          </PUIText>
          <PUIText as="span" tone="muted" variant="footnote">
            Held in the injected store, attached as Bearer on every request.
          </PUIText>
        </div>
      </dl>

      <PUIText tone="muted" variant="footnote">
        Identity comes from the server&apos;s userinfo route, not the unverified token payload.
        Signing out revokes the session upstream, then clears the local tokens.
      </PUIText>

      <PUIButton loading={pending} onPress={onSignOut} variant="outline">
        Sign out
      </PUIButton>
    </div>
  )
}

function Restoring() {
  return (
    <div className="flex items-center gap-3 py-6" role="status">
      <PUISpinner size="sm" tone="muted" />
      <PUIText tone="muted" variant="subheadline">
        Restoring session from the token store...
      </PUIText>
    </div>
  )
}

function AuthScreen() {
  const { session, signIn, signOut } = useSession()
  switch (session.status) {
    case 'restoring':
      return <Restoring />
    case 'authenticated':
      return <SignedIn signOut={signOut} userId={session.userId} />
    case 'unauthenticated':
      return <SignInForm signIn={signIn} />
  }
}

function AuthDemo() {
  const auth = useMemo(
    () =>
      createAuthSession({
        baseUrl: MOCK_BASE_URL,
        store: createMockAuthStore(),
        fetch: createMockAuthFetch(),
      }),
    [],
  )

  return (
    <SessionProvider auth={auth}>
      <AuthScreen />
    </SessionProvider>
  )
}

const meta = {
  title: 'Modules/Auth',
  component: AuthDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `Email and password sign-in built on the framework-agnostic auth-kit Engine (createAuthSession + SessionProvider + useSession), the same controller the platform ships on web and native. In-memory demo: a mock fetch seeds ${SEEDED_EMAIL} / ${SEEDED_PASSWORD} resolving to ${SEEDED_USER_ID}. Try the seeded credentials to sign in, watch the boot-time restore, inspect the server-verified identity, then sign out to revoke the session. Any other password is rejected.`,
      },
    },
  },
} satisfies Meta<typeof AuthDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
