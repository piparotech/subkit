import { ProfileData, type ProfileUpdate } from './profile'

/**
 * The isomorphic profile client (Engine) — one fetch surface for web + native. The host supplies a
 * `getToken` (the auth module's session controller) so the client never owns auth state. Responses
 * are re-validated against the shared schema, so a drifted backend surfaces as a typed error here.
 */
export type ProfileClientOptions = {
  baseUrl: string
  /** Returns a fresh access token (sync or async); null = unauthenticated. */
  getToken: () => Promise<string | null> | string | null
  /** Injected fetch (an in-memory mock in the demo). Defaults to the global `fetch`. */
  fetch?: typeof fetch
}

export type ProfileClient = {
  get(): Promise<ProfileData>
  update(patch: ProfileUpdate): Promise<ProfileData>
  deleteAccount(): Promise<void>
}

export class ProfileError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
    this.name = 'ProfileError'
  }
}

async function codeOf(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { code?: string }
    return body.code ?? `HTTP_${res.status}`
  } catch {
    return `HTTP_${res.status}`
  }
}

export function createProfileClient(opts: ProfileClientOptions): ProfileClient {
  const base = opts.baseUrl.replace(/\/$/, '')
  const doFetch = opts.fetch ?? fetch
  const url = (path: string) => `${base}${path}`

  async function authHeaders(): Promise<Record<string, string>> {
    const token = await opts.getToken()
    return token ? { authorization: `Bearer ${token}` } : {}
  }

  return {
    async get() {
      const res = await doFetch(url('/profile'), { headers: await authHeaders() })
      if (!res.ok) throw new ProfileError(res.status, await codeOf(res))
      return ProfileData.parse(await res.json())
    },

    async update(patch) {
      const res = await doFetch(url('/profile'), {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new ProfileError(res.status, await codeOf(res))
      return ProfileData.parse(await res.json())
    },

    async deleteAccount() {
      const res = await doFetch(url('/profile'), { method: 'DELETE', headers: await authHeaders() })
      if (!res.ok && res.status !== 204) throw new ProfileError(res.status, await codeOf(res))
    },
  }
}
