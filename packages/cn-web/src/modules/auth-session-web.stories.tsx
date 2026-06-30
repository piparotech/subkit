import { useMemo, useState } from 'react'

import type { Meta, StoryObj } from '@storybook/react-vite'

import { PUIBadge, PUIButton, PUIEmailInput, PUIPasswordInput, PUIText } from '@/components/ui'

import {
  type CookieJar,
  FOREIGN_ORIGIN,
  InMemoryAuthServer,
  SEEDED_EMAIL,
  SEEDED_PASSWORD,
  TRUSTED_ORIGIN,
  applySetCookies,
  scriptVisibleCookies,
  seededConfig,
} from './mock-auth-session-web'

type LogEntry = { id: number; ok: boolean; text: string }

/** A line in the server round-trip log. The id keeps React keys stable as entries prepend. */
function useServerLog() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const append = (ok: boolean, text: string) =>
    setEntries((prev) => [{ id: prev.length, ok, text }, ...prev].slice(0, 6))
  return { entries, append, reset: () => setEntries([]) }
}

function CookieRow({ name, value, httpOnly }: { name: string; value: string; httpOnly: boolean }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 py-2.5">
      <div className="min-w-0">
        <PUIText className="font-mono font-medium" variant="footnote">
          {name}
        </PUIText>
        <PUIText className="block truncate font-mono" tone="muted" variant="caption1">
          {value}
        </PUIText>
      </div>
      <PUIBadge variant={httpOnly ? 'secondary' : 'outline'}>
        {httpOnly ? 'HttpOnly' : 'readable'}
      </PUIBadge>
    </li>
  )
}

function AuthSessionWebDemo() {
  const server = useMemo(() => new InMemoryAuthServer(), [])
  const log = useServerLog()

  const [email, setEmail] = useState(SEEDED_EMAIL)
  const [password, setPassword] = useState(SEEDED_PASSWORD)
  const [jar, setJar] = useState<CookieJar>({})
  const [csrfToken, setCsrfToken] = useState<string>()
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState(false)

  const { sessionName, refreshName, csrfName } = seededConfig.cookies
  const authenticated = sessionName in jar
  const readable = scriptVisibleCookies(jar)

  async function login() {
    setPending(true)
    setError(undefined)
    const result = await server.login(email, password)
    if (result.ok) {
      setJar((prev) => applySetCookies(prev, result.setCookies))
      setCsrfToken(result.csrfToken)
      log.append(true, 'verified upstream identity, minted session, set 3 cookies')
    } else {
      setError('Those credentials are not recognised.')
      log.append(false, `${result.reason}: no session issued (${result.status})`)
    }
    setPending(false)
  }

  async function visitProtected() {
    const guard = await server.guard(jar)
    log.append(
      guard.authenticated,
      guard.authenticated
        ? `loader guard passed for ${guard.subject}, protected HTML served`
        : `loader guard redirected to ${guard.redirectTo} before any HTML`,
    )
  }

  async function mutate(origin: string) {
    const result = await server.mutate(jar, csrfToken, origin)
    log.append(
      result.ok,
      result.ok
        ? `mutation accepted: token + origin (${origin}) both passed`
        : `${result.reason}: mutation rejected (${origin})`,
    )
  }

  async function logout() {
    const result = await server.logout(jar)
    setJar((prev) => applySetCookies(prev, result.setCookies))
    setCsrfToken(undefined)
    log.append(true, 'session revoked server-side, all cookies deleted')
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <PUIText as="h2" className="tracking-tight" variant="title3">
              Sign in
            </PUIText>
            <PUIText className="max-w-md" tone="muted" variant="subheadline">
              The server verifies the upstream identity, then mints its own HS256 session and hands
              the browser nothing but an opaque HttpOnly cookie.
            </PUIText>
          </div>
          <PUIBadge dot variant={authenticated ? 'success' : 'secondary'}>
            {authenticated ? 'Session active' : 'No session'}
          </PUIBadge>
        </div>

        {authenticated ? (
          <div className="border-border flex items-center justify-between gap-4 border-y py-4">
            <PUIText tone="muted" variant="footnote">
              Signed in as <span className="text-foreground font-mono">{SEEDED_EMAIL}</span>. The
              browser cannot read the session, only the server can.
            </PUIText>
            <PUIButton onPress={logout} size="sm" variant="outline">
              Sign out
            </PUIButton>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <PUIEmailInput
                label="Email"
                onChange={(event) => setEmail(event.target.value)}
                value={email}
              />
              <PUIPasswordInput
                label="Password"
                onChange={(event) => setPassword(event.target.value)}
                value={password}
              />
            </div>
            {error ? (
              <PUIText className="text-destructive" variant="footnote">
                {error}
              </PUIText>
            ) : null}
            <PUIButton loading={pending} onPress={login}>
              Sign in
            </PUIButton>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <PUIText className="font-medium" variant="subheadline">
          What the browser stores
        </PUIText>
        {authenticated ? (
          <>
            <ul className="divide-border divide-y">
              <CookieRow httpOnly name={sessionName} value="•••• signed session JWT" />
              <CookieRow httpOnly name={refreshName} value="•••• signed refresh JWT (sid)" />
              <CookieRow httpOnly={false} name={csrfName} value={csrfToken ?? ''} />
            </ul>
            <PUIText tone="muted" variant="footnote">
              <span className="text-foreground font-mono">document.cookie</span> exposes only{' '}
              {readable.length === 1 ? (
                <span className="text-foreground font-mono">{readable[0]}</span>
              ) : (
                'the readable cookies'
              )}
              . The session and refresh tokens carry HttpOnly, so script cannot read them, the
              defining guarantee of this module.
            </PUIText>
          </>
        ) : (
          <PUIText tone="muted" variant="footnote">
            Sign in to see the three cookies the server sets.
          </PUIText>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <PUIText className="font-medium" variant="subheadline">
          Try the guarantees
        </PUIText>
        <div className="flex flex-wrap gap-2">
          <PUIButton onPress={visitProtected} size="sm" variant="outline">
            Visit protected route
          </PUIButton>
          <PUIButton
            disabled={!authenticated}
            onPress={() => mutate(TRUSTED_ORIGIN)}
            size="sm"
            variant="outline"
          >
            Mutate (same origin)
          </PUIButton>
          <PUIButton
            disabled={!authenticated}
            onPress={() => mutate(FOREIGN_ORIGIN)}
            size="sm"
            variant="ghost"
          >
            Mutate (foreign origin)
          </PUIButton>
        </div>
        <PUIText tone="subtle" variant="footnote">
          The loader guard runs server-side before any protected HTML. Mutations pass the CSRF gate
          ({seededConfig.csrf}: double-submit token AND same origin); a foreign origin is rejected.
        </PUIText>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <PUIText className="font-medium" variant="subheadline">
            Server round trip
          </PUIText>
          {log.entries.length > 0 ? (
            <button
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring text-footnote rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
              onClick={log.reset}
              type="button"
            >
              Clear
            </button>
          ) : null}
        </div>
        {log.entries.length === 0 ? (
          <PUIText tone="muted" variant="footnote">
            Each action runs the real Engine and logs the server outcome here.
          </PUIText>
        ) : (
          <ul className="divide-border divide-y">
            {log.entries.map((entry) => (
              <li className="flex items-start gap-3 py-2.5" key={entry.id}>
                <PUIBadge variant={entry.ok ? 'success' : 'destructive'}>
                  {entry.ok ? 'pass' : 'block'}
                </PUIBadge>
                <PUIText className="min-w-0 flex-1" tone="muted" variant="footnote">
                  {entry.text}
                </PUIText>
              </li>
            ))}
          </ul>
        )}
      </section>

      <PUIText className="border-border border-t pt-4" tone="subtle" variant="footnote">
        Same pure Engine the platform runs on the server: cookie hardening, HS256 session token, the
        loader guard and the CSRF gate, here driven through an in-memory browser and server with no
        network.
      </PUIText>
    </div>
  )
}

const meta = {
  title: 'Modules/Web Session Auth (HttpOnly Cookie, CSRF)',
  component: AuthSessionWebDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Authenticate a web/SSR user with a server-held session whose state lives in an HttpOnly cookie plus CSRF protection, instead of a JavaScript-readable token. In-memory demo: seeded credentials demo@piparo.tech / password123 are verified against an injected upstream check, then the real Engine mints an HS256 session and sets opaque HttpOnly cookies. Sign in to inspect what the browser can and cannot read, visit the loader-guarded route, and try a same-origin vs foreign-origin mutation through the CSRF gate.',
      },
    },
  },
} satisfies Meta<typeof AuthSessionWebDemo>

export default meta

export const Demo: StoryObj<typeof meta> = {}
