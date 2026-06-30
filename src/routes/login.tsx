import { createFileRoute } from '@tanstack/react-router'

import { getAuthStatus } from '~/features/subkit/server'

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
    <main className="subkit-login-shell">
      <section className="subkit-login-card" aria-labelledby="login-title">
        <div className="subkit-login-orb" />
        <div className="subkit-login-kicker">SubKit</div>
        <h1 id="login-title">Sign in to manage app subscriptions</h1>
        <p className="subkit-login-copy">
          ZITADEL protects this console. Piparo staff use Microsoft; external operators receive a one-time e-mail code.
        </p>
        {reason ? <p className="subkit-login-notice">{reason}</p> : null}

        <div className="subkit-login-actions">
          <a className="subkit-login-option" href="/auth/start?method=microsoft">
            <span className="subkit-login-mark microsoft">MS</span>
            <span>
              <strong>Continue with Microsoft</strong>
              <small>Internal Piparo accounts via Microsoft Entra in ZITADEL.</small>
            </span>
            <span aria-hidden>→</span>
          </a>

          <form action="/auth/start" className="subkit-login-email" method="get">
            <input name="method" type="hidden" value="email" />
            <label htmlFor="login-email">External e-mail code</label>
            <div className="subkit-login-email-row">
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
      return 'Please sign in to open SubKit.'
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
