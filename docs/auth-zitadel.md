# ZITADEL authentication

SubKit always uses ZITADEL OIDC. There is no dev-login or auth bypass.

## Target login behavior

- Internal Piparo users: Microsoft Entra via ZITADEL (`/auth/start?method=microsoft`).
- External users: e-mail-code login through the hosted ZITADEL login (`/auth/start?method=email&login_hint=...`).

## Local runtime

Local development reads `.env.development` automatically. The file is git-ignored and contains the real local OIDC values.

Required keys:

```sh
DATABASE_URL=file:subkit.sqlite
AUTH_BASE_URL=http://127.0.0.1:3010
AUTH_ISSUER=https://auth.piparo.tech
OIDC_CLIENT_ID=...
OIDC_CLIENT_SECRET=...
OIDC_DISCOVERY_URL=https://auth.piparo.tech/.well-known/openid-configuration
OIDC_REDIRECT_PATH=/auth/callback
SESSION_COOKIE_NAME=subkit_session
SESSION_SECRET=...
TENANT_ID=piparo
TENANT_NAME=piparo.tech
TENANT_INITIALS=PI
TENANT_COLOR=oklch(0.62 0.17 152)
```

Do not commit real values.

## App behavior

- `/` checks `getAuthStatus()` and redirects unauthenticated users to `/login?reason=auth_required`.
- `/auth/start` stores PKCE verifier/state/nonce in an httpOnly challenge cookie and redirects to ZITADEL.
- `/auth/callback` validates state/nonce, verifies the ID-token signature against JWKS, loads missing profile data from UserInfo, links/creates the local user, and stores only a hashed session token in SQLite.
- `/logout` clears both app and challenge cookies.

## ZITADEL client settings

Use an OIDC web application with:

- Response type: `Code`
- Grant type: `Authorization Code`
- Auth method: `Post`
- Redirect URI: `${AUTH_BASE_URL}/auth/callback`
- Post logout URI: `${AUTH_BASE_URL}/login`

Currently configured for local work:

- `http://127.0.0.1:3010/auth/callback`
- `http://127.0.0.1:3010/login`
