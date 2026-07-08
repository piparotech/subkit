export function LoginPage({ reason }: { reason?: string }) {
  return (
    <main className="subkit-login-shell">
      <section className="subkit-login-card" aria-labelledby="login-title">
        <div className="subkit-login-orb" />
        <div className="subkit-login-kicker">SubKit</div>
        <h1 id="login-title">Sign in to manage app subscriptions</h1>
        <p className="subkit-login-copy">
          ZITADEL protects this console. Piparo staff use Microsoft; external operators receive a
          one-time e-mail code.
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
              <input
                id="login-email"
                name="login_hint"
                placeholder="name@company.com"
                type="email"
                autoComplete="email"
              />
              <button type="submit">Send code</button>
            </div>
            <p>
              If the address is allowed, ZITADEL sends the login code. Account existence is never
              revealed here.
            </p>
          </form>
        </div>
      </section>
    </main>
  )
}
