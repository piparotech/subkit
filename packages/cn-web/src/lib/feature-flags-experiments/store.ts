import { assignWeighted } from './assignment'
import { type FlagDefMap, type FlagRegistry, type FlagValue } from './flags'
import { type EvaluationContext, type ReleaseCondition, evaluateTargeting } from './targeting'

// The feature-flags store — the provider-neutral Engine the app talks to. It holds a snapshot of flag
// values fetched from an injected `FlagSource` (PostHog in production, an in-memory fake in tests) and
// resolves every read through the typed registry. Three guarantees implement the capability ACs:
//   - default-fallback: a missing/unavailable value resolves to the declared default, never an error
//   - kill-switch: a kill-switch flag forced OFF (or an empty/unreachable snapshot) disables the
//                  feature at runtime via `refresh` with no app-store release
//   - local override: a developer/QA can pin a value (debug panel) without touching the source
// Nothing here imports the PostHog SDK, so the whole Engine is unit-testable offline.

/** The minimal surface a concrete provider must implement to feed the store. */
export type FlagSource = {
  /**
   * Fetch the current flag snapshot for the given context. May reject or return null when the provider
   * is unreachable — the store then keeps the last snapshot (or defaults) and never throws to callers.
   */
  fetch: (context: EvaluationContext) => Promise<FlagSnapshot | null>
}

/** A raw snapshot: flag key -> raw value (boolean for gates, string for variants). */
export type FlagSnapshot = Record<string, boolean | string>

/** A source that never returns anything — the store then serves declared defaults only (offline-safe). */
export function noopSource(): FlagSource {
  return { fetch: async () => null }
}

/** A source that always returns a fixed snapshot — handy for tests and local development. */
export function staticSource(snapshot: FlagSnapshot): FlagSource {
  return { fetch: async () => snapshot }
}

export type FeatureFlagsOptions<M extends FlagDefMap> = {
  registry: FlagRegistry<M>
  source: FlagSource
  context: EvaluationContext
  /** Optional per-flag targeting conditions evaluated locally on top of the source snapshot. */
  conditions?: Partial<Record<keyof M & string, readonly ReleaseCondition[]>>
  /** Fired on a refresh error with the error NAME only (never token/PII bytes). */
  onError?: (errorName: string) => void
}

export type RefreshResult = { status: 'updated'; keys: number } | { status: 'unavailable' }

export type FeatureFlags<M extends FlagDefMap> = {
  /** Resolve a flag to its precisely typed value (default-fallback when unknown/unavailable). */
  getTyped: <K extends keyof M & string>(key: K) => FlagValue<M[K]>
  /** Convenience boolean read for gates/kill-switches (false-safe for non-boolean keys). */
  isEnabled: (key: keyof M & string) => boolean
  /** Pull a fresh snapshot from the source. Never throws — returns `unavailable` on failure. */
  refresh: () => Promise<RefreshResult>
  /** Pin a flag value locally (debug/QA), bypassing the source until cleared. */
  setOverride: <K extends keyof M & string>(key: K, value: FlagValue<M[K]>) => void
  clearOverride: (key: keyof M & string) => void
  clearAllOverrides: () => void
  /** A plain view of every resolved flag value (for the debug panel). */
  snapshot: () => Record<keyof M & string, boolean | string>
}

export function createFeatureFlags<M extends FlagDefMap>(
  options: FeatureFlagsOptions<M>,
): FeatureFlags<M> {
  const { registry, source, context, conditions, onError } = options
  let remote: FlagSnapshot = {}
  const overrides = new Map<string, boolean | string>()

  function resolveRaw(key: keyof M & string): unknown {
    if (overrides.has(key)) return overrides.get(key)
    // Local targeting conditions (if any) win over a bare remote value: they can scope a flag to a
    // segment or pick a variant deterministically even when the source returns a plain boolean.
    const flagConditions = conditions?.[key]
    if (flagConditions && flagConditions.length > 0) {
      const match = evaluateTargeting(key, flagConditions, context)
      const def = registry.def(key)
      if (def.kind === 'variant') return match.variant ?? (match.matched ? undefined : def.default)
      return match.matched
    }
    return Object.prototype.hasOwnProperty.call(remote, key) ? remote[key] : undefined
  }

  function getTyped<K extends keyof M & string>(key: K): FlagValue<M[K]> {
    return registry.coerce(key, resolveRaw(key))
  }

  function isEnabled(key: keyof M & string): boolean {
    const def = registry.def(key)
    if (def.kind !== 'boolean') return false
    return getTyped(key) as boolean
  }

  async function refresh(): Promise<RefreshResult> {
    try {
      const next = await source.fetch(context)
      if (!next) return { status: 'unavailable' }
      remote = next
      return { status: 'updated', keys: Object.keys(next).length }
    } catch (error) {
      onError?.(error instanceof Error ? error.name : 'UnknownError')
      return { status: 'unavailable' }
    }
  }

  function setOverride<K extends keyof M & string>(key: K, value: FlagValue<M[K]>): void {
    overrides.set(key, value)
  }

  function clearOverride(key: keyof M & string): void {
    overrides.delete(key)
  }

  function clearAllOverrides(): void {
    overrides.clear()
  }

  function snapshot(): Record<keyof M & string, boolean | string> {
    const out = {} as Record<keyof M & string, boolean | string>
    for (const key of registry.keys) out[key] = getTyped(key)
    return out
  }

  return {
    getTyped,
    isEnabled,
    refresh,
    setOverride,
    clearOverride,
    clearAllOverrides,
    snapshot,
  }
}

/** Re-export the deterministic weighted picker for hosts that bucket outside an experiment. */
export { assignWeighted }
