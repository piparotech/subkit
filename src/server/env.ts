import { z } from 'zod'

const requiredNonEmptyString = z.string().min(1)
const requiredUrl = z.string().url()

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
  SESSION_SECRET: z.string().min(16),
  TENANT_COLOR: requiredNonEmptyString,
  TENANT_ID: requiredNonEmptyString,
  TENANT_INITIALS: requiredNonEmptyString,
  TENANT_NAME: requiredNonEmptyString,
  ZITADEL_MICROSOFT_IDP_ID: requiredNonEmptyString.optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

let developmentEnvLoaded = false

export function parseServerEnv(env: NodeJS.ProcessEnv): ServerEnv {
  loadDevelopmentEnvFile()
  return serverEnvSchema.parse(env)
}

function loadDevelopmentEnvFile(): void {
  if (developmentEnvLoaded) return
  developmentEnvLoaded = true

  try {
    process.loadEnvFile('.env.development')
  } catch (error) {
    if (!isMissingEnvFileError(error)) throw error
  }
}

function isMissingEnvFileError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
