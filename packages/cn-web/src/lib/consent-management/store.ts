// Consent persistence (capability AC: the decision survives reload / restart / re-visit). A thin codec
// over an injected synchronous key-value store so the Engine stays platform-neutral: MMKV satisfies it
// on mobile, `localStorage` on web. A `cookieStorage` adapter is provided for the web cookie path
// (TTDDG: first-party, no third-party storage before consent). All reads are fail-safe — corrupt or
// absent data yields the undecided default rather than throwing.
import { type ConsentDecision, type ConsentInit, defaultDecision, normalizeDecision } from './model'

/** Minimal sync KV the store needs. MMKV (`getString`/`set`/`delete`) and the adapters below match. */
export type ConsentStorage = {
  getString: (key: string) => string | undefined
  set: (key: string, value: string) => void
  delete: (key: string) => void
}

export const DEFAULT_STORAGE_KEY = 'piparo.consent'

export type ConsentStore = {
  /** Load the persisted decision, or the undecided default when none/invalid is stored. */
  load: () => ConsentDecision
  /** Whether a decision is currently persisted (regardless of validity). */
  has: () => boolean
  /** Persist a decision. */
  save: (decision: ConsentDecision) => void
  /** Forget the decision (re-prompts on next load). */
  clear: () => void
}

export type ConsentStoreOptions = {
  storage: ConsentStorage
  init: ConsentInit
  storageKey?: string
}

export function createConsentStore(options: ConsentStoreOptions): ConsentStore {
  const { storage, init, storageKey = DEFAULT_STORAGE_KEY } = options

  return {
    load() {
      const raw = storage.getString(storageKey)
      if (!raw) return defaultDecision(init)
      try {
        return normalizeDecision(JSON.parse(raw), init)
      } catch {
        return defaultDecision(init)
      }
    },
    has() {
      return storage.getString(storageKey) !== undefined
    },
    save(decision) {
      storage.set(storageKey, JSON.stringify(decision))
    },
    clear() {
      storage.delete(storageKey)
    },
  }
}

/** Wrap `localStorage` (or any Web Storage) as a `ConsentStorage`. Safe to call when absent (no-op). */
export function webStorage(backing?: Storage): ConsentStorage {
  const store = backing ?? (typeof localStorage !== 'undefined' ? localStorage : undefined)
  return {
    getString(key) {
      return store?.getItem(key) ?? undefined
    },
    set(key, value) {
      store?.setItem(key, value)
    },
    delete(key) {
      store?.removeItem(key)
    },
  }
}

export type CookieOptions = {
  /** Cookie lifetime in days. Defaults to 180 (TTDDG-typical consent retention). */
  maxAgeDays?: number
  /** Cookie path. Defaults to `/`. */
  path?: string
  /** SameSite policy. Defaults to `Lax`. */
  sameSite?: 'Strict' | 'Lax' | 'None'
  /** Mark the cookie Secure (required with SameSite=None). Defaults to true. */
  secure?: boolean
  /** Inject `document` for testing; defaults to the ambient `document` when present. */
  doc?: Pick<Document, 'cookie'>
}

/**
 * First-party cookie-backed `ConsentStorage` for the web variant. Stores the consent decision as a
 * single first-party cookie so it survives a reload before any third-party SDK is allowed to set
 * storage of its own. Values are URI-encoded; absence yields `undefined` (fail-safe).
 */
export function cookieStorage(options: CookieOptions = {}): ConsentStorage {
  const {
    maxAgeDays = 180,
    path = '/',
    sameSite = 'Lax',
    secure = true,
    doc = typeof document !== 'undefined' ? document : undefined,
  } = options

  function read(key: string): string | undefined {
    if (!doc) return undefined
    const prefix = `${encodeURIComponent(key)}=`
    for (const part of doc.cookie.split('; ')) {
      if (part.startsWith(prefix)) return decodeURIComponent(part.slice(prefix.length))
    }
    return undefined
  }

  function write(key: string, value: string, maxAgeSeconds: number): void {
    if (!doc) return
    const attrs = [
      `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
      `Max-Age=${maxAgeSeconds}`,
      `Path=${path}`,
      `SameSite=${sameSite}`,
    ]
    if (secure || sameSite === 'None') attrs.push('Secure')
    doc.cookie = attrs.join('; ')
  }

  return {
    getString(key) {
      return read(key)
    },
    set(key, value) {
      write(key, value, maxAgeDays * 24 * 60 * 60)
    },
    delete(key) {
      write(key, '', 0)
    },
  }
}
