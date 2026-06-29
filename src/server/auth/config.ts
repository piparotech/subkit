import { parseServerEnv } from '~/server/env'

export function getAuthConfig() {
  const env = parseServerEnv(process.env)
  const baseUrl = trimTrailingSlash(env.AUTH_BASE_URL)
  const issuer = trimTrailingSlash(env.AUTH_ISSUER)

  return {
    baseUrl,
    issuer,
    clientId: env.OIDC_CLIENT_ID,
    clientSecret: env.OIDC_CLIENT_SECRET,
    discoveryUrl: env.OIDC_DISCOVERY_URL,
    redirectPath: env.OIDC_REDIRECT_PATH,
    redirectUri: `${baseUrl}${env.OIDC_REDIRECT_PATH}`,
    sessionCookieName: env.SESSION_COOKIE_NAME,
    sessionSecret: env.SESSION_SECRET,
    microsoftIdpId: env.ZITADEL_MICROSOFT_IDP_ID,
  }
}

export function requireOidcConfig() {
  return getAuthConfig()
}

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value
}
