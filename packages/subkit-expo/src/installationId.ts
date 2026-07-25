import type { SubKitInstallationIdInput } from './types.js'

export interface SubKitInstallationIdResolver {
  get(): Promise<string>
}

export function createInstallationIdResolver(
  input: SubKitInstallationIdInput,
): SubKitInstallationIdResolver {
  if (typeof input === 'string') {
    const installationId = validateInstallationId(input)
    return {
      async get() {
        return installationId
      },
    }
  }

  let resolved: string | null = null
  let inFlight: Promise<string> | null = null

  return {
    get() {
      if (resolved != null) return Promise.resolve(resolved)
      if (inFlight != null) return inFlight
      const attempt = Promise.resolve()
        .then(input)
        .then(validateInstallationId)
        .then((installationId) => {
          resolved = installationId
          return installationId
        })
      const tracked = attempt.then(
        (installationId) => {
          inFlight = null
          return installationId
        },
        (error: unknown) => {
          inFlight = null
          throw error
        },
      )
      inFlight = tracked
      return tracked
    },
  }
}

function validateInstallationId(value: string): string {
  const normalized = value.trim()
  if (normalized === '') throw new Error('SubKit installationId is required')
  return normalized
}
