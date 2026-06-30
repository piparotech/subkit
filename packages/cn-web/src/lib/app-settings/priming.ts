import { z } from 'zod'

import { type PrimingConfig } from './config'
import { type SettingsStorage } from './storage'

/**
 * Push-permission soft-ask priming. The system permission dialog can be shown only ONCE on iOS — a
 * denial is permanent. So we gate it behind an in-app soft-ask: the OS dialog is requested only AFTER
 * the user agrees to the soft-ask. We persist how often the soft-ask was shown and whether the user
 * already accepted/declined, so we never nag past `maxPrompts` and never re-prompt once the OS
 * decision is settled. The actual OS permission request is injected by the Shell (expo-notifications).
 */

export const PRIMING_STORAGE_KEY = 'piparo.app-settings.priming.v1'
export const PRIMING_SCHEMA_VERSION = 1

/** The OS-level permission outcome, as known to the app. */
export const OsPermission = z.enum(['undetermined', 'granted', 'denied'])
export type OsPermission = z.infer<typeof OsPermission>

export const PersistedPriming = z.strictObject({
  version: z.literal(PRIMING_SCHEMA_VERSION),
  /** How many times the soft-ask has been shown. */
  prompts: z.number().int().nonnegative(),
  /** The user declined the soft-ask (we then stop showing it for this session policy). */
  softDeclined: z.boolean(),
  /** The last OS permission outcome we observed (so we don't re-ask once settled). */
  osPermission: OsPermission,
})
export type PersistedPriming = z.infer<typeof PersistedPriming>

function defaults(): PersistedPriming {
  return {
    version: PRIMING_SCHEMA_VERSION,
    prompts: 0,
    softDeclined: false,
    osPermission: 'undetermined',
  }
}

export function migratePriming(raw: unknown): PersistedPriming {
  if (raw == null || typeof raw !== 'object') return defaults()
  const current = PersistedPriming.safeParse(raw)
  if (current.success) return current.data
  const obj = raw as Record<string, unknown>
  const out = defaults()
  if (typeof obj.prompts === 'number' && Number.isInteger(obj.prompts) && obj.prompts >= 0)
    out.prompts = obj.prompts
  if (typeof obj.softDeclined === 'boolean') out.softDeclined = obj.softDeclined
  const os = OsPermission.safeParse(obj.osPermission)
  if (os.success) out.osPermission = os.data
  return out
}

/**
 * Whether the soft-ask should be shown now. False once the OS decision is settled (granted/denied),
 * once the user soft-declined, once we hit maxPrompts, or when priming is disabled by config.
 */
export function shouldShowSoftAsk(state: PersistedPriming, config: PrimingConfig): boolean {
  if (!config.enabled) return false
  if (state.osPermission !== 'undetermined') return false
  if (state.softDeclined) return false
  return state.prompts < config.maxPrompts
}

export type PrimingStoreOptions = {
  config: PrimingConfig
  storage: SettingsStorage
  key?: string
}

export type PrimingDecision = {
  /** Tell the Shell to invoke the OS permission request now. */
  requestOs: boolean
  state: PersistedPriming
}

export type PrimingStore = {
  read(): PersistedPriming
  shouldShowSoftAsk(): boolean
  /** Record that the soft-ask was shown (increments the counter). */
  markShown(): PersistedPriming
  /** User agreed in the soft-ask => the Shell should now request the OS dialog. */
  acceptSoftAsk(): PrimingDecision
  /** User declined the soft-ask => do not request the OS dialog; stop nagging. */
  declineSoftAsk(): PersistedPriming
  /** Record the OS outcome after the Shell requested the permission. */
  setOsPermission(permission: OsPermission): PersistedPriming
  reset(): PersistedPriming
}

export function createPrimingStore(options: PrimingStoreOptions): PrimingStore {
  const { config, storage } = options
  const key = options.key ?? PRIMING_STORAGE_KEY

  function load(): PersistedPriming {
    const raw = storage.getString(key)
    let parsed: unknown
    if (raw != null) {
      try {
        parsed = JSON.parse(raw)
      } catch {
        parsed = undefined
      }
    }
    const migrated = migratePriming(parsed)
    if (raw == null || JSON.stringify(migrated) !== raw) persist(migrated)
    return migrated
  }

  function persist(value: PersistedPriming): void {
    storage.set(key, JSON.stringify(value))
  }

  function update(patch: Partial<Omit<PersistedPriming, 'version'>>): PersistedPriming {
    const next: PersistedPriming = { ...load(), ...patch, version: PRIMING_SCHEMA_VERSION }
    persist(next)
    return next
  }

  return {
    read: () => load(),
    shouldShowSoftAsk: () => shouldShowSoftAsk(load(), config),
    markShown: () => update({ prompts: load().prompts + 1 }),
    acceptSoftAsk: () => {
      const state = load()
      // The OS dialog is requested only after soft-ask consent, and only while undetermined.
      const requestOs = state.osPermission === 'undetermined'
      return { requestOs, state }
    },
    declineSoftAsk: () => update({ softDeclined: true }),
    setOsPermission: (permission) => update({ osPermission: permission }),
    reset: () => {
      const fresh = defaults()
      persist(fresh)
      return fresh
    },
  }
}
