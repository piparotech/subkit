import { createFileRoute } from '@tanstack/react-router'

import { getAuthStatus } from '~/features/subscription-console/server'

interface LoginSearch {
  reason?: string
}

export const Route = createFileRoute('/login')({
  component: LoginPage,
  loader: async () => getAuthStatus(),
  validateSearch: validateLoginSearch,
})

function LoginPage() {
  Route.useLoaderData()
  const search = Route.useSearch()
  const reason = loginReasonText(search.reason)

  return (
    <main className="subs-login-shell">
      <section className="subs-login-card" aria-labelledby="login-title">
        <div className="subs-login-orb" />
        <div className="subs-login-kicker">Piparo Subscriptions</div>
        <h1 id="login-title">Sign in to manage app subscriptions</h1>
        <p className="subs-login-copy">
          ZITADEL protects this console. Piparo staff use Microsoft; external operators receive a one-time e-mail code.
        </p>
        {reason ? <p className="subs-login-notice">{reason}</p> : null}

        <div className="subs-login-actions">
          <a className="subs-login-option" href="/auth/start?method=microsoft">
            <span className="subs-login-mark microsoft">MS</span>
            <span>
              <strong>Continue with Microsoft</strong>
              <small>Internal Piparo accounts via Microsoft Entra in ZITADEL.</small>
            </span>
            <span aria-hidden>→</span>
          </a>

          <form action="/auth/start" className="subs-login-email" method="get">
            <input name="method" type="hidden" value="email" />
            <label htmlFor="login-email">External e-mail code</label>
            <div className="subs-login-email-row">
              <input id="login-email" name="login_hint" placeholder="name@company.com" type="email" autoComplete="email" />
              <button type="submit">Send code</button>
            </div>
            <p>If the address is allowed, ZITADEL sends the login code. Account existence is never revealed here.</p>
          </form>
        </div>
      </section>
    </main>
  )
}

function validateLoginSearch(search: Record<string, unknown>): LoginSearch {
  return { reason: typeof search.reason === 'string' ? search.reason : undefined }
}

function loginReasonText(reason: string | undefined): string | undefined {
  switch (reason) {
    case 'auth_required':
      return 'Please sign in to open the subscription console.'
    case 'callback_failed':
    case 'expired':
    case 'invalid_state':
    case 'oidc_error':
      return 'The sign-in could not be completed. Please try again.'
    case 'logged_out':
      return 'You have been signed out.'
    default:
      return undefined
  }
}
