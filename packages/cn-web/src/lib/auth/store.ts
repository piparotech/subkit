/**
 * Platform-injected token storage. The app picks the implementation; the Engine stays dependency-free
 * (no hard expo-secure-store dep). Native picks SecureStore; web picks a localStorage baseline. This
 * showcase wires the in-memory store, which is also the access-token tier of a cookie-based web setup.
 */
export type AuthTokens = { accessToken: string | null; refreshToken: string | null }

export interface AuthTokenStore {
  getAccess(): Promise<string | null>
  getRefresh(): Promise<string | null>
  save(tokens: AuthTokens): Promise<void>
  clear(): Promise<void>
}

/** In-memory store — tests, and the access-token tier of a cookie-based web setup. */
export function createMemoryStore(): AuthTokenStore {
  let access: string | null = null
  let refresh: string | null = null
  return {
    async getAccess() {
      return access
    },
    async getRefresh() {
      return refresh
    },
    async save(tokens) {
      access = tokens.accessToken
      refresh = tokens.refreshToken
    },
    async clear() {
      access = null
      refresh = null
    },
  }
}
