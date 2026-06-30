export type AuthMethod = 'microsoft' | 'email'

export type GlobalRole = 'user' | 'super_admin'

export type AuthUser = {
  email?: string
  globalRole: GlobalRole
  id: string
  identityProvider?: string
  initials: string
  name: string
  operator: boolean
  organization: string
  zitadelSubject?: string
}

export type AuthSessionData = {
  userId?: string
  authSessionId?: string
  sessionToken?: string
}

export type LoginChallengeData = {
  method?: AuthMethod
  state?: string
  nonce?: string
  codeVerifier?: string
  returnTo?: string
  createdAt?: number
}

export type OidcClaims = {
  sub: string
  iss: string
  aud: string | Array<string>
  exp: number
  iat: number
  nonce?: string
  email?: string
  email_verified?: boolean
  name?: string
  preferred_username?: string
  login_name?: string
  idp?: string
  idp_id?: string
}

export type OidcDiscovery = {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint?: string
  end_session_endpoint?: string
  jwks_uri: string
}
