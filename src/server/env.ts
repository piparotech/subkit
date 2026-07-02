import { z } from 'zod'

const requiredNonEmptyString = z.string().min(1)
const requiredUrl = z.string().url()
const optionalSecret = z.preprocess((value) => (value === '' ? undefined : value), z.string().min(16).optional())

export const serverEnvSchema = z.object({
  AUTH_BASE_URL: requiredUrl,
  AUTH_ISSUER: requiredUrl,
  DATABASE_URL: requiredNonEmptyString,
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  OIDC_CLIENT_ID: requiredNonEmptyString,
  OIDC_CLIENT_SECRET: requiredNonEmptyString,
  OIDC_DISCOVERY_URL: requiredUrl,
  OIDC_REDIRECT_PATH: z.string().startsWith('/'),
  SESSION_COOKIE_NAME: requiredNonEmptyString,
  SECRET_ENCRYPTION_KEY: optionalSecret,
  SESSION_SECRET: z.string().min(16),
  SUBKIT_SERVER_API_KEY: optionalSecret,
  ZITADEL_MICROSOFT_IDP_ID: requiredNonEmptyString.optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

let cachedProcessEnv: ServerEnv | null = null
let developmentEnvLoaded = false

export function parseServerEnv(env: NodeJS.ProcessEnv): ServerEnv {
  const isProcessEnv = env === process.env
  if (isProcessEnv && cachedProcessEnv != null) return cachedProcessEnv

  loadDevelopmentEnvFile()
  const parsed = serverEnvSchema.parse(env)
  assertProductionSecrets(parsed)
  if (isProcessEnv) cachedProcessEnv = parsed
  return parsed
}

/**
 * Key material for encrypting stored secrets (for example App Store Connect
 * private keys) and for hashing runtime SDK keys.
 *
 * Outside development this must be SECRET_ENCRYPTION_KEY: falling back to
 * SESSION_SECRET would silently re-key all encrypted secrets whenever the
 * session secret is rotated.
 */
export function resolveSecretEncryptionKey(env: ServerEnv): string {
  return env.SECRET_ENCRYPTION_KEY ?? env.SESSION_SECRET
}

function assertProductionSecrets(env: ServerEnv): void {
  if (process.env.NODE_ENV !== 'production') return
  if (env.SECRET_ENCRYPTION_KEY == null) {
    throw new Error(
      'SECRET_ENCRYPTION_KEY must be set in production. The development-only fallback to SESSION_SECRET would break all encrypted store credentials when the session secret rotates.',
    )
  }
}

function loadDevelopmentEnvFile(): void {
  if (developmentEnvLoaded) return
  developmentEnvLoaded = true
  if (process.env.NODE_ENV === 'production') return

  try {
    process.loadEnvFile('.env.development')
  } catch (error) {
    if (!isMissingEnvFileError(error)) throw error
  }
}

function isMissingEnvFileError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
