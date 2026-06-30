/**
 * Server-side attempt limiter — the lockout logic for "lock the action after N failed attempts in a
 * window" (e.g. login, voucher redemption). The counter MUST live server-side, never in client state.
 * The store is pluggable (default in-memory); production wires a shared store (Redis / Postgres) so
 * the limit holds across instances.
 */
export type AttemptRecord = { count: number; firstAt: number }

export type AttemptStore = {
  get(key: string): AttemptRecord | undefined | Promise<AttemptRecord | undefined>
  set(key: string, value: AttemptRecord): void | Promise<void>
  delete(key: string): void | Promise<void>
}

export type AttemptLimiterOptions = {
  maxAttempts: number
  windowMs: number
  /** Injectable clock for deterministic tests; defaults to Date.now. */
  now?: () => number
  store?: AttemptStore
}

export type AttemptState = {
  locked: boolean
  /** Remaining attempts before lockout (0 while locked). */
  remaining: number
  /** Milliseconds until the window resets (0 when not locked). */
  retryAfterMs: number
}

export function inMemoryAttemptStore(): AttemptStore {
  const map = new Map<string, AttemptRecord>()
  return {
    get: (key) => map.get(key),
    set: (key, value) => void map.set(key, value),
    delete: (key) => void map.delete(key),
  }
}

export type AttemptLimiter = {
  /** Current state for a key without recording anything (call before the protected action). */
  check(key: string): Promise<AttemptState>
  /** Record a failed attempt and return the resulting state. */
  recordFailure(key: string): Promise<AttemptState>
  /** Clear the counter for a key (call on success). */
  reset(key: string): Promise<void>
}

export function createAttemptLimiter(options: AttemptLimiterOptions): AttemptLimiter {
  const now = options.now ?? Date.now
  const store = options.store ?? inMemoryAttemptStore()
  const { maxAttempts, windowMs } = options

  const state = (record: AttemptRecord | undefined, at: number): AttemptState => {
    if (!record) return { locked: false, remaining: maxAttempts, retryAfterMs: 0 }
    const elapsed = at - record.firstAt
    if (elapsed >= windowMs) return { locked: false, remaining: maxAttempts, retryAfterMs: 0 }
    const locked = record.count >= maxAttempts
    return {
      locked,
      remaining: Math.max(0, maxAttempts - record.count),
      retryAfterMs: locked ? windowMs - elapsed : 0,
    }
  }

  return {
    async check(key) {
      return state(await store.get(key), now())
    },

    async recordFailure(key) {
      const at = now()
      const existing = await store.get(key)
      const fresh = !existing || at - existing.firstAt >= windowMs
      const record: AttemptRecord = fresh
        ? { count: 1, firstAt: at }
        : { count: existing.count + 1, firstAt: existing.firstAt }
      await store.set(key, record)
      return state(record, at)
    },

    async reset(key) {
      await store.delete(key)
    },
  }
}
