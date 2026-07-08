import { createPublicKey, verify } from 'node:crypto'
import type { JsonWebKey as NodeJsonWebKey } from 'node:crypto'
import { z } from 'zod'

import { requireOidcConfig } from './config'
import { base64UrlDecode, createCodeChallenge } from './crypto'
import type { AuthMethod, OidcClaims, OidcDiscovery } from './types'

const discoverySchema = z.object({
  authorization_endpoint: z.string().url(),
  end_session_endpoint: z.string().url().optional(),
  issuer: z.string().url(),
  jwks_uri: z.string().url(),
  token_endpoint: z.string().url(),
  userinfo_endpoint: z.string().url().optional(),
})

const tokenResponseSchema = z.object({
  access_token: z.string().optional(),
  expires_in: z.number().optional(),
  id_token: z.string(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
  token_type: z.string().optional(),
})

const userInfoSchema = z.object({
  email: z.string().optional(),
  email_verified: z.boolean().optional(),
  idp: z.string().optional(),
  idp_id: z.string().optional(),
  login_name: z.string().optional(),
  name: z.string().optional(),
  preferred_username: z.string().optional(),
  sub: z.string(),
})

const jwksSchema = z.object({
  keys: z.array(
    z.object({
      alg: z.string().optional(),
      e: z.string().optional(),
      kid: z.string().optional(),
      kty: z.string().optional(),
      n: z.string().optional(),
      use: z.string().optional(),
    }),
  ),
})

type Jwk = z.infer<typeof jwksSchema>['keys'][number]

let cachedDiscovery: OidcDiscovery | undefined
let cachedJwks: Jwk[] | undefined

export async function buildAuthorizeUrl(input: {
  method: AuthMethod
  state: string
  nonce: string
  codeVerifier: string
  loginHint?: string
}): Promise<URL> {
  const config = requireOidcConfig()
  const discovery = await getDiscovery()
  const url = new URL(discovery.authorization_endpoint)
  const scopes = ['openid', 'profile', 'email']
  const idpScope = getIdentityProviderScope(input.method)

  if (idpScope) scopes.push(idpScope)

  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('code_challenge', createCodeChallenge(input.codeVerifier))
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('nonce', input.nonce)
  url.searchParams.set('redirect_uri', config.redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', scopes.join(' '))
  url.searchParams.set('state', input.state)

  if (input.loginHint) url.searchParams.set('login_hint', input.loginHint)

  return url
}

export async function exchangeCodeForClaims(input: {
  code: string
  codeVerifier: string
  expectedNonce: string
}): Promise<OidcClaims> {
  const config = requireOidcConfig()
  const discovery = await getDiscovery()
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code: input.code,
    code_verifier: input.codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
  })
  const response = await fetch(discovery.token_endpoint, {
    body,
    headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  })

  if (!response.ok) throw new Error(`OIDC token exchange failed with ${response.status}`)

  const tokenResponse = tokenResponseSchema.parse(await response.json())
  const idTokenClaims = await verifyIdToken(tokenResponse.id_token, input.expectedNonce)

  if (hasProfileClaims(idTokenClaims) || !tokenResponse.access_token) return idTokenClaims

  return enrichClaimsFromUserInfo(idTokenClaims, tokenResponse.access_token)
}

export async function getDiscovery(): Promise<OidcDiscovery> {
  if (cachedDiscovery) return cachedDiscovery

  const config = requireOidcConfig()
  const response = await fetch(config.discoveryUrl, {
    headers: { accept: 'application/json' },
  })

  if (!response.ok) throw new Error(`OIDC discovery failed with ${response.status}`)

  cachedDiscovery = discoverySchema.parse(await response.json())
  return cachedDiscovery
}

async function verifyIdToken(idToken: string, expectedNonce: string): Promise<OidcClaims> {
  const config = requireOidcConfig()
  const [encodedHeader, encodedPayload, encodedSignature] = idToken.split('.')

  if (!encodedHeader || !encodedPayload || !encodedSignature)
    throw new Error('Invalid ID token format')

  const header = parseJsonObject(base64UrlDecode(encodedHeader).toString('utf8'))
  const payload = parseJsonObject(base64UrlDecode(encodedPayload).toString('utf8'))
  const kid = readStringProperty(header, 'kid')
  const alg = readStringProperty(header, 'alg')

  if (alg !== 'RS256') throw new Error('Unsupported ID token algorithm')

  const jwk = await findSigningKey(kid)
  const publicKey = createPublicKey({ key: jwk, format: 'jwk' })
  const verified = verify(
    'RSA-SHA256',
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    publicKey,
    base64UrlDecode(encodedSignature),
  )

  if (!verified) throw new Error('Invalid ID token signature')

  const claims = toOidcClaims(payload)
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  const now = Math.floor(Date.now() / 1000)

  if (claims.iss !== config.issuer) throw new Error('Invalid ID token issuer')
  if (!audience.includes(config.clientId)) throw new Error('Invalid ID token audience')
  if (claims.exp <= now) throw new Error('Expired ID token')
  if (claims.iat > now + 60) throw new Error('Invalid ID token issued-at time')
  if (claims.nonce !== expectedNonce) throw new Error('Invalid ID token nonce')

  return claims
}

async function enrichClaimsFromUserInfo(
  idTokenClaims: OidcClaims,
  accessToken: string,
): Promise<OidcClaims> {
  const discovery = await getDiscovery()
  if (!discovery.userinfo_endpoint) return idTokenClaims

  const response = await fetch(discovery.userinfo_endpoint, {
    headers: { accept: 'application/json', authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) throw new Error(`OIDC userinfo fetch failed with ${response.status}`)

  const userInfo = userInfoSchema.parse(await response.json())
  if (userInfo.sub !== idTokenClaims.sub) throw new Error('OIDC userinfo subject mismatch')

  return {
    ...idTokenClaims,
    email: userInfo.email ?? idTokenClaims.email,
    email_verified: userInfo.email_verified ?? idTokenClaims.email_verified,
    idp: userInfo.idp ?? idTokenClaims.idp,
    idp_id: userInfo.idp_id ?? idTokenClaims.idp_id,
    login_name: userInfo.login_name ?? idTokenClaims.login_name,
    name: userInfo.name ?? idTokenClaims.name,
    preferred_username: userInfo.preferred_username ?? idTokenClaims.preferred_username,
  }
}

function hasProfileClaims(claims: OidcClaims): boolean {
  return Boolean(claims.email && (claims.name || claims.preferred_username))
}

async function findSigningKey(kid: string | undefined): Promise<NodeJsonWebKey> {
  const jwks = await getJwks()
  const key = jwks.find((candidate) => !kid || candidate.kid === kid)
  if (key) return toJsonWebKey(key)

  cachedJwks = undefined
  const refreshedJwks = await getJwks()
  const refreshedKey = refreshedJwks.find((candidate) => !kid || candidate.kid === kid)
  if (!refreshedKey) throw new Error('OIDC signing key not found')

  return toJsonWebKey(refreshedKey)
}

async function getJwks(): Promise<Jwk[]> {
  if (cachedJwks) return cachedJwks

  const discovery = await getDiscovery()
  const response = await fetch(discovery.jwks_uri, { headers: { accept: 'application/json' } })

  if (!response.ok) throw new Error(`OIDC JWKS fetch failed with ${response.status}`)

  cachedJwks = jwksSchema.parse(await response.json()).keys
  return cachedJwks
}

function getIdentityProviderScope(method: AuthMethod): string | undefined {
  const config = requireOidcConfig()
  if (method === 'microsoft' && config.microsoftIdpId)
    return `urn:zitadel:iam:org:idp:id:${config.microsoftIdpId}`
  return undefined
}

function toJsonWebKey(jwk: Jwk): NodeJsonWebKey {
  if (jwk.kty !== 'RSA' || !jwk.n || !jwk.e) throw new Error('Unsupported OIDC signing key')
  return { alg: jwk.alg, e: jwk.e, kty: jwk.kty, n: jwk.n, use: jwk.use }
}

function parseJsonObject(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value)
  if (!isRecord(parsed)) throw new Error('Expected JSON object')
  return parsed
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function toOidcClaims(payload: Record<string, unknown>): OidcClaims {
  return {
    aud: readAudience(payload.aud),
    exp: readRequiredNumberProperty(payload, 'exp'),
    iat: readRequiredNumberProperty(payload, 'iat'),
    iss: readRequiredStringProperty(payload, 'iss'),
    sub: readRequiredStringProperty(payload, 'sub'),
    email: readStringProperty(payload, 'email'),
    email_verified: readBooleanProperty(payload, 'email_verified'),
    idp: readStringProperty(payload, 'idp'),
    idp_id: readStringProperty(payload, 'idp_id'),
    login_name: readStringProperty(payload, 'login_name'),
    name: readStringProperty(payload, 'name'),
    nonce: readStringProperty(payload, 'nonce'),
    preferred_username: readStringProperty(payload, 'preferred_username'),
  }
}

function readAudience(value: unknown): string | string[] {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value
  throw new Error('Invalid ID token audience claim')
}

function readRequiredStringProperty(value: Record<string, unknown>, property: string): string {
  const result = readStringProperty(value, property)
  if (!result) throw new Error(`Missing string claim: ${property}`)
  return result
}

function readStringProperty(value: Record<string, unknown>, property: string): string | undefined {
  const result = value[property]
  return typeof result === 'string' && result.length > 0 ? result : undefined
}

function readRequiredNumberProperty(value: Record<string, unknown>, property: string): number {
  const result = value[property]
  if (typeof result !== 'number') throw new Error(`Missing number claim: ${property}`)
  return result
}

function readBooleanProperty(
  value: Record<string, unknown>,
  property: string,
): boolean | undefined {
  const result = value[property]
  return typeof result === 'boolean' ? result : undefined
}
