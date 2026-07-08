import {
  clearSession,
  getRequestHeader,
  getRequestIP,
  useSession,
} from '@tanstack/react-start/server'

import { db } from '~/db/client'
import { authSessions } from '~/db/schema'

import { getAuthConfig } from './config'
import { createRandomToken, sha256Hex } from './crypto'
import type { AuthSessionData, LoginChallengeData } from './types'

const appSessionMaxAgeSeconds = 60 * 60 * 12
const loginChallengeMaxAgeSeconds = 60 * 10

export async function getAppSession() {
  const config = getAuthConfig()

  return useSession<AuthSessionData>({
    cookie: {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: config.baseUrl.startsWith('https://'),
    },
    maxAge: appSessionMaxAgeSeconds,
    name: config.sessionCookieName,
    password: config.sessionSecret,
  })
}

export async function getLoginChallengeSession() {
  const config = getAuthConfig()

  return useSession<LoginChallengeData>({
    cookie: {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: config.baseUrl.startsWith('https://'),
    },
    maxAge: loginChallengeMaxAgeSeconds,
    name: `${config.sessionCookieName}_challenge`,
    password: config.sessionSecret,
  })
}

export async function setAuthenticatedSession(userId: string): Promise<void> {
  const token = createRandomToken(32)
  const expiresAt = new Date(Date.now() + appSessionMaxAgeSeconds * 1000)
  const [created] = await db
    .insert(authSessions)
    .values({
      expiresAt,
      id: createRandomToken(18),
      ipHash: hashIpAddress(),
      lastSeenAt: new Date(),
      tokenHash: sha256Hex(token),
      userAgent: getRequestHeader('user-agent'),
      userId,
    })
    .returning({ id: authSessions.id })

  if (!created) throw new Error('Failed to create auth session')

  const appSession = await getAppSession()
  await appSession.update({
    authSessionId: created.id,
    sessionToken: token,
    userId,
  })
}

export async function clearAuthCookies(): Promise<void> {
  const config = getAuthConfig()
  await clearSession({ name: config.sessionCookieName })
  await clearSession({ name: `${config.sessionCookieName}_challenge` })
}

function hashIpAddress(): string | undefined {
  const ip = getRequestIP({ xForwardedFor: true })
  return ip ? sha256Hex(ip) : undefined
}
